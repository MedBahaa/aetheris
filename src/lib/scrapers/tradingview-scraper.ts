import { SymbolMapper } from '../symbol-mapper';

export interface TradingViewFundamentalData {
  peRatio: string;
  dividendYield: string;
  marketCap: string;
  netProfit: string;
  roe: string;
  margin: string;
  revenueGrowth: string;
  profitGrowth: string;
  status: 'success' | 'error';
}

export interface TradingViewShariaData {
  companyName: string;
  ticker: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  totalAssets: number | null;
  totalRevenue: number | null;
  interestDebt: number | null;
  interestCash: number | null;
  currency: string;
  status: 'success' | 'error';
}

const HARAM_INDUSTRIES = [
  'regional banks',
  'major banks',
  'multi-line insurance',
  'insurance brokers',
  'finance/rental/leasing',
  'beverages: alcoholic',
];

const HARAM_KEYWORDS = [
  'banque',
  'bank',
  'assurance',
  'insurance',
  'alcool',
  'alcohol',
  'tabac',
  'tobacco',
  'gambling',
  'casino',
  'jeux',
];

const HARAM_BVC_TICKERS = new Set([
  'ATW', 'BCP', 'BOA', 'CIH', 'CDM', 'CFG',
  'WAA', 'ATH', 'SAN', 'AGM', 'SBM', 'EQD', 'SLF', 'MAB', 'MLE',
]);

/**
 * Classifie de manière déterministe si un émetteur appartient à un secteur illicite (Haram),
 * tout en préservant les foncières / promoteurs immobiliers classés sous "Finance" par TradingView.
 */
export function isHaramIndustryOrSector(sector?: string, industry?: string, ticker?: string): boolean {
  const cleanTicker = String(ticker || '').trim().toUpperCase().replace(/^CSEMA:/, '');
  if (cleanTicker && HARAM_BVC_TICKERS.has(cleanTicker)) return true;

  const ind = String(industry || '').toLowerCase().trim();
  const sec = String(sector || '').toLowerCase().trim();

  if (ind.includes('real estate')) return false;
  if (HARAM_INDUSTRIES.some(h => ind.includes(h))) return true;

  const combined = `${sec} ${ind}`;
  return HARAM_KEYWORDS.some(k => combined.includes(k));
}

const SHARIA_UNIVERSE_COLUMNS = [
  'name',
  'description',
  'sector',
  'industry',
  'market_cap_basic',
  'total_assets_fq',
  'total_revenue_fy',
  'total_revenue_ttm',
  'total_debt_fq',
  'cash_n_equivalents_fq',
  'cash_n_short_term_investments_fq',
  'fundamental_currency_code',
];

function normalizeSearchText(val: string): string {
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class TradingViewScraper {
  private static shariaUniverseCache: { rows: any[]; timestamp: number } | null = null;
  private static readonly SHARIA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  static clearCache(): void {
    this.shariaUniverseCache = null;
  }

  private static async getUsdMadRate(): Promise<number> {
    try {
      const fxRes = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          symbols: { tickers: ['FX_IDC:USDMAD'], query: { types: [] } },
          columns: ['name', 'close']
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (fxRes.ok) {
        const fxJson = await fxRes.json();
        const rateRow = (fxJson.data || []).find((r: any) => r.s === 'FX_IDC:USDMAD');
        const numericRate = rateRow?.d?.[1];
        if (typeof numericRate === 'number' && Number.isFinite(numericRate) && numericRate > 0) {
          return numericRate;
        }
      }
    } catch {
      // Fallback conservateur MAD/USD
    }
    return 10.0;
  }

  private static async getMoroccoUniverse(): Promise<any[]> {
    const now = Date.now();
    if (
      this.shariaUniverseCache &&
      now - this.shariaUniverseCache.timestamp < this.SHARIA_CACHE_TTL_MS
    ) {
      return this.shariaUniverseCache.rows;
    }

    const res = await fetch('https://scanner.tradingview.com/morocco/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        filter: [],
        options: { lang: 'en' },
        markets: ['morocco'],
        columns: SHARIA_UNIVERSE_COLUMNS,
        range: [0, 100],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`TradingView Universe HTTP Error ${res.status}`);
    }

    const parsed = await res.json();
    const rows = Array.isArray(parsed?.data) ? parsed.data : [];
    if (rows.length > 0) {
      this.shariaUniverseCache = { rows, timestamp: now };
    }
    return rows;
  }

  /**
   * Extrait le bilan et le compte de résultat (CA, Dettes, Trésorerie, Capitalisation, Actif)
   * pour le screener AAOIFI sur les sociétés cotées CSEMA en MAD natif.
   */
  static async getShariaBalanceSheet(query: string, symbolInput?: string): Promise<TradingViewShariaData> {
    const empty: TradingViewShariaData = {
      companyName: query,
      ticker: (symbolInput || query).toUpperCase(),
      sector: 'Inconnu',
      industry: '',
      marketCap: null,
      totalAssets: null,
      totalRevenue: null,
      interestDebt: null,
      interestCash: null,
      currency: 'MAD',
      status: 'error',
    };

    try {
      const rows = await this.getMoroccoUniverse();
      if (rows.length === 0) return empty;

      const resolved = (symbolInput || SymbolMapper.resolve(query) || '')
        .toUpperCase()
        .replace(/^CSEMA:/, '')
        .trim();
      const rawQueryUpper = query.toUpperCase().replace(/^CSEMA:/, '').trim();
      const normQuery = normalizeSearchText(query);

      let matched = rows.find((r: any) => {
        const ticker = String(r?.d?.[0] || '').toUpperCase();
        return (resolved && (r?.s === `CSEMA:${resolved}` || ticker === resolved)) || ticker === rawQueryUpper;
      });

      if (!matched && normQuery.length >= 2) {
        matched = rows.find((r: any) => {
          const tickerNorm = normalizeSearchText(String(r?.d?.[0] || ''));
          const descNorm = normalizeSearchText(String(r?.d?.[1] || ''));
          return tickerNorm === normQuery || descNorm.includes(normQuery) || (descNorm.length >= 3 && normQuery.includes(descNorm));
        });
      }

      if (!matched || !Array.isArray(matched.d)) {
        return empty;
      }

      const d = matched.d;
      const currency = typeof d[11] === 'string' ? d[11].toUpperCase() : 'MAD';
      const fxMultiplier = currency === 'USD' ? await this.getUsdMadRate() : 1.0;

      const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
      const scale = (v: unknown): number | null => (isNum(v) ? Math.round(v * fxMultiplier) : null);

      const totalRevenueRaw = isNum(d[6]) ? d[6] : isNum(d[7]) ? d[7] : null;
      const cashRaw = isNum(d[10]) ? d[10] : isNum(d[9]) ? d[9] : null;

      return {
        companyName: typeof d[1] === 'string' && d[1].trim() ? d[1].trim() : String(d[0] || query),
        ticker: String(d[0] || resolved || rawQueryUpper).toUpperCase(),
        sector: typeof d[2] === 'string' && d[2].trim() ? d[2].trim() : 'Inconnu',
        industry: typeof d[3] === 'string' && d[3].trim() ? d[3].trim() : '',
        marketCap: scale(d[4]),
        totalAssets: scale(d[5]),
        totalRevenue: scale(totalRevenueRaw),
        interestDebt: scale(d[8]),
        interestCash: scale(cashRaw),
        currency: 'MAD',
        status: 'success',
      };
    } catch (error: any) {
      console.error(`[TradingViewScraper] Erreur bilan Sharia pour "${query}" :`, error.message);
      return empty;
    }
  }
  /**
   * Récupère les données fondamentales depuis TradingView Morocco (CSEMA) en MAD natif,
   * avec conversion sécurisée uniquement si un champ reste exprimé en devise étrangère.
   */
  static async getFundamentalData(company: string, symbolInput?: string): Promise<TradingViewFundamentalData> {
    const symbol = (symbolInput || SymbolMapper.resolve(company) || company).toUpperCase();
    console.log(`[TradingViewScraper] Récupération des fondamentaux pour : CSEMA:${symbol}...`);

    try {
      const postData = {
        symbols: {
          tickers: [`CSEMA:${symbol}`],
          query: { types: [] }
        },
        columns: [
          "name",
          "close",
          "market_cap_basic",
          "price_earnings_ttm",
          "dividends_yield",
          "return_on_equity_fq",
          "net_income",
          "operating_margin",
          "total_revenue",
          "revenue_growth_yoy",
          "fundamental_currency_code"
        ]
      };

      const res = await fetch('https://scanner.tradingview.com/morocco/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(postData),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`TradingView HTTP Error ${res.status}`);
      }

      const parsed = await res.json();
      const rows = parsed.data || [];
      const stockRow = rows.find((r: any) => r.s === `CSEMA:${symbol}`);

      if (!stockRow || !Array.isArray(stockRow.d)) {
        throw new Error(`Symbole CSEMA:${symbol} introuvable dans TradingView`);
      }

      const d = stockRow.d;
      const fundamentalCurrency = typeof d[10] === 'string' ? d[10].toUpperCase() : 'MAD';
      const fxMultiplier = fundamentalCurrency === 'USD' ? await this.getUsdMadRate() : 1.0;

      const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

      const pe = isNum(d[3]) ? d[3].toFixed(2) : 'N/A';
      const divYield = isNum(d[4]) ? `${d[4].toFixed(2)} %` : 'N/A';

      const marketCapRaw = isNum(d[2]) && d[2] > 0 ? Math.round(d[2] * fxMultiplier) : null;
      const marketCap = marketCapRaw !== null ? marketCapRaw.toString() : 'N/A';

      const netProfitRaw = isNum(d[6]) ? Math.round(d[6] * fxMultiplier) : null;
      const netProfit = netProfitRaw !== null
        ? `${netProfitRaw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`
        : 'N/A';

      const roe = isNum(d[5]) ? `${d[5].toFixed(2)}%` : 'N/A';
      const margin = isNum(d[7]) ? `${d[7].toFixed(2)}%` : 'N/A';
      const revenueGrowth = isNum(d[9]) ? `${d[9].toFixed(2)}%` : 'N/A';

      console.log(`[TradingViewScraper] ✅ Données extraites pour ${symbol} (${fundamentalCurrency})`);
      return {
        peRatio: pe,
        dividendYield: divYield,
        marketCap,
        netProfit,
        roe,
        margin,
        revenueGrowth,
        profitGrowth: 'N/A',
        status: 'success'
      };

    } catch (error: any) {
      console.error(`[TradingViewScraper] Erreur sur ${symbol} :`, error.message);
      return {
        peRatio: 'N/A',
        dividendYield: 'N/A',
        marketCap: 'N/A',
        netProfit: 'N/A',
        roe: 'N/A',
        margin: 'N/A',
        revenueGrowth: 'N/A',
        profitGrowth: 'N/A',
        status: 'error'
      };
    }
  }
}

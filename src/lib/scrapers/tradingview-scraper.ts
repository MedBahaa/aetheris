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

export class TradingViewScraper {
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
      let fxMultiplier = 1.0;

      // Si l'endpoint renvoyait exceptionnellement des montants en USD, récupérer le vrai taux numérique (colonne "close" index 1)
      if (fundamentalCurrency === 'USD') {
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
            fxMultiplier = typeof numericRate === 'number' && Number.isFinite(numericRate) && numericRate > 0 ? numericRate : 10.0;
          } else {
            fxMultiplier = 10.0;
          }
        } catch {
          fxMultiplier = 10.0;
        }
      }

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

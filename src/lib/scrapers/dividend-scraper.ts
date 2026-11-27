import * as cheerio from 'cheerio';
import { SymbolMapper } from '../symbol-mapper';

export interface DividendYieldData {
  rank: number;
  symbol: string;
  name: string;
  yield: string;
  amountDH: string;
  price: string;
  sector?: string;
}

export type DividendScrapeSource = 'tradingview' | 'casablancabourse' | 'none';

export interface DividendScrapeResult {
  data: DividendYieldData[];
  source: DividendScrapeSource;
  updatedAt: string;
}

interface CacheEntry {
  result: DividendScrapeResult;
  expiresAt: number;
}

const TRADINGVIEW_MOROCCO_SCAN_URL = 'https://scanner.tradingview.com/morocco/scan';
const CASABLANCA_BOURSE_DIVIDENDS_URL =
  'https://www.casablancabourse.com/classement-entreprises-marocaines-par-dividendes-yield-2026/';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const TRADINGVIEW_SECTOR_FR: Record<string, string> = {
  Finance: 'Finance',
  'Consumer Non-Durables': 'Biens de consommation',
  'Retail Trade': 'Distribution',
  Communications: 'Télécoms',
  Utilities: 'Énergie & Services',
  'Non-Energy Minerals': 'Matériaux & Ciments',
  'Process Industries': 'Industrie',
  'Producer Manufacturing': 'Industrie lourde',
  'Distribution Services': 'Distribution',
  Transportation: 'Transport & Logistique',
  'Health Services': 'Santé',
  'Health Technology': 'Santé',
  'Technology Services': 'Technologie',
  'Commercial Services': 'Services',
  'Electronic Technology': 'Électronique',
};

function translateSectorToFrench(rawSector: string, symbol: string): string {
  const cleaned = rawSector.trim();
  if (cleaned && TRADINGVIEW_SECTOR_FR[cleaned]) {
    return TRADINGVIEW_SECTOR_FR[cleaned];
  }
  const mapped = SymbolMapper.getSector(symbol);
  if (mapped && mapped !== 'Autres Secteurs') {
    return mapped;
  }
  return cleaned || mapped || 'Autres Secteurs';
}

function parseNumericDisplay(raw: string): number {
  const cleaned = raw
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export class DividendScraper {
  private static cache: CacheEntry | null = null;

  static clearCache(): void {
    this.cache = null;
  }

  private static async fetchFromTradingView(): Promise<DividendYieldData[]> {
    const response = await fetch(TRADINGVIEW_MOROCCO_SCAN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        filter: [{ left: 'type', operation: 'equal', right: 'stock' }],
        options: { lang: 'en' },
        markets: ['morocco'],
        symbols: { query: { types: [] }, tickers: [] },
        columns: [
          'name',
          'description',
          'close',
          'dividends_yield',
          'dividends_yield_current',
          'dps_common_stock_prim_issue_fy',
          'dps_common_stock_prim_issue_ttm',
          'sector',
          'fundamental_currency_code',
        ],
        sort: { sortBy: 'dividends_yield_current', sortOrder: 'desc' },
        range: [0, 100],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`TradingView HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];

    interface ParsedItem {
      symbol: string;
      name: string;
      yieldNum: number;
      amountNum: number;
      close: number;
      sector: string;
    }

    const bySymbol = new Map<string, ParsedItem>();

    for (const row of rows) {
      const d = Array.isArray(row?.d) ? row.d : null;
      if (!d) continue;

      const symbol = String(d[0] || '')
        .trim()
        .toUpperCase()
        .replace(/^CSEMA:/, '');
      const name = String(d[1] || symbol).trim();
      const close = typeof d[2] === 'number' && Number.isFinite(d[2]) ? d[2] : 0;
      const yldTtm = typeof d[3] === 'number' && Number.isFinite(d[3]) ? d[3] : null;
      const yldCur = typeof d[4] === 'number' && Number.isFinite(d[4]) ? d[4] : null;
      const dpsFy = typeof d[5] === 'number' && Number.isFinite(d[5]) ? d[5] : null;
      const dpsTtm = typeof d[6] === 'number' && Number.isFinite(d[6]) ? d[6] : null;
      const rawSector = String(d[7] || '').trim();

      const dpsNum =
        dpsFy !== null && dpsFy > 0
          ? dpsFy
          : dpsTtm !== null && dpsTtm > 0
            ? dpsTtm
            : null;

      const yieldNum =
        yldCur !== null && yldCur > 0
          ? yldCur
          : yldTtm !== null && yldTtm > 0
            ? yldTtm
            : dpsNum !== null && close > 0
              ? (dpsNum / close) * 100
              : 0;

      const amountNum =
        dpsNum !== null ? dpsNum : close > 0 && yieldNum > 0 ? (close * yieldNum) / 100 : 0;

      if (!symbol || close <= 0 || yieldNum <= 0) continue;

      const existing = bySymbol.get(symbol);
      if (!existing || yieldNum > existing.yieldNum) {
        bySymbol.set(symbol, {
          symbol,
          name,
          yieldNum,
          amountNum,
          close,
          sector: translateSectorToFrench(rawSector, symbol),
        });
      }
    }

    const sorted = Array.from(bySymbol.values()).sort((a, b) => b.yieldNum - a.yieldNum);

    return sorted.map((item, idx) => ({
      rank: idx + 1,
      symbol: item.symbol,
      name: item.name,
      yield: `${item.yieldNum.toFixed(2)} %`,
      amountDH: `${item.amountNum.toFixed(2)} DH`,
      price: `${item.close.toFixed(2)} DH`,
      sector: item.sector,
    }));
  }

  private static async fetchFromCasablancaBourse(): Promise<DividendYieldData[]> {
    const response = await fetch(CASABLANCA_BOURSE_DIVIDENDS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      throw new Error(`CasablancaBourse HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const seenSymbols = new Set<string>();
    const rawItems: Omit<DividendYieldData, 'rank'>[] = [];

    $('#tableEses tbody tr').each((_, el) => {
      const nameTd = $(el).find('.name-td');
      const href = nameTd.find('a').attr('href') || '';
      const parts = href.split('/').filter(Boolean);
      const rawSym = (parts[0] || '').trim().toUpperCase();
      const name = nameTd.find('.nom_entreprise').text().trim();

      const tds = $(el).find('td');
      const yieldVal = $(tds[2]).text().trim().replace(/\s+/g, ' ');
      const amountDH = $(tds[3]).text().trim().replace(/\s+/g, ' ');
      const price = $(tds[4]).text().trim().replace(/\s+/g, ' ');

      if (!rawSym) return;

      const symbol = /^[A-Z0-9]{2,5}$/.test(rawSym)
        ? rawSym
        : SymbolMapper.resolve(rawSym) || rawSym;

      const yieldNum = parseNumericDisplay(yieldVal);
      if (yieldNum <= 0 || seenSymbols.has(symbol)) return;

      seenSymbols.add(symbol);
      rawItems.push({
        symbol,
        name: name || symbol,
        yield: yieldVal,
        amountDH,
        price,
        sector: SymbolMapper.getSector(symbol),
      });
    });

    rawItems.sort((a, b) => parseNumericDisplay(b.yield) - parseNumericDisplay(a.yield));

    return rawItems.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));
  }

  static async getDividendYieldsWithMeta(forceRefresh: boolean = false): Promise<DividendScrapeResult> {
    const now = Date.now();

    if (!forceRefresh && this.cache && this.cache.result.data.length > 0 && now < this.cache.expiresAt) {
      return this.cache.result;
    }

    try {
      const tvData = await this.fetchFromTradingView();
      if (tvData.length > 0) {
        const result: DividendScrapeResult = {
          data: tvData,
          source: 'tradingview',
          updatedAt: new Date().toISOString(),
        };
        this.cache = { result, expiresAt: now + CACHE_TTL_MS };
        console.log(`[DividendScraper] ✅ TradingView CSEMA: ${tvData.length} dividendes extraits.`);
        return result;
      }
    } catch (tvErr: any) {
      console.warn(`[DividendScraper] TradingView indisponible (${tvErr?.message || tvErr}), bascule fallback...`);
    }

    try {
      const bvcData = await this.fetchFromCasablancaBourse();
      if (bvcData.length > 0) {
        const result: DividendScrapeResult = {
          data: bvcData,
          source: 'casablancabourse',
          updatedAt: new Date().toISOString(),
        };
        this.cache = { result, expiresAt: now + CACHE_TTL_MS };
        console.log(`[DividendScraper] ✅ CasablancaBourse fallback: ${bvcData.length} dividendes extraits.`);
        return result;
      }
    } catch (bvcErr: any) {
      console.error(`[DividendScraper] Fallback CasablancaBourse échoué:`, bvcErr?.message || bvcErr);
    }

    if (this.cache && this.cache.result.data.length > 0) {
      console.warn(`[DividendScraper] Utilisation du dernier cache valide (${this.cache.result.data.length} valeurs).`);
      return this.cache.result;
    }

    return {
      data: [],
      source: 'none',
      updatedAt: new Date().toISOString(),
    };
  }

  static async getDividendYields(forceRefresh: boolean = false): Promise<DividendYieldData[]> {
    const res = await this.getDividendYieldsWithMeta(forceRefresh);
    return res.data;
  }
}

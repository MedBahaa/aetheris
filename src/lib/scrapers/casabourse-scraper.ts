import * as cheerio from 'cheerio';

export interface CasabourseData {
  peRatio?: string;
  dividendYield?: string;
  margin?: string;
  revenueGrowth?: string;
  profitGrowth?: string;
  status: 'success' | 'error';
}

interface CachedScreenerRow {
  normalizedText: string;
  data: CasabourseData;
}

function normalizeMatchText(s: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class CasabourseScraper {
  private static cachedRows: CachedScreenerRow[] | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures (évite de re-télécharger 2.4 Mo)

  static clearCache(): void {
    this.cachedRows = null;
    this.lastFetchTime = 0;
  }

  private static async getScreenerRows(): Promise<CachedScreenerRow[]> {
    const now = Date.now();
    if (this.cachedRows && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cachedRows;
    }

    const response = await fetch('https://casabourse.ma/screener/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const parsedRows: CachedScreenerRow[] = [];
    $('table tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 10) return;

      const getVal = (key: string) => $(el).find(`td[data-column-key="${key}"]`).text().trim() || 'N/A';
      parsedRows.push({
        normalizedText: normalizeMatchText($(el).text()),
        data: {
          peRatio: getVal('pe_ratio'),
          dividendYield: getVal('dividend_yield'),
          margin: getVal('profit_margin'),
          revenueGrowth: getVal('revenue_aagr'),
          profitGrowth: getVal('net_income_aagr'),
          status: 'success',
        }
      });
    });

    if (parsedRows.length > 0) {
      this.cachedRows = parsedRows;
      this.lastFetchTime = now;
    }
    return parsedRows;
  }

  /**
   * Extrait les données depuis le screener de casabourse.ma (avec cache mémoire 6h)
   */
  static async getFundamentalData(companyName: string, symbol?: string): Promise<CasabourseData> {
    try {
      console.log(`[Casabourse] Recherche (Fast-HTML) pour "${companyName}" (Symbol: ${symbol || 'N/A'})...`);
      const rows = await this.getScreenerRows();

      const normRaw = normalizeMatchText(companyName);
      const normClean = normalizeMatchText(companyName.replace(/\([^)]*\)/g, ' '));
      const s = normalizeMatchText(symbol || (companyName.length <= 5 ? companyName : ''));

      const match = rows.find((row) => {
        const text = row.normalizedText;
        const nameMatch =
          (normRaw && text.includes(normRaw)) ||
          (normClean.length >= 3 && text.includes(normClean));
        const symbolMatch =
          s.length >= 2 &&
          (text.includes(`(${s})`) || text.includes(` ${s} `));
        return Boolean(nameMatch || symbolMatch);
      });

      if (!match) {
        console.warn(`[Casabourse] ❌ Valeur introuvable pour "${companyName}"`);
        return { status: 'error' };
      }

      console.log(`[Casabourse] ✅ Données extraites pour ${companyName}`);
      return match.data;
    } catch (e: any) {
      console.error(`[Casabourse] Erreur Fast-HTML:`, e.message);
      return { status: 'error' };
    }
  }
}

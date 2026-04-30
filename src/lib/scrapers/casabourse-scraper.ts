import * as cheerio from 'cheerio';

export interface CasabourseData {
  peRatio?: string;
  dividendYield?: string;
  margin?: string;
  revenueGrowth?: string;
  profitGrowth?: string;
  status: 'success' | 'error';
}

export class CasabourseScraper {
  /**
   * Extrait les données depuis le screener de casabourse.ma (Moteur Fast-HTML)
   */
  static async getFundamentalData(companyName: string, symbol?: string): Promise<CasabourseData> {
    try {
      console.log(`[Casabourse] Recherche (Fast-HTML) pour "${companyName}" (Symbol: ${symbol || 'N/A'})...`);
      
      const response = await fetch('https://casabourse.ma/screener/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);

      let targetRow: any = null;
      
      $('table tr').each((_, el) => {
        const text = $(el).text().toUpperCase();
        const nameMatch = companyName && text.includes(companyName.toUpperCase());
        const s = symbol || (companyName.length <= 5 ? companyName : '');
        const symbolMatch = s && (text.includes(`(${s.toUpperCase()})`) || text.includes(` ${s.toUpperCase()} `));

        if (nameMatch || symbolMatch) {
          targetRow = el;
          return false; // break each loop
        }
      });

      if (!targetRow) {
        console.warn(`[Casabourse] ❌ Valeur introuvable pour "${companyName}"`);
        return { status: 'error' };
      }

      const cells = $(targetRow).find('td');
      if (cells.length < 10) return { status: 'error' };

      const getVal = (key: string) => $(targetRow).find(`td[data-column-key="${key}"]`).text().trim() || 'N/A';

      const data = {
        peRatio: getVal('pe_ratio'),
        dividendYield: getVal('dividend_yield'),
        margin: getVal('profit_margin'),
        revenueGrowth: getVal('revenue_aagr'),
        profitGrowth: getVal('net_income_aagr'),
      };

      console.log(`[Casabourse] ✅ Données extraites pour ${companyName}`);
      return { ...data, status: 'success' };

    } catch (e: any) {
      console.error(`[Casabourse] Erreur Fast-HTML:`, e.message);
      return { status: 'error' };
    }
  }
}

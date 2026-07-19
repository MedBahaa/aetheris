import * as cheerio from 'cheerio';

export interface IndexData {
  symbol: string;
  price: string;
  variation: string;
  variationValue: number;
  timestamp: string;
}

const BMCE_INDEX_URL = 'https://www.bmcecapitalbourse.com/bkbbourse/lists/TK?q=AE31180F8E3BE20E762758E81EDC1204&type=Indices';

/**
 * INDEX SCRAPER ⚡
 * Récupère le MASI et éventuellement d'autres indices.
 */
export class IndexScraper {
  private static cache: IndexData | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 30000; // 30 secondes

  static async getMASI(): Promise<IndexData | null> {
    const now = Date.now();
    
    if (this.cache && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cache;
    }

    try {
      console.log(`[IndexScraper] Fetching MASI from Firebase...`);
      const response = await fetch('https://coronavirus-tracker-m.firebaseio.com/live/indices.json', {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Firebase indices HTTP ${response.status}`);
      }

      const parsed = await response.json();
      if (!parsed || !parsed.MASI) {
        throw new Error('Invalid JSON payload or missing MASI');
      }

      const masi = parsed.MASI;
      const priceNum = masi.v || 0;
      const varNum = masi.vp || 0;

      // Format values matching the old format
      const price = priceNum.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f/g, ' ');
      const variation = (varNum >= 0 ? '+' : '') + varNum.toFixed(2).replace('.', ',') + '%';

      const result: IndexData = {
        symbol: 'MASI',
        price,
        variation,
        variationValue: varNum,
        timestamp: new Date(masi.t || Date.now()).toISOString()
      };

      this.cache = result;
      this.lastFetchTime = now;
      return result;

    } catch (firebaseError: any) {
      console.warn(`[IndexScraper] Firebase failed, falling back to BMCE:`, firebaseError.message);
      
      try {
        console.log(`[IndexScraper] Fetching MASI from BMCE...`);
        const response = await fetch(BMCE_INDEX_URL, {
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const table = $('#master-data-table');
        if (!table.length) return null;

        let price = '---';
        let variation = '---';
        let varValue = 0;

        table.find('tr').each((_, row) => {
          const th = $(row).find('th').text().trim();
          const td = $(row).find('td').text().trim();

          if (th.includes('Cours')) {
            price = td.replace(/\s/g, ' ').trim();
          } else if (th.includes('Variation %')) {
            variation = td.split('(')[0].trim();
            varValue = parseFloat(variation.replace(',', '.').replace('%', '').trim()) || 0;
          }
        });

        const result: IndexData = {
          symbol: 'MASI',
          price: price || '---',
          variation: variation || '---',
          variationValue: varValue,
          timestamp: new Date().toISOString()
        };

        this.cache = result;
        this.lastFetchTime = now;
        return result;

      } catch (bmceError: any) {
        console.error('[IndexScraper] Both Firebase and BMCE failed:', bmceError);
        return null;
      }
    }
  }
}

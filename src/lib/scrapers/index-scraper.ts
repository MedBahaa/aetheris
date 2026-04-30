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
          price = td.replace(/\s/g, ' ').trim(); // Nettoyage espaces insécables
        } else if (th.includes('Variation %')) {
          // Format typique: "+2,66% (498,87)"
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

    } catch (error) {
      console.error('[IndexScraper] Erreur:', error);
      return null;
    }
  }
}

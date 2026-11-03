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
 * INDEX SCRAPER (Source institutionnelle primaire : BMCE Capital Bourse)
 * Récupère l'indice MASI avec contrôle de cohérence des valeurs.
 */
export class IndexScraper {
  private static cache: IndexData | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 30000; // 30 secondes

  static async getMASI(): Promise<IndexData | null> {
    const now = Date.now();

    if (this.cache && now - this.lastFetchTime < this.CACHE_TTL) {
      return this.cache;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(BMCE_INDEX_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) throw new Error(`BMCE Index HTTP ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);

      const table = $('#master-data-table');
      let price = '';
      let variation = '';
      let varValue = 0;

      if (table.length) {
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
      }

      // Fallback sur le tableau de liste d'indices BMCE si #master-data-table n'est pas présent
      if (!price) {
        $('table tbody tr').each((_, row) => {
          const cells = $(row).find('td');
          const label = $(cells[0]).text().trim().toUpperCase();
          if (cells.length >= 4 && label.includes('MASI') && !label.includes('20') && !label.includes('ESG')) {
            price = $(cells[2]).text().replace(/\s/g, ' ').trim();
            variation = $(cells[3]).text().trim();
            varValue = parseFloat(variation.replace(',', '.').replace('%', '').replace('+', '').trim()) || 0;
          }
        });
      }

      const numericMasi = parseFloat(price.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(numericMasi) || numericMasi < 1000 || numericMasi > 100_000 || Math.abs(varValue) > 25) {
        throw new Error('Valeur MASI absente ou hors bornes de cohérence');
      }

      const result: IndexData = {
        symbol: 'MASI',
        price,
        variation: variation || '0,00%',
        variationValue: varValue,
        timestamp: new Date().toISOString(),
      };

      this.cache = result;
      this.lastFetchTime = now;
      return result;
    } catch (bmceError: any) {
      console.warn('[IndexScraper] BMCE MASI indisponible :', bmceError.message);
      return this.cache;
    } finally {
      clearTimeout(timeout);
    }
  }
}

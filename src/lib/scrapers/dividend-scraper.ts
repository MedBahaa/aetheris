import * as cheerio from 'cheerio';
import { SymbolMapper } from '../symbol-mapper';

export interface DividendYieldData {
  rank: number;
  symbol: string;
  name: string;
  yield: string;
  amountDH: string;
  price: string;
}

export class DividendScraper {
  static async getDividendYields(): Promise<DividendYieldData[]> {
    try {
      console.log(`[DividendScraper] Fetching dividend yields from casablancabourse.com...`);
      
      const response = await fetch('https://www.casablancabourse.com/classement-entreprises-marocaines-par-dividendes-yield-2026/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);

      const dividends: DividendYieldData[] = [];

      $('#tableEses tbody tr').each((_, el) => {
        const rank = parseInt($(el).find('.rank-td').text().trim(), 10);
        
        const nameTd = $(el).find('.name-td');
        const href = nameTd.find('a').attr('href') || '';
        // Extract symbol from href like "/SLF/action/dividendes"
        const parts = href.split('/');
        let symbol = parts.length > 1 ? parts[1] : '';
        const name = nameTd.find('.nom_entreprise').text().trim();
        
        const tds = $(el).find('td');
        const yieldVal = $(tds[2]).text().trim();
        const amountDH = $(tds[3]).text().trim();
        const price = $(tds[4]).text().trim();
        
        if (symbol && !Number.isNaN(rank)) {
           // Normalize symbol if needed
           symbol = SymbolMapper.resolve(symbol) || symbol;
           
           dividends.push({
             rank,
             symbol,
             name,
             yield: yieldVal,
             amountDH,
             price
           });
        }
      });

      console.log(`[DividendScraper] ✅ Extraits ${dividends.length} dividendes.`);
      return dividends;
    } catch (e: any) {
      console.error(`[DividendScraper] Erreur:`, e.message);
      return [];
    }
  }
}

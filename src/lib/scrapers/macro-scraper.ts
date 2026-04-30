export interface MacroData {
  brent: { price: number; changePercent: number };
  gold: { price: number; changePercent: number };
  usDmad: { price: number; changePercent: number };
  timestamp: string;
}

const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * MACRO SCRAPER 🌍
 * Interroge l'API publique (anonyme) de Yahoo Finance.
 */
export class MacroScraper {
  private static cache: MacroData | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 150000; // 2.5 minutes cache

  static async getMacroData(): Promise<MacroData | null> {
    const now = Date.now();
    if (this.cache && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cache;
    }

    try {
      // BZ=F (Brent Crude), GC=F (Gold), MAD=X (USD/MAD)
      const symbols = ['BZ=F', 'GC=F', 'MAD=X'];
      const data: any = {};

      await Promise.all(symbols.map(async (symbol) => {
        const res = await fetch(`${YAHOO_API}/${symbol}?interval=1d&range=2d`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.chart.result && json.chart.result.length > 0) {
          const result = json.chart.result[0];
          const price = result.meta.regularMarketPrice;
          const prevClose = result.meta.chartPreviousClose;
          
          let changePercent = 0;
          if (price && prevClose) {
             changePercent = ((price - prevClose) / prevClose) * 100;
          }

          const key = symbol === 'BZ=F' ? 'brent' : symbol === 'GC=F' ? 'gold' : 'usDmad';
          data[key] = {
            price: price,
            changePercent: parseFloat(changePercent.toFixed(2))
          };
        }
      }));

      // Validation
      if (data.brent && data.gold && data.usDmad) {
        const finalData = {
          brent: data.brent,
          gold: data.gold,
          usDmad: data.usDmad,
          timestamp: new Date().toISOString()
        };
        this.cache = finalData;
        this.lastFetchTime = now;
        return finalData;
      }
      return this.cache; // Retourne l'ancien cache si erreur partielle

    } catch (e) {
      console.error("[MacroScraper] Erreur accès données monde:", e);
      return this.cache;
    }
  }
}

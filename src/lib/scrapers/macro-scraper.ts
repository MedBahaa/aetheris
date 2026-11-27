export interface MacroData {
  brent: { price: number; changePercent: number };
  gold: { price: number; changePercent: number };
  usDmad: { price: number; changePercent: number };
  keyRate: { value: number; lastChange: string; lastUpdated: string };
  inflation: { value: number; period: string; lastUpdated: string };
  nextBAMMeeting: string;
  bamDataLastVerified: string;
  timestamp: string;
}

const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * MACRO SCRAPER 🌍
 * Interroge l'API publique (anonyme) de Yahoo Finance + Données BAM.
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
      // 1. Collecte Yahoo Finance (Brent, Or, USD/MAD)
      const symbols = ['BZ=F', 'GC=F', 'MAD=X'];
      const data: any = {};

      await Promise.allSettled(symbols.map(async (symbol) => {
        const res = await fetch(`${YAHOO_API}/${symbol}?interval=1d&range=2d`, {
          cache: 'no-store',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const json = await res.json();

        if (json?.chart?.result && json.chart.result.length > 0) {
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

      // 2. Données Institutionnelles (BKAM)
      const institutionalData = {
        keyRate: { value: 2.25, lastChange: '23/06/2026', lastUpdated: '2026-08-07' },
        inflation: { value: 0.3, period: 'Juin 2026 (Annuel)', lastUpdated: '2026-08-07' },
        nextBAMMeeting: 'Voir calendrier officiel BKAM',
        bamDataLastVerified: '2026-08-07'
      };

      const brent = data.brent ?? this.cache?.brent;
      const gold = data.gold ?? this.cache?.gold;
      const usDmad = data.usDmad ?? this.cache?.usDmad;

      if (brent || gold || usDmad) {
        const finalData: MacroData = {
          brent: brent ?? { price: 0, changePercent: 0 },
          gold: gold ?? { price: 0, changePercent: 0 },
          usDmad: usDmad ?? { price: 0, changePercent: 0 },
          ...institutionalData,
          timestamp: new Date().toISOString()
        };
        this.cache = finalData;
        this.lastFetchTime = now;
        return finalData;
      }
      return this.cache;

    } catch (e) {
      console.error("[MacroScraper] Erreur accès données macro:", e);
      return this.cache;
    }
  }
}

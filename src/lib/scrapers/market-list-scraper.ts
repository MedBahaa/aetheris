import * as cheerio from 'cheerio';

export interface LiveStockData {
  symbol: string;
  time: string;
  opening: string;
  price: string;
  variation: string;
  variationValue: number;
  variationAbs: string; // Nouvel indicateur : variation absolue (ex: +7.90)
  quantity: string;  // Nombre de titres échangés
  volume: string;    // Volume en MAD
  high: string;
  low: string;
}

export interface MarketListResult {
  stocks: LiveStockData[];
  timestamp: string;
  totalCount: number;
  scrapeDurationMs: number;
  status: 'success' | 'error';
  error?: string;
}

const BMCE_LIST_URL = 'https://www.bmcecapitalbourse.com/bkbbourse/lists/TK?q=AE31180F8E3BE20E762758E81EDC1204&type=Actions';

/**
 * MARKET LIST SCRAPER (Version Fetch + Cheerio ⚡)
 * Remplace l'API de Casablanca Bourse (24s) et Playwright (45s) par un
 * simple Fetch HTML parsé (< 0.5s) contenant l'intégralité des 77 actions.
 */
export class MarketListScraper {
  private static cache: MarketListResult | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 30000; // 30 secondes (Rafraîchissement plus fréquent)

  /**
   * Recherche une action spécifique dans le dernier listing
   */
  static async getLiveStock(query: string): Promise<LiveStockData | null> {
    const now = Date.now();
    
    // Si pas de cache ou cache expiré, on rescrape
    if (!this.cache || (now - this.lastFetchTime > this.CACHE_TTL)) {
      console.log(`[MarketList] Cache expiré ou vide. Fetch Fast HTML...`);
      const result = await this.scrapeAll();
      if (result.status === 'success') {
        this.cache = result;
        this.lastFetchTime = now;
      }
    }

    if (!this.cache) return null;

    const normalize = (s: string) => s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever les accents
      .replace(/[^a-z0-9]/g, ''); // Garder seulement alpha-numérique

    const normalizedQuery = normalize(query);
    
    // 1. Recherche par symbole exact (après normalisation)
    const bySymbol = this.cache.stocks.find((s: LiveStockData) => normalize(s.symbol) === normalizedQuery);
    if (bySymbol) return bySymbol;

    // 2. Recherche par inclusion
    const byInclusion = this.cache.stocks.find((s: LiveStockData) => {
      const normalizedStock = normalize(s.symbol);
      return normalizedStock.includes(normalizedQuery) || normalizedQuery.includes(normalizedStock);
    });
    
    if (byInclusion) return byInclusion;

    // 3. Recherche par mots-clés multiples (ex: "Residences Dar Saada" vs "Resid Dar Saada")
    const queryTokens = query.toLowerCase().split(' ').filter(t => t.length > 2);
    if (queryTokens.length > 1) {
      const byTokens = this.cache.stocks.find((s: LiveStockData) => {
        const stockLower = s.symbol.toLowerCase();
        // Si la majorité des mots (ou les plus importants) sont dans le nom
        const matchCount = queryTokens.filter(token => stockLower.includes(token)).length;
        return matchCount >= Math.min(2, queryTokens.length - 1);
      });
      if (byTokens) return byTokens;
    }

    return null;
  }

  /**
   * Extrait toutes les actions en utilisant un simple Fetch HTML depuis BMCE.
   */
  static async scrapeAll(): Promise<MarketListResult> {
    const startTime = Date.now();

    try {
      console.log(`[MarketList] Téléchargement du DOM BMCE Bourse...`);
      
      const response = await fetch(BMCE_LIST_URL, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
         throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const allStocks: LiveStockData[] = [];

      // Parcourir toutes les lignes de la table d'actions
      $('table tbody tr').each((_, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 9) {
          const symbol = $(cells[0]).text().trim();
          const time = $(cells[1]).text().trim();
          const opening = $(cells[2]).text().trim();
          const price = $(cells[3]).text().trim();
          const variation = $(cells[4]).text().trim();
          const quantity = $(cells[5]).text().trim(); // Nombre de titres
          const volume = $(cells[6]).text().trim();   // Volume en MAD
          const high = $(cells[7]).text().trim();
          const low = $(cells[8]).text().trim();

          // Filtrer les headers résiduels ou valeurs nulles
          if (symbol && price && symbol.length > 1 && !symbol.includes('Nom') && !symbol.includes('Valeur')) {
            const priceNum = parseFloat((price || '0').replace(',', '.').replace(/\s/g, '')) || 0;
            const varNum = parseFloat((variation || '0').replace(',', '.').replace('%', '').replace('+', '')) || 0;
            
            // Calcul de la variation absolue : absChange = price - (price / (1 + (var/100)))
            let variationAbs = '0.00';
            if (priceNum > 0 && varNum !== 0) {
              const prevClose = priceNum / (1 + (varNum / 100));
              const change = priceNum - prevClose;
              variationAbs = (change >= 0 ? '+' : '') + change.toFixed(2).replace('.', ',');
            }

            allStocks.push({
              symbol,
              time,
              opening,
              price,
              variation,
              variationValue: varNum,
              variationAbs: variationAbs === '0.00' ? (varNum === 0 ? '0,00' : variationAbs) : variationAbs,
              quantity,
              volume,
              high,
              low
            });
          }
        }
      });

      // Nettoyage des doublons éventuels
      const uniqueMap = new Map<string, LiveStockData>();
      for (const stock of allStocks) {
        if (!uniqueMap.has(stock.symbol)) uniqueMap.set(stock.symbol, stock);
      }

      const finalStocks = Array.from(uniqueMap.values());

      console.log(`[MarketList] Cheerio Fast-Parsing réussi : ${finalStocks.length} actions extraites en ${Date.now() - startTime}ms`);

      return {
        stocks: finalStocks,
        timestamp: new Date().toISOString(),
        totalCount: finalStocks.length,
        scrapeDurationMs: Date.now() - startTime,
        status: 'success'
      };

    } catch (error: any) {
      console.error("[MarketListScraper] Erreur:", error);
      return {
        stocks: [],
        timestamp: new Date().toISOString(),
        totalCount: 0,
        scrapeDurationMs: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
    }
  }
}

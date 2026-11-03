import * as cheerio from 'cheerio';
import { SymbolMapper } from '../symbol-mapper';

export interface LiveStockData {
  symbol: string;
  time: string;
  opening: string;
  price: string;
  variation: string;
  variationValue: number;
  variationAbs: string; // Variation absolue (ex: +7,90)
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
const MAX_PLAUSIBLE_PRICE_MAD = 100_000;
const MAX_PLAUSIBLE_DAILY_VARIATION_PCT = 25; // Plafond de cohérence au-delà des réservations BVC (±10%)

function isPlausibleTick(priceNum: number, varNum: number): boolean {
  return (
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    priceNum <= MAX_PLAUSIBLE_PRICE_MAD &&
    Number.isFinite(varNum) &&
    Math.abs(varNum) <= MAX_PLAUSIBLE_DAILY_VARIATION_PCT
  );
}

/**
 * MARKET LIST SCRAPER (Source institutionnelle primaire : BMCE Capital Bourse)
 * Valide strictement les bornes numériques des cours et variations journalières
 * afin d'empêcher tout empoisonnement de flux (faux déclenchement Stop-Loss / corruption historique).
 */
export class MarketListScraper {
  private static cache: MarketListResult | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 30000; // 30 secondes

  /**
   * Recherche une action spécifique dans le dernier listing
   */
  static async getLiveStock(query: string): Promise<LiveStockData | null> {
    const now = Date.now();

    if (!this.cache || now - this.lastFetchTime > this.CACHE_TTL) {
      const result = await this.scrapeAll();
      if (result.status === 'success') {
        this.cache = result;
        this.lastFetchTime = now;
      }
    }

    if (!this.cache) return null;

    const resolvedQuery = SymbolMapper.resolve(query) || query;

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const normalizedQuery = normalize(resolvedQuery);

    // 1. Recherche par symbole exact (après normalisation)
    const bySymbol = this.cache.stocks.find((s: LiveStockData) => normalize(s.symbol) === normalizedQuery);
    if (bySymbol) return bySymbol;

    // 2. Recherche par inclusion
    const byInclusion = this.cache.stocks.find((s: LiveStockData) => {
      const normalizedStock = normalize(s.symbol);
      return normalizedStock.includes(normalizedQuery) || normalizedQuery.includes(normalizedStock);
    });

    if (byInclusion) return byInclusion;

    // 3. Recherche par mots-clés multiples
    const queryTokens = query.toLowerCase().split(' ').filter((t) => t.length > 2);
    if (queryTokens.length > 1) {
      const byTokens = this.cache.stocks.find((s: LiveStockData) => {
        const stockLower = s.symbol.toLowerCase();
        const matchCount = queryTokens.filter((token) => stockLower.includes(token)).length;
        return matchCount >= Math.min(2, queryTokens.length - 1);
      });
      if (byTokens) return byTokens;
    }

    return null;
  }

  private static async scrapeFromBMCE(): Promise<LiveStockData[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(BMCE_LIST_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`BMCE HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const allStocks: LiveStockData[] = [];

      $('table tbody tr').each((_, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 9) {
          const symbol = $(cells[0]).text().trim();
          const time = $(cells[1]).text().trim();
          const opening = $(cells[2]).text().trim();
          const price = $(cells[3]).text().trim();
          const variation = $(cells[4]).text().trim();
          const quantity = $(cells[5]).text().trim();
          const volume = $(cells[6]).text().trim();
          const high = $(cells[7]).text().trim();
          const low = $(cells[8]).text().trim();

          if (symbol && price && symbol.length > 1 && !symbol.includes('Nom') && !symbol.includes('Valeur')) {
            const priceNum = parseFloat((price || '0').replace(',', '.').replace(/\s/g, '')) || 0;
            const varNum = parseFloat((variation || '0').replace(',', '.').replace('%', '').replace('+', '')) || 0;

            if (!isPlausibleTick(priceNum, varNum)) return;

            let variationAbs = '0,00';
            if (priceNum > 0 && varNum !== 0) {
              const prevClose = priceNum / (1 + varNum / 100);
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
              variationAbs,
              quantity,
              volume,
              high,
              low,
            });
          }
        }
      });

      const uniqueMap = new Map<string, LiveStockData>();
      for (const stock of allStocks) {
        if (!uniqueMap.has(stock.symbol)) uniqueMap.set(stock.symbol, stock);
      }

      const finalStocks = Array.from(uniqueMap.values());
      if (finalStocks.length === 0) {
        throw new Error('BMCE returned 0 valid stocks');
      }
      return finalStocks;
    } finally {
      clearTimeout(timeout);
    }
  }

  static async scrapeAll(): Promise<MarketListResult> {
    const startTime = Date.now();

    // 1. Source institutionnelle primaire : BMCE Capital Bourse
    try {
      const bmceStocks = await this.scrapeFromBMCE();
      return {
        stocks: bmceStocks,
        timestamp: new Date().toISOString(),
        totalCount: bmceStocks.length,
        scrapeDurationMs: Date.now() - startTime,
        status: 'success',
      };
    } catch (bmceError: any) {
      console.warn('[MarketList] Source primaire BMCE indisponible, tentative de secours validée :', bmceError.message);

      // 2. Secours uniquement si BMCE est hors-ligne, avec filtrage strict d'intégrité (anti-spoofing de prix)
      const fallbackUrl = process.env.MARKET_FEED_FALLBACK_URL;
      if (!fallbackUrl) {
        if (this.cache && this.cache.stocks.length > 0) {
          return {
            ...this.cache,
            scrapeDurationMs: Date.now() - startTime,
          };
        }
        return {
          stocks: [],
          timestamp: new Date().toISOString(),
          totalCount: 0,
          scrapeDurationMs: Date.now() - startTime,
          status: 'error',
          error: `Source marché institutionnelle indisponible (${bmceError.message})`,
        };
      }

      try {
        const parsedUrl = new URL(fallbackUrl);
        if (parsedUrl.protocol !== 'https:') {
          throw new Error('MARKET_FEED_FALLBACK_URL doit utiliser HTTPS');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Fallback HTTP ${response.status}`);
        }

        const parsed = await response.json();
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Format JSON de secours invalide');
        }

        const allStocks: LiveStockData[] = [];
        Object.keys(parsed).forEach((symbol) => {
          if (!/^[A-Za-zÀ-ÿ0-9.\-_&\s]{1,35}$/.test(symbol)) return;
          const item = parsed[symbol];
          if (!item || typeof item !== 'object') return;

          const priceNum = Number(item.c || 0);
          const varNum = Number(item.v || 0);
          if (!isPlausibleTick(priceNum, varNum)) return;

          const openingNum = Number(item.o || priceNum);
          const highNum = Number(item.h || priceNum);
          const lowNum = Number(item.l || priceNum);
          const volumeNum = Math.max(0, Number(item.vol || 0));
          const quantityNum = Math.max(0, Number(item.tr || 0));

          const price = priceNum.toFixed(2).replace('.', ',');
          const variation = (varNum >= 0 ? '+' : '') + varNum.toFixed(2).replace('.', ',') + '%';
          const opening = openingNum.toFixed(2).replace('.', ',');
          const high = highNum.toFixed(2).replace('.', ',');
          const low = lowNum.toFixed(2).replace('.', ',');
          const volume = volumeNum
            .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .replace(/\u202f/g, ' ');
          const quantity = quantityNum.toString();

          let variationAbs = '0,00';
          if (priceNum > 0 && varNum !== 0) {
            const prevClose = priceNum / (1 + varNum / 100);
            const change = priceNum - prevClose;
            variationAbs = (change >= 0 ? '+' : '') + change.toFixed(2).replace('.', ',');
          }

          const date = new Date(Number(item.t) || Date.now());
          const time = date.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Casablanca' });

          allStocks.push({
            symbol,
            time,
            opening,
            price,
            variation,
            variationValue: varNum,
            variationAbs,
            quantity,
            volume,
            high,
            low,
          });
        });

        return {
          stocks: allStocks,
          timestamp: new Date().toISOString(),
          totalCount: allStocks.length,
          scrapeDurationMs: Date.now() - startTime,
          status: allStocks.length > 0 ? 'success' : 'error',
          error: allStocks.length > 0 ? undefined : 'Aucune valeur valide dans le flux de secours',
        };
      } catch (fallbackErr: any) {
        return {
          stocks: [],
          timestamp: new Date().toISOString(),
          totalCount: 0,
          scrapeDurationMs: Date.now() - startTime,
          status: 'error',
          error: `BMCE error: ${bmceError.message} | Fallback error: ${fallbackErr.message}`,
        };
      }
    }
  }
}

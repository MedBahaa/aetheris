import * as cheerio from 'cheerio';
import { SymbolMapper } from '../symbol-mapper';

export interface LiveStockData {
  symbol: string;
  ticker?: string;     // Code ticker officiel BVC (ex: IAM, ATW, GTM, VCN, CAP)
  name?: string;       // Nom complet de la société (ex: MAROC TELECOM, SGTM, VICENNE, CASH PLUS)
  bmceId?: string;     // Identifiant numérique BMCE Capital Bourse (ex: 150349775)
  sector?: string;     // Secteur d'activité résolu
  isIpo?: boolean;     // Indique une nouvelle introduction détectée dynamiquement
  time: string;
  opening: string;
  price: string;
  variation: string;
  variationValue: number;
  variationAbs: string; // Variation absolue (ex: +7,90)
  quantity: string;     // Nombre de titres échangés
  volume: string;       // Volume en MAD
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
  newIposDiscovered?: string[];
}

export interface ScrapeAllOptions {
  forceDiscovery?: boolean;
}

const BMCE_LIST_URL = 'https://www.bmcecapitalbourse.com/bkbbourse/lists/TK?q=AE31180F8E3BE20E762758E81EDC1204&type=Actions';
const TRADINGVIEW_MOROCCO_SCAN_URL = 'https://scanner.tradingview.com/morocco/scan';
const MAX_PLAUSIBLE_PRICE_MAD = 100_000;
const MAX_PLAUSIBLE_DAILY_VARIATION_PCT = 50; // Plafond de cohérence élargi pour supporter les introductions (IPO) et réservations BVC

const IGNORED_INDEX_NAMES = new Set([
  'MASI',
  'MSI20',
  'MASI 20',
  'MADEX',
  'MASI ESG',
  'FTSE CSE MOROCCO 15',
  'FTSE CSE MOROCCO ALL-LIQUID',
]);

function isPlausibleTick(priceNum: number, varNum: number): boolean {
  return (
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    priceNum <= MAX_PLAUSIBLE_PRICE_MAD &&
    Number.isFinite(varNum) &&
    Math.abs(varNum) <= MAX_PLAUSIBLE_DAILY_VARIATION_PCT
  );
}

function parseFrenchNumber(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace('%', '')
    .replace('+', '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function extractBmceIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const match = href.match(/\/bkbbourse\/details\/(\d+)/);
  return match?.[1];
}

function normalizeSearchToken(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * MARKET LIST SCRAPER & IPO AUTO-DISCOVERY ENGINE
 * - Source primaire : BMCE Capital Bourse (Tableau Actions + Bandeau Ticker Complet #tickerContainer)
 * - Source secondaire de découverte IPO : TradingView Morocco (CSEMA) Scanner
 * - Synchronisation périodique automatique avec la table `companies` de Supabase
 */
export class MarketListScraper {
  private static cache: MarketListResult | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_TTL = 30000; // 30 secondes

  // Cache de découverte multi-sources (TradingView CSEMA) pour capter les nouvelles IPO
  private static discoveredExtraStocks: LiveStockData[] = [];
  private static lastDailyIpoCheckDate: string = ''; // Format YYYY-MM-DD (Africa/Casablanca)
  private static isDbSyncRunning: boolean = false;

  /**
   * Retourne la date (YYYY-MM-DD), l'heure et la minute actuelles au fuseau horaire de la Bourse de Casablanca.
   */
  static getCasablancaTimeParts(now: Date = new Date()): { dateKey: string; hour: number; minute: number } {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Casablanca',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((p) => p.type === 'year')?.value || '2026';
      const month = parts.find((p) => p.type === 'month')?.value || '01';
      const day = parts.find((p) => p.type === 'day')?.value || '01';
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      return { dateKey: `${year}-${month}-${day}`, hour, minute };
    } catch {
      return { dateKey: now.toISOString().split('T')[0], hour: now.getUTCHours() + 1, minute: now.getUTCMinutes() };
    }
  }

  /**
   * Vérifie si la détection automatique quotidienne des IPO doit s'exécuter :
   * Strictement 1 fois par jour le matin à 10h00 (créneau de 10h00 à 10h14 heure de Casablanca).
   */
  static shouldRunDaily10AmIpoCheck(now: Date = new Date()): boolean {
    const { dateKey, hour, minute } = this.getCasablancaTimeParts(now);
    return hour === 10 && minute < 15 && this.lastDailyIpoCheckDate !== dateKey;
  }

  /**
   * Recherche une action spécifique dans le dernier listing (par ticker, nom ou alias)
   */
  static async getLiveStock(query: string): Promise<LiveStockData | null> {
    if (!query || !query.trim()) return null;
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
    const normalizedQuery = normalizeSearchToken(resolvedQuery);
    const normalizedRawQuery = normalizeSearchToken(query);

    const getCandidateTokens = (s: LiveStockData): string[] => {
      const resolvedSym = SymbolMapper.resolve(s.ticker || s.symbol);
      const canonicalName = s.name || SymbolMapper.getCanonicalName(s.symbol);
      return [
        normalizeSearchToken(s.symbol),
        normalizeSearchToken(s.ticker || ''),
        normalizeSearchToken(resolvedSym),
        normalizeSearchToken(canonicalName),
      ].filter(Boolean);
    };

    // 1. Recherche par correspondance exacte (symbole, ticker résolu ou nom)
    const byExact = this.cache.stocks.find((s: LiveStockData) => {
      const tokens = getCandidateTokens(s);
      return tokens.includes(normalizedQuery) || tokens.includes(normalizedRawQuery);
    });
    if (byExact) return byExact;

    // 2. Recherche par inclusion (pour requêtes d'au moins 3 caractères)
    if (normalizedRawQuery.length >= 3) {
      const byInclusion = this.cache.stocks.find((s: LiveStockData) => {
        const tokens = getCandidateTokens(s);
        return tokens.some(
          (tok) =>
            tok.length >= 3 &&
            (tok.includes(normalizedQuery) ||
              normalizedQuery.includes(tok) ||
              tok.includes(normalizedRawQuery) ||
              normalizedRawQuery.includes(tok))
        );
      });
      if (byInclusion) return byInclusion;
    }

    // 3. Recherche par mots-clés multiples
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => normalizeSearchToken(t))
      .filter((t) => t.length > 2);

    if (queryTokens.length > 1) {
      const byTokens = this.cache.stocks.find((s: LiveStockData) => {
        const haystack = `${normalizeSearchToken(s.symbol)} ${normalizeSearchToken(s.name || '')}`;
        const matchCount = queryTokens.filter((token) => haystack.includes(token)).length;
        return matchCount >= Math.min(2, queryTokens.length - 1);
      });
      if (byTokens) return byTokens;
    }

    return null;
  }

  /**
   * Extraction depuis BMCE Capital Bourse :
   * Combine le tableau principal (`table tbody tr`) ET le bandeau `#tickerContainer`
   * afin de capter les nouvelles introductions (IPO) et les valeurs réservées / non traitées en séance.
   */
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

      // 1. Extraire le bandeau complet `#tickerContainer` (contient toutes les valeurs et leurs bmce_id, y compris les IPO récentes)
      const tickerTapeMap = new Map<
        string,
        { rawName: string; bmceId?: string; priceStr: string; priceNum: number; varStr: string; varNum: number }
      >();

      $('#tickerContainer dt').each((_, dtEl) => {
        const link = $(dtEl).find('a').first();
        const rawName = (link.attr('title') || link.text() || '').trim();
        if (!rawName || IGNORED_INDEX_NAMES.has(rawName.toUpperCase())) return;

        const bmceId = extractBmceIdFromHref(link.attr('href'));
        const ddEl = $(dtEl).next('dd');
        const spans = ddEl.find('span');
        const priceStr = spans.first().text().trim().replace(/\u202f/g, ' ');
        const varRaw = spans.last().text().trim();

        const priceNum = parseFrenchNumber(priceStr);
        const varNum = parseFrenchNumber(varRaw);

        if (priceNum > 0 && priceNum <= MAX_PLAUSIBLE_PRICE_MAD) {
          const normKey = normalizeSearchToken(SymbolMapper.resolve(rawName) || rawName);
          tickerTapeMap.set(normKey, {
            rawName,
            bmceId,
            priceStr: priceNum.toFixed(2).replace('.', ','),
            priceNum,
            varStr: (varNum >= 0 ? '+' : '') + varNum.toFixed(2).replace('.', ',') + '%',
            varNum: Math.abs(varNum) <= MAX_PLAUSIBLE_DAILY_VARIATION_PCT ? varNum : 0,
          });

          const resolvedTicker = SymbolMapper.resolve(rawName);
          SymbolMapper.registerDynamicCompany({
            symbol: resolvedTicker || rawName,
            name: rawName,
            bmceId,
            sector: SymbolMapper.getSector(resolvedTicker || rawName, rawName),
          });
        }
      });

      // 2. Parcourir le tableau principal des actions
      $('table tbody tr').each((_, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 9) {
          const firstCell = $(cells[0]);
          const symbol = firstCell.text().trim();
          const linkHref = firstCell.find('a').attr('href');
          const extractedBmceId = extractBmceIdFromHref(linkHref);

          const time = $(cells[1]).text().trim();
          const opening = $(cells[2]).text().trim();
          let price = $(cells[3]).text().trim();
          let variation = $(cells[4]).text().trim();
          const quantity = $(cells[5]).text().trim();
          const volume = $(cells[6]).text().trim();
          const high = $(cells[7]).text().trim();
          const low = $(cells[8]).text().trim();

          if (
            symbol &&
            symbol.length > 1 &&
            !symbol.includes('Nom') &&
            !symbol.includes('Valeur') &&
            !IGNORED_INDEX_NAMES.has(symbol.toUpperCase())
          ) {
            const normKey = normalizeSearchToken(SymbolMapper.resolve(symbol) || symbol);
            const tapeEntry = tickerTapeMap.get(normKey);

            let priceNum = parseFrenchNumber(price);
            let varNum = parseFrenchNumber(variation);

            // Fallback spécial IPO / valeur réservée ou non encore traitée en séance :
            // Si le dernier cours est '-' ou 0, utiliser l'ouverture, le plus haut, ou le cours du bandeau ticker
            if (priceNum <= 0) {
              const openNum = parseFrenchNumber(opening);
              const highNum = parseFrenchNumber(high);
              const lowNum = parseFrenchNumber(low);
              const fallbackNum = openNum > 0 ? openNum : highNum > 0 ? highNum : lowNum > 0 ? lowNum : tapeEntry?.priceNum || 0;
              if (fallbackNum > 0) {
                priceNum = fallbackNum;
                price = fallbackNum.toFixed(2).replace('.', ',');
                if (!variation || variation === '-' || variation === 'N/A') {
                  varNum = tapeEntry?.varNum ?? 0;
                  variation = tapeEntry?.varStr ?? '0,00%';
                }
              }
            }

            if (!isPlausibleTick(priceNum, varNum)) return;

            let variationAbs = '0,00';
            if (priceNum > 0 && varNum !== 0) {
              const prevClose = priceNum / (1 + varNum / 100);
              const change = priceNum - prevClose;
              variationAbs = (change >= 0 ? '+' : '') + change.toFixed(2).replace('.', ',');
            }

            const ticker = SymbolMapper.resolve(symbol);
            const bmceId = extractedBmceId || tapeEntry?.bmceId || SymbolMapper.getBmceId(symbol) || undefined;
            const canonicalName = SymbolMapper.getCanonicalName(symbol);
            const sector = SymbolMapper.getSector(ticker || symbol, canonicalName);

            SymbolMapper.registerDynamicCompany({
              symbol: ticker || symbol,
              name: canonicalName,
              bmceId,
              sector,
            });

            allStocks.push({
              symbol,
              ticker,
              name: canonicalName,
              bmceId,
              sector,
              time: time || '--:--',
              opening: opening && opening !== '-' ? opening : price,
              price,
              variation: variation && variation !== '-' ? variation : '0,00%',
              variationValue: varNum,
              variationAbs,
              quantity: quantity && quantity !== '-' ? quantity : '0',
              volume: volume && volume !== '-' ? volume : '0,00',
              high: high && high !== '-' ? high : price,
              low: low && low !== '-' ? low : price,
            });
          }
        }
      });

      // 3. Dédupliquer et injecter les éventuelles nouvelles introductions (IPO) présentes dans `#tickerContainer` mais absentes de la liste statique `q=...`
      const uniqueMap = new Map<string, LiveStockData>();
      const seenCanonicalKeys = new Set<string>();

      for (const stock of allStocks) {
        const key = normalizeSearchToken(stock.ticker || SymbolMapper.resolve(stock.symbol) || stock.symbol);
        if (!uniqueMap.has(stock.symbol) && !seenCanonicalKeys.has(key)) {
          uniqueMap.set(stock.symbol, stock);
          if (key) seenCanonicalKeys.add(key);
        }
      }

      for (const [normKey, tape] of tickerTapeMap.entries()) {
        if (!seenCanonicalKeys.has(normKey) && isPlausibleTick(tape.priceNum, tape.varNum)) {
          const ticker = SymbolMapper.resolve(tape.rawName);
          const canonicalName = SymbolMapper.getCanonicalName(tape.rawName);
          const sector = SymbolMapper.getSector(ticker || tape.rawName, canonicalName);

          let variationAbs = '0,00';
          if (tape.priceNum > 0 && tape.varNum !== 0) {
            const prevClose = tape.priceNum / (1 + tape.varNum / 100);
            const change = tape.priceNum - prevClose;
            variationAbs = (change >= 0 ? '+' : '') + change.toFixed(2).replace('.', ',');
          }

          uniqueMap.set(tape.rawName, {
            symbol: tape.rawName,
            ticker,
            name: canonicalName,
            bmceId: tape.bmceId || SymbolMapper.getBmceId(tape.rawName) || undefined,
            sector,
            isIpo: true,
            time: new Date().toLocaleTimeString('fr-FR', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' }),
            opening: tape.priceStr,
            price: tape.priceStr,
            variation: tape.varStr,
            variationValue: tape.varNum,
            variationAbs,
            quantity: '0',
            volume: '0,00',
            high: tape.priceStr,
            low: tape.priceStr,
          });
          seenCanonicalKeys.add(normKey);
        }
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

  /**
   * Scanner secondaire multi-sources (TradingView CSEMA) :
   * Permet de détecter automatiquement toute nouvelle introduction (IPO) cotée à la Bourse de Casablanca
   * dès son premier jour d'introduction, même si la liste statique BMCE n'a pas encore été mise à jour.
   */
  static async scrapeFromTradingViewCSEMA(): Promise<LiveStockData[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const payload = {
        filter: [{ left: 'exchange', operation: 'equal', right: 'CSEMA' }],
        options: { lang: 'fr' },
        markets: ['morocco'],
        symbols: { query: { types: ['stock', 'dr', 'fund'] }, tickers: [] },
        columns: ['name', 'description', 'close', 'change', 'change_abs', 'open', 'high', 'low', 'volume', 'Value.Traded', 'sector'],
        sort: { sortBy: 'name', sortOrder: 'asc' },
        range: [0, 150],
      };

      const res = await fetch(TRADINGVIEW_MOROCCO_SCAN_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`TradingView CSEMA HTTP ${res.status}`);
      }

      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const tvStocks: LiveStockData[] = [];
      const nowTime = new Date().toLocaleTimeString('fr-FR', {
        timeZone: 'Africa/Casablanca',
        hour: '2-digit',
        minute: '2-digit',
      });

      for (const row of rows) {
        const d = row?.d;
        if (!Array.isArray(d)) continue;

        const rawTicker = String(d[0] || '').trim().toUpperCase();
        const rawDesc = String(d[1] || rawTicker).trim();
        if (!rawTicker || IGNORED_INDEX_NAMES.has(rawTicker)) continue;

        const priceNum = Number(d[2] || 0);
        const varNum = Number(d[3] || 0);
        if (!isPlausibleTick(priceNum, varNum)) continue;

        const changeAbsNum = Number(d[4] ?? (varNum !== 0 ? priceNum - priceNum / (1 + varNum / 100) : 0));
        const openNum = Number(d[5] || priceNum);
        const highNum = Number(d[6] || priceNum);
        const lowNum = Number(d[7] || priceNum);
        const qtyNum = Math.max(0, Math.round(Number(d[8] || 0)));
        const valTradedNum = Math.max(0, Number(d[9] || qtyNum * priceNum));
        const tvSector = d[10] ? String(d[10]) : undefined;

        const canonicalTicker = SymbolMapper.resolve(rawTicker) || rawTicker;
        const canonicalName =
          SymbolMapper.getCanonicalName(canonicalTicker) !== canonicalTicker
            ? SymbolMapper.getCanonicalName(canonicalTicker)
            : rawDesc.toUpperCase();
        const bmceId = SymbolMapper.getBmceId(canonicalTicker) || SymbolMapper.getBmceId(rawDesc) || undefined;
        const sector = SymbolMapper.getSector(canonicalTicker, tvSector || canonicalName);

        SymbolMapper.registerDynamicCompany({
          symbol: canonicalTicker,
          name: canonicalName,
          bmceId,
          sector,
        });

        tvStocks.push({
          symbol: canonicalName || canonicalTicker,
          ticker: canonicalTicker,
          name: canonicalName,
          bmceId,
          sector,
          time: nowTime,
          opening: openNum.toFixed(2).replace('.', ','),
          price: priceNum.toFixed(2).replace('.', ','),
          variation: (varNum >= 0 ? '+' : '') + varNum.toFixed(2).replace('.', ',') + '%',
          variationValue: Number(varNum.toFixed(2)),
          variationAbs: (changeAbsNum >= 0 ? '+' : '') + changeAbsNum.toFixed(2).replace('.', ','),
          quantity: qtyNum.toString(),
          volume: valTradedNum
            .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .replace(/\u202f/g, ' '),
          high: highNum.toFixed(2).replace('.', ','),
          low: lowNum.toFixed(2).replace('.', ','),
        });
      }

      return tvStocks;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fusionne les listes BMCE et TradingView CSEMA pour garantir qu'aucune IPO récente ne manque.
   */
  private static mergeMarketLists(primaryStocks: LiveStockData[], secondaryStocks: LiveStockData[]): {
    merged: LiveStockData[];
    newlyDiscoveredSymbols: string[];
  } {
    const merged = [...primaryStocks];
    const newlyDiscoveredSymbols: string[] = [];

    const existingKeys = new Set<string>();
    for (const s of primaryStocks) {
      const resolved = SymbolMapper.resolve(s.ticker || s.symbol);
      existingKeys.add(normalizeSearchToken(s.symbol));
      if (s.ticker) existingKeys.add(normalizeSearchToken(s.ticker));
      if (s.name) existingKeys.add(normalizeSearchToken(s.name));
      if (resolved) existingKeys.add(normalizeSearchToken(resolved));
    }

    for (const extra of secondaryStocks) {
      const resolved = SymbolMapper.resolve(extra.ticker || extra.symbol);
      const candKeys = [
        normalizeSearchToken(extra.symbol),
        normalizeSearchToken(extra.ticker || ''),
        normalizeSearchToken(extra.name || ''),
        normalizeSearchToken(resolved),
      ].filter(Boolean);

      const alreadyPresent = candKeys.some((k) => existingKeys.has(k));
      if (!alreadyPresent) {
        merged.push({ ...extra, isIpo: true });
        candKeys.forEach((k) => existingKeys.add(k));
        newlyDiscoveredSymbols.push(extra.ticker || extra.symbol);
      }
    }

    return { merged, newlyDiscoveredSymbols };
  }

  /**
   * Synchronise automatiquement les sociétés et nouvelles introductions (IPO) avec la table `companies` de Supabase.
   * Exécuté 1 fois par jour le matin à 10h00 (heure de Casablanca) ou sur demande explicite (`force = true`).
   */
  static async syncCompaniesWithMarket(
    stocksInput?: LiveStockData[],
    force: boolean = false
  ): Promise<{ added: string[]; updated: string[]; total: number }> {
    const { dateKey } = this.getCasablancaTimeParts();
    if (!force && (this.isDbSyncRunning || !this.shouldRunDaily10AmIpoCheck())) {
      return { added: [], updated: [], total: 0 };
    }

    this.isDbSyncRunning = true;
    this.lastDailyIpoCheckDate = dateKey;
    const added: string[] = [];
    const updated: string[] = [];

    try {
      const { supabaseAdmin } = await import('../supabase-server');
      if (!supabaseAdmin) {
        return { added: [], updated: [], total: 0 };
      }

      let stocks = stocksInput;
      if (!stocks || stocks.length === 0) {
        const res = await this.scrapeAll({ forceDiscovery: true });
        stocks = res.stocks;
      }

      const { data: existingCompanies, error: dbErr } = await supabaseAdmin
        .from('companies')
        .select('id, symbol, name, bmce_id, sector');

      if (dbErr) {
        console.warn('[IPO Discovery] Impossible de lire la table companies:', dbErr.message);
        return { added: [], updated: [], total: 0 };
      }

      const dbList = existingCompanies || [];

      // Enregistrer toutes les sociétés existantes en base dans le résolveur dynamique en mémoire
      for (const comp of dbList) {
        SymbolMapper.registerDynamicCompany({
          symbol: comp.symbol,
          name: comp.name,
          bmceId: comp.bmce_id || undefined,
          sector: comp.sector || undefined,
        });
      }

      const toInsert: Array<{
        symbol: string;
        name: string;
        bmce_id: string | null;
        sector: string;
        updated_at: string;
      }> = [];

      const seenInsertSymbols = new Set<string>();

      for (const stock of stocks) {
        const canonicalSymbol = (stock.ticker || SymbolMapper.resolve(stock.symbol) || stock.symbol).trim().toUpperCase();
        if (!canonicalSymbol || IGNORED_INDEX_NAMES.has(canonicalSymbol)) continue;

        const canonicalName = (
          stock.name ||
          SymbolMapper.getCanonicalName(canonicalSymbol) ||
          stock.symbol
        )
          .trim()
          .toUpperCase();

        const bmceId =
          stock.bmceId ||
          SymbolMapper.getBmceId(canonicalSymbol) ||
          SymbolMapper.getBmceId(stock.symbol) ||
          null;

        const sector = SymbolMapper.getSector(canonicalSymbol, stock.sector || canonicalName);

        const normCanonicalSym = normalizeSearchToken(canonicalSymbol);
        const normStockSym = normalizeSearchToken(stock.symbol);
        const normCanonicalName = normalizeSearchToken(canonicalName);

        const existing = dbList.find((c: { id: string; symbol: string; name: string; bmce_id?: string | null; sector?: string | null }) => {
          const cSym = normalizeSearchToken(c.symbol);
          const cRes = normalizeSearchToken(SymbolMapper.resolve(c.symbol));
          const cName = normalizeSearchToken(c.name);
          const cBmce = c.bmce_id ? c.bmce_id.split(',')[0].trim() : '';
          return (
            cSym === normCanonicalSym ||
            cSym === normStockSym ||
            cRes === normCanonicalSym ||
            cName === normCanonicalName ||
            cName === normStockSym ||
            (bmceId && cBmce === bmceId)
          );
        });

        if (!existing) {
          if (!seenInsertSymbols.has(canonicalSymbol)) {
            seenInsertSymbols.add(canonicalSymbol);
            toInsert.push({
              symbol: canonicalSymbol,
              name: canonicalName,
              bmce_id: bmceId,
              sector,
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          // Si la société existe déjà mais qu'il lui manque son bmce_id ou son secteur (ex: IPO ajoutée partiellement)
          const needsBmceId = bmceId && (!existing.bmce_id || existing.bmce_id.trim() === '');
          const needsSector =
            sector &&
            sector !== 'Autres Secteurs' &&
            (!existing.sector || existing.sector === 'Inconnu' || existing.sector === 'Autres Secteurs');

          if (needsBmceId || needsSector) {
            const updatePayload: Record<string, string> = {
              updated_at: new Date().toISOString(),
            };
            if (needsBmceId && bmceId) updatePayload.bmce_id = bmceId;
            if (needsSector) updatePayload.sector = sector;

            const { error: updErr } = await supabaseAdmin
              .from('companies')
              .update(updatePayload)
              .eq('id', existing.id);

            if (!updErr) {
              updated.push(existing.symbol);
            }
          }
        }
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabaseAdmin
          .from('companies')
          .upsert(toInsert, { onConflict: 'symbol' });

        if (!insErr) {
          added.push(...toInsert.map((item) => item.symbol));
          console.log(`[IPO Discovery] ✅ ${toInsert.length} nouvelle(s) valeur(s) / IPO indexée(s) en base : ${added.join(', ')}`);
        } else {
          console.warn('[IPO Discovery] Erreur upsert nouvelles valeurs:', insErr.message);
        }
      }

      this.lastDailyIpoCheckDate = dateKey;
      return { added, updated, total: stocks.length };
    } catch (err: any) {
      console.warn('[IPO Discovery] Exception lors de la synchronisation:', err?.message || err);
      return { added, updated, total: 0 };
    } finally {
      this.isDbSyncRunning = false;
    }
  }

  /**
   * Déclenche la vérification quotidienne en arrière-plan uniquement à 10h00 (1 fois par jour)
   */
  static triggerBackgroundDiscoverySync(stocks: LiveStockData[]): void {
    if (this.isDbSyncRunning || !this.shouldRunDaily10AmIpoCheck()) {
      return;
    }
    this.syncCompaniesWithMarket(stocks, true).catch((err) => {
      console.warn('[IPO Discovery 10h00] Erreur non-bloquante:', err?.message);
    });
  }

  static async scrapeAll(options?: ScrapeAllOptions): Promise<MarketListResult> {
    const startTime = Date.now();
    const shouldRefreshDiscovery =
      Boolean(options?.forceDiscovery) || this.shouldRunDaily10AmIpoCheck();

    // 1. Source institutionnelle primaire : BMCE Capital Bourse (Tableau + #tickerContainer)
    try {
      const bmceStocks = await this.scrapeFromBMCE();

      // Découverte multi-sources (TradingView CSEMA) : exécutée 1 fois par jour à 10h00 (ou si forcée manuellement)
      if (shouldRefreshDiscovery) {
        try {
          const tvStocks = await this.scrapeFromTradingViewCSEMA();
          if (tvStocks.length > 0) {
            this.discoveredExtraStocks = tvStocks;
          }
        } catch {
          // Non-bloquant : si TradingView est indisponible, on conserve BMCE
        }
      }

      const { merged, newlyDiscoveredSymbols } = this.mergeMarketLists(bmceStocks, this.discoveredExtraStocks);

      const result: MarketListResult = {
        stocks: merged,
        timestamp: new Date().toISOString(),
        totalCount: merged.length,
        scrapeDurationMs: Date.now() - startTime,
        status: 'success',
        newIposDiscovered: newlyDiscoveredSymbols.length > 0 ? newlyDiscoveredSymbols : undefined,
      };

      this.cache = result;
      this.lastFetchTime = Date.now();

      // Auto-indexation en base uniquement 1 fois par jour à 10h00
      this.triggerBackgroundDiscoverySync(merged);

      return result;
    } catch (bmceError: any) {
      console.warn('[MarketList] Source primaire BMCE indisponible, tentative de secours validée :', bmceError.message);

      // 2. Secours uniquement si BMCE est hors-ligne, avec filtrage strict d'intégrité (anti-spoofing de prix)
      const fallbackUrl = process.env.MARKET_FEED_FALLBACK_URL;
      if (!fallbackUrl) {
        // Essayer TradingView CSEMA avant d'échouer si aucun MARKET_FEED_FALLBACK_URL n'est défini
        try {
          const tvFallbackStocks = await this.scrapeFromTradingViewCSEMA();
          if (tvFallbackStocks.length > 0) {
            const tvResult: MarketListResult = {
              stocks: tvFallbackStocks,
              timestamp: new Date().toISOString(),
              totalCount: tvFallbackStocks.length,
              scrapeDurationMs: Date.now() - startTime,
              status: 'success',
            };
            this.cache = tvResult;
            this.lastFetchTime = Date.now();
            return tvResult;
          }
        } catch {
          // Ignorer et continuer vers le cache mémoire
        }

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
        const hostLower = parsedUrl.hostname.toLowerCase();
        const isPrivateOrMetadataHost =
          hostLower === 'localhost' ||
          hostLower.endsWith('.local') ||
          hostLower.endsWith('.internal') ||
          /^127\./.test(hostLower) ||
          /^10\./.test(hostLower) ||
          /^192\.168\./.test(hostLower) ||
          /^169\.254\./.test(hostLower) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostLower) ||
          hostLower === '0.0.0.0' ||
          hostLower === '[::1]';
        if (isPrivateOrMetadataHost) {
          throw new Error('MARKET_FEED_FALLBACK_URL vers hôte privé ou métadonnées bloqué (Anti-SSRF)');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          redirect: 'error',
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
          const ticker = SymbolMapper.resolve(symbol);
          const canonicalName = SymbolMapper.getCanonicalName(symbol);

          allStocks.push({
            symbol,
            ticker,
            name: canonicalName,
            bmceId: SymbolMapper.getBmceId(symbol) || undefined,
            sector: SymbolMapper.getSector(ticker || symbol, canonicalName),
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

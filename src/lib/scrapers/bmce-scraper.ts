import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../supabase-server';
import { InputSanitizer } from '../input-sanitizer';
import { SymbolMapper } from '../symbol-mapper';
import { MarketListScraper } from './market-list-scraper';

export interface ScrapedStockData {
  price: string;
  variation: string;
  volume: string;
  timestamp: string;
  status: 'success' | 'error';
  error?: string;
  resolvedName?: string;
}

export interface FundamentalData {
  peRatio: string;
  dividendYield: string;
  marketCap: string;
  netProfit?: string;
  roe?: string;
  status: 'success' | 'error';
}

// Headers HTTP communs pour simuler un navigateur standard
const HTTP_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * BMCE Capital Bourse Scraper
 * ⚡ Migration Playwright → Fetch + Cheerio (HTTP pur)
 * 
 * Avantages :
 * - Zéro dépendance binaire (pas de Chromium)
 * - ~0.5s par requête (vs 10-30s avec Playwright)
 * - ~5 MB RAM (vs 150-300 MB par instance Chromium)
 * - Pas de risque OOM en production
 */
export class BMCEBourseScraper {

  /**
   * Résout une société via Supabase + fallback dynamique (SymbolMapper & MarketListScraper pour les nouvelles IPO)
   */
  public static async resolveStock(input: string): Promise<{ id: string, name: string, uuid: string, symbol: string } | null> {
    const query = InputSanitizer.sanitizePostgrestFilter(input);
    if (!query) return null;

    const resolvedSym = InputSanitizer.sanitizePostgrestFilter(SymbolMapper.resolve(input));
    const canonicalName = InputSanitizer.sanitizePostgrestFilter(SymbolMapper.getCanonicalName(input));

    try {
      const orClauses = new Set<string>([
        `symbol.eq.${query}`,
        `name.ilike.%${query}%`,
        `symbol.ilike.%${query}%`,
      ]);
      if (resolvedSym && resolvedSym !== query) {
        orClauses.add(`symbol.eq.${resolvedSym}`);
        orClauses.add(`name.ilike.%${resolvedSym}%`);
      }
      if (canonicalName && canonicalName !== query) {
        orClauses.add(`name.ilike.%${canonicalName}%`);
      }

      // 1. Recherche dans la table `companies`
      const { data: companies, error } = await supabaseAdmin
        .from('companies')
        .select('id, name, symbol, bmce_id')
        .or(Array.from(orClauses).join(','));

      if (error) {
        console.error('[resolveStock] Supabase error:', error.message);
      }

      // Trouver la meilleure correspondance avec un bmce_id valide
      const match = companies?.find((c: { bmce_id: string | null }) => c.bmce_id && !c.bmce_id.includes(','));
      const fallback = companies?.find((c: { bmce_id: string | null }) => c.bmce_id);
      const companyWithId = match || fallback;

      if (companyWithId && companyWithId.bmce_id) {
        const cleanId = companyWithId.bmce_id.split(',')[0].trim();
        console.log(`[resolveStock] Résolu: "${input}" → ${companyWithId.name} (ID: ${cleanId}, Symbol: ${companyWithId.symbol})`);
        return { id: cleanId, name: companyWithId.name, uuid: companyWithId.id, symbol: companyWithId.symbol };
      }

      // 2. Fallback IPO / bmce_id manquant : résoudre via SymbolMapper ou MarketListScraper en direct
      let discoveredBmceId = SymbolMapper.getBmceId(input);
      let liveMatch = null;

      if (!discoveredBmceId) {
        liveMatch = await MarketListScraper.getLiveStock(input);
        if (liveMatch) {
          discoveredBmceId = liveMatch.bmceId || SymbolMapper.getBmceId(liveMatch.symbol) || null;
        }
      }

      const existingWithoutBmceId = companies?.[0];

      if (discoveredBmceId) {
        const cleanId = discoveredBmceId.split(',')[0].trim();

        // Cas 2A : La société existe déjà dans `companies` mais n'avait pas encore son `bmce_id` (ex: SGTM)
        if (existingWithoutBmceId) {
          await supabaseAdmin
            .from('companies')
            .update({ bmce_id: cleanId, updated_at: new Date().toISOString() })
            .eq('id', existingWithoutBmceId.id);

          console.log(`[resolveStock] 🔄 bmce_id auto-complété pour ${existingWithoutBmceId.symbol}: ${cleanId}`);
          return {
            id: cleanId,
            name: existingWithoutBmceId.name,
            uuid: existingWithoutBmceId.id,
            symbol: existingWithoutBmceId.symbol,
          };
        }

        // Cas 2B : Nouvelle introduction (IPO) pas encore enregistrée dans `companies`
        const newSymbol = (resolvedSym || liveMatch?.ticker || query).toUpperCase();
        const newName = (liveMatch?.name || canonicalName || liveMatch?.symbol || query).toUpperCase();
        const newSector = SymbolMapper.getSector(newSymbol, newName);

        const { data: inserted } = await supabaseAdmin
          .from('companies')
          .upsert(
            {
              symbol: newSymbol,
              name: newName,
              bmce_id: cleanId,
              sector: newSector,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'symbol' }
          )
          .select('id, name, symbol')
          .maybeSingle();

        console.log(`[resolveStock] 🆕 Nouvelle valeur / IPO auto-enregistrée: ${newSymbol} (${newName}, ID: ${cleanId})`);
        return {
          id: cleanId,
          name: inserted?.name || newName,
          uuid: inserted?.id || '',
          symbol: inserted?.symbol || newSymbol,
        };
      }

      console.warn(`[resolveStock] Aucune correspondance pour "${input}"`);
      return null;
    } catch (e: any) {
      console.error('[resolveStock] Exception:', e.message);
      return null;
    }
  }

  /**
   * Construit l'URL BMCE à partir d'un ID numérique
   */
  private static buildUrl(bmceId: string, tab?: string): string {
    const base = `https://www.bmcecapitalbourse.com/bkbbourse/details/${bmceId},102,608`;
    return tab ? `${base}#${tab}` : base;
  }

  /**
   * Fetch HTTP générique avec gestion d'erreurs
   */
  private static async fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
    try {
      const response = await fetch(url, { 
        headers: HTTP_HEADERS,
        signal: AbortSignal.timeout(15000) // 15s timeout
      });
      
      if (!response.ok) {
        console.error(`[BMCE HTTP] Erreur ${response.status} pour ${url}`);
        return null;
      }
      
      const html = await response.text();
      return cheerio.load(html);
    } catch (e: any) {
      console.error(`[BMCE HTTP] Fetch échoué pour ${url}:`, e.message);
      return null;
    }
  }

  /**
   * Récupère le cours actuel (via HTTP + Cheerio)
   */
  static async getStockData(companyName: string): Promise<ScrapedStockData> {
    const resolved = await this.resolveStock(companyName);

    if (!resolved) {
      console.error(`[getStockData] Société non trouvée : ${companyName}`);
      return {
        price: '0.0', variation: '0.0%', volume: '0',
        timestamp: new Date().toISOString(), status: 'error',
        error: `Société non trouvée : ${companyName}`
      };
    }

    const url = this.buildUrl(resolved.id);

    try {
      console.log(`[Scraper] Fetch HTTP pour ${resolved.name} (ID: ${resolved.id})...`);
      const $ = await this.fetchPage(url);
      
      if (!$) {
        return {
          price: '0.0', variation: '0.0%', volume: '0',
          timestamp: new Date().toISOString(), status: 'error',
          error: 'Page BMCE inaccessible',
          resolvedName: resolved.name
        };
      }

      // Extraction des données via sélecteurs CSS
      let price = $('[id^="LVAL_NORM"]').first().text().trim();
      let variation = $('[id^="CHG_PCT_NORM"]').first().text().trim();
      let volume = $('[id^="QTY_NORM"]').first().text().trim();

      // Fallback volume
      if (!volume || volume === '0') {
        $('td, span').each((_, el) => {
          const text = $(el).text();
          if (text.includes('Volume')) {
            const nextEl = $(el).next();
            if (nextEl.length) {
              volume = nextEl.text().trim();
              return false; // break
            }
          }
        });
      }

      // Fallback prix via patterns textuels
      if (!price || price === '--' || price === '0') {
        const body = $('body').text();
        const patterns = [
          /Cours\s*[:\s]*(\d[\d\s]*[.,]\d{1,2})/i,
          /Dernier\s*[:\s]*(\d[\d\s]*[.,]\d{1,2})/i,
          /(\d{2,6}[.,]\d{2})\s*MAD/i,
        ];
        for (const pat of patterns) {
          const m = body.match(pat);
          if (m) { price = m[1]; break; }
        }
      }

      console.log(`[Scraper] Données brutes:`, JSON.stringify({ price, variation, volume }));

      const cleanNum = (val: string) => (val || '0').replace(/[\s\u00A0\u202F]/g, '').replace(',', '.').trim();

      const result: ScrapedStockData = {
        price: cleanNum(price),
        variation: (variation || '0.0%').trim(),
        volume: cleanNum(volume),
        timestamp: new Date().toISOString(),
        status: price && price !== '--' && price !== '' ? 'success' : 'error',
        resolvedName: resolved.name
      };

      if (result.status === 'success') {
        console.log(`[Scraper] ✅ Succès: ${result.price} MAD`);
        // Sauvegarder en base (fire and forget)
        supabaseAdmin.from('market_history').insert({
          company_id: resolved.uuid,
          price: parseFloat(result.price),
          variation: result.variation,
          volume: parseInt(result.volume) || 0
        }).then(({ error }: any) => {
          if (error) console.error('[Scraper] Insert market_history error:', error.message);
        });
      } else {
        console.error(`[Scraper] ❌ Extraction échouée. Données brutes: ${JSON.stringify({ price, variation, volume })}`);
      }

      return result;

    } catch (error: any) {
      console.error(`[Scraper] Exception:`, error.message);
      return {
        price: '0.0', variation: '0.0%', volume: '0',
        timestamp: new Date().toISOString(), status: 'error',
        error: error.message,
        resolvedName: resolved.name
      };
    }
  }

  /**
   * Récupère l'historique des cours (14-30 derniers jours) via HTTP
   */
  static async getStockHistory(companyName: string): Promise<number[]> {
    const resolved = await this.resolveStock(companyName);
    if (!resolved) return [];

    const url = this.buildUrl(resolved.id, 'Tab2');

    try {
      console.log(`[History] Fetch HTTP pour ${resolved.name}...`);
      const $ = await this.fetchPage(url);
      
      if (!$) return [];

      // Extraction du tableau historique
      const history: number[] = [];
      $('table tr').slice(1, 40).each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        
        // Index 1 est le cours de clôture ('Dernier'), Index 2 est la variation
        const text = $(cells[1]).text().trim();
        const cleaned = text.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        
        if (num > 1) {
          history.push(num);
        }
      });

      console.log(`[History] ${history.length} points extraits pour ${resolved.name}`);
      return history.reverse(); // Du plus ancien au plus récent

    } catch (error: any) {
      console.error(`[History] Erreur:`, error.message);
      return [];
    }
  }

  /**
   * Récupère les actualités BMCE via HTTP
   */
  static async getStockNews(companyName: string): Promise<any[]> {
    const resolved = await this.resolveStock(companyName);
    if (!resolved) return [];

    const url = this.buildUrl(resolved.id, 'Tab4');

    try {
      const $ = await this.fetchPage(url);
      if (!$) return [];

      const newsList: any[] = [];
      
      // Chercher dans Tab4 ou dans les éléments d'actualités
      const newsElements = $('#Tab4 tr, .news-item, article');
      
      newsElements.each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 15) {
          // Tentative d'extraction de date (Format DD/MM/YYYY)
          const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
          const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('fr-FR');
          
          newsList.push({
            id: 'bmce-' + i,
            summary: text.replace(date, '').substring(0, 300).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
            date: date,
            source: 'BMCE Capital'
          });
        }
      });
      
      return newsList.slice(0, 5);

    } catch (error) {
      return [];
    }
  }

  /**
   * Récupère les données fondamentales via HTTP (une seule requête, sans faux positif DERNIER -> RN)
   */
  static async getFundamentalData(companyName: string): Promise<FundamentalData> {
    const resolved = await this.resolveStock(companyName);
    if (!resolved) return { peRatio: 'N/A', dividendYield: 'N/A', marketCap: 'N/A', status: 'error' };

    const results: any = { peRatio: 'N/A', dividendYield: 'N/A', marketCap: 'N/A', netProfit: 'N/A', roe: 'N/A' };

    try {
      const url = this.buildUrl(resolved.id);
      console.log(`[Fundamental] Fetch HTTP BMCE: ${url}`);
      const $ = await this.fetchPage(url);

      if ($) {
        $('td, th, span, div.label').each((_, el) => {
          const key = $(el).text().trim();
          const nextEl = $(el).next();
          const parentLast = $(el).parent().children().last();
          const val = (nextEl.length ? nextEl.text().trim() : parentLast.text().trim()) || '';
          if (!val || val === '--' || val === '-') return;

          if (/capitalisation/i.test(key)) results.marketCap = val;
          if (/(rendement|dividende)/i.test(key)) results.dividendYield = val;
          if (/^(r[ée]sultat\s*net|rnpg|r\.n\.p\.g)/i.test(key)) results.netProfit = val;
        });

        $('table tr').each((_, row) => {
          const cells = $(row).find('td, th');
          if (cells.length >= 2) {
            const label = $(cells[0]).text().trim();
            const value = $(cells[cells.length - 1]).text().trim() || $(cells[1]).text().trim() || 'N/A';
            if (!value || value === '--' || value === '-') return;

            if (/\bP\.?E\.?R\b/i.test(label)) results.peRatio = value;
            if (/\bR\.?O\.?E\b/i.test(label)) results.roe = value;
          }
        });
      }

      const hasAnyData = Object.values(results).some((v) => typeof v === 'string' && v !== 'N/A' && v.trim() !== '');
      console.log(`[Fundamental] Données BMCE pour ${resolved.name} (${hasAnyData ? 'OK' : 'vide'}):`, JSON.stringify(results));
      return { ...results, status: hasAnyData ? 'success' : 'error' };

    } catch (error: any) {
      console.error(`[Fundamental] Erreur:`, error.message);
      return { peRatio: 'N/A', dividendYield: 'N/A', marketCap: 'N/A', status: 'error' };
    }
  }

}

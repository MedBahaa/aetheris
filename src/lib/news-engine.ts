import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { InputSanitizer } from './input-sanitizer';


export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  fullContent?: string; // Ajouté par l'audit : Contenu scrapé en profondeur
  corroboratingSourcesCount?: number;
}

export enum SourceType {
  OFFICIAL = 'OFFICIAL',     // AMMC, Communiqués
  SPECIALIZED = 'SPECIALIZED', // Médias24 (Le Boursier), BMCE
  GENERAL = 'GENERAL'        // Google News, Presse généraliste
}

/**
 * Classifie la source d'un article selon sa hiérarchie institutionnelle BVC.
 */
export function classifyNewsSourceType(source: string, link: string = ''): SourceType {
  const s = (source || '').toLowerCase();
  const l = (link || '').toLowerCase();
  if (s.includes('ammc') || s.includes('bvc') || l.includes('ammc.ma') || l.includes('casablanca-bourse.com')) {
    return SourceType.OFFICIAL;
  }
  if (
    s.includes('médias24') ||
    s.includes('medias24') ||
    s.includes('bourse news') ||
    s.includes('challenge') ||
    l.includes('boursenews.ma') ||
    l.includes('challenge.ma')
  ) {
    return SourceType.SPECIALIZED;
  }
  return SourceType.GENERAL;
}

const ALLOWED_DEEP_SCRAPE_HOSTS = new Set([
  'ammc.ma',
  'www.ammc.ma',
  'medias24.com',
  'www.medias24.com',
  'boursenews.ma',
  'www.boursenews.ma',
  'challenge.ma',
  'www.challenge.ma',
  'fr.hespress.com',
]);

function getValidatedDeepScrapeUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== '443') return null;
    if (!ALLOWED_DEEP_SCRAPE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed;
  } catch {
    return null;
  }
}

const FEEDS = [
  { name: 'AMMC Officiel', url: 'https://www.ammc.ma/fr/rss.xml', type: SourceType.OFFICIAL },
  { name: 'Médias24 Actualités', url: 'https://medias24.com/feed/', type: SourceType.SPECIALIZED },
  { name: 'Hespress Économie', url: 'https://fr.hespress.com/feed/', type: SourceType.GENERAL },
  { name: 'Challenge.ma', url: 'https://www.challenge.ma/feed/', type: SourceType.SPECIALIZED },
  { name: 'Google News Bourse', url: 'https://news.google.com/rss/search?q=Bourse+de+Casablanca+OR+Morocco+Stock+Exchange&hl=fr-MA&gl=MA&ceid=MA:fr', type: SourceType.GENERAL }
];

/**
 * Alias / Noms alternatifs pour les sociétés cotées à la Bourse de Casablanca.
 * Permet de matcher "IAM" quand on cherche "MAROC TELECOM" et inversement.
 */
const COMPANY_ALIASES: Record<string, string[]> = {
  'MAROC TELECOM': ['IAM', 'ITISSALAT', 'ITISSALAT AL-MAGHRIB', 'ITISSALAT AL MAGHRIB'],
  'IAM': ['MAROC TELECOM', 'ITISSALAT', 'ITISSALAT AL-MAGHRIB'],
  'ATTIJARIWAFA BANK': ['ATW', 'ATTIJARI', 'ATTIJARIWAFA'],
  'ATTIJARIWAFA': ['ATW', 'ATTIJARI', 'ATTIJARIWAFA BANK'],
  'BANK OF AFRICA': ['BOA', 'BMCE', 'BMCE BANK'],
  'BCP': ['BANQUE POPULAIRE', 'BANQUE CENTRALE POPULAIRE'],
  'BANQUE POPULAIRE': ['BCP', 'BANQUE CENTRALE POPULAIRE'],
  'LABEL VIE': ['LBV', 'LABEL\'VIE', 'LABELVIE'],
  'MARSA MAROC': ['MSA', 'SODEP'],
  'MARSA MAROC (SODEP)': ['MSA', 'MARSA MAROC', 'SODEP'],
  'ATLANTASANAD': ['ATH'],
  'SANLAM MAROC': ['SAH', 'SANLAM', 'SAHAM'],
  'CFG BANK': ['CFG'],
  'CASH PLUS': ['CAP'],
  'VICENNE': ['VCN'],
  'CMGP GROUP': ['CMG', 'CMGP'],
  'COSUMAR': ['CSR'],
  'LAFARGEHOLCIM': ['LHM', 'LAFARGE', 'HOLCIM', 'LAFARGEHOLCIM MAROC'],
  'TAQA MOROCCO': ['TAQA', 'TQM'],
  'TQM': ['TAQA MOROCCO', 'TAQA'],
  'TOTAL ENERGIES': ['TEN', 'TOTAL MAROC', 'TOTALENERGIES', 'TMA'],
  'TMA': ['TOTAL ENERGIES', 'TOTAL MAROC', 'TOTALENERGIES'],
  'CIMENTS DU MAROC': ['CMA', 'CIMAR'],
  'AKDITAL': ['AKT'],
  'ALLIANCES': ['ADI', 'ALLIANCES DARNA'],
  'ADDOHA': ['ADH'],
  'HPS': ['HPS'],
  'MANAGEM': ['MNG'],
  'SAHAM ASSURANCE': ['SAH', 'SAHAM'],
  'WAFA ASSURANCE': ['WAA'],
  'AUTO HALL': ['AUH'],
  'AUTO NEJMA': ['NEJ', 'AUTONEJMA'],
  'SONASID': ['SID'],
  'AFRIQUIA GAZ': ['AFI', 'AFG', 'AFRIQUIA'],
  'DELTA HOLDING': ['DHO', 'DELTA'],
  'CIH BANK': ['CIH'],
  'CDM': ['CREDIT DU MAROC'],
  'CREDIT DU MAROC': ['CDM'],
  'SNEP': ['SNEP'],
  'TGCC': ['TGCC', 'TGC'],
  'TGC': ['TGCC', 'TGCC'],
  'SGTM': ['GTM', 'SOCIETE GENERALE DES TRAVAUX DU MAROC'],
  'GTM': ['SGTM', 'SOCIETE GENERALE DES TRAVAUX DU MAROC'],
  'SANLAM': ['SAN', 'SANLAM MAROC'],
  'DISWAY': ['DWY'],
  'MICRODATA': ['MIC'],
  'INVOLYS': ['INV'],
  'M2M GROUP': ['M2M'],
  'MUTANDIS': ['MUT'],
  'LESIEUR CRISTAL': ['LES', 'LESIEUR'],
  'CENTRALE DANONE': ['CDN', 'DANONE', 'CENTRALE LAITIERE'],
  'ENNAKL': ['ENK'],
  'SBM': ['SBM', 'SOCIETE DES BOISSONS'],
  'MAGHREBAIL': ['MAB'],
  'AGMA': ['AGMA', 'AGMA LAHLOU-TAZI'],
  'ZELLIDJA': ['ZDJ'],
  'SMI': ['SMI', 'SOCIETE METALLURGIQUE'],
  'COLORADO': ['COL'],
  'JET CONTRACTORS': ['JET'],
  'RISMA': ['RIS'],
  'MINIERE TOUISSIT': ['CMT'],
  'SOTHEMA': ['SOT'],
  'PROMOPHARM': ['PRO'],
  'LYDEC': ['LYD'],
};

export class NewsEngine {
  private parser: Parser;
  private lastCollectionMetrics = { successCount: 0, totalFeeds: 0 };

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['content', 'description']
      },
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
  }

  /**
   * Retourne les métriques de la dernière collecte RSS
   */
  getLastCollectionMetrics() {
    return { ...this.lastCollectionMetrics };
  }

  /**
   * Génère les termes de recherche pour une société : nom complet (sans parenthèses) + aliases connus
   */
  private getSearchTerms(companyName: string): { exact: string[]; aliases: string[] } {
    const raw = companyName.toUpperCase().trim();
    const baseName = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    const parenMatches = Array.from(raw.matchAll(/\(([^)]+)\)/g)).map(m => m[1].trim()).filter(Boolean);

    const exact = Array.from(new Set([baseName || raw, raw].filter(Boolean)));
    const aliasSet = new Set<string>(parenMatches);

    for (const candidate of [raw, baseName]) {
      if (candidate && COMPANY_ALIASES[candidate]) {
        COMPANY_ALIASES[candidate].forEach(a => aliasSet.add(a));
      }
    }

    for (const [mainName, aliasList] of Object.entries(COMPANY_ALIASES)) {
      if (
        aliasList.some(a => a.toUpperCase() === raw || a.toUpperCase() === baseName) &&
        !exact.includes(mainName)
      ) {
        aliasSet.add(mainName);
      }
    }

    const aliases = Array.from(aliasSet).filter(a => !exact.includes(a));
    return { exact, aliases };
  }

  /**
   * Récupère les actualités triées et dédoublonnées avec les métriques exactes de collecte (thread-safe).
   */
  async getNewsWithMetrics(companyName: string): Promise<{
    articles: NewsArticle[];
    metrics: { successCount: number; totalFeeds: number };
  }> {
    const articles: NewsArticle[] = [];
    const { exact, aliases } = this.getSearchTerms(companyName);
    
    // Tous les termes de recherche (nom complet + aliases), normalisés en lowercase
    const allTerms = [...exact, ...aliases].map(t => t.toLowerCase());
    
    console.log(`[NewsEngine] Recherche pour "${companyName}" avec termes: [${allTerms.join(', ')}]`);

    // Single ciblée boolean query on Google News to avoid multiple parallel requests
    const queryTerms = Array.from(new Set([exact[0], ...aliases]));
    const termsGroup = queryTerms.map(t => `"${t}"`).join(' OR ');
    const queryStr = `(${termsGroup}) AND (Bourse OR Casablanca OR Maroc OR Action OR "résultats" OR "dividende")`;
    
    const companyFeeds = [
      {
        name: 'Google News',
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(queryStr)}&hl=fr-MA&gl=MA&ceid=MA:fr`
      },
      {
        name: 'AMMC & BVC Communiqués',
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(`(${termsGroup}) AND (site:ammc.ma OR site:casablanca-bourse.com OR "communiqué" OR "avis" OR "franchissement")`)}&hl=fr-MA&gl=MA&ceid=MA:fr`
      }
    ];
    
    const allFeeds = [...FEEDS, ...companyFeeds];

    const results = await Promise.allSettled(
      allFeeds.map(async feed => {
        try {
          const FEED_TIMEOUT = 8000;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout ${FEED_TIMEOUT}ms`)), FEED_TIMEOUT)
          );
          const content = await Promise.race([
            this.parser.parseURL(feed.url),
            timeoutPromise
          ]);
          const items = content.items.map(item => {
            let actualTitle = item.title || '';
            let actualSource = feed.name;

            if (feed.name.includes('Google News') && actualTitle.includes(' - ')) {
              const parts = actualTitle.split(' - ');
              if (parts.length > 1) {
                actualSource = parts.pop()?.trim() || feed.name;
                actualTitle = parts.join(' - ').trim();
              }
            }

            return {
              title: actualTitle,
              link: item.link || '',
              pubDate: item.pubDate || '',
              contentSnippet: item.contentSnippet || '',
              source: actualSource
            };
          });
          return { ok: true, items };
        } catch (e) {
          console.warn(`[NewsEngine] ⚠️ Feed "${feed.name}" échoué: ${(e as Error).message?.substring(0, 60)}`);
          return { ok: false, items: [] as NewsArticle[] };
        }
      })
    );

    results.forEach(res => {
      if (res.status === 'fulfilled') {
        articles.push(...res.value.items);
      }
    });

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    const metrics = {
      successCount,
      totalFeeds: allFeeds.length,
    };
    this.lastCollectionMetrics = metrics;

    // FILTRAGE STRICT par nom de société + bouclier anti-injection indirecte de prompt (OWASP LLM01)
    const filtered = articles.filter(article => {
      if (article.link && !InputSanitizer.sanitizeHttpUrl(article.link)) {
        return false;
      }
      const rawCombined = `${article.title} ${article.contentSnippet}`;
      if (InputSanitizer.detectInjection(rawCombined)) {
        console.warn(`[NewsEngine] 🛡️ Article RSS suspect bloqué (Prompt Injection détectée): ${article.title.slice(0, 60)}`);
        return false;
      }

      const fullText = rawCombined.toLowerCase();
      
      for (const term of allTerms) {
        if (term.length <= 4) {
          const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
          if (regex.test(fullText)) return true;
        } else {
          if (fullText.includes(term)) return true;
        }
      }
      
      return false;
    });

    console.log(`[NewsEngine] ${articles.length} articles totaux → ${filtered.length} pertinents pour "${companyName}"`);

    // 1. Trier par date décroissante AVANT tout découpage
    const toTs = (d: string) => {
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const sorted = [...filtered].sort((a, b) => toTs(b.pubDate) - toTs(a.pubDate));

    // 2. Dédoublonner par similarité de Jaccard AVANT le scraping profond
    const uniqueTop = this.deduplicateArticles(sorted).slice(0, 15);

    // 3. Scraping profond uniquement sur les 5 plus récents (tout en conservant jusqu'à 15 articles uniques)
    const enrichedTop5 = await Promise.all(
      uniqueTop.slice(0, 5).map(async (article) => {
        const sourceType = classifyNewsSourceType(article.source, article.link);
        if (sourceType !== SourceType.GENERAL) {
          const fullContent = await this.fetchFullContent(article.link, sourceType);
          if (fullContent) {
            console.log(`[NewsEngine] 🧬 Contenu enrichi pour: ${article.title.substring(0, 30)}... (${fullContent.length} chars)`);
            return { ...article, fullContent };
          }
        }
        return article;
      })
    );

    return {
      articles: [...enrichedTop5, ...uniqueTop.slice(5)],
      metrics,
    };
  }

  /**
   * Récupère et filtre les actualités pour une société donnée
   * FILTRAGE STRICT : exige le nom complet de la société ou un alias connu
   */
  async getNewsForCompany(companyName: string): Promise<NewsArticle[]> {
    const { articles } = await this.getNewsWithMetrics(companyName);
    return articles;
  }

  /**
   * Scrape le contenu complet d'un article selon sa source (Durci contre les attaques SSRF)
   */
  private async fetchFullContent(url: string, sourceType: SourceType): Promise<string | null> {
    const safeUrl = getValidatedDeepScrapeUrl(url);
    if (!safeUrl) {
      return null;
    }

    try {
      const response = await axios.get(safeUrl.toString(), {
        timeout: 5000,
        maxRedirects: 2,
        maxContentLength: 1_000_000, // 1 Mo max (anti-DoS mémoire)
        maxBodyLength: 1_000_000,
        validateStatus: (status) => status >= 200 && status < 300,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      // Vérifier l'URL finale après redirection éventuelle (anti-SSRF via Open Redirect)
      const finalUrl: string | undefined = response.request?.res?.responseUrl;
      if (finalUrl && !getValidatedDeepScrapeUrl(finalUrl)) {
        console.warn(`[NewsEngine] Redirection bloquée hors liste blanche : ${finalUrl}`);
        return null;
      }

      if (typeof response.data !== 'string') {
        return null;
      }

      const $ = cheerio.load(response.data);
      let content = '';

      if (sourceType === SourceType.SPECIALIZED) {
        // Sélecteurs Medias24 / Le Boursier / Challenge.ma
        content = $('.entry-content p, .td-post-content p').map((_, el) => $(el).text()).get().join('\n');
        if (!content.trim()) {
          content = $('article p').map((_, el) => $(el).text()).get().join('\n');
        }
      } else if (sourceType === SourceType.OFFICIAL) {
        // Sélecteurs AMMC
        content = $('.field-name-body .field-item, .node-content p').map((_, el) => $(el).text()).get().join('\n');
      }

      // Cas spécifique Bourse News
      if (safeUrl.hostname === 'boursenews.ma' || safeUrl.hostname === 'www.boursenews.ma') {
        content = $('.corps-article p, .corps-article').map((_, el) => $(el).text()).get().join('\n');
      }

      return content.trim().length > 100 ? content.trim().substring(0, 8000) : null;
    } catch {
      // Échec silencieux du scraping profond, on garde le snippet RSS
      return null;
    }
  }

  /**
   * Échappe les caractères spéciaux pour utilisation dans RegExp
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calcule la similarité de Jaccard entre deux chaînes de caractères (mots uniques)
   */
  private getJaccardSimilarity(str1: string, str2: string): number {
    const cleanWords = (s: string) => s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // Exclure les mots trop courts comme "le", "de", "la"

    const set1 = new Set(cleanWords(str1));
    const set2 = new Set(cleanWords(str2));

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private getSourcePriority(source: string, link: string): number {
    const type = classifyNewsSourceType(source, link);
    return type === SourceType.OFFICIAL ? 3 : type === SourceType.SPECIALIZED ? 2 : 1;
  }

  /**
   * Dédoublonnage sémantique par clusters Jaccard conservant la source la plus fiable
   */
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const uniqueList: NewsArticle[] = [];

    for (const article of articles) {
      const matchIdx = uniqueList.findIndex(
        inserted => this.getJaccardSimilarity(inserted.title, article.title) > 0.55
      );

      if (matchIdx === -1) {
        uniqueList.push({ ...article, corroboratingSourcesCount: 1 });
      } else {
        const existing = uniqueList[matchIdx];
        const count = (existing.corroboratingSourcesCount || 1) + 1;
        const existingPrio = this.getSourcePriority(existing.source, existing.link);
        const newPrio = this.getSourcePriority(article.source, article.link);
        const existingTs = new Date(existing.pubDate).getTime() || 0;
        const newTs = new Date(article.pubDate).getTime() || 0;

        if (newPrio > existingPrio || (newPrio === existingPrio && newTs > existingTs)) {
          uniqueList[matchIdx] = { ...article, corroboratingSourcesCount: count };
        } else {
          existing.corroboratingSourcesCount = count;
        }
      }
    }

    return uniqueList;
  }
}

export const newsEngine = new NewsEngine();

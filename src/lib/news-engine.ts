import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';


export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  fullContent?: string; // Ajouté par l'audit : Contenu scrapé en profondeur
}

export enum SourceType {
  OFFICIAL = 'OFFICIAL',     // AMMC, Communiqués
  SPECIALIZED = 'SPECIALIZED', // Médias24 (Le Boursier), BMCE
  GENERAL = 'GENERAL'        // Google News, Presse généraliste
}

const FEEDS = [
  { name: 'AMMC Officiel', url: 'https://www.ammc.ma/fr/rss.xml', type: SourceType.OFFICIAL },
  { name: 'Le Boursier (Médias24)', url: 'https://medias24.com/categorie/leboursier/actus/feed/', type: SourceType.SPECIALIZED },
  { name: 'Médias24 Actualités', url: 'https://medias24.com/feed/', type: SourceType.SPECIALIZED },
  { name: 'Le360 Economie', url: 'https://fr.le360.ma/rss/economie/', type: SourceType.GENERAL },
  { name: 'Telquel', url: 'https://telquel.ma/feed/', type: SourceType.GENERAL },
  { name: 'Le Matin', url: 'https://lematin.ma/rss/economie.xml', type: SourceType.GENERAL },
  { name: "L'Observateur", url: 'https://lobservateur.info/?feed=rss2', type: SourceType.GENERAL },
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
  'COSUMAR': ['CSR'],
  'LAFARGEHOLCIM': ['LHM', 'LAFARGE', 'HOLCIM', 'LAFARGEHOLCIM MAROC'],
  'TAQA MOROCCO': ['TAQA'],
  'TOTAL ENERGIES': ['TEN', 'TOTAL MAROC', 'TOTALENERGIES'],
  'CIMENTS DU MAROC': ['CMA', 'CIMAR'],
  'AKDITAL': ['AKT'],
  'ALLIANCES': ['ADI', 'ALLIANCES DARNA'],
  'ADDOHA': ['ADH'],
  'HPS': ['HPS'],
  'MANAGEM': ['MNG'],
  'SAHAM ASSURANCE': ['SAH', 'SAHAM'],
  'WAFA ASSURANCE': ['WAA'],
  'AUTO HALL': ['ATH'],
  'AUTO NEJMA': ['NEJ', 'AUTONEJMA'],
  'SONASID': ['SID'],
  'AFRIQUIA GAZ': ['GAZ', 'AFRIQUIA'],
  'DELTA HOLDING': ['DHO', 'DELTA'],
  'CIH BANK': ['CIH'],
  'CDM': ['CREDIT DU MAROC'],
  'CREDIT DU MAROC': ['CDM'],
  'SNEP': ['SNEP'],
  'TGCC': ['TGCC'],
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
   * Génère les termes de recherche pour une société : nom complet + aliases connus
   * Retourne des termes ordonnés par priorité (nom complet d'abord)
   */
  private getSearchTerms(companyName: string): { exact: string[]; aliases: string[] } {
    const name = companyName.toUpperCase().trim();
    
    // Termes exacts : le nom complet tel quel
    const exact = [name];
    
    // Aliases depuis le dictionnaire
    const aliases: string[] = [];
    
    // Chercher les alias directs
    if (COMPANY_ALIASES[name]) {
      aliases.push(...COMPANY_ALIASES[name]);
    }
    
    // Chercher aussi si le nom est un alias dans une autre entrée
    for (const [mainName, aliasList] of Object.entries(COMPANY_ALIASES)) {
      if (aliasList.some(a => a.toUpperCase() === name) && !exact.includes(mainName)) {
        aliases.push(mainName);
      }
    }
    
    return { exact, aliases };
  }

  /**
   * Récupère et filtre les actualités pour une société donnée
   * FILTRAGE STRICT : exige le nom complet de la société ou un alias connu
   */
  async getNewsForCompany(companyName: string): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const { exact, aliases } = this.getSearchTerms(companyName);
    
    // Tous les termes de recherche (nom complet + aliases), normalisés en lowercase
    const allTerms = [...exact, ...aliases].map(t => t.toLowerCase());
    
    console.log(`[NewsEngine] Recherche pour "${companyName}" avec termes: [${allTerms.join(', ')}]`);

    // Ajouter des feeds Google News CIBLÉS avec nom exact entre guillemets
    const companyFeeds = [
      {
        name: 'Google News',
        url: `https://news.google.com/rss/search?q="${encodeURIComponent(companyName)}"&hl=fr-MA&gl=MA&ceid=MA:fr`
      },
      {
        name: 'Google News Bourse',
        url: `https://news.google.com/rss/search?q="${encodeURIComponent(companyName)}"+Bourse+Casablanca&hl=fr-MA&gl=MA&ceid=MA:fr`
      }
    ];
    
    // Ajouter aussi les alias courts comme feeds spécifiques (ex: "IAM" pour Maroc Telecom)
    for (const alias of aliases) {
      if (alias.length <= 5) {
        companyFeeds.push({
          name: 'Google News',
          url: `https://news.google.com/rss/search?q="${encodeURIComponent(alias)}"+Bourse+Maroc&hl=fr-MA&gl=MA&ceid=MA:fr`
        });
      }
    }
    
    const allFeeds = [...FEEDS, ...companyFeeds];

    const results = await Promise.allSettled(
      allFeeds.map(async feed => {
        try {
          const content = await this.parser.parseURL(feed.url);
          return content.items.map(item => {
            let actualTitle = item.title || '';
            let actualSource = feed.name;

            // Google News ajoute " - Nom du Journal" à la fin de tous les titres.
            if (feed.name.includes('Google News') && actualTitle.includes(' - ')) {
              const parts = actualTitle.split(' - ');
              if (parts.length > 1) {
                // Le vrai journal est la dernière partie
                actualSource = parts.pop()?.trim() || feed.name;
                actualTitle = parts.join(' - ').trim(); // On retire le nom du journal du titre
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
        } catch (e) {
          // Silencieux : les feeds RSS sont souvent instables
          return [];
        }
      })
    );

    results.forEach(res => {
      if (res.status === 'fulfilled') {
        articles.push(...res.value);
      }
    });

    // Tracker les métriques de collecte
    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any[]).length >= 0).length;
    this.lastCollectionMetrics = {
      successCount,
      totalFeeds: allFeeds.length,
    };

    // FILTRAGE STRICT par nom de société
    // On exige que le NOM COMPLET ou un ALIAS CONNU apparaisse dans le titre ou snippet
    const filtered = articles.filter(article => {
      const fullText = (article.title + ' ' + article.contentSnippet).toLowerCase();
      
      // Vérifier le nom complet (ex: "maroc telecom")
      for (const term of allTerms) {
        if (term.length <= 3) {
          // Pour les termes courts (ex: IAM, BCP), exiger une correspondance mot entier
          const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
          if (regex.test(fullText)) return true;
        } else {
          // Pour les termes longs, simple inclusion suffit
          if (fullText.includes(term)) return true;
        }
      }
      
      return false;
    });

    console.log(`[NewsEngine] ${articles.length} articles totaux → ${filtered.length} pertinents pour "${companyName}"`);

    // 2. SCRAPING PROFOND (Optionnel pour les sources critiques)
    // On ne scrape que les 5 articles les plus récents et pertinents pour éviter de ralentir le moteur
    const topArticles = filtered.slice(0, 5);
    const enriched = await Promise.all(
      topArticles.map(async (article) => {
        const sourceType = article.source.includes('AMMC') ? SourceType.OFFICIAL : 
                           (article.source.includes('Médias24') || article.source.includes('Bourse News') || article.link.includes('boursenews.ma')) ? SourceType.SPECIALIZED : SourceType.GENERAL;
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

    // Dédoublonner par titre similaire
    const unique = this.deduplicateArticles(enriched);

    // Tri par date
    return unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 15);
  }

  /**
   * Scrape le contenu complet d'un article selon sa source
   */
  private async fetchFullContent(url: string, sourceType: SourceType): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      let content = '';

      if (sourceType === SourceType.SPECIALIZED) {
        // Sélecteurs Medias24 / Le Boursier
        content = $('.entry-content p, .td-post-content p').map((i, el) => $(el).text()).get().join('\n');
      } else if (sourceType === SourceType.OFFICIAL) {
        // Sélecteurs AMMC
        content = $('.field-name-body .field-item, .node-content p').map((i, el) => $(el).text()).get().join('\n');
      }

      // Cas spécifique Bourse News (même si marqué specialized)
      if (url.includes('boursenews.ma')) {
        content = $('.corps-article p, .corps-article').map((i, el) => $(el).text()).get().join('\n');
      }

      // Nettoyage basique
      return content.trim().length > 100 ? content.trim() : null;
    } catch (e) {
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
   * Dédoublonnage sémantique basique
   */
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen: string[] = [];
    return articles.filter(article => {
      // Normaliser le titre pour la comparaison
      const normalized = article.title.toLowerCase()
        .replace(/[^a-zàâéèêëïîôùûüç0-9\s]/g, '')
        .trim();
      
      // Heuristique : Si les 4 premiers mots sont identiques, c'est probablement un doublon
      const words = normalized.split(/\s+/).slice(0, 5).join(' ');
      
      if (seen.some(s => s === words)) {
        return false;
      }
      
      seen.push(words);
      return true;
    });
  }
}

export const newsEngine = new NewsEngine();

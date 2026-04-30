import { CompanyAnalysis, FundamentalDataSchema, DataSource } from '../schemas';
import { BMCEBourseScraper } from '../scrapers/bmce-scraper';
import { TechnicalEngine } from '../technical-engine';
import { newsEngine } from '../news-engine';
import { GeminiService } from '../gemini';
import { MarketListScraper } from '../scrapers/market-list-scraper';
import { CasabourseScraper } from '../scrapers/casabourse-scraper';
import { OfficialCasaScraper } from '../scrapers/official-casa-scraper';

/**
 * AGENT NEWS: Analyse de sentiment multi-sources
 */
export const NewsWorker = {
  analyze: async (company: string): Promise<Partial<CompanyAnalysis>> => {
    try {
      // 1. Collecte multi-sources (RSS) boostée par les nouveaux headers
      const rssNews = await newsEngine.getNewsForCompany(company);
      
      // Récupérer les métriques de collecte
      const collectionMetrics = newsEngine.getLastCollectionMetrics();
      
      const allNews = rssNews.map(n => ({ 
        ...n, 
        sourceType: (n.source.includes('AMMC')) ? 'OFFICIAL' : 
                    (n.source.includes('Médias24') || n.source.includes('Bourse News') || n.link.includes('boursenews.ma')) ? 'SPECIALIZED' : 'GENERAL' 
      }));

      if (allNews.length > 0) {
        // 2. Analyse Sémantique réelle via Gemini Flash (Structured JSON)
        const sentimentAnalysis = await GeminiService.analyzeNewsSentiment(company, allNews);

        return {
          globalScore: sentimentAnalysis.globalScore,
          globalSentiment: sentimentAnalysis.globalScore > 0.2 ? 'POSITIF' : sentimentAnalysis.globalScore < -0.2 ? 'NEGATIF' : 'NEUTRE',
          probableImpact: sentimentAnalysis.impactSummary,
          consolidatedSummary: sentimentAnalysis.consolidatedSummary,
          collectionStatus: {
            status: collectionMetrics.successCount === collectionMetrics.totalFeeds ? 'FULL' : 'PARTIAL',
            feedsSuccess: collectionMetrics.successCount,
            feedsTotal: collectionMetrics.totalFeeds,
            articlesFound: allNews.length,
          },
          news: allNews.map((n, i) => ({
             id: `news-${i}`,
             summary: n.title,
             sentiment: sentimentAnalysis.details[i]?.sentiment || 'NEUTRE',
             impact: sentimentAnalysis.details[i]?.impact || 'Court terme',
             explanation: sentimentAnalysis.details[i]?.explanation || 'Analyse en attente.',
             source: n.source,
             date: new Date(n.pubDate).toLocaleDateString('fr-FR'),
             url: n.link,
             fullContent: n.fullContent
          }))
        };
      }
    } catch (e) {
      console.error("News Worker Error:", e);
    }

    return { 
      globalSentiment: 'NEUTRE', 
      probableImpact: 'Aucun catalyseur majeur détecté.',
      collectionStatus: {
        status: 'FAILED' as const,
        feedsSuccess: 0,
        feedsTotal: 0,
        articlesFound: 0,
      },
      news: [] 
    };
  }
};

/**
 * AGENT MARKET: Indicateurs techniques réels (Optimisé via Marché Live)
 * AUDIT FIX: Ajout filtre liquidité, volume intégré, labels honnêtes
 */
export const MarketWorker = {
  analyze: async (company: string): Promise<Partial<CompanyAnalysis>> => {
    try {
      console.log(`[MarketWorker] Analyse technique pour "${company}"...`);
      
      // 1 & 2. Récupérer le PRIX ACTUEL et l'HISTORIQUE en parallèle (Gain de temps)
      const [liveData, history] = await Promise.all([
        MarketListScraper.getLiveStock(company),
        BMCEBourseScraper.getStockHistory(company)
      ]);

      console.log(`[MarketWorker] Live data match for "${company}": ${liveData ? 'OUI (' + liveData.symbol + ')' : 'NON (N/A)'}`);
      
      const currentPrice = liveData ? parseFloat(liveData.price.replace(',', '.').replace(/\s/g, '')) : 0;
      
      // AUDIT FIX: Circuit breaker — Vérifier la validité du prix
      if (currentPrice <= 0 && history.length === 0) {
        console.error(`[MarketWorker] ❌ CIRCUIT BREAKER: Aucune donnée de prix pour "${company}". Abandon.`);
        return { 
          price: 'INDISPONIBLE', 
          marketSituation: `⚠️ Données de prix indisponibles pour ${company}. Aucun calcul technique possible.`,
          signals: ['❌ Prix indisponible — Analyse technique impossible']
        };
      }

      const prices = [...history];
      if (currentPrice > 0 && !prices.some(p => Math.abs(p - currentPrice) < 0.01)) {
        prices.push(currentPrice);
      }

      // AUDIT FIX: Validation croisée des prix (Live vs Historique)
      // Détecte les anomalies de scraping (ex: variation prise comme prix)
      let priceDiscrepancy: string | undefined;
      if (currentPrice > 0 && history.length > 0) {
        const lastHistoryPrice = history[history.length - 1];
        const divergence = Math.abs(currentPrice - lastHistoryPrice) / currentPrice;
        if (divergence > 0.20) {
          priceDiscrepancy = `⚠️ Divergence prix: Live=${currentPrice.toFixed(2)} vs Historique=${lastHistoryPrice.toFixed(2)} (${(divergence * 100).toFixed(0)}%). Vérification manuelle recommandée.`;
          console.warn(`[MarketWorker] 🔴 PRICE DISCREPANCY for "${company}": ${priceDiscrepancy}`);
        }
      }

      // AUDIT FIX: Extraire la quantité de titres échangés pour le filtre de liquidité
      const volumeStr = liveData ? liveData.quantity : undefined;
      const volumeNum = volumeStr ? parseInt(volumeStr.replace(/[\s\u00A0]/g, '').replace(',', ''), 10) : undefined;

      // 3. Calcul via le moteur technique (AUDIT FIX: volume passé)
      const tech = TechnicalEngine.calculate(prices, volumeNum);
      
      if (liveData || history.length > 0) {
        const displayPrice = liveData?.price || (history.length > 0 ? history[history.length-1].toString() : '0.0');
        
        // AUDIT FIX: Construire les signaux avec honnêteté sur les données
        const signals: string[] = [];
        if (tech.support === 'N/A') {
          signals.push(`⚠️ Données historiques insuffisantes (${tech.dataPointsUsed} points)`);
          signals.push(`Calculs techniques dégradés`);
        } else {
          signals.push(`Tendance ${tech.trend}`);
          signals.push(`RSI ${tech.rsi.interpretation}`);
          if (typeof tech.macd.trend === 'string' && !tech.macd.trend.includes('Indéterminé')) {
            signals.push(`MACD ${tech.macd.trend}`);
          } else {
            signals.push(`MACD: données insuffisantes`);
          }
          signals.push(`${tech.smaLabel}`);
          signals.push(`Pivot: ${tech.pivot}`);
        }
        if (liveData) signals.push(`Variation: ${liveData.variation}`);
        if (tech.volumeSignal) signals.push(`Volume: ${tech.volumeSignal}`);
        if (priceDiscrepancy) signals.push(priceDiscrepancy);
        signals.push(`📊 Points de données: ${tech.dataPointsUsed}`);

        // AUDIT FIX: Alerte liquidité
        const liquidityWarning = MarketWorker.checkLiquidity(volumeNum);

        return {
          price: displayPrice,
          marketSituation: tech.support === 'N/A' 
            ? `Historique limité (${tech.dataPointsUsed} pts). Tendance indéterminée. Prix: ${displayPrice} MAD.`
            : `${tech.trend} | RSI: ${tech.rsi.value} (${tech.rsi.interpretation}). MACD: ${tech.macd.trend}. ${tech.smaLabel}`,
          rsi: { value: String(tech.rsi.value), interpretation: tech.rsi.interpretation },
          support: String(tech.support),
          resistance: String(tech.resistance),
          technicalTrend: tech.trend,
          fibonacci: tech.fibonacci,
          variation: liveData?.variation,
          variationValue: liveData?.variationValue,
          sma20: typeof tech.sma20 === 'number' ? tech.sma20 : undefined,
          sma50: typeof tech.sma50 === 'number' ? tech.sma50 : undefined,
          smaLabel: tech.smaLabel,
          pivot: typeof tech.pivot === 'number' ? tech.pivot : undefined,
          macd: (typeof tech.macd.macd === 'number') ? {
            macd: Number(tech.macd.macd) || 0,
            signal: Number(tech.macd.signal) || 0,
            histogram: Number(tech.macd.histogram) || 0,
            trend: tech.macd.trend
          } : undefined,
          signals,
          liquidityWarning,
        };
      }
    } catch (e) {
      console.error("Market Worker Error:", e);
    }
    
    // AUDIT FIX: Message d'erreur clair au lieu de données silencieusement nulles
    return { 
      price: 'INDISPONIBLE', 
      marketSituation: '⚠️ Données indisponibles — Scraping échoué.',
      signals: ['❌ Erreur de récupération des données']
    };
  },

  /**
   * AUDIT FIX: Vérification de la liquidité pour le marché marocain
   * Certaines small caps traitent <100 titres/jour
   */
  checkLiquidity: (volume: number | undefined) => {
    if (volume === undefined) {
      return {
        isLiquid: true, // Défaut optimiste en l'absence de données
        message: 'Volume non disponible — Vérifiez la liquidité manuellement'
      };
    }
    if (volume < 100) {
      return {
        isLiquid: false,
        dailyVolume: volume,
        message: '🔴 ILLIQUIDE — Volume extrêmement faible. Risque élevé de slippage et d\'impossibilité d\'exécution.'
      };
    }
    if (volume < 1000) {
      return {
        isLiquid: false,
        dailyVolume: volume,
        message: '🟡 Liquidité limitée — Volume faible. Ordres à cours limité recommandés.'
      };
    }
    return {
      isLiquid: true,
      dailyVolume: volume,
      message: undefined
    };
  }
};

/**
 * AGENT STRATEGY: Synthèse et décision
 * AUDIT FIX: Ajout du signal VENDRE + logique multi-facteurs
 */
export const StrategyWorker = {
  /**
   * Scoring quantitatif symétrique [-100, +100]
   * Chaque indicateur contribue de manière équilibrée. Élimine le biais haussier structurel.
   */
  synthesize: (news: Partial<CompanyAnalysis>, market: Partial<CompanyAnalysis>): Partial<CompanyAnalysis> => {
    const rsiValue = typeof market.rsi === 'object' ? parseFloat(String(market.rsi.value)) : 50;
    const macdTrend = market.macd?.trend || 'Indéterminé';
    const variation = market.variationValue || 0;
    
    // Circuit breaker — Refuser de décider sur des données manquantes
    if (market.price === 'INDISPONIBLE' || market.price === '0.0') {
      return {
        recommendedAction: 'ATTENDRE',
        confidenceLevel: 'Faible',
        strategyPlan: '⚠️ Analyse impossible — Données de prix indisponibles. Aucune recommandation ne peut être émise.',
        riskExplication: 'Données insuffisantes pour une analyse fiable.'
      };
    }
    
    // ═══════════════════════════════════════════════════
    // SCORING MULTI-FACTEURS SYMÉTRIQUE
    // Chaque facteur : [-25, +25] → Total : [-100, +100]
    // ═══════════════════════════════════════════════════
    let score = 0;
    const factors: string[] = [];

    // 1. SENTIMENT (Poids: 25 pts)
    if (news.globalSentiment === 'POSITIF') {
      const sentimentScore = news.globalScore ? Math.min(25, Math.round(news.globalScore * 25)) : 15;
      score += sentimentScore;
      factors.push(`Sentiment +${sentimentScore} (${news.globalSentiment})`);
    } else if (news.globalSentiment === 'NEGATIF') {
      const sentimentScore = news.globalScore ? Math.max(-25, Math.round(news.globalScore * 25)) : -15;
      score += sentimentScore;
      factors.push(`Sentiment ${sentimentScore} (${news.globalSentiment})`);
    } else {
      factors.push(`Sentiment 0 (NEUTRE)`);
    }

    // 2. RSI (Poids: 25 pts)
    if (rsiValue > 70) {
      const rsiScore = -Math.round(((rsiValue - 70) / 30) * 25);
      score += rsiScore;
      factors.push(`RSI ${rsiScore} (Surachat: ${rsiValue})`);
    } else if (rsiValue < 30) {
      // Survente = potentiel rebond, mais dangereux → score neutre-positif modéré
      const rsiScore = Math.round(((30 - rsiValue) / 30) * 15); // Max +15 (pas +25, car couteau qui tombe)
      score += rsiScore;
      factors.push(`RSI +${rsiScore} (Survente: ${rsiValue}, rebond possible)`);
    } else if (rsiValue > 55) {
      const rsiScore = Math.round(((rsiValue - 50) / 20) * 15);
      score += rsiScore;
      factors.push(`RSI +${rsiScore} (Momentum haussier: ${rsiValue})`);
    } else if (rsiValue < 45) {
      const rsiScore = -Math.round(((50 - rsiValue) / 20) * 15);
      score += rsiScore;
      factors.push(`RSI ${rsiScore} (Momentum baissier: ${rsiValue})`);
    } else {
      factors.push(`RSI 0 (Zone neutre: ${rsiValue})`);
    }

    // 3. MACD (Poids: 25 pts)
    if (macdTrend === 'Haussier') {
      score += 20;
      factors.push(`MACD +20 (Haussier)`);
    } else if (macdTrend === 'Baissier') {
      score -= 20;
      factors.push(`MACD -20 (Baissier)`);
    } else {
      factors.push(`MACD 0 (Indéterminé)`);
    }

    // 4. VARIATION INTRADAY (Poids: 25 pts)
    if (variation > 3) {
      score += Math.min(20, Math.round(variation * 4));
      factors.push(`Variation +${Math.min(20, Math.round(variation * 4))} (+${variation.toFixed(1)}%)`);
    } else if (variation < -3) {
      score += Math.max(-25, Math.round(variation * 5));
      factors.push(`Variation ${Math.max(-25, Math.round(variation * 5))} (${variation.toFixed(1)}%)`);
    } else if (Math.abs(variation) > 0.5) {
      const varScore = Math.round(variation * 3);
      score += varScore;
      factors.push(`Variation ${varScore > 0 ? '+' : ''}${varScore} (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%)`);
    }

    // ═══════════════════════════════════════════════════
    // DÉCISION BASÉE SUR LE SCORE
    // ═══════════════════════════════════════════════════
    const clampedScore = Math.max(-100, Math.min(100, score));
    const absScore = Math.abs(clampedScore);
    const confidence = absScore >= 50 ? 'Élevé' : absScore >= 25 ? 'Moyen' : 'Faible';
    const factorsStr = factors.join(' | ');

    if (clampedScore >= 30) {
      return {
        recommendedAction: 'ACHETER',
        confidenceLevel: confidence,
        strategyPlan: `Signal d'achat quantitatif. Score: +${clampedScore}/100. Facteurs: ${factorsStr}.`,
        idealEntryPoint: `${market.support} - ${market.price}`,
        riskExplication: `Score positif basé sur ${factors.length} indicateurs convergents. Stop loss sous le support recommandé.`
      };
    }

    if (clampedScore <= -30) {
      return {
        recommendedAction: 'VENDRE',
        confidenceLevel: confidence,
        strategyPlan: `Signal de vente quantitatif. Score: ${clampedScore}/100. Facteurs: ${factorsStr}.`,
        idealEntryPoint: 'N/A (Signal de sortie)',
        riskExplication: `Score négatif basé sur ${factors.length} indicateurs convergents. Réduire l'exposition recommandé.`
      };
    }

    // Zone neutre [-30, +30]
    return {
      recommendedAction: 'ATTENDRE',
      confidenceLevel: confidence,
      strategyPlan: `Zone d'observation. Score: ${clampedScore > 0 ? '+' : ''}${clampedScore}/100. Aucun signal directionnel suffisant. Facteurs: ${factorsStr}.`,
      riskExplication: `Momentum insuffisant pour une prise de position. Attendre une convergence plus marquée (seuil ±30).`
    };
  }
};

/**
 * AGENT FUNDAMENTAL: Analyse des ratios et résultats
 * AUDIT FIX: Suppression du fallback IA hallucinatoire + Source tracking
 */
export const FundamentalWorker = {
  analyze: async (company: string, marketPrice?: string, preResolved?: { name: string; symbol: string }): Promise<Partial<CompanyAnalysis>> => {
    try {
      // Utiliser la résolution pré-fournie par l'orchestrateur si disponible (élimine 1-2 appels Supabase)
      let searchName: string;
      let searchSymbol: string;
      
      if (preResolved) {
        searchName = preResolved.name;
        searchSymbol = preResolved.symbol;
        console.log(`[FundamentalWorker] Résolution pré-fournie: ${searchName} (${searchSymbol})`);
      } else {
        const resolved = await BMCEBourseScraper.resolveStock(company);
        searchName = resolved ? resolved.name : company;
        searchSymbol = resolved ? (resolved.symbol || company) : company;
        console.log(`[FundamentalWorker] Résolution DB: ${searchName} | Symbole: ${searchSymbol}`);
      }

      // 2 & 3. Appels parallèles BMCE/Casabourse/OfficialCasa (Ultra-rapide)
      const [bmcePromise, casaPromise, officialPromise] = await Promise.allSettled([
        BMCEBourseScraper.getFundamentalData(searchName),
        CasabourseScraper.getFundamentalData(searchName, searchSymbol),
        OfficialCasaScraper.getFundamentalData(searchSymbol)
      ]);
      
      const bmceData = bmcePromise.status === 'fulfilled' ? bmcePromise.value : { peRatio: 'N/A', dividendYield: 'N/A', marketCap: 'N/A', netProfit: 'N/A', roe: 'N/A', status: 'error' };
      const casaData = casaPromise.status === 'fulfilled' ? casaPromise.value : { peRatio: 'N/A', dividendYield: 'N/A', margin: 'N/A', revenueGrowth: 'N/A', profitGrowth: 'N/A', status: 'error' };
      const officialData = officialPromise.status === 'fulfilled' ? officialPromise.value : { netProfit: 'N/A', roe: 'N/A', status: 'error' };

      
      // AUDIT FIX: Source tracking — tracer l'origine de chaque donnée
      const dataSources: Record<string, DataSource> = {};
      
      const pickBest = (field: string, casaVal: string | undefined, bmceVal: string | undefined, officialVal?: string | undefined): string => {
        // Priorité 1: Source Officielle (Casablanca Bourse) pour ROE et Bénéfice
        if (officialData.status === 'success' && officialVal && officialVal !== 'N/A') {
          dataSources[field] = 'OFFICIAL_CASA';
          return officialVal;
        }
        // Priorité 2: Casabourse.ma (Screener)
        if (casaData.status === 'success' && casaVal && casaVal !== 'N/A') {
          dataSources[field] = 'CASABOURSE';
          return casaVal;
        }
        // Priorité 3: BMCE Capital
        if (bmceVal && bmceVal !== 'N/A') {
          dataSources[field] = 'BMCE';
          return bmceVal;
        }
        dataSources[field] = 'UNKNOWN';
        return 'N/A';
      };

      const fundamentals = {
        peRatio: pickBest('peRatio', casaData.peRatio, bmceData.peRatio),
        dividendYield: pickBest('dividendYield', casaData.dividendYield, bmceData.dividendYield),
        marketCap: pickBest('marketCap', undefined, (bmceData.marketCap && bmceData.marketCap !== 'N/A') ? bmceData.marketCap : undefined),
        netProfit: pickBest('netProfit', undefined, (bmceData.netProfit && bmceData.netProfit !== 'N/A') ? bmceData.netProfit : undefined, officialData.netProfit),
        roe: pickBest('roe', undefined, (bmceData.roe && bmceData.roe !== 'N/A') ? bmceData.roe : undefined, officialData.roe),
        margin: pickBest('margin', casaData.margin, undefined),
        revenueGrowth: pickBest('revenueGrowth', casaData.revenueGrowth, undefined),
        profitGrowth: pickBest('profitGrowth', casaData.profitGrowth, undefined),
        sector: '', // Complété par l'orchestrateur
        dataSources, // AUDIT FIX: Traçabilité
      };


      // AUDIT FIX: Suppression du fallback IA hallucinatoire
      // Les données manquantes restent N/A. C'est honnête.
      const missingFields = Object.entries(fundamentals)
        .filter(([key, val]) => val === 'N/A' && !['sector', 'dataSources'].includes(key))
        .map(([key]) => key);
      
      if (missingFields.length > 0) {
        console.log(`[FundamentalWorker] ℹ️ Données manquantes pour "${searchName}": ${missingFields.join(', ')}. Affichées comme N/A (pas d'estimation IA).`);
      }

      console.log(`[FundamentalWorker] 📊 Synthèse terminée pour ${searchName}. PER: ${fundamentals.peRatio}, ROE: ${fundamentals.roe}, Bénéfice: ${fundamentals.netProfit}`);
      
      // 5. Validation Zod de sortie
      const validatedData = FundamentalDataSchema.safeParse(fundamentals);
      if (!validatedData.success) {
        console.warn("[FundamentalWorker] ⚠️ Validation Zod échouée pour les fondamentaux:", validatedData.error.format());
      }
      
      return { fundamentals: validatedData.success ? validatedData.data : fundamentals };
    } catch (e) {
      console.error("Fundamental Worker Error:", e);
    }

    
    
    return {
      fundamentals: {
        peRatio: 'N/A',
        dividendYield: 'N/A',
        marketCap: 'N/A'
      }
    };
  }
};

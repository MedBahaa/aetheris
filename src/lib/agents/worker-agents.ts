import { CompanyAnalysis, FundamentalDataSchema, DataSource } from '../schemas';
import { BMCEBourseScraper } from '../scrapers/bmce-scraper';
import { supabaseAdmin } from '../supabase-server';
import { TechnicalEngine } from '../technical-engine';
import { newsEngine, classifyNewsSourceType } from '../news-engine';
import { GeminiService } from '../gemini';
import { MarketListScraper } from '../scrapers/market-list-scraper';
import { CasabourseScraper } from '../scrapers/casabourse-scraper';
import { OfficialCasaScraper } from '../scrapers/official-casa-scraper';
import { WafabourseScraper } from '../scrapers/wafabourse-scraper';
import { TradingViewScraper } from '../scrapers/tradingview-scraper';
import { IndexScraper } from '../scrapers/index-scraper';
import { CacheService } from '../cache-service';
import { SymbolMapper } from '../symbol-mapper';

export type NewsEventCategory =
  | 'PROFIT_WARNING'
  | 'M_AND_A'
  | 'CAPITAL_INCREASE'
  | 'DIVIDEND'
  | 'EARNINGS'
  | 'GENERAL';

/**
 * Détecte la catégorie financière BVC d'une dépêche et son multiplicateur d'impact.
 */
export function classifyNewsEvent(
  title: string,
  content?: string
): { category: NewsEventCategory; multiplier: number; label: string } {
  const text = `${title || ''} ${content || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/(avertissement|profit warning|baisse du resultat|recul net|deficit|sanction ammc|perte nette)/.test(text)) {
    return { category: 'PROFIT_WARNING', multiplier: 1.35, label: 'Profit Warning / Alerte Résultats' };
  }
  if (/(acquisition|fusion|\bopa\b|\bopr\b|prise de participation|cession strategique|rachat)/.test(text)) {
    return { category: 'M_AND_A', multiplier: 1.30, label: 'Fusions & Acquisitions (M&A)' };
  }
  if (/(augmentation de capital|emprunt obligataire|emission obligataire|introduction en bourse|\bipo\b)/.test(text)) {
    return { category: 'CAPITAL_INCREASE', multiplier: 1.25, label: 'Opération sur Capital / Dette' };
  }
  if (/(dividende|coupon|distribution exceptionnelle|assemblee generale)/.test(text)) {
    return { category: 'DIVIDEND', multiplier: 1.20, label: 'Dividende & Distribution' };
  }
  if (/(resultats annuels|resultats semestriels|chiffre d'affaires|\brnpg\b|\bebitda\b|indicateurs trimestriels)/.test(text)) {
    return { category: 'EARNINGS', multiplier: 1.20, label: 'Publication Résultats' };
  }
  return { category: 'GENERAL', multiplier: 1.0, label: 'Information Générale' };
}

/**
 * AGENT NEWS: Analyse de sentiment multi-sources
 */
export const NewsWorker = {
  analyze: async (company: string): Promise<Partial<CompanyAnalysis> & { isAI?: boolean }> => {
    try {
      // 1. Collecte multi-sources (RSS) boostée et thread-safe
      const { articles: rssNews, metrics: collectionMetrics } = await newsEngine.getNewsWithMetrics(company);
      
      const allNews = rssNews.map(n => ({ 
        ...n, 
        sourceType: classifyNewsSourceType(n.source, n.link)
      }));

      const totalFeeds = collectionMetrics.totalFeeds;
      const successFeeds = collectionMetrics.successCount;
      const collectionStatusVal =
        totalFeeds === 0 || successFeeds === 0
          ? ('FAILED' as const)
          : successFeeds === totalFeeds
            ? ('FULL' as const)
            : ('PARTIAL' as const);

      if (allNews.length === 0) {
        return {
          globalScore: 0,
          globalSentiment: 'NEUTRE',
          probableImpact: 'Aucun catalyseur majeur détecté.',
          isAI: false,
          collectionStatus: {
            status: collectionStatusVal,
            feedsSuccess: successFeeds,
            feedsTotal: totalFeeds,
            articlesFound: 0,
          },
          news: [],
        };
      }

      // 2. Analyse Sémantique réelle via Gemini (Structured JSON)
      const sentimentAnalysis = await GeminiService.analyzeNewsSentiment(company, allNews);

      // BUG FIX #1: Guard against null/missing details array from AI
      const safeDetails = sentimentAnalysis?.details ?? [];
      const detailById = new Map<string, any>();
      for (const d of safeDetails) {
        if (d && typeof d.articleId === 'string') {
          detailById.set(d.articleId, d);
        }
      }

      const validSentiments = new Set(['FORTEMENT_POSITIF', 'POSITIF', 'NEUTRE', 'NEGATIF', 'FORTEMENT_NEGATIF']);
      const validImpacts = new Set(['Court terme', 'Moyen terme', 'Long terme']);

      const relevantItems: Array<{
        id: string;
        article: (typeof allNews)[number];
        detail: any;
        parsedTs: number;
        event: ReturnType<typeof classifyNewsEvent>;
        corroboratingSourcesCount: number;
      }> = [];

      allNews.forEach((n, i) => {
        const articleId = `art-${i}`;
        const detail = detailById.size > 0 ? detailById.get(articleId) : safeDetails[i];
        if (detail?.relevant === false) return;

        relevantItems.push({
          id: articleId,
          article: n,
          detail,
          parsedTs: new Date(n.pubDate).getTime(),
          event: classifyNewsEvent(n.title, n.fullContent || n.contentSnippet),
          corroboratingSourcesCount: Math.max(1, n.corroboratingSourcesCount || 1),
        });
      });

      // Calcul du Score Global avec Dépréciation Temporelle, corroboration multi-sources et multiplicateur d'événement
      let totalWeight = 0;
      let weightedScoreSum = 0;
      const detectedEventsSet = new Set<string>();

      for (const { article: n, detail, parsedTs, event, corroboratingSourcesCount } of relevantItems) {
        if (event.category !== 'GENERAL') {
          detectedEventsSet.add(event.label);
        }
        if (!detail) continue;

        const ageInDays = Number.isFinite(parsedTs)
          ? Math.max(0, (Date.now() - parsedTs) / (1000 * 60 * 60 * 24))
          : 1;
        const timeDecayWeight = Math.exp(-0.08 * ageInDays); // Demi-vie d'environ 8.6 jours
        const sourceWeight = n.sourceType === 'OFFICIAL' ? 2.0 : n.sourceType === 'SPECIALIZED' ? 1.5 : 1.0;
        const corroborationBoost = Math.min(1.2, 1 + 0.1 * Math.max(0, corroboratingSourcesCount - 1));

        const weight = sourceWeight * timeDecayWeight * event.multiplier * corroborationBoost;
        const rawScore = typeof detail.score === 'number' && Number.isFinite(detail.score) ? detail.score : 0;
        const articleScore = Math.max(-1, Math.min(1, rawScore));

        weightedScoreSum += articleScore * weight;
        totalWeight += weight;
      }

      const rawGlobalScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) : 0;
      const globalScore = Math.max(-1, Math.min(1, rawGlobalScore));

      let globalSentiment: 'FORTEMENT_POSITIF' | 'POSITIF' | 'NEUTRE' | 'NEGATIF' | 'FORTEMENT_NEGATIF' = 'NEUTRE';
      if (globalScore >= 0.6) {
        globalSentiment = 'FORTEMENT_POSITIF';
      } else if (globalScore >= 0.15) {
        globalSentiment = 'POSITIF';
      } else if (globalScore > -0.15) {
        globalSentiment = 'NEUTRE';
      } else if (globalScore >= -0.6) {
        globalSentiment = 'NEGATIF';
      } else {
        globalSentiment = 'FORTEMENT_NEGATIF';
      }

      return {
        globalScore,
        globalSentiment,
        probableImpact: sentimentAnalysis?.impactSummary || 'Analyse indisponible.',
        consolidatedSummary: sentimentAnalysis?.consolidatedSummary || '',
        isAI: Boolean(sentimentAnalysis?.aiAvailable),
        detectedEvents: detectedEventsSet.size > 0 ? Array.from(detectedEventsSet) : undefined,
        collectionStatus: {
          status: collectionStatusVal,
          feedsSuccess: successFeeds,
          feedsTotal: totalFeeds,
          articlesFound: allNews.length,
        },
        news: relevantItems.map(({ id, article: n, detail, parsedTs, event, corroboratingSourcesCount }) => ({
          id,
          summary: n.title,
          sentiment: validSentiments.has(detail?.sentiment) ? detail.sentiment : 'NEUTRE',
          impact: validImpacts.has(detail?.impact) ? detail.impact : 'Court terme',
          explanation: detail?.explanation || 'Analyse en attente.',
          source: n.source,
          date: Number.isFinite(parsedTs) ? new Date(parsedTs).toLocaleDateString('fr-FR') : 'Récent',
          url: n.link,
          fullContent: n.fullContent,
          eventCategory: event.category,
          corroboratingSourcesCount,
        }))
      };
    } catch (e) {
      console.error("News Worker Error:", e);
    }

    return { 
      globalSentiment: 'NEUTRE', 
      probableImpact: 'Aucun catalyseur majeur détecté.',
      isAI: false,
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

function parsePositiveLocaleNum(s?: string | number | null): number | undefined {
  if (typeof s === 'number') return Number.isFinite(s) && s > 0 ? s : undefined;
  if (!s || s === '-' || s === 'N/A' || s.includes('INDISPONIBLE')) return undefined;
  const noSpaces = s.replace(/[\s\u00A0\u202F]/g, '');
  const m = noSpaces.match(/-?[\d.,]+/);
  if (!m) return undefined;
  let token = m[0];
  if (token.includes('.') && token.includes(',')) {
    if (token.lastIndexOf(',') > token.lastIndexOf('.')) {
      token = token.replace(/\./g, '').replace(',', '.');
    } else {
      token = token.replace(/,/g, '');
    }
  } else if (token.includes(',')) {
    token = token.replace(',', '.');
  }
  const n = parseFloat(token);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseSignedMetricPct(raw?: string): number | null {
  if (!raw || raw === 'N/A' || raw === '-') return null;
  const cleaned = raw.replace(/[\s\u00A0\u202F%]/g, '').replace(',', '.');
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const num = parseFloat(m[0]);
  return Number.isFinite(num) ? num : null;
}

export type MarketRegime = 'TRENDING' | 'RANGING' | 'HIGH_VOLATILITY';

/**
 * Identifie le régime technique courant du titre (Tendance, Range ou Haute Volatilité).
 */
export function detectMarketRegime(market: Partial<CompanyAnalysis>): MarketRegime {
  if (market.atr?.atrPercent !== undefined && market.atr.atrPercent > 3.5) {
    return 'HIGH_VOLATILITY';
  }
  const hasTrendMacd = market.macd?.trend === 'Haussier' || market.macd?.trend === 'Baissier';
  if (
    typeof market.sma20 === 'number' &&
    typeof market.sma50 === 'number' &&
    market.sma50 > 0 &&
    Math.abs((market.sma20 - market.sma50) / market.sma50) >= 0.025 &&
    hasTrendMacd
  ) {
    return 'TRENDING';
  }
  return 'RANGING';
}

/**
 * Backtest glissant empirique sur les cours de clôture (TechnicalEngine multi-facteurs).
 */
export function backtestTechnicalSignals(
  closes: number[],
  horizonSessions: number = 5
): CompanyAnalysis['strategyBacktest'] {
  if (!Array.isArray(closes) || closes.length < 35 || horizonSessions < 1) {
    return undefined;
  }

  const maxEnd = closes.length - horizonSessions - 1;
  const effectiveStart = Math.max(20, maxEnd - 39);
  const returns: number[] = [];

  for (let i = effectiveStart; i <= maxEnd; i++) {
    const slice = closes.slice(0, i + 1);
    const sig = TechnicalEngine.calculate(slice);
    const rsiVal = typeof sig.rsi.value === 'number' ? sig.rsi.value : 50;
    let direction = 0;
    if (sig.trend === 'Haussière' && rsiVal < 70) direction = 1;
    else if (sig.trend === 'Baissière' && rsiVal > 30) direction = -1;
    else continue;

    const entry = closes[i];
    const exit = closes[i + horizonSessions];
    if (entry > 0 && exit > 0) {
      returns.push(direction * ((exit - entry) / entry) * 100);
    }
  }

  if (returns.length < 3) return undefined;

  const sampleSize = returns.length;
  const wins = returns.filter((r) => r > 0).length;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / sampleSize;
  const worstLoss = Math.min(0, ...returns);

  return {
    sampleSize,
    winRatePct: Number(((wins / sampleSize) * 100).toFixed(1)),
    avgReturnPct: Number(avgReturn.toFixed(2)),
    maxDrawdownPct: Number(Math.abs(worstLoss).toFixed(2)),
    horizonSessions,
  };
}

/**
 * Score quantitatif de qualité fondamentale (0–100, Grade A–D) adapté aux valeurs BVC.
 */
export function computeFundamentalQualityScore(fundamentals: {
  peRatio?: string;
  dividendYield?: string;
  roe?: string;
  margin?: string;
  revenueGrowth?: string;
  profitGrowth?: string;
  sectorBenchmark?: { medianPe: number | null };
}): { score: number; grade: 'A' | 'B' | 'C' | 'D'; highlights: string[] } {
  let score = 50;
  const highlights: string[] = [];

  const roe = parseSignedMetricPct(fundamentals.roe);
  if (roe !== null) {
    if (roe >= 15) {
      score += 15;
      highlights.push(`ROE élevé (${roe.toFixed(1)}%)`);
    } else if (roe >= 10) {
      score += 8;
      highlights.push(`ROE solide (${roe.toFixed(1)}%)`);
    } else if (roe < 5) {
      score -= 10;
      highlights.push(`Rentabilité des fonds propres faible (${roe.toFixed(1)}%)`);
    }
  }

  const margin = parseSignedMetricPct(fundamentals.margin);
  if (margin !== null) {
    if (margin >= 15) {
      score += 10;
      highlights.push(`Marge robuste (${margin.toFixed(1)}%)`);
    } else if (margin >= 8) {
      score += 5;
    } else if (margin < 0) {
      score -= 12;
      highlights.push(`Marge négative (${margin.toFixed(1)}%)`);
    }
  }

  const pe = parseSignedMetricPct(fundamentals.peRatio);
  if (pe !== null && pe > 0) {
    const sectorMedian = fundamentals.sectorBenchmark?.medianPe;
    if ((sectorMedian && sectorMedian > 0 && pe < sectorMedian) || pe < 15) {
      score += 12;
      highlights.push(`Valorisation attractive (PER ${pe.toFixed(1)}x)`);
    } else if (pe > 28) {
      score -= 10;
      highlights.push(`Multiple PER élevé (${pe.toFixed(1)}x)`);
    }
  }

  const div = parseSignedMetricPct(fundamentals.dividendYield);
  if (div !== null) {
    if (div >= 3.5 && div <= 10) {
      score += 10;
      highlights.push(`Rendement attractif (${div.toFixed(2)}%)`);
    } else if (div > 0) {
      score += 4;
    }
  }

  const revG = parseSignedMetricPct(fundamentals.revenueGrowth);
  if (revG !== null) {
    if (revG > 5) {
      score += 8;
      highlights.push(`Croissance CA (+${revG.toFixed(1)}%)`);
    } else if (revG < -5) {
      score -= 8;
      highlights.push(`Contraction CA (${revG.toFixed(1)}%)`);
    }
  }

  const profG = parseSignedMetricPct(fundamentals.profitGrowth);
  if (profG !== null) {
    if (profG > 5) {
      score += 10;
      highlights.push(`Croissance RN (+${profG.toFixed(1)}%)`);
    } else if (profG < -5) {
      score -= 10;
      highlights.push(`Baisse RN (${profG.toFixed(1)}%)`);
    }
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const grade: 'A' | 'B' | 'C' | 'D' =
    clamped >= 75 ? 'A' : clamped >= 60 ? 'B' : clamped >= 45 ? 'C' : 'D';

  return { score: clamped, grade, highlights };
}

/**
 * AGENT MARKET: Indicateurs techniques réels (Optimisé via Marché Live)
 * AUDIT FIX: Ajout filtre liquidité, volume intégré, labels honnêtes
 */
export const MarketWorker = {
  analyze: async (company: string): Promise<Partial<CompanyAnalysis>> => {
    try {
      console.log(`[MarketWorker] Analyse technique pour "${company}"...`);
      
      // 1 & 2. Récupérer le PRIX ACTUEL, l'HISTORIQUE détaillé et le MASI en parallèle (Gain de temps)
      let [liveData, detailedHistory, masiData] = await Promise.all([
        MarketListScraper.getLiveStock(company),
        WafabourseScraper.getStockHistoryDetailed(company),
        IndexScraper.getMASI().catch(() => null),
      ]);

      let history = detailedHistory.closes;

      // Fallback si l'historique Wafabourse est vide
      if (history.length === 0) {
        console.warn(`[MarketWorker] Historique Wafabourse vide pour ${company}. Fallback sur BMCE...`);
        history = await BMCEBourseScraper.getStockHistory(company);
      } else {
        // ✅ SYNCHRONISATION EN BULK DE L'HISTORIQUE BOURSIER DANS LA DB
        // Élimine le message "Données historiques insuffisantes" du graphique
        try {
          const resolved = await BMCEBourseScraper.resolveStock(company);
          if (resolved && resolved.uuid && supabaseAdmin) {
            // Vérifier s'il y a déjà assez de points historiques dans la DB
            const { count, error: countErr } = await supabaseAdmin
              .from('market_history')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', resolved.uuid);
              
            if (!countErr && (count || 0) < 15) {
              console.log(`[MarketWorker] ⏳ Synchro en cours de l'historique pour ${company} (${detailedHistory.historyPoints.length} points)...`);
              const pointsToInsert = detailedHistory.historyPoints.map(pt => ({
                company_id: resolved.uuid,
                price: pt.price,
                volume: pt.volume ?? null,
                timestamp: pt.timestamp,
                // BUG FIX #4: Use real variation data if available, not hardcoded '0.0%'
                variation: (pt as any).variation ?? '0.0%'
              }));
              
              // BUG FIX #3: Use upsert with conflict on (company_id, timestamp) to prevent
              // duplicate rows on concurrent requests (race condition fix)
              const chunk = pointsToInsert.slice(-120);
              const { error: insertErr } = await supabaseAdmin
                .from('market_history')
                .upsert(chunk, { onConflict: 'company_id,timestamp', ignoreDuplicates: true });
                
              if (insertErr) {
                console.error(`[MarketWorker] Erreur synchro historique db:`, insertErr.message);
              } else {
                console.log(`[MarketWorker] ✅ Synchro réussie de ${chunk.length} points historiques pour ${company}.`);
              }
            }
          }
        } catch (dbErr: any) {
          console.error(`[MarketWorker] Exception synchro historique db:`, dbErr.message);
        }
      }

      console.log(`[MarketWorker] Live data match for "${company}": ${liveData ? 'OUI (' + liveData.symbol + ')' : 'NON (N/A)'}`);

      const currentPrice = parsePositiveLocaleNum(liveData?.price) || 0;
      
      // BUG FIX #5: Circuit breaker amélioré — vérifier les deux cas séparément
      // Si le prix LIVE est absent mais l'historique existe, on continue mais avec avertissement
      if (currentPrice <= 0 && history.length === 0) {
        console.error(`[MarketWorker] ❌ CIRCUIT BREAKER TOTAL: Aucune donnée de prix ni d'historique pour "${company}". Abandon.`);
        return { 
          price: 'INDISPONIBLE', 
          marketSituation: `⚠️ Données de prix indisponibles pour ${company}. Aucun calcul technique possible.`,
          signals: ['❌ Prix indisponible — Analyse technique impossible']
        };
      }
      
      // Avertissement si seulement le prix live est manquant (historique présent)
      if (currentPrice <= 0 && history.length > 0) {
        console.warn(`[MarketWorker] ⚠️ CIRCUIT BREAKER PARTIEL: Prix live indisponible pour "${company}". Analyse basée sur historique uniquement.`);
      }

      const prices = [...history];
      const lastHistoryClose = prices.length > 0 ? prices[prices.length - 1] : null;
      if (currentPrice > 0 && (lastHistoryClose === null || Math.abs(lastHistoryClose - currentPrice) >= 0.01)) {
        prices.push(currentPrice);
      }

      // AUDIT FIX: Validation croisée des prix (Live vs Historique)
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
      const parsedVol = volumeStr ? parseInt(volumeStr.replace(/[\s\u00A0\u202F,.]/g, ''), 10) : NaN;
      const volumeNum = Number.isFinite(parsedVol) && parsedVol >= 0 ? parsedVol : undefined;

      // 3. Calcul via le moteur technique avec vrais OHLC intraday, historique volumes et benchmark MASI
      const sessionOHLC = {
        high: parsePositiveLocaleNum(liveData?.high),
        low: parsePositiveLocaleNum(liveData?.low),
        close: currentPrice > 0 ? currentPrice : undefined,
      };
      const volumeHistory = detailedHistory.historyPoints
        .map(pt => pt.volume)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
      const masiContext =
        typeof liveData?.variationValue === 'number' && typeof masiData?.variationValue === 'number'
          ? {
              stockVariationPct: liveData.variationValue,
              masiVariationPct: masiData.variationValue,
            }
          : undefined;
      const tech = TechnicalEngine.calculate(prices, volumeNum, sessionOHLC, volumeHistory, masiContext);
      
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
        if (tech.atr) signals.push(`ATR(14): ${tech.atr.atr14} MAD (${tech.atr.atrPercent}%)`);
        if (tech.volumeBreakout?.isBreakout) {
          signals.push(`🚀 Breakout Volume (${tech.volumeBreakout.ratio}x MM20)`);
        } else if (tech.volumeBreakout?.isBollingerSqueeze) {
          signals.push(`🗜️ Compression Bollinger (${tech.volumeBreakout.bollingerBandwidth}%)`);
        }
        if (tech.relativeStrengthMasi) {
          signals.push(
            `${tech.relativeStrengthMasi.label} (${tech.relativeStrengthMasi.alphaPct >= 0 ? '+' : ''}${tech.relativeStrengthMasi.alphaPct}%)`
          );
        }
        if (priceDiscrepancy) signals.push(priceDiscrepancy);
        signals.push(`📊 Points de données: ${tech.dataPointsUsed}`);

        // AUDIT FIX: Alerte liquidité
        const liquidityWarning = MarketWorker.checkLiquidity(volumeNum);
        const strategyBacktest = backtestTechnicalSignals(prices);

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
          atr: tech.atr,
          volumeBreakout: tech.volumeBreakout,
          relativeStrengthMasi: tech.relativeStrengthMasi,
          strategyBacktest,
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
    if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0) {
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
  detectMarketRegime,
  backtestSignals: backtestTechnicalSignals,

  /**
   * Scoring quantitatif symétrique [-100, +100] modulé par régime de marché
   * Chaque indicateur contribue de manière équilibrée. Élimine le biais haussier structurel.
   */
  synthesize: (news: Partial<CompanyAnalysis>, market: Partial<CompanyAnalysis>): Partial<CompanyAnalysis> => {
    const rawRsiVal =
      typeof market.rsi === 'object'
        ? parseFloat(String(market.rsi.value))
        : typeof market.rsi === 'string'
          ? parseFloat(market.rsi)
          : NaN;
    const hasValidRsi = Number.isFinite(rawRsiVal);
    const macdTrend = market.macd?.trend || 'Indéterminé';
    const variation = market.variationValue || 0;
    const numericPrice = parsePositiveLocaleNum(market.price) || 0;

    // Circuit breaker — Refuser de décider sur des données manquantes ou nulles
    if (numericPrice <= 0) {
      return {
        recommendedAction: 'ATTENDRE',
        confidenceLevel: 'Faible',
        strategyPlan: '⚠️ Analyse impossible — Données de prix indisponibles. Aucune recommandation ne peut être émise.',
        riskExplication: 'Données insuffisantes pour une analyse fiable.'
      };
    }

    const marketRegime = detectMarketRegime(market);
    const macdWeight = marketRegime === 'TRENDING' ? 25 : 20;
    const rsiOverboughtMultiplier = marketRegime === 'TRENDING' ? 0.7 : 1.0;
    const decisionThreshold = marketRegime === 'HIGH_VOLATILITY' ? 35 : 30;
    
    // ═══════════════════════════════════════════════════
    // SCORING MULTI-FACTEURS SYMÉTRIQUE
    // Chaque facteur : [-25, +25] → Total : [-100, +100]
    // ═══════════════════════════════════════════════════
    let score = 0;
    const factors: string[] = [];

    // 1. SENTIMENT (Poids: 25 pts)
    const gScore = news.globalScore || 0;
    
    // Volume density boost (si beaucoup d'articles récents, cela augmente la force/validité du sentiment de 20%)
    const volumeBoost = (news.collectionStatus?.articlesFound || 0) >= 5 ? 1.2 : 1.0;
    
    let sentimentPoints = 0;
    if (news.globalSentiment === 'FORTEMENT_POSITIF') {
      sentimentPoints = Math.min(25, Math.round(gScore * 25 * volumeBoost));
    } else if (news.globalSentiment === 'POSITIF') {
      sentimentPoints = Math.min(18, Math.round(gScore * 25 * volumeBoost));
    } else if (news.globalSentiment === 'FORTEMENT_NEGATIF') {
      sentimentPoints = Math.max(-25, Math.round(gScore * 25 * volumeBoost));
    } else if (news.globalSentiment === 'NEGATIF') {
      sentimentPoints = Math.max(-18, Math.round(gScore * 25 * volumeBoost));
    }

    if (sentimentPoints !== 0) {
      score += sentimentPoints;
      factors.push(`Sentiment ${sentimentPoints >= 0 ? '+' : ''}${sentimentPoints} (${news.globalSentiment})`);
    } else {
      factors.push(`Sentiment 0 (NEUTRE)`);
    }

    // 2. RSI (Poids: 25 pts)
    if (!hasValidRsi) {
      factors.push('RSI 0 (Indisponible)');
    } else if (rawRsiVal > 70) {
      const rsiScore = -Math.round(((rawRsiVal - 70) / 30) * 25 * rsiOverboughtMultiplier);
      score += rsiScore;
      factors.push(`RSI ${rsiScore} (Surachat: ${rawRsiVal})`);
    } else if (rawRsiVal < 30) {
      // Survente = potentiel rebond, mais dangereux → score neutre-positif modéré
      const rsiScore = Math.round(((30 - rawRsiVal) / 30) * 15); // Max +15 (pas +25, car couteau qui tombe)
      score += rsiScore;
      factors.push(`RSI +${rsiScore} (Survente: ${rawRsiVal}, rebond possible)`);
    } else if (rawRsiVal > 55) {
      const rsiScore = Math.round(((rawRsiVal - 50) / 20) * 15);
      score += rsiScore;
      factors.push(`RSI +${rsiScore} (Momentum haussier: ${rawRsiVal})`);
    } else if (rawRsiVal < 45) {
      const rsiScore = -Math.round(((50 - rawRsiVal) / 20) * 15);
      score += rsiScore;
      factors.push(`RSI ${rsiScore} (Momentum baissier: ${rawRsiVal})`);
    } else {
      factors.push(`RSI 0 (Zone neutre: ${rawRsiVal})`);
    }

    // 3. MACD (Poids modulé par régime: 20 ou 25 pts)
    if (macdTrend === 'Haussier') {
      score += macdWeight;
      factors.push(`MACD +${macdWeight} (Haussier)`);
    } else if (macdTrend === 'Baissier') {
      score -= macdWeight;
      factors.push(`MACD -${macdWeight} (Baissier)`);
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

    // 5. FILTRE LIQUIDITÉ
    const isIlliquid = Boolean(market.liquidityWarning && market.liquidityWarning.isLiquid === false);
    if (isIlliquid) {
      factors.push('Liquidité réduite');
    }

    // ═══════════════════════════════════════════════════
    // DÉCISION BASÉE SUR LE SCORE & RÉGIME
    // ═══════════════════════════════════════════════════
    const clampedScore = Math.max(-100, Math.min(100, score));
    const absScore = Math.abs(clampedScore);
    let confidence: 'Faible' | 'Moyen' | 'Élevé' = absScore >= 50 ? 'Élevé' : absScore >= 25 ? 'Moyen' : 'Faible';
    if (isIlliquid) {
      confidence = 'Faible';
    }
    const liquidityNote = isIlliquid
      ? ' ⚠️ Liquidité faible/illiquide : confiance plafonnée et ordres à cours limité recommandés.'
      : '';
    const factorsStr = factors.join(' | ');
    const hasSupport = Boolean(
      market.support && !market.support.includes('N/A') && !market.support.includes('INDISPONIBLE')
    );

    if (clampedScore >= decisionThreshold) {
      return {
        recommendedAction: 'ACHETER',
        confidenceLevel: confidence,
        marketRegime,
        strategyPlan: `Signal d'achat quantitatif [${marketRegime}]. Score: +${clampedScore}/100. Facteurs: ${factorsStr}.`,
        idealEntryPoint: hasSupport ? `${market.support} - ${market.price}` : (market.price || 'MARKET'),
        riskExplication: `Score positif basé sur ${factors.length} indicateurs convergents. Stop loss sous le support recommandé.${liquidityNote}`
      };
    }

    if (clampedScore <= -decisionThreshold) {
      return {
        recommendedAction: 'VENDRE',
        confidenceLevel: confidence,
        marketRegime,
        strategyPlan: `Signal de vente quantitatif [${marketRegime}]. Score: ${clampedScore}/100. Facteurs: ${factorsStr}.`,
        idealEntryPoint: 'N/A (Signal de sortie)',
        riskExplication: `Score négatif basé sur ${factors.length} indicateurs convergents. Réduire l'exposition recommandé.${liquidityNote}`
      };
    }

    // Zone neutre [-seuil, +seuil]
    return {
      recommendedAction: 'ATTENDRE',
      confidenceLevel: confidence,
      marketRegime,
      strategyPlan: `Zone d'observation [${marketRegime}]. Score: ${clampedScore > 0 ? '+' : ''}${clampedScore}/100. Aucun signal directionnel suffisant. Facteurs: ${factorsStr}.`,
      riskExplication: `Momentum insuffisant pour une prise de position. Attendre une convergence plus marquée (seuil ±${decisionThreshold}).${liquidityNote}`
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

      // 0. Cache distribué Redis/Supabase (TTL 6h) pour éviter le re-scraping fondamental répétitif
      const cacheKey = `aetheris:fundamental:${searchSymbol.toUpperCase()}`;
      try {
        const cachedFundamentals = await CacheService.getGeneric(cacheKey, 6 * 60 * 60 * 1000);
        if (cachedFundamentals && cachedFundamentals.peRatio && cachedFundamentals.fundamentalQualityScore) {
          return { fundamentals: cachedFundamentals };
        }
      } catch {
        // Fallback live transparent
      }

      // 1. Récupération des données TradingView Morocco et médianes sectorielles en parallèle
      const [tvData, sectorBenchmarks] = await Promise.all([
        TradingViewScraper.getFundamentalData(searchName, searchSymbol),
        TradingViewScraper.getSectorBenchmarks().catch(() => new Map()),
      ]);

      // 2. Complément Casabourse (en cache 6h) dès que la croissance ou tout ratio est N/A
      let casaData: any = { peRatio: 'N/A', dividendYield: 'N/A', margin: 'N/A', revenueGrowth: 'N/A', profitGrowth: 'N/A', status: 'error' };
      let bmceData: any = { peRatio: 'N/A', dividendYield: 'N/A', marketCap: 'N/A', netProfit: 'N/A', roe: 'N/A', status: 'error' };
      let officialData: any = { netProfit: 'N/A', roe: 'N/A', status: 'error' };

      const tvHasMissingAny =
        tvData.status === 'error' ||
        tvData.peRatio === 'N/A' ||
        tvData.dividendYield === 'N/A' ||
        tvData.marketCap === 'N/A' ||
        tvData.netProfit === 'N/A' ||
        tvData.roe === 'N/A' ||
        tvData.margin === 'N/A' ||
        tvData.revenueGrowth === 'N/A' ||
        tvData.profitGrowth === 'N/A';

      if (tvHasMissingAny) {
        casaData = await CasabourseScraper.getFundamentalData(searchName, searchSymbol);
      }

      const needsCoreFallback =
        (tvData.peRatio === 'N/A' && (!casaData.peRatio || casaData.peRatio === 'N/A')) ||
        (tvData.dividendYield === 'N/A' && (!casaData.dividendYield || casaData.dividendYield === 'N/A')) ||
        tvData.marketCap === 'N/A' ||
        tvData.roe === 'N/A' ||
        tvData.netProfit === 'N/A';

      if (needsCoreFallback) {
        console.log(`[FundamentalWorker] ⚠️ Données cœur incomplètes pour ${searchSymbol}. Lancement des fallbacks BMCE/Official...`);
        const [bmcePromise, officialPromise] = await Promise.allSettled([
          BMCEBourseScraper.getFundamentalData(searchName),
          OfficialCasaScraper.getFundamentalData(searchSymbol)
        ]);
        if (bmcePromise.status === 'fulfilled') bmceData = bmcePromise.value;
        if (officialPromise.status === 'fulfilled') officialData = officialPromise.value;
      }

      
      // AUDIT FIX: Source tracking — tracer l'origine de chaque donnée
      const dataSources: Record<string, DataSource> = {};
      
      const pickBest = (
        field: string, 
        tvVal: string | undefined, 
        casaVal: string | undefined, 
        bmceVal: string | undefined, 
        officialVal?: string | undefined
      ): string => {
        // Priorité 1: TradingView (Moderne, live et sans blocage)
        if (tvData.status === 'success' && tvVal && tvVal !== 'N/A') {
          dataSources[field] = 'TRADINGVIEW';
          return tvVal;
        }
        // Priorité 2: Source Officielle (Bourse de Casablanca)
        if (officialData.status === 'success' && officialVal && officialVal !== 'N/A') {
          dataSources[field] = 'OFFICIAL_CASA';
          return officialVal;
        }
        // Priorité 3: Casabourse.ma (Screener)
        if (casaData.status === 'success' && casaVal && casaVal !== 'N/A') {
          dataSources[field] = 'CASABOURSE';
          return casaVal;
        }
        // Priorité 4: BMCE Capital
        if (bmceData.status === 'success' && bmceVal && bmceVal !== 'N/A') {
          dataSources[field] = 'BMCE';
          return bmceVal;
        }
        dataSources[field] = 'UNKNOWN';
        return 'N/A';
      };

      const sectorName = SymbolMapper.getSector(searchSymbol, searchName);
      const peRawNum = parseSignedMetricPct(pickBest('peRatio', tvData.peRatio, casaData.peRatio, bmceData.peRatio));

      const baseFundamentals = {
        peRatio: pickBest('peRatio', tvData.peRatio, casaData.peRatio, bmceData.peRatio),
        dividendYield: pickBest('dividendYield', tvData.dividendYield, casaData.dividendYield, bmceData.dividendYield),
        marketCap: pickBest('marketCap', tvData.marketCap, undefined, (bmceData.marketCap && bmceData.marketCap !== 'N/A') ? bmceData.marketCap : undefined),
        netProfit: pickBest('netProfit', tvData.netProfit, undefined, (bmceData.netProfit && bmceData.netProfit !== 'N/A') ? bmceData.netProfit : undefined, officialData.netProfit),
        roe: pickBest('roe', tvData.roe, undefined, (bmceData.roe && bmceData.roe !== 'N/A') ? bmceData.roe : undefined, officialData.roe),
        margin: pickBest('margin', tvData.margin, casaData.margin, undefined),
        revenueGrowth: pickBest('revenueGrowth', tvData.revenueGrowth, casaData.revenueGrowth, undefined),
        profitGrowth: pickBest('profitGrowth', tvData.profitGrowth, casaData.profitGrowth, undefined),
        sector: sectorName, // Complété/confirmé par l'orchestrateur si besoin
        dataSources, // AUDIT FIX: Traçabilité
      };

      const sectorBenchmark = TradingViewScraper.computeSectorBenchmark(
        sectorName,
        peRawNum,
        sectorBenchmarks
      );
      const fundamentalQualityScore = computeFundamentalQualityScore({
        ...baseFundamentals,
        sectorBenchmark,
      });

      const fundamentals = {
        ...baseFundamentals,
        sectorBenchmark,
        fundamentalQualityScore,
      };


      // AUDIT FIX: Suppression du fallback IA hallucinatoire
      // Les données manquantes restent N/A. C'est honnête.
      const missingFields = Object.entries(baseFundamentals)
        .filter(([key, val]) => val === 'N/A' && !['sector', 'dataSources'].includes(key))
        .map(([key]) => key);
      
      if (missingFields.length > 0) {
        console.log(`[FundamentalWorker] ℹ️ Données manquantes pour "${searchName}": ${missingFields.join(', ')}. Affichées comme N/A (pas d'estimation IA).`);
      }

      console.log(`[FundamentalWorker] 📊 Synthèse terminée pour ${searchName}. PER: ${fundamentals.peRatio}, ROE: ${fundamentals.roe}, Score Qualité: ${fundamentalQualityScore.score}/100 (${fundamentalQualityScore.grade})`);
      
      // 5. Validation Zod de sortie
      const validatedData = FundamentalDataSchema.safeParse(fundamentals);
      if (!validatedData.success) {
        console.warn("[FundamentalWorker] ⚠️ Validation Zod échouée pour les fondamentaux:", validatedData.error.format());
      }
      
      const finalFundamentals = validatedData.success ? validatedData.data : fundamentals;
      const validCoreCount = [
        finalFundamentals.peRatio,
        finalFundamentals.dividendYield,
        finalFundamentals.marketCap,
        finalFundamentals.roe,
        finalFundamentals.netProfit,
      ].filter((v) => v && v !== 'N/A').length;

      if (validCoreCount >= 2) {
        CacheService.setGeneric(cacheKey, finalFundamentals, 6 * 60 * 60 * 1000).catch(() => {});
      }

      return { fundamentals: finalFundamentals };
    } catch (e) {
      console.error("Fundamental Worker Error:", e);
    }

    
    
    return {
      fundamentals: {
        peRatio: 'N/A',
        dividendYield: 'N/A',
        marketCap: 'N/A',
        dataSources: {
          peRatio: 'UNKNOWN',
          dividendYield: 'UNKNOWN',
          marketCap: 'UNKNOWN',
        },
      }
    };
  }
};

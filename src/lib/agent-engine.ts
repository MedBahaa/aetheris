import 'server-only';
import { NewsWorker, MarketWorker, StrategyWorker, FundamentalWorker } from './agents/worker-agents';
import { GeminiService } from './gemini';
import { supabaseAdmin } from './supabase-server';
import { CacheService } from './cache-service';
import { InputSanitizer } from './input-sanitizer';
import { ImpactValidator } from './impact-validator';
import { 
  CompanyAnalysis, 
  AgentType, 
  CompanyAnalysisSchema, 
  OrchestratorResult, 
  Action, 
  Sentiment, 
  Confidence, 
  Opportunity,
  DataQuality 
} from './schemas';
import { MacroScraper } from './scrapers/macro-scraper';
import { SymbolMapper } from './symbol-mapper';
import { BMCEBourseScraper } from './scrapers/bmce-scraper';
import { MarketListScraper } from './scrapers/market-list-scraper';

// On exporte les types depuis ici aussi pour la compatibilité
export type { CompanyAnalysis, AgentType, OrchestratorResult, Action, Sentiment, Confidence, Opportunity };

/**
 * Parse un cours/montant formaté à la française ou anglaise (ex: "1 850,50 MAD", "1.850,50", "98.45 MAD").
 */
export function parseFrenchPrice(raw?: string | number | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : 0;
  if (!raw || raw === 'N/A' || raw.includes('INDISPONIBLE')) return 0;
  const noSpaces = raw.replace(/[\s\u00A0\u202F]/g, '');
  const m = noSpaces.match(/-?[\d.,]+/);
  if (!m) return 0;
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
  const num = parseFloat(token);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export interface AtrLevelsInput {
  dynamicStopBuy?: number;
  dynamicTargetBuy?: number;
  dynamicStopSell?: number;
  dynamicTargetSell?: number;
}

/**
 * Valide et recalcule TP / SL / R:R pour garantir la cohérence mathématique vis-à-vis de l'action et du cours.
 */
export function validatePriceLevels(
  action: string | undefined,
  currentPrice: number,
  tp: string | undefined,
  sl: string | undefined,
  entry?: string | undefined,
  atrLevels?: AtrLevelsInput
): { tp: string; sl: string; riskRewardRatio?: string } {
  if (currentPrice <= 0 || !tp || !sl) {
    return { tp: tp || 'N/A', sl: sl || 'N/A' };
  }

  const tpVal = parseFrenchPrice(tp);
  const slVal = parseFrenchPrice(sl);
  const entryVal = parseFrenchPrice(entry) || currentPrice;

  if (tpVal <= 0 || slVal <= 0) {
    return { tp, sl };
  }

  let finalTp = tp;
  let finalSl = sl;
  let effectiveTp = tpVal;
  let effectiveSl = slVal;

  if (action === 'ACHETER') {
    const tpOk = tpVal > currentPrice && tpVal <= currentPrice * 2.5;
    const slOk = slVal < currentPrice && slVal >= currentPrice * 0.70;
    if (!tpOk) {
      const atrTp = atrLevels?.dynamicTargetBuy;
      effectiveTp =
        typeof atrTp === 'number' && atrTp > currentPrice && atrTp <= currentPrice * 2.5
          ? atrTp
          : currentPrice * 1.12;
      finalTp = `${effectiveTp.toFixed(2)} MAD ⚠️ (recalculé: TP original incohérent)`;
    }
    if (!slOk) {
      const atrSl = atrLevels?.dynamicStopBuy;
      effectiveSl =
        typeof atrSl === 'number' && atrSl < currentPrice && atrSl >= currentPrice * 0.70
          ? atrSl
          : currentPrice * 0.94;
      finalSl = `${effectiveSl.toFixed(2)} MAD ⚠️ (recalculé: SL original incohérent)`;
    }
    if (!tpOk || !slOk) {
      console.warn(`[Orchestrator] ⚠️ TP/SL incohérents pour ACHETER. TP=${tpVal}, SL=${slVal}, Prix=${currentPrice}. Recalcul automatique.`);
    }
  } else if (action === 'VENDRE') {
    const tpOk = tpVal < currentPrice && tpVal >= currentPrice * 0.50;
    const slOk = slVal > currentPrice && slVal <= currentPrice * 1.30;
    if (!tpOk) {
      const atrTp = atrLevels?.dynamicTargetSell;
      effectiveTp =
        typeof atrTp === 'number' && atrTp < currentPrice && atrTp >= currentPrice * 0.50
          ? atrTp
          : currentPrice * 0.90;
      finalTp = `${effectiveTp.toFixed(2)} MAD ⚠️ (recalculé: TP original incohérent pour VENDRE)`;
    }
    if (!slOk) {
      const atrSl = atrLevels?.dynamicStopSell;
      effectiveSl =
        typeof atrSl === 'number' && atrSl > currentPrice && atrSl <= currentPrice * 1.30
          ? atrSl
          : currentPrice * 1.05;
      finalSl = `${effectiveSl.toFixed(2)} MAD ⚠️ (recalculé: SL original incohérent pour VENDRE)`;
    }
    if (!tpOk || !slOk) {
      console.warn(`[Orchestrator] ⚠️ TP/SL incohérents pour VENDRE. TP=${tpVal}, SL=${slVal}, Prix=${currentPrice}. Recalcul automatique.`);
    }
  }

  let effectiveEntry = currentPrice;
  if (entryVal > 0) {
    if (action === 'ACHETER' && entryVal > effectiveSl && entryVal < effectiveTp) {
      effectiveEntry = entryVal;
    } else if (action === 'VENDRE' && entryVal < effectiveSl && entryVal > effectiveTp) {
      effectiveEntry = entryVal;
    } else if (action !== 'ACHETER' && action !== 'VENDRE') {
      effectiveEntry = entryVal;
    }
  }

  const reward = Math.abs(effectiveTp - effectiveEntry);
  const risk = Math.abs(effectiveEntry - effectiveSl);
  const riskRewardRatio = risk > 0 && reward > 0 ? `1:${(reward / risk).toFixed(1)}` : undefined;

  return { tp: finalTp, sl: finalSl, riskRewardRatio };
}

/**
 * ORCHESTRATEUR AETHERIS (Server-Only Core)
 * ✅ Combine + Nettoie + Structure + Analyse Critique + Cache
 * AUDIT FIX: Circuit breakers, Zod enforcement, data quality tracking, source transparency
 */
export class AetherisOrchestrator {
  
  /**
   * AUDIT FIX: Rate limiting hybride (Supabase-backed + fallback mémoire)
   * Plafond global relevé (le throttling fin par utilisateur/IP est déjà géré dans actions.ts).
   */
  private static memoryRequestCount = 0;
  private static memoryWindowStart = Date.now();
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static inFlightRequests = new Map<string, Promise<CompanyAnalysis>>();

  private static async checkRateLimit(): Promise<boolean> {
    if (supabaseAdmin) {
      try {
        // Vérifier en DB le nombre d'analyses créées dans la dernière minute
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count, error } = await supabaseAdmin
          .from('analysis_cache')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneMinuteAgo);
        
        if (!error && count !== null) {
          return count >= this.MAX_REQUESTS_PER_MINUTE;
        }
      } catch {
        // Fallback silencieux sur la vérification mémoire
      }
    }
    
    // Fallback mémoire (mieux que rien)
    const now = Date.now();
    if (now - this.memoryWindowStart > 60000) {
      this.memoryRequestCount = 0;
      this.memoryWindowStart = now;
    }
    this.memoryRequestCount++;
    return this.memoryRequestCount > this.MAX_REQUESTS_PER_MINUTE;
  }

  static async process(
    companyName: string,
    type: AgentType,
    forceRefresh: boolean = false,
    onProgress?: (step: string) => void
  ): Promise<CompanyAnalysis> {
    
    // SECURITY: Sanitize user input before any processing
    if (InputSanitizer.detectInjection(companyName)) {
      console.warn(`[Orchestrator] ⚠️ PROMPT INJECTION DETECTED: "${companyName.substring(0, 50)}"`);
      throw new Error('Entrée invalide détectée.');
    }
    companyName = InputSanitizer.sanitizeCompanyName(companyName);
    onProgress?.(`RÉSOLUTION DU TICKER & RÉFÉRENTIEL BVC : ${companyName}`);

    // 0. Smart Ticker Resolution (Ex: 'IAM' -> 'MAROC TELECOM')
    const queryTerm = companyName.toUpperCase().trim();
    let symbol = queryTerm;
    let resolvedName = queryTerm;
    let sector: string | undefined = undefined;
    let companyDbId: string | undefined = undefined;
    let tickerUnverified = false;

    try {
      // 🕵️ PRIORITÉ 1 : Recherche en Base de Données (Plus fiable et rapide)
      const dbQueryTerm = InputSanitizer.sanitizePostgrestFilter(queryTerm);
      const resolvedAlias = InputSanitizer.sanitizePostgrestFilter(SymbolMapper.resolve(queryTerm));
      const orFilter =
        resolvedAlias && resolvedAlias !== dbQueryTerm
          ? `symbol.eq.${dbQueryTerm},symbol.eq.${resolvedAlias},name.ilike.%${dbQueryTerm}%`
          : `symbol.eq.${dbQueryTerm},name.ilike.%${dbQueryTerm}%`;

      const { data: dbCompanies } = supabaseAdmin
        ? await supabaseAdmin
            .from('companies')
            .select('id, name, symbol, sector')
            .or(orFilter)
            .limit(1)
        : { data: null };

      const dbCompany = dbCompanies?.[0];

      if (dbCompany) {
        companyDbId = dbCompany.id; // Capture de l'ID pour l'historisation
        symbol = dbCompany.symbol;
        resolvedName = dbCompany.name;
        sector = dbCompany.sector || SymbolMapper.getSector(dbCompany.symbol, dbCompany.name);
        console.log(`[Orchestrator] 🏛️ Résolution DB: ${symbol} (${resolvedName}) [${sector}]`);
      } else {
        // PRIORITÉ 2 : Découverte en direct via le flux Marché Live / BMCE (Capte automatiquement les nouvelles IPO)
        const liveResolved = await BMCEBourseScraper.resolveStock(queryTerm);
        const liveQuote = !liveResolved ? await MarketListScraper.getLiveStock(queryTerm) : null;

        if (liveResolved) {
          companyDbId = liveResolved.uuid || undefined;
          symbol = liveResolved.symbol;
          resolvedName = liveResolved.name;
          sector = SymbolMapper.getSector(symbol, resolvedName);
          console.log(`[Orchestrator] 🆕 Résolution Marché Live / IPO: ${symbol} (${resolvedName}) [${sector}]`);
        } else if (liveQuote) {
          symbol = liveQuote.ticker || SymbolMapper.resolve(liveQuote.symbol) || liveQuote.symbol;
          resolvedName = liveQuote.name || SymbolMapper.getCanonicalName(symbol) || liveQuote.symbol;
          sector = liveQuote.sector || SymbolMapper.getSector(symbol, resolvedName);
          console.log(`[Orchestrator] 📈 Résolution Flux Direct: ${symbol} (${resolvedName}) [${sector}]`);
        } else {
          // PRIORITÉ 3 (FALLBACK) : IA (Gemini)
          console.log(`[Orchestrator] 🤖 Résolution IA pour "${companyName}"...`);
          const aiResolved = await GeminiService.resolveTicker(companyName);
          symbol = aiResolved.symbol;
          resolvedName = aiResolved.companyName;

          // AUDIT FIX: Validate AI-resolved ticker against the companies table
          const { data: aiValidation } = supabaseAdmin
            ? await supabaseAdmin
                .from('companies')
                .select('id, name, symbol, sector')
                .eq('symbol', aiResolved.symbol.toUpperCase())
                .maybeSingle()
            : { data: null };

          if (aiValidation) {
            // AI ticker confirmed in DB
            companyDbId = aiValidation.id;
            symbol = aiValidation.symbol;
            resolvedName = aiValidation.name;
            sector = aiValidation.sector || undefined;
            console.log(`[Orchestrator] ✅ Ticker IA validé contre le référentiel: ${symbol} (${resolvedName})`);
          } else {
            console.warn(`[Orchestrator] ⚠️ Ticker IA "${aiResolved.symbol}" NON TROUVÉ dans le référentiel CSE. Utilisation avec prudence.`);
            tickerUnverified = true;
          }
        }
      }
    } catch (e) {
      console.error("[Orchestrator] Resolution Error:", e);
    }

    const searchName = resolvedName.toUpperCase();
    const searchTicker = symbol.toUpperCase();
    onProgress?.(`TITRE IDENTIFIÉ : ${searchTicker} (${searchName})`);
    
    // 1. Check Cache first
    const cachedResult = await CacheService.get(searchTicker, type, forceRefresh);
    if (cachedResult) {
      console.log(`[Orchestrator] 🧊 CACHE HIT : Chargement instantané pour ${searchTicker} (${type}).`);
      onProgress?.(`CACHE HIT : CHARGEMENT INSTANTANÉ (${searchTicker})`);
      return cachedResult;
    }

    // AUDIT FIX: Rate limiting hybride (Supabase-backed) exécuté uniquement en cas de CACHE MISS !
    if (await this.checkRateLimit()) {
      throw new Error('RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques secondes.');
    }

    const flightKey = `${searchTicker}:${type}`;
    if (!forceRefresh) {
      const existingFlight = this.inFlightRequests.get(flightKey);
      if (existingFlight) {
        onProgress?.(`COALESCENCE : REQUÊTE SIMULTANÉE DÉJÀ EN COURS (${searchTicker})`);
        return existingFlight;
      }
    }

    const computeAnalysis = async (): Promise<CompanyAnalysis> => {
      const lockKey = `aetheris:lock:${type}:${searchTicker}`;
      let lockToken = await CacheService.acquireLock(lockKey, 25000);
      if (!lockToken && !forceRefresh) {
        onProgress?.(`ATTENTE DU VERROU DISTRIBUÉ (${searchTicker})...`);
        await new Promise((r) => setTimeout(r, 800));
        const warmed = await CacheService.get(searchTicker, type, false);
        if (warmed) return warmed;
        lockToken = await CacheService.acquireLock(lockKey, 25000);
      }

      console.log(`[Orchestrator] 🚀 Launching Engine: Ticker="${searchTicker}", Nom="${searchName}"`);
      
      // AUDIT FIX: Tracker de qualité des données
      const dataQuality: DataQuality = {
        score: 100,
        warnings: [],
        missingFields: [],
        sources: [],
      };

      if (tickerUnverified) {
        dataQuality.warnings.push(`Ticker résolu par IA (${symbol}) non confirmé dans le référentiel officiel.`);
        dataQuality.score -= 15;
      }

      let result: Partial<CompanyAnalysis> = {
        id: companyDbId || Math.random().toString(36).substring(2, 11),
        companyName: resolvedName,
        sector: sector,
        date: new Date().toLocaleDateString('fr-FR'),
        type: type,
      };

      try {
        if (type === 'SENTIMENT') {
          onProgress?.(`COLLECTE DES FLUX RSS INSTITUTIONNELS (AMMC / PRESSE)...`);
          const [newsData, reliabilityScore] = await Promise.all([
            NewsWorker.analyze(searchName),
            companyDbId
              ? ImpactValidator.getAgentReliabilityScore(companyDbId).catch(() => undefined)
              : Promise.resolve(undefined),
          ]);
          if (typeof reliabilityScore === 'number') {
            dataQuality.agentReliabilityScore = reliabilityScore;
            if (reliabilityScore < 50) {
              dataQuality.score -= 10;
              dataQuality.warnings.push(`Fiabilité historique mesurée modérée (${reliabilityScore}/100) sur ce titre.`);
            }
          }
        
        // --- AUDIT IMPROVEMENT: HISTORISATION & MOMENTUM ---
        if (newsData.news && companyDbId) {
          this.persistNewsItems(companyDbId, newsData.news).catch(e => console.error(e));
          
          // Calcul du Momentum (Comparaison avec le cache précédent)
          const previousAnalysis = await CacheService.get(searchTicker, 'SENTIMENT', false);
          if (previousAnalysis && previousAnalysis.globalScore !== undefined && newsData.globalScore !== undefined) {
             const diff = newsData.globalScore - previousAnalysis.globalScore;
             const momentumDir = diff > 0.05 ? '📈 AMÉLIORATION' : diff < -0.05 ? '📉 DÉGRADATION' : '➡️ STABLE';
             (newsData as any).sentimentMomentum = {
                direction: momentumDir,
                variation: diff.toFixed(2),
                previousScore: previousAnalysis.globalScore.toFixed(2)
             };
             console.log(`[Orchestrator] Sentiment Momentum: ${momentumDir} (${diff.toFixed(2)})`);
          }
        }
        // ----------------------------------------------------

        result = { ...result, ...newsData, isAI: Boolean(newsData.isAI) };
        dataQuality.sources.push('RSS');
        if (!newsData.news || newsData.news.length === 0) {
          dataQuality.warnings.push('Aucune actualité trouvée — Sentiment par défaut NEUTRE');
          dataQuality.score -= 20;
        } else if (newsData.isAI === false) {
          dataQuality.warnings.push('Synthèse IA sentiment indisponible — scores neutres par défaut');
          dataQuality.score -= 30;
        }
      } 
      else if (type === 'TECHNICAL') {
        onProgress?.(`COLLECTE DES COURS LIVE, HISTORIQUES & INDICE MASI...`);
        const marketData = await MarketWorker.analyze(searchName);
        onProgress?.(`CALCUL ATR(14), BANDES BOLLINGER & INDICATEURS QUANTITATIFS...`);
        const cleanedMarket = this.cleanMarketData(marketData);
        result = {
          ...result,
          ...cleanedMarket,
          globalSentiment:
            cleanedMarket.technicalTrend === 'Haussière' ? 'POSITIF' :
            cleanedMarket.technicalTrend === 'Baissière' ? 'NEGATIF' : 'NEUTRE',
          probableImpact: cleanedMarket.marketSituation || 'Analyse technique quantitative calculée.',
          isAI: false,
        };
        dataQuality.sources.push('BMCE');
        
        // AUDIT FIX: Dégrader le score si données techniques insuffisantes ou illiquidité
        if (marketData.price === 'INDISPONIBLE') {
          dataQuality.score -= 60;
          dataQuality.warnings.push('Prix indisponible — Analyse technique impossible');
          dataQuality.missingFields.push('price');
        }
        if (marketData.signals?.some(s => s.includes('insuffisantes'))) {
          dataQuality.score -= 20;
          dataQuality.warnings.push('Historique limité — Indicateurs techniques dégradés');
        }
        if (marketData.liquidityWarning && !marketData.liquidityWarning.isLiquid) {
          dataQuality.score -= 10;
          dataQuality.warnings.push(marketData.liquidityWarning.message || 'Liquidité limitée sur ce titre');
        }

        // Appel à l'IA pour la synthèse de convergence technique
        if (marketData.price !== 'INDISPONIBLE') {
          console.log(`[Orchestrator] 🤖 Synthèse technique IA pour ${searchName}...`);
          const aiTech = await GeminiService.synthesizeTechnicalAnalysis(searchName, cleanedMarket);
          if (aiTech) {
            result.marketSituation = aiTech.marketSituation;
            result.recommendedAction = aiTech.finalAction;
            result.globalSentiment = aiTech.finalAction === 'ACHETER' ? 'POSITIF' : aiTech.finalAction === 'VENDRE' ? 'NEGATIF' : 'NEUTRE';
            result.probableImpact = aiTech.why;
            result.isAI = true;
            
            // Enrichir orchestratorResult pour correspondre aux attentes globales
            result.orchestrator = {
              finalAction: aiTech.finalAction,
              why: aiTech.why,
              currentSituation: aiTech.marketSituation,
              keyPoints: marketData.signals || [],
              opportunity: aiTech.finalAction === 'ACHETER' ? 'Oui' : aiTech.finalAction === 'VENDRE' ? 'Non' : 'À surveiller',
              risk: aiTech.finalAction === 'VENDRE' ? 'Élevé' : aiTech.finalAction === 'ACHETER' ? 'Faible' : 'Moyen',
              riskExplication: 'Risque technique lié à la configuration des indicateurs.',
              isAI: true,
            };
          } else {
            dataQuality.score -= 15;
            dataQuality.warnings.push('Synthèse IA technique indisponible — indicateurs quantitatifs uniquement');
          }
        }
      } 
      else if (type === 'FUNDAMENTAL') {
        onProgress?.(`EXTRACTION FONDAMENTAUX BVC & BENCHMARKS SECTORIELS...`);
        const [marketData, fundamentalData] = await Promise.all([
          MarketWorker.analyze(searchName),
          FundamentalWorker.analyze(searchName, undefined, { name: resolvedName, symbol: searchTicker }),
        ]);
        result = { 
          ...result, 
          globalSentiment: 'NEUTRE',
          probableImpact: 'Analyse des ratios financiers et fondamentaux BVC.',
          isAI: false,
          fundamentals: {
            ...fundamentalData.fundamentals,
            sector: sector
          },
          price: marketData.price
        };
        // Remplir les sources à partir des sources réelles utilisées par le scraper
        const actualSources = new Set<string>();
        if (fundamentalData.fundamentals?.dataSources) {
          Object.values(fundamentalData.fundamentals.dataSources).forEach(src => {
            if (src !== 'UNKNOWN') actualSources.add(src);
          });
        }
        if (actualSources.size > 0) {
          dataQuality.sources.push(...Array.from(actualSources) as any[]);
        } else {
          dataQuality.sources.push('BMCE', 'CASABOURSE');
        }

        // AUDIT FIX: Tracker les données manquantes dans les fondamentaux
        const fundFields = ['peRatio', 'dividendYield', 'marketCap', 'roe', 'netProfit'];
        const missing = fundFields.filter(f => !fundamentalData.fundamentals?.[f as keyof typeof fundamentalData.fundamentals] || fundamentalData.fundamentals?.[f as keyof typeof fundamentalData.fundamentals] === 'N/A');
        if (missing.length > 0) {
          dataQuality.missingFields.push(...missing);
          dataQuality.score -= (missing.length * 8);
          dataQuality.warnings.push(`Données fondamentales manquantes: ${missing.join(', ')}`);
        }
      }
      else if (type === 'STRATEGY') {
        console.log(`[Orchestrator] Starting strategy synthesis for ${searchName}...`);
        
        // Collecte Parallèle (Gain de temps massif)
        console.log(`[Orchestrator] Collecte de données en parallèle pour ${searchName}...`);
        onProgress?.(`COLLECTE PARALLÈLE : NEWS AMMC + MARCHÉ LIVE + HISTORIQUE...`);
        const [newsData, marketData, reliabilityScore] = await Promise.all([
          NewsWorker.analyze(searchName),
          MarketWorker.analyze(searchName),
          companyDbId
            ? ImpactValidator.getAgentReliabilityScore(companyDbId).catch(() => undefined)
            : Promise.resolve(undefined),
        ]);
        if (typeof reliabilityScore === 'number') {
          dataQuality.agentReliabilityScore = reliabilityScore;
          if (reliabilityScore < 50) {
            dataQuality.score -= 10;
            dataQuality.warnings.push(`Fiabilité historique mesurée modérée (${reliabilityScore}/100) sur ce titre.`);
          }
        }
        
        // AUDIT FIX: Circuit breaker — Vérifier les données avant de continuer
        if (marketData.price === 'INDISPONIBLE') {
          console.error(`[Orchestrator] ❌ CIRCUIT BREAKER: Prix indisponible pour ${searchName}. Basculement sur le fallback déterministe.`);
          dataQuality.score -= 50;
          dataQuality.warnings.push('⚠️ CIRCUIT BREAKER: Prix indisponible — Analyse basée sur le moteur quantitatif uniquement');
          dataQuality.missingFields.push('price');
          
          // Skip AI entirely — use deterministic fallback
          const strategyData = StrategyWorker.synthesize(newsData, this.cleanMarketData(marketData));
          const fallbackOrch = this.generateFinalOrchestration(searchName, newsData, this.cleanMarketData(marketData), strategyData);
          
          result = {
            ...result,
            ...newsData,
            ...this.cleanMarketData(marketData),
            orchestrator: fallbackOrch,
            strategyPlan: strategyData.strategyPlan || 'Observation en cours.',
            recommendedAction: strategyData.recommendedAction || 'ATTENDRE',
            globalSentiment: newsData.globalSentiment || 'NEUTRE',
            probableImpact: newsData.probableImpact || 'Impact non déterminé.',
          };
          
          dataQuality.score = Math.max(0, Math.min(100, dataQuality.score));
          result.dataQuality = dataQuality;
          
          const validation = CompanyAnalysisSchema.safeParse(result);
          const finalResult = validation.success ? validation.data : result as unknown as CompanyAnalysis;
          CacheService.set(searchTicker, type, finalResult).catch(e => console.error(e));
          return finalResult;
        }

        // Collecte en parallèle des fondamentaux et du contexte macroéconomique
        onProgress?.(`EXTRACTION FONDAMENTAUX, BENCHMARKS SECTORIELS & MACRO BAM...`);
        const [fundamentalData, macroData] = await Promise.all([
          FundamentalWorker.analyze(searchName, marketData.price, { name: resolvedName, symbol: searchTicker }),
          MacroScraper.getMacroData(),
        ]);

        const cleanedMarket = this.cleanMarketData(marketData);

        // Enrichissement des fondamentaux avec le secteur de la DB
        if (fundamentalData.fundamentals) {
          fundamentalData.fundamentals.sector = sector;
        }
        
        // Sources tracking
        const actualSources = new Set<string>(['RSS']);
        if (fundamentalData.fundamentals?.dataSources) {
          Object.values(fundamentalData.fundamentals.dataSources).forEach(src => {
            if (src !== 'UNKNOWN') actualSources.add(src);
          });
        } else {
          actualSources.add('BMCE');
          actualSources.add('CASABOURSE');
        }
        dataQuality.sources.push(...Array.from(actualSources) as any[]);
        if (macroData) dataQuality.sources.push('YAHOO');

        // Signal Premium
        const rsiVal = typeof cleanedMarket.rsi === 'object' ? parseFloat(String(cleanedMarket.rsi.value)) : NaN;
        const sentScore = newsData.globalScore || 0;
        const isPremium = Number.isFinite(rsiVal) && ((sentScore > 0.4 && rsiVal < 40) || (sentScore < -0.4 && rsiVal > 65));

        onProgress?.(`SYNTHÈSE STRATÉGIQUE MULTI-HORIZONS IA EN COURS...`);
        let orchestratorResult = await GeminiService.synthesizeAnalysis(
          searchName, 
          newsData, 
          cleanedMarket, 
          sector,
          fundamentalData.fundamentals,
          macroData || undefined
        );
        let strategyPlan: string | null = null;
        let horizons = (orchestratorResult as any)?.horizons;
        let resolvedRegime = StrategyWorker.detectMarketRegime(cleanedMarket);
        
        if (orchestratorResult) {
          orchestratorResult.isAI = true;
          if (horizons) {
            (['shortTerm', 'mediumTerm', 'longTerm'] as const).forEach((h) => {
              if (horizons[h]) horizons[h].isAI = true;
            });
          }
          // Si on a des horizons, on utilise le court terme comme plan par défaut pour la compatibilité
          strategyPlan = horizons?.shortTerm?.strategyPlan || (orchestratorResult as any).strategyPlan || null;
          
          if (!strategyPlan) {
            strategyPlan = await GeminiService.generateStrategyPlan({ 
              ...result, ...cleanedMarket, orchestrator: orchestratorResult 
            });
          }
        } else {
          const strategyData = StrategyWorker.synthesize(newsData, cleanedMarket);
          resolvedRegime = strategyData.marketRegime || resolvedRegime;
          orchestratorResult = this.generateFinalOrchestration(searchName, newsData, cleanedMarket, strategyData);
          strategyPlan = strategyData.strategyPlan || null;
          dataQuality.score -= 20;
          dataQuality.warnings.push('Synthèse IA stratégique indisponible — bascule sur moteur quantitatif');
        }

        // Suivi qualité des données sur STRATEGY (fondamentaux, actualités, liquidité)
        const fundFields = ['peRatio', 'dividendYield', 'marketCap', 'roe', 'netProfit'];
        const missingFund = fundFields.filter(
          (f) => !fundamentalData.fundamentals?.[f as keyof typeof fundamentalData.fundamentals] ||
                 fundamentalData.fundamentals?.[f as keyof typeof fundamentalData.fundamentals] === 'N/A'
        );
        if (missingFund.length > 0) {
          dataQuality.missingFields.push(...missingFund);
          dataQuality.score -= missingFund.length * 5;
          dataQuality.warnings.push(`Données fondamentales manquantes: ${missingFund.join(', ')}`);
        }
        if (newsData.news && newsData.news.length > 0 && newsData.isAI === false) {
          dataQuality.score -= 15;
          dataQuality.warnings.push('Synthèse IA des actualités indisponible — sentiment par défaut NEUTRE');
        }
        if (marketData.liquidityWarning && !marketData.liquidityWarning.isLiquid) {
          dataQuality.score -= 10;
          dataQuality.warnings.push(marketData.liquidityWarning.message || 'Liquidité limitée sur ce titre');
        }
        
        // Sécurité : S'assurer que les champs destinés à l'affichage sont des strings
        if (typeof strategyPlan === 'object' && strategyPlan !== null) {
          strategyPlan = JSON.stringify(strategyPlan, null, 2);
        }
        
        // AUDIT FIX: Post-traitement transparent pour les prix cibles (symétrique BUY / SELL)
        const sanitizePriceField = (val: string | undefined, pType: 'TP' | 'SL', current: number, action?: string) => {
          if (!val || val === 'N/A' || val.includes('...')) {
            if (current <= 0) return 'N/A (prix de base indisponible)';
            if (action === 'VENDRE') {
              if (pType === 'TP') return `${(current * 0.90).toFixed(2)} MAD ⚠️ (défaut -10%, non validé techniquement)`;
              return `${(current * 1.05).toFixed(2)} MAD ⚠️ (défaut +5%, non validé techniquement)`;
            }
            if (pType === 'TP') return `${(current * 1.15).toFixed(2)} MAD ⚠️ (défaut +15%, non validé techniquement)`;
            return `${(current * 0.94).toFixed(2)} MAD ⚠️ (défaut -6%, non validé techniquement)`;
          }
          return val;
        };

        const currentVal = parseFrenchPrice(cleanedMarket.price);

        if (horizons) {
          // Sécuriser chaque horizon avec parseFrenchPrice + validatePriceLevels (bornes ATR si présentes)
          (['shortTerm', 'mediumTerm', 'longTerm'] as const).forEach(h => {
             const hData = horizons[h];
             if (hData) {
               hData.takeProfit = sanitizePriceField(hData.takeProfit, 'TP', currentVal, hData.finalAction);
               hData.stopLoss = sanitizePriceField(hData.stopLoss, 'SL', currentVal, hData.finalAction);
               hData.idealEntryPoint = hData.idealEntryPoint && hData.idealEntryPoint !== 'N/A' 
                 ? hData.idealEntryPoint : (cleanedMarket.support && cleanedMarket.support !== 'N/A' ? cleanedMarket.support : (cleanedMarket.price || 'MARKET'));

               const validated = validatePriceLevels(
                 hData.finalAction,
                 currentVal,
                 hData.takeProfit,
                 hData.stopLoss,
                 hData.idealEntryPoint,
                 cleanedMarket.atr
               );
               hData.takeProfit = validated.tp;
               hData.stopLoss = validated.sl;
               if (validated.riskRewardRatio) {
                 hData.riskRewardRatio = validated.riskRewardRatio;
               }
             }
          });
        }

        const needsPriceSync = (v?: string) => !v || v === 'N/A' || v.includes('...');
        if (orchestratorResult && horizons?.shortTerm) {
          const st = horizons.shortTerm;
          if (!orchestratorResult.finalAction && st.finalAction) {
            orchestratorResult.finalAction = st.finalAction;
          }
          if (needsPriceSync(orchestratorResult.takeProfit) && st.takeProfit) {
            orchestratorResult.takeProfit = st.takeProfit;
          }
          if (needsPriceSync(orchestratorResult.stopLoss) && st.stopLoss) {
            orchestratorResult.stopLoss = st.stopLoss;
          }
          if ((!orchestratorResult.idealEntryPoint || orchestratorResult.idealEntryPoint === 'N/A') && st.idealEntryPoint) {
            orchestratorResult.idealEntryPoint = st.idealEntryPoint;
          }
          if (!orchestratorResult.riskRewardRatio && st.riskRewardRatio) {
            orchestratorResult.riskRewardRatio = st.riskRewardRatio;
          }
          if (!orchestratorResult.confidenceLevel && st.confidenceLevel) {
            orchestratorResult.confidenceLevel = st.confidenceLevel;
          }
        }

        // Garde de cohérence multi-horizons : signal ACHETER CT contredit par MT/LT
        const isIlliquidTitle = Boolean(marketData.liquidityWarning && marketData.liquidityWarning.isLiquid === false);
        const shortAction = horizons?.shortTerm?.finalAction;
        const medAction = horizons?.mediumTerm?.finalAction;
        const longAction = horizons?.longTerm?.finalAction;
        const hasMultiHorizonDivergence =
          shortAction === 'ACHETER' &&
          ((medAction === 'VENDRE' && longAction === 'VENDRE') ||
            (isIlliquidTitle && longAction === 'VENDRE'));
        if (hasMultiHorizonDivergence && horizons?.shortTerm && orchestratorResult) {
          horizons.shortTerm.confidenceLevel = 'Faible';
          orchestratorResult.confidenceLevel = 'Faible';
          const coherenceNote =
            'Divergence multi-horizons : signal acheteur court terme contredit par les perspectives moyen/long terme.';
          orchestratorResult.contradictionDetected = orchestratorResult.contradictionDetected
            ? `${orchestratorResult.contradictionDetected} | ${coherenceNote}`
            : coherenceNote;
          dataQuality.warnings.push(`⚠️ ${coherenceNote}`);
        }

        if (orchestratorResult) {
          const rootValidated = validatePriceLevels(
            orchestratorResult.finalAction,
            currentVal,
            orchestratorResult.takeProfit,
            orchestratorResult.stopLoss,
            orchestratorResult.idealEntryPoint,
            cleanedMarket.atr
          );
          orchestratorResult.takeProfit = rootValidated.tp;
          orchestratorResult.stopLoss = rootValidated.sl;
          if (rootValidated.riskRewardRatio) {
            orchestratorResult.riskRewardRatio = rootValidated.riskRewardRatio;
          }
        }

        let idealEntry = horizons?.shortTerm?.idealEntryPoint || orchestratorResult?.idealEntryPoint;
        if (typeof idealEntry === 'object' && idealEntry !== null) {
          idealEntry = JSON.stringify(idealEntry);
        }

        const fallbackEntry = (!cleanedMarket.support || cleanedMarket.support.includes('N/A')) 
             ? (cleanedMarket.price || 'MARKET') : `${cleanedMarket.support} - ${cleanedMarket.price}`;

        const resolvedAction = horizons?.shortTerm?.finalAction || orchestratorResult?.finalAction || 'ATTENDRE';
        const resolvedConfidence =
          horizons?.shortTerm?.confidenceLevel ||
          orchestratorResult?.confidenceLevel ||
          (orchestratorResult?.risk === 'Élevé' ? 'Faible' : 'Moyen');

        result = {
          ...result,
          ...newsData,
          ...cleanedMarket,
          fundamentals: fundamentalData.fundamentals,
          orchestrator: orchestratorResult,
          horizons: horizons,
          strategyPlan: strategyPlan || 'Observation en cours.',
          idealEntryPoint: idealEntry || fallbackEntry,
          riskExplication: (typeof orchestratorResult?.riskExplication === 'object' && orchestratorResult.riskExplication !== null ? Object.values(orchestratorResult.riskExplication).join(' | ') : orchestratorResult?.riskExplication) || 'Risque de volatilité standard pour le secteur.',
          recommendedAction: resolvedAction,
          confidenceLevel: resolvedConfidence as Confidence,
          isAI: Boolean(orchestratorResult?.isAI),
          isPremiumSignal: isPremium,
          fibonacci: (cleanedMarket as any).fibonacci || undefined,
          marketRegime: resolvedRegime,
        };

        // Sécurité ultime pour les 5 valeurs de SentimentSchema (ne jamais écraser FORTEMENT_POSITIF/NEGATIF)
        if (!['FORTEMENT_POSITIF', 'POSITIF', 'NEUTRE', 'NEGATIF', 'FORTEMENT_NEGATIF'].includes(result.globalSentiment as string)) {
          result.globalSentiment = 'NEUTRE';
        }
        if (!['ACHETER', 'ATTENDRE', 'VENDRE'].includes(result.recommendedAction as string)) {
          result.recommendedAction = 'ATTENDRE';
        }
      }

      onProgress?.(`VALIDATION ZOD & ENREGISTREMENT CACHE...`);

      // AUDIT FIX: Clamp data quality score
      dataQuality.score = Math.max(0, Math.min(100, dataQuality.score));
      result.dataQuality = dataQuality;

      // 2. Validation de sortie via ZOD
      const validation = CompanyAnalysisSchema.safeParse(result);
      if (!validation.success) {
        console.warn("[Orchestrator] ⚠️ Validation Zod échouée pour", searchTicker);
        console.warn(JSON.stringify(validation.error.format(), null, 2));
        
        // AUDIT FIX: Ne plus bypasser la validation — Enrichir le résultat pour passer Zod
        // On complète les champs obligatoires manquants avec des valeurs sûres
        if (!result.globalSentiment) result.globalSentiment = 'NEUTRE';
        if (!result.probableImpact) result.probableImpact = 'Impact non déterminé.';
        
        // Champs supplémentaires qui pourraient manquer et faire crasher la validation
        if (type === 'STRATEGY') {
          if (!result.recommendedAction) result.recommendedAction = 'ATTENDRE';
          if (!result.strategyPlan) result.strategyPlan = 'Analyse en cours...';
        }
        
        // Re-validation après correction
        const revalidation = CompanyAnalysisSchema.safeParse(result);
        if (!revalidation.success) {
          console.error("[Orchestrator] ❌ Validation Zod échouée même après correction. Erreurs:", JSON.stringify(revalidation.error.format(), null, 2));
          dataQuality.warnings.push('⚠️ La validation des données a échoué. Résultats potentiellement incomplets.');
          dataQuality.score = Math.max(0, dataQuality.score - 20);
          result.dataQuality = dataQuality;
          
          // Ultime fallback manuel: Retourner un squelette 100% typé au lieu de "...result" pour éviter les crashs React
          const safeString = (val: any, fallback: string) => typeof val === 'string' ? val : fallback;
          return {
            id: safeString(result?.id, Math.random().toString()),
            date: safeString(result?.date, new Date().toLocaleString()),
            companyName: safeString(result?.companyName, searchName),
            type: type as any,
            globalSentiment: 'NEUTRE',
            probableImpact: 'Impact inconnu suite à une corruption des données IA.',
            recommendedAction: 'ATTENDRE',
            globalScore: 0,
            isAI: false,
            confidenceLevel: 'Moyen',
            news: [],
            signals: ['Erreur de format IA - Signaux non disponibles'],
            technicalTrend: 'Neutre',
            marketSituation: 'L\'IA a généré un format de données invalide.',
            strategyPlan: 'Veuillez relancer l\'analyse. Les données reçues sont corrompues.',
            dataQuality: {
              score: 10,
              warnings: ['Format de données invalide (Crash interface évité)'],
              missingFields: [],
              sources: [],
            },
            orchestrator: {
              finalAction: 'ATTENDRE',
              idealEntryPoint: 'MARKET',
              takeProfit: 'N/A',
              stopLoss: 'N/A',
              risk: 'Moyen',
              why: 'Impossible de parser la stratégie suite à une erreur de formatage Gemini.',
              keyPoints: ['Analyse indisponible', 'Format JSON corrompu'],
              isAI: false
            },
            horizons: {
              shortTerm: {
                finalAction: 'ATTENDRE',
                idealEntryPoint: 'MARKET',
                takeProfit: 'N/A',
                stopLoss: 'N/A',
                risk: 'Moyen',
                why: 'Analyse indisponible',
                keyPoints: ['Erreur de parsing'],
                isAI: false
              }
            }
          } as unknown as CompanyAnalysis;
        }
        
        const finalResult = revalidation.data;
        CacheService.set(searchTicker, type, finalResult).catch(e => console.error(e));
        return finalResult;
      }

      const finalResult = validation.data;

      // 3. Save to Cache (Async)
      CacheService.set(searchTicker, type, finalResult).catch(e => console.error(e));

      return finalResult;

      } catch (error) {
        console.error("Orchestration Error:", error);
        throw error;
      } finally {
        await CacheService.releaseLock(lockKey, lockToken);
      }
    };

    const flightPromise = computeAnalysis();
    if (!forceRefresh) {
      this.inFlightRequests.set(flightKey, flightPromise);
    }
    try {
      return await flightPromise;
    } finally {
      if (!forceRefresh && this.inFlightRequests.get(flightKey) === flightPromise) {
        this.inFlightRequests.delete(flightKey);
      }
    }
  }

  /**
   * AUDIT FIX: Fallback data-driven au lieu de texte générique
   * Chaque phrase est construite à partir des données réelles
   */
  private static generateFinalOrchestration(
    company: string, 
    news: Partial<CompanyAnalysis>, 
    market: Partial<CompanyAnalysis>, 
    strategy: Partial<CompanyAnalysis>
  ): OrchestratorResult {
    
    let contradiction = undefined;
    const isPositiveNews = news.globalSentiment === 'POSITIF' || news.globalSentiment === 'FORTEMENT_POSITIF';
    const isNegativeNews = news.globalSentiment === 'NEGATIF' || news.globalSentiment === 'FORTEMENT_NEGATIF';
    if (isPositiveNews && (market.technicalTrend === 'Baissière' || market.marketSituation?.toLowerCase().includes('baissière'))) {
      contradiction = "Divergence détectée : Le sentiment d'actualité est positif mais la tendance technique actuelle est baissière. Prudence accrue recommandée.";
    }
    if (isNegativeNews && (market.technicalTrend === 'Haussière' || market.marketSituation?.toLowerCase().includes('haussière'))) {
      contradiction = "Divergence détectée : Le sentiment d'actualité est négatif mais la tendance technique est haussière. Signal contradictoire.";
    }

    const currentPrice = parseFrenchPrice(market.price);
    const rsiStr = typeof market.rsi === 'object' ? `RSI à ${market.rsi.value} (${market.rsi.interpretation})` : 'RSI non disponible';
    const sentimentStr = news.globalSentiment || 'NEUTRE';
    const isBuy = strategy.recommendedAction === 'ACHETER';
    const isSell = strategy.recommendedAction === 'VENDRE';
    
    // AUDIT FIX: Prix cibles cohérents ou N/A si prix = 0, et R:R mathématique réel
    let tp: string, sl: string, riskRewardRatio = 'N/A';
    if (currentPrice > 0) {
      const tpNum = isBuy ? currentPrice * 1.10 : isSell ? currentPrice * 0.90 : currentPrice * 1.08;
      const slNum = isBuy ? currentPrice * 0.95 : isSell ? currentPrice * 1.04 : currentPrice * 0.94;
      tp = isBuy ? `${tpNum.toFixed(2)} MAD ⚠️ (estimation +10%)` : 
           isSell ? `${tpNum.toFixed(2)} MAD ⚠️ (cible repli -10%)` :
           `${tpNum.toFixed(2)} MAD ⚠️ (estimation +8%)`;
      sl = isBuy ? `${slNum.toFixed(2)} MAD ⚠️ (estimation -5%)` :
           isSell ? `${slNum.toFixed(2)} MAD (invalidation +4%)` :
           `${slNum.toFixed(2)} MAD ⚠️ (estimation -6%)`;
      const reward = Math.abs(tpNum - currentPrice);
      const riskDiff = Math.abs(currentPrice - slNum);
      if (riskDiff > 0) {
        riskRewardRatio = `1:${(reward / riskDiff).toFixed(1)}`;
      }
    } else {
      tp = 'N/A (prix de base indisponible)';
      sl = 'N/A (prix de base indisponible)';
    }
    
    const resolvedEntry = (!market.support || market.support.includes('N/A') || market.support.includes('INDISPONIBLE')) 
      ? (market.price && !market.price.includes('INDISPONIBLE') ? market.price : 'MARKET') : market.support;

    // AUDIT FIX: Texte construit à partir des données réelles (plus de templates génériques)
    const buildSituation = () => {
      const parts: string[] = [];
      if (currentPrice > 0) parts.push(`${company} cote à ${currentPrice.toFixed(2)} MAD`);
      else parts.push(`${company}: cours non disponible`);
      
      if (typeof market.rsi === 'object' && market.rsi.value !== 'N/A') {
        parts.push(`avec un ${rsiStr}`);
      }
      parts.push(`sur un sentiment de marché ${sentimentStr.toLowerCase()}`);
      return parts.join(', ') + '.';
    };

    const buildKeyPoints = () => {
      const points: string[] = [];
      if (market.technicalTrend) points.push(`Tendance technique : ${market.technicalTrend}`);
      if (market.variation) points.push(`Variation en séance : ${market.variation}`);
      if (news.probableImpact && news.probableImpact !== 'Aucun catalyseur majeur détecté.') {
        points.push(`Impact actualités : ${news.probableImpact}`);
      }
      if (contradiction) points.push(contradiction);
      if (points.length === 0) points.push('Aucun signal majeur détecté pour le moment.');
      return points;
    };

    const isIlliquid = Boolean(market.liquidityWarning && !market.liquidityWarning.isLiquid);
    const computedRisk: Confidence = (isSell || isIlliquid) ? 'Élevé' : (contradiction || !isBuy) ? 'Moyen' : 'Faible';

    return {
      currentSituation: buildSituation(),
      keyPoints: buildKeyPoints(),
      opportunity: strategy.recommendedAction === 'ACHETER' ? 'Oui' : 
                   strategy.recommendedAction === 'VENDRE' ? 'Non' : 'À surveiller',
      risk: computedRisk,
      finalAction: (strategy.recommendedAction || 'ATTENDRE') as Action,
      why: strategy.strategyPlan || `Analyse basée sur les données disponibles. Sentiment: ${sentimentStr}, ${rsiStr}.`,
      contradictionDetected: contradiction,
      idealEntryPoint: resolvedEntry,
      takeProfit: tp,
      stopLoss: sl,
      riskRewardRatio,
      confidenceLevel: strategy.confidenceLevel || 'Moyen',
      isAI: false
    };
  }

  private static cleanMarketData(data: Partial<CompanyAnalysis>): Partial<CompanyAnalysis> {
    if (data.price === 'INDISPONIBLE') {
      return {
        ...data,
        price: 'INDISPONIBLE',
        support: 'N/A',
        resistance: 'N/A',
      };
    }

    const formatOrNA = (val: string | undefined): string => {
      const n = parseFrenchPrice(val);
      return n > 0 ? `${n.toFixed(2)} MAD` : 'N/A';
    };

    return {
      ...data,
      price: data.price ? formatOrNA(data.price) : 'N/A',
      support: formatOrNA(data.support),
      resistance: formatOrNA(data.resistance),
    };
  }

  /**
   * AUDIT IMPROVEMENT: Persistance des news individuelles pour l'historisation
   */
  private static async persistNewsItems(companyId: string, news: any[]) {
    if (!supabaseAdmin) return;
    
    try {
      const items = news.map(n => ({
        company_id: companyId,
        title: n.summary,
        source: n.source,
        url: n.url,
        sentiment_label: n.sentiment,
        impact: n.impact,
        timestamp: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('news_items')
        .upsert(items, { onConflict: 'url' });

      if (error) console.error("[Orchestrator] Error persisting news items:", error.message);
      else console.log(`[Orchestrator] 📊 ${items.length} news items historisés.`);
    } catch (e) {
      console.error("[Orchestrator] Persistence exception:", e);
    }
  }
}

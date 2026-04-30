import { NewsWorker, MarketWorker, StrategyWorker, FundamentalWorker } from './agents/worker-agents';
import { GeminiService } from './gemini';
import { supabaseAdmin } from './supabase';
import { AnalysisCache } from './cache-service';
import { InputSanitizer } from './input-sanitizer';
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

// On exporte les types depuis ici aussi pour la compatibilité
export type { CompanyAnalysis, AgentType, OrchestratorResult, Action, Sentiment, Confidence, Opportunity };

/**
 * ORCHESTRATEUR AETHERIS (Server-Only Core)
 * ✅ Combine + Nettoie + Structure + Analyse Critique + Cache
 * AUDIT FIX: Circuit breakers, Zod enforcement, data quality tracking, source transparency
 */
export class AetherisOrchestrator {
  
  /**
   * AUDIT FIX: Rate limiting hybride (Supabase-backed + fallback mémoire)
   * Survit aux cold starts et redéploiements serverless.
   */
  private static memoryRequestCount = 0;
  private static memoryWindowStart = Date.now();
  private static readonly MAX_REQUESTS_PER_MINUTE = 15;

  private static async checkRateLimit(): Promise<boolean> {
    try {
      // Vérifier en DB le nombre d'analyses créées dans la dernière minute
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { count, error } = await supabaseAdmin
        .from('analyses_cache')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneMinuteAgo);
      
      if (!error && count !== null) {
        return count >= this.MAX_REQUESTS_PER_MINUTE;
      }
    } catch {
      // Fallback silencieux sur la vérification mémoire
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

  static async process(companyName: string, type: AgentType, forceRefresh: boolean = false): Promise<CompanyAnalysis> {
    
    // SECURITY: Sanitize user input before any processing
    if (InputSanitizer.detectInjection(companyName)) {
      console.warn(`[Orchestrator] ⚠️ PROMPT INJECTION DETECTED: "${companyName.substring(0, 50)}"`);
      throw new Error('Entrée invalide détectée.');
    }
    companyName = InputSanitizer.sanitizeCompanyName(companyName);

    // AUDIT FIX: Rate limiting hybride (Supabase-backed)
    if (await this.checkRateLimit()) {
      throw new Error('RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques secondes.');
    }

    // 0. Smart Ticker Resolution (Ex: 'IAM' -> 'MAROC TELECOM')
    const queryTerm = companyName.toUpperCase().trim();
    let symbol = queryTerm;
    let resolvedName = queryTerm;
    let sector: string | undefined = undefined;
    let companyDbId: string | undefined = undefined;

    try {
      // 🕵️ PRIORITÉ : Recherche en Base de Données (Plus fiable et rapide)
      const dbQueryTerm = InputSanitizer.sanitizeForDb(queryTerm);
      const { data: dbCompany } = await supabaseAdmin
        .from('companies')
        .select('id, name, symbol, sector')
        .or(`symbol.eq.${dbQueryTerm},name.ilike.%${dbQueryTerm}%`)
        .maybeSingle();

      if (dbCompany) {
        companyDbId = dbCompany.id; // Capture de l'ID pour l'historisation
        symbol = dbCompany.symbol;
        resolvedName = dbCompany.name;
        sector = dbCompany.sector || undefined;
        console.log(`[Orchestrator] 🏛️ Résolution DB: ${symbol} (${resolvedName}) [${sector}]`);
      } else {
        // FALLBACK : IA (Gemini)
        console.log(`[Orchestrator] 🤖 Résolution IA pour "${companyName}"...`);
        const aiResolved = await GeminiService.resolveTicker(companyName);
        symbol = aiResolved.symbol;
        resolvedName = aiResolved.companyName;
      }
    } catch (e) {
      console.error("[Orchestrator] Resolution Error:", e);
    }

    const searchName = resolvedName.toUpperCase();
    const searchTicker = symbol.toUpperCase();
    
    // 1. Check Cache first
    const cachedResult = await AnalysisCache.get(searchTicker, type, forceRefresh);
    if (cachedResult) {
      console.log(`[Orchestrator] 🧊 CACHE HIT : Chargement instantané pour ${searchTicker} (${type}).`);
      return cachedResult;
    }

    console.log(`[Orchestrator] 🚀 Launching Engine: Ticker="${searchTicker}", Nom="${searchName}"`);
    
    // AUDIT FIX: Tracker de qualité des données
    const dataQuality: DataQuality = {
      score: 100,
      warnings: [],
      missingFields: [],
      sources: [],
    };

    let result: Partial<CompanyAnalysis> = {
      id: companyDbId || Math.random().toString(36).substring(2, 11),
      companyName: resolvedName,
      sector: sector,
      date: new Date().toLocaleDateString('fr-FR'),
      type: type,
    };

    try {
      if (type === 'SENTIMENT') {
        const newsData = await NewsWorker.analyze(searchName);
        
        // --- AUDIT IMPROVEMENT: HISTORISATION & MOMENTUM ---
        if (newsData.news && companyDbId) {
          this.persistNewsItems(companyDbId, newsData.news).catch(e => console.error(e));
          
          // Calcul du Momentum (Comparaison avec le cache précédent)
          const previousAnalysis = await AnalysisCache.get(searchTicker, 'SENTIMENT', false);
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

        result = { ...result, ...newsData };
        dataQuality.sources.push('RSS');
        if (!newsData.news || newsData.news.length === 0) {
          dataQuality.warnings.push('Aucune actualité trouvée — Sentiment par défaut NEUTRE');
          dataQuality.score -= 20;
        }
      } 
      else if (type === 'TECHNICAL') {
        const marketData = await MarketWorker.analyze(searchName);
        result = { ...result, ...this.cleanMarketData(marketData) };
        dataQuality.sources.push('BMCE');
        
        // AUDIT FIX: Dégrader le score si données techniques insuffisantes
        if (marketData.price === 'INDISPONIBLE') {
          dataQuality.score -= 60;
          dataQuality.warnings.push('Prix indisponible — Analyse technique impossible');
          dataQuality.missingFields.push('price');
        }
        if (marketData.signals?.some(s => s.includes('insuffisantes'))) {
          dataQuality.score -= 20;
          dataQuality.warnings.push('Historique limité — Indicateurs techniques dégradés');
        }
      } 
      else if (type === 'FUNDAMENTAL') {
        // On récupère le prix d'abord pour ancrer l'IA
        const marketData = await MarketWorker.analyze(searchName);
        const fundamentalData = await FundamentalWorker.analyze(searchName, marketData.price, { name: resolvedName, symbol: searchTicker });
        result = { 
          ...result, 
          fundamentals: {
            ...fundamentalData.fundamentals,
            sector: sector
          },
          price: marketData.price
        };
        dataQuality.sources.push('BMCE', 'CASABOURSE');

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
        const [newsData, marketData] = await Promise.all([
          NewsWorker.analyze(searchName),
          MarketWorker.analyze(searchName)
        ]);
        
        // AUDIT FIX: Circuit breaker — Vérifier les données avant de continuer
        if (marketData.price === 'INDISPONIBLE') {
          console.error(`[Orchestrator] ❌ CIRCUIT BREAKER: Prix indisponible pour ${searchName}. Stratégie dégradée.`);
          dataQuality.score -= 50;
          dataQuality.warnings.push('⚠️ CIRCUIT BREAKER: Prix indisponible — Recommandation non fiable');
          dataQuality.missingFields.push('price');
        }

        // Les fondamentaux dépendent du prix pour l'IA fallback
        const fundamentalData = await FundamentalWorker.analyze(searchName, marketData.price, { name: resolvedName, symbol: searchTicker });
        
        const cleanedMarket = this.cleanMarketData(marketData);
        
        // Enrichissement des fondamentaux avec le secteur de la DB
        if (fundamentalData.fundamentals) {
          fundamentalData.fundamentals.sector = sector;
        }

        // Fetch Macro Data (Pétrole, Or, USD/MAD) pour contextualiser l'IA
        const macroData = await MacroScraper.getMacroData();
        
        // Sources tracking
        dataQuality.sources.push('BMCE', 'CASABOURSE', 'RSS');
        if (macroData) dataQuality.sources.push('YAHOO');

        // Signal Premium
        const rsiVal = typeof cleanedMarket.rsi === 'object' ? parseFloat(cleanedMarket.rsi.value) : 50;
        const sentScore = newsData.globalScore || 0;
        const isPremium = (sentScore > 0.4 && rsiVal < 40) || (sentScore < -0.4 && rsiVal > 65);

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
        
        if (orchestratorResult) {
          orchestratorResult.isAI = true;
          // Si on a des horizons, on utilise le court terme comme plan par défaut pour la compatibilité
          strategyPlan = horizons?.shortTerm?.strategyPlan || (orchestratorResult as any).strategyPlan || null;
          
          if (!strategyPlan) {
            strategyPlan = await GeminiService.generateStrategyPlan({ 
              ...result, ...cleanedMarket, orchestrator: orchestratorResult 
            });
          }
        } else {
          const strategyData = StrategyWorker.synthesize(newsData, cleanedMarket);
          orchestratorResult = this.generateFinalOrchestration(searchName, newsData, cleanedMarket, strategyData);
          strategyPlan = strategyData.strategyPlan || null;
        }
        
        // Sécurité : S'assurer que les champs destinés à l'affichage sont des strings
        if (typeof strategyPlan === 'object') {
          strategyPlan = JSON.stringify(strategyPlan, null, 2);
        }
        
        // AUDIT FIX: Post-traitement plus transparent pour les prix cibles
        const sanitizePriceField = (val: string | undefined, type: 'TP' | 'SL', current: number) => {
          if (!val || val === 'N/A' || val.includes('...')) {
            // AUDIT FIX: On calcule un défaut mais on le signale
            if (current <= 0) return 'N/A (prix de base indisponible)';
            if (type === 'TP') return `${(current * 1.15).toFixed(2)} ⚠️ (défaut +15%, non validé techniquement)`;
            return `${(current * 0.94).toFixed(2)} ⚠️ (défaut -6%, non validé techniquement)`;
          }
          return val;
        };

        const currentVal = parseFloat(
          (cleanedMarket.price || '0').replace(' MAD', '').replace('INDISPONIBLE', '0')
        );

        if (horizons) {
          // Sécuriser chaque horizon
          (['shortTerm', 'mediumTerm', 'longTerm'] as const).forEach(h => {
             const hData = horizons[h];
             if (hData) {
               hData.takeProfit = sanitizePriceField(hData.takeProfit, 'TP', currentVal);
               hData.stopLoss = sanitizePriceField(hData.stopLoss, 'SL', currentVal);
               hData.idealEntryPoint = hData.idealEntryPoint && hData.idealEntryPoint !== 'N/A' 
                 ? hData.idealEntryPoint : (cleanedMarket.support || cleanedMarket.price);
             }
          });
        }

        let idealEntry = horizons?.shortTerm?.idealEntryPoint || orchestratorResult?.idealEntryPoint;
        if (typeof idealEntry === 'object') {
          idealEntry = JSON.stringify(idealEntry);
        }

        const fallbackEntry = (!cleanedMarket.support || cleanedMarket.support.includes('N/A')) 
             ? 'MARKET' : `${cleanedMarket.support} - ${cleanedMarket.price}`;

        // AUDIT FIX: Tracker les données fondamentales manquantes 
        const fundFields = ['peRatio', 'dividendYield', 'marketCap', 'roe', 'netProfit'];
        const missingFund = fundFields.filter(f => {
          const v = fundamentalData.fundamentals?.[f as keyof typeof fundamentalData.fundamentals];
          return !v || v === 'N/A';
        });
        if (missingFund.length > 0) {
          dataQuality.missingFields.push(...missingFund);
          dataQuality.score -= (missingFund.length * 5);
          dataQuality.warnings.push(`Fondamentaux manquants: ${missingFund.join(', ')}`);
        }

        result = {
          ...result,
          ...newsData,
          ...cleanedMarket,
          fundamentals: fundamentalData.fundamentals,
          orchestrator: orchestratorResult,
          horizons: horizons,
          strategyPlan: strategyPlan || 'Observation en cours.',
          idealEntryPoint: idealEntry || fallbackEntry,
          riskExplication: (typeof orchestratorResult?.riskExplication === 'object' ? Object.values(orchestratorResult.riskExplication).join(' | ') : orchestratorResult?.riskExplication) || 'Risque de volatilité standard pour le secteur.',
          recommendedAction: horizons?.shortTerm?.finalAction || orchestratorResult?.finalAction || 'ATTENDRE',
          isPremiumSignal: isPremium,
          fibonacci: (cleanedMarket as any).fibonacci || undefined,
        };

        // Sécurité ultime pour les enums globaux
        if (!['POSITIF', 'NEGATIF', 'NEUTRE'].includes(result.globalSentiment as string)) {
          result.globalSentiment = 'NEUTRE';
        }
        if (!['ACHETER', 'ATTENDRE', 'VENDRE'].includes(result.recommendedAction as string)) {
          result.recommendedAction = 'ATTENDRE';
        }
      }

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
        
        // Re-validation après correction
        const revalidation = CompanyAnalysisSchema.safeParse(result);
        if (!revalidation.success) {
          console.error("[Orchestrator] ❌ Validation Zod échouée même après correction. Erreurs:", JSON.stringify(revalidation.error.format(), null, 2));
          // AUDIT FIX: On ajoute un warning mais on retourne le résultat (downgrade, pas crash)
          dataQuality.warnings.push('⚠️ La validation des données a échoué. Résultats potentiellement incomplets.');
          dataQuality.score = Math.max(0, dataQuality.score - 20);
          result.dataQuality = dataQuality;
          return result as CompanyAnalysis;
        }
        
        const finalResult = revalidation.data;
        AnalysisCache.set(searchTicker, type, finalResult).catch(e => console.error(e));
        return finalResult;
      }

      const finalResult = validation.data;

      // 3. Save to Cache (Async)
      AnalysisCache.set(searchTicker, type, finalResult).catch(e => console.error(e));

      return finalResult;

    } catch (error) {
      console.error("Orchestration Error:", error);
      throw error;
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
    if (news.globalSentiment === 'POSITIF' && market.marketSituation?.includes('baissière')) {
      contradiction = "Divergence détectée : Le sentiment d'actualité est positif mais la tendance technique actuelle est baissière. Prudence accrue recommandée.";
    }
    if (news.globalSentiment === 'NEGATIF' && market.technicalTrend === 'Haussière') {
      contradiction = "Divergence détectée : Le sentiment d'actualité est négatif mais la tendance technique est haussière. Signal contradictoire.";
    }

    const currentPrice = parseFloat((market.price || '0').replace(' MAD', '').replace(',', '.').replace('INDISPONIBLE', '0'));
    const rsiStr = typeof market.rsi === 'object' ? `RSI à ${market.rsi.value} (${market.rsi.interpretation})` : 'RSI non disponible';
    const sentimentStr = news.globalSentiment || 'NEUTRE';
    const isBuy = strategy.recommendedAction === 'ACHETER';
    const isSell = strategy.recommendedAction === 'VENDRE';
    
    // AUDIT FIX: Prix cibles cohérents ou N/A si prix = 0
    let tp: string, sl: string;
    if (currentPrice > 0) {
      tp = isBuy ? `${(currentPrice * 1.1).toFixed(2)} MAD ⚠️ (estimation +10%)` : 
           isSell ? 'N/A (Signal de sortie)' :
           `${(currentPrice * 1.08).toFixed(2)} MAD ⚠️ (estimation +8%)`;
      sl = isBuy ? `${(currentPrice * 0.95).toFixed(2)} MAD ⚠️ (estimation -5%)` :
           isSell ? `${(currentPrice * 1.03).toFixed(2)} MAD (Invalidation si rebond)` :
           `${(currentPrice * 0.94).toFixed(2)} MAD ⚠️ (estimation -6%)`;
    } else {
      tp = 'N/A (prix de base indisponible)';
      sl = 'N/A (prix de base indisponible)';
    }
    
    const resolvedEntry = (!market.support || market.support.includes('N/A') || market.support.includes('INDISPONIBLE')) 
      ? 'MARKET' : market.support;

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

    return {
      currentSituation: buildSituation(),
      keyPoints: buildKeyPoints(),
      opportunity: strategy.recommendedAction === 'ACHETER' ? 'Oui' : 
                   strategy.recommendedAction === 'VENDRE' ? 'Non' : 'À surveiller',
      risk: (contradiction ? 'Moyen' : 'Faible') as Confidence,
      finalAction: (strategy.recommendedAction || 'ATTENDRE') as Action,
      why: strategy.strategyPlan || `Analyse basée sur les données disponibles. Sentiment: ${sentimentStr}, ${rsiStr}.`,
      contradictionDetected: contradiction,
      idealEntryPoint: resolvedEntry,
      takeProfit: tp,
      stopLoss: sl,
      riskRewardRatio: currentPrice > 0 ? '1:2.0' : 'N/A',
      isAI: false
    };
  }

  private static cleanMarketData(data: Partial<CompanyAnalysis>): Partial<CompanyAnalysis> {
    // AUDIT FIX: Ne pas nettoyer si le prix est INDISPONIBLE (circuit breaker)
    if (data.price === 'INDISPONIBLE') {
      return {
        ...data,
        price: 'INDISPONIBLE',
        support: 'N/A',
        resistance: 'N/A',
      };
    }

    const sanitize = (val: string | undefined) => {
      if (!val) return '0';
      const clean = val.replace(/\s/g, '');
      // Si on a à la fois un point et une virgule, le point est le millier (ex: 1.200,50)
      if (clean.includes('.') && clean.includes(',')) {
        return clean.replace(/\./g, '').replace(',', '.');
      }
      // Si on a seulement une virgule, c'est la décimale (ex: 785,10)
      if (clean.includes(',')) {
        return clean.replace(',', '.');
      }
      return clean;
    };

    const cleanPrice = sanitize(data.price);
    const cleanSupport = sanitize(data.support);
    const cleanResistance = sanitize(data.resistance);

    return {
      ...data,
      price: data.price ? `${cleanPrice} MAD` : 'N/A',
      support: data.support ? `${cleanSupport} MAD` : 'N/A',
      resistance: data.resistance ? `${cleanResistance} MAD` : 'N/A',
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

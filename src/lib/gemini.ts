import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CompanyAnalysis, OrchestratorResult, Sentiment, Impact } from './schemas';
import { InputSanitizer } from './input-sanitizer';
import crypto from 'crypto';
import { CacheService } from './cache-service';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Types for structured data passed to AI synthesis
interface FundamentalInput {
  peRatio?: string;
  dividendYield?: string;
  marketCap?: string;
  netProfit?: string;
  roe?: string;
  status?: string;
}

interface MacroInput {
  brent?: { price: number; changePercent: number };
  gold?: { price: number; changePercent: number };
  usDmad?: { price: number; changePercent: number };
  keyRate?: { value: number; lastChange: string };
  inflation?: { value: number; period: string };
  nextBAMMeeting?: string;
  timestamp?: string;
}

interface NewsItem {
  title?: string;
  summary?: string;
  source?: string;
  date?: string;
  url?: string;
  sentiment?: string;
  impact?: string;
  sourceType?: string;
  fullContent?: string;
  contentSnippet?: string;
}

const MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro'];

/** Appel via Google Generative AI avec retry + fallback
 * AUDIT FIX: Retry sur les erreurs transitoires (timeout, 500, réseau),
 * pas seulement les erreurs 429 quota.
 */
async function callGoogleAI(prompt: string, isJson: boolean = false, preferredModel?: string, customApiKey?: string, useGrounding: boolean = false, fileData?: { data: string, mimeType: string }, responseSchema?: any, temperature?: number): Promise<string> {
  const modelsToTry = preferredModel ? [preferredModel, ...MODELS.filter(m => m !== preferredModel)] : MODELS;
  const MAX_RETRIES_PER_MODEL = 2;
  const aiInstance = customApiKey ? new GoogleGenerativeAI(customApiKey) : genAI;
  
  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const generationConfig: any = isJson ? { responseMimeType: 'application/json', responseSchema } : {};
        if (temperature !== undefined) generationConfig.temperature = temperature;
        const modelOptions: any = { 
          model: modelName,
          generationConfig: (isJson || temperature !== undefined) ? generationConfig : undefined
        };
        
        if (useGrounding) {
          modelOptions.tools = [{ googleSearch: {} }];
        }
        
        const model = aiInstance.getGenerativeModel(modelOptions);
        
        const contents = fileData 
          ? [prompt, { inlineData: { data: fileData.data, mimeType: fileData.mimeType } }]
          : prompt;

        const result = await model.generateContent(contents as any);
        return result.response.text();
      } catch (e: any) {
        const isQuota = e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota');
        const isTransient = e?.status === 500 || e?.status === 503 || 
                           e?.message?.includes('ECONNRESET') || e?.message?.includes('timeout') ||
                           e?.message?.includes('fetch failed') || e?.message?.includes('network');
        const isNotFound = e?.status === 404 || e?.message?.includes('404') || e?.message?.includes('not found') || e?.message?.includes('is no longer available');
        
        console.warn(`[GoogleAI] ${modelName} attempt ${attempt}/${MAX_RETRIES_PER_MODEL} failed (${isQuota ? 'quota' : isTransient ? 'transient' : isNotFound ? 'not found' : e.message}).`);
        
        // Quota exhausted or Model Not Found → skip to next model immediately
        if (isQuota || isNotFound) break;
        
        // Transient error → retry with backoff if attempts remain
        if (isTransient && attempt < MAX_RETRIES_PER_MODEL) {
          const delay = attempt * 1500; // 1.5s, 3s
          console.log(`[GoogleAI] Retrying ${modelName} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        // Unrecoverable API error (like invalid API key) → throw to trigger Mistral
        if (e?.status === 400 || e?.message?.includes('API key')) {
          throw e;
        }
        
        // Otherwise, skip to the next model
        break;
      }
    }
  }
  throw new Error('ALL_MODELS_FAILED');
}

/** Appel Mistral (Fallback de secours) */
async function callMistral(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY_MISSING');

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mistral API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e: any) {
    console.error("[Mistral] Failed:", e.message);
    throw e;
  }
}

/** Orchestrateur d'IA avec Fallback automatique */
async function unifiedAICall(prompt: string, isJson: boolean = true, preferredModel?: string, customApiKey?: string, useGrounding: boolean = false, fileData?: { data: string, mimeType: string }, responseSchema?: any, temperature?: number): Promise<string> {
  const hashObj = prompt + isJson + (preferredModel || '') + (customApiKey || '') + useGrounding + (fileData ? 'FILE' : '');
  const hash = crypto.createHash('md5').update(hashObj).digest('hex');
  const cacheKey = `aetheris:prompt:${hash}`;

  try {
    // 0. Vérification du cache de prompt
    const cachedResult = await CacheService.getGeneric(cacheKey);
    if (cachedResult) {
      console.log(`[GeminiService] ⚡ PROMPT CACHE HIT: Réutilisation du résultat de génération (${hash})`);
      return cachedResult;
    }
  } catch (cacheErr: any) {
    console.warn("[GeminiService] Erreur lecture cache prompt:", cacheErr.message);
  }

  let resultText = '';
  try {
    const result = await callGoogleAI(prompt, isJson, preferredModel, customApiKey, useGrounding, fileData, responseSchema, temperature);
    if (isJson && safeJsonParse(result) === null) throw new Error('Invalid JSON from Gemini');
    
    CacheService.setGeneric(cacheKey, result);
    return result;
  } catch (e: any) {
    console.log(`🔄 [Fallback] Échec Google AI (${e.message || e}). Passage sur Mistral...`);
    // 2. Basculement sur Mistral
    resultText = await callMistral(prompt);
  }

  // Enregistrer le résultat dans le cache de prompts pour les appels futurs
  if (resultText) {
    try {
      await CacheService.setGeneric(cacheKey, resultText);
    } catch (cacheSetErr: any) {
      console.warn("[GeminiService] Erreur écriture cache prompt:", cacheSetErr.message);
    }
  }

  return resultText;
}


/** Extrait et parse le JSON même s'il y a du texte autour (Cas des modèles avec 'Thinking Mode') */
function safeJsonParse(text: string): any {
  if (!text) return null;
  
  try {
    // 1. Nettoyage des blocs de code Markdown
    let cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
    
    // 2. Tenter le parse direct sur le texte nettoyé
    try {
      return JSON.parse(cleaned);
    } catch {
      // 3. Tenter d'extraire le bloc JSON via les délimiteurs { et }
      // On cherche de la première accolade ouvrante à la dernière accolade fermante
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonString);
        } catch (innerError) {
          console.error("[JSON Parser] Échec du parse du bloc extrait:", innerError);
        }
      }
    }
  } catch (e) {
    console.error("[JSON Parser] Échec critique d'extraction JSON. Début du texte:", text.substring(0, 100));
  }
  return null;
}

/** 
 * Auto-correcteur pour les énumérations Zod (Indispensable pour éviter les crash de validation)
 */
function sanitizeAIResult(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const mapValue = (val: any, mapping: Record<string, string>, defaultVal: string) => {
    if (!val) return defaultVal;
    const normalized = String(val).toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Retirer accents pour la comparaison
    
    for (const [key, result] of Object.entries(mapping)) {
      if (normalized === key || normalized === result.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
        return result;
      }
    }
    return defaultVal;
  };

  const confidenceMap = { "faible": "Faible", "low": "Faible", "moyen": "Moyen", "medium": "Moyen", "eleve": "Élevé", "high": "Élevé" };
  const opportunityMap = { "oui": "Oui", "yes": "Oui", "non": "Non", "no": "Non", "surveiller": "À surveiller", "a surveiller": "À surveiller", "watch": "À surveiller" };
  const actionMap = { "acheter": "ACHETER", "buy": "ACHETER", "vendre": "VENDRE", "sell": "VENDRE", "attendre": "ATTENDRE", "hold": "ATTENDRE", "wait": "ATTENDRE" };

  // Appliquer récursivement sur les horizons et l'objet racine
  const processEntry = (entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    
    if (entry.confidenceLevel) entry.confidenceLevel = mapValue(entry.confidenceLevel, confidenceMap, "Moyen");
    if (entry.risk) entry.risk = mapValue(entry.risk, confidenceMap, "Moyen");
    if (entry.opportunity) entry.opportunity = mapValue(entry.opportunity, opportunityMap, "À surveiller");
    if (entry.finalAction) entry.finalAction = mapValue(entry.finalAction, actionMap, "ATTENDRE");
    if (entry.recommendedAction) entry.recommendedAction = mapValue(entry.recommendedAction, actionMap, "ATTENDRE");
  };

  processEntry(obj);
  if (obj.horizons) {
    if (obj.horizons.shortTerm) processEntry(obj.horizons.shortTerm);
    if (obj.horizons.mediumTerm) processEntry(obj.horizons.mediumTerm);
    if (obj.horizons.longTerm) processEntry(obj.horizons.longTerm);
  }

  return obj;
}

/**
 * PROMPT SYSTÈME STATIQUE — Extrait pour éviter la re-tokenisation à chaque appel (~30% de tokens économisés)
 */
const SYNTHESIS_SYSTEM_PROMPT = `
DIRECTIVES DE RENSEIGNEMENT :
1. TON ANALYSE DOIT REPOSER SUR LE COURS FOURNI. Toute recommandation de prix (Entry, TP, SL) doit être COHÉRENTE avec ce cours.
2. SI des données techniques sont marquées "N/A", SIGNALE-LE explicitement. Ne prétends pas avoir des données que tu n'as pas.
3. SI LA VALEUR EST SENSIBLE AUX MATIÈRES PREMIÈRES (cimentiers=pétrole, minières=or), intègre OBLIGATOIREMENT le CONTEXTE MACRO.
4. JUSTIFIE TON ACTION PAR LES CHIFFRES (ex: "Entrée proche du support à X MAD").
5. ANALYSE LE P/E RATIO : Bas (<12-15) = sous-évaluation. Élevé (>25) = justifie par la croissance. N/A = analyse dégradée.
6. ANALYSE LE RENDEMENT DIVIDENDE : Profil rendement ou croissance ?

RÈGLES D'OR :
- Réponds UNIQUEMENT en JSON valide.
- Ton institutionnel, précis et concret. Pas de généralités vagues.
- TRANSPARENCE : Si données manquantes (N/A), signale-le et ajuste la confiance à la baisse.
- Pour SL/TP si support/résistance N/A, base sur volatilité (SL -5%/-8%, TP +8%/+15%) et mentionne que c'est un défaut.

STRUCTURE JSON OBLIGATOIRE :
{
  "currentSituation": "Synthèse globale",
  "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "opportunity": "Oui" | "Non" | "À surveiller",
  "risk": "Faible" | "Moyen" | "Élevé",
  "finalAction": "ACHETER" | "VENDRE" | "ATTENDRE",
  "why": "Raisonnement global",
  "horizons": {
    "shortTerm": {
      "currentSituation": "Perspective 1-5 jours",
      "keyPoints": ["..."],
      "opportunity": "Oui" | "Non" | "À surveiller",
      "risk": "Faible" | "Moyen" | "Élevé",
      "finalAction": "ACHETER" | "VENDRE" | "ATTENDRE",
      "why": "Raisonnement CT",
      "strategyPlan": "Plan tactique immédiat",
      "idealEntryPoint": "...", "stopLoss": "...", "takeProfit": "...",
      "riskRewardRatio": "...", "confidenceLevel": "Faible" | "Moyen" | "Élevé"
    },
    "mediumTerm": {
      "currentSituation": "Perspective 2-4 semaines",
      "keyPoints": ["..."],
      "opportunity": "Oui" | "Non" | "À surveiller",
      "risk": "Faible" | "Moyen" | "Élevé",
      "finalAction": "ACHETER" | "VENDRE" | "ATTENDRE",
      "why": "Raisonnement MT",
      "strategyPlan": "Plan tactique intermédiaire",
      "idealEntryPoint": "...", "stopLoss": "...", "takeProfit": "...",
      "riskRewardRatio": "...", "confidenceLevel": "Faible" | "Moyen" | "Élevé"
    },
    "longTerm": {
      "currentSituation": "Perspective 6-12 mois",
      "keyPoints": ["..."],
      "opportunity": "Oui" | "Non" | "À surveiller",
      "risk": "Faible" | "Moyen" | "Élevé",
      "finalAction": "ACHETER" | "VENDRE" | "ATTENDRE",
      "why": "Raisonnement LT",
      "strategyPlan": "Vision stratégique long terme",
      "idealEntryPoint": "...", "stopLoss": "...", "takeProfit": "...",
      "riskRewardRatio": "...", "confidenceLevel": "Faible" | "Moyen" | "Élevé"
    }
  },
  "riskExplication": "Détails des risques transversaux"
}
`;

const TECHNICAL_SYSTEM_PROMPT = `
DIRECTIVES DE L'ANALYSTE QUANT :
1. Rédige une synthèse de convergence technique ("marketSituation") d'environ 3-4 phrases en français pour la valeur boursière concernée. Le ton doit être professionnel, précis et axé sur les faits du marché.
2. Base ton analyse sur le cours actuel et les indicateurs techniques fournis (RSI, MMS 20/50, MACD, supports et résistances, volumes).
3. Détermine une recommandation claire ("finalAction") : "ACHETER" | "VENDRE" | "ATTENDRE".
4. Justifie brièvement ton choix ("why").

STRUCTURE JSON OBLIGATOIRE :
{
  "marketSituation": "Synthèse de convergence en français...",
  "finalAction": "ACHETER" | "VENDRE" | "ATTENDRE",
  "why": "Brève justification du choix..."
}
`;

export class GeminiService {
  
  /**
   * Analyse de sentiment par batch pour les articles (Gemini Flash)
   */
  static async analyzeNewsSentiment(company: string, news: NewsItem[]): Promise<{
    globalScore: number;
    impactSummary: string;
    consolidatedSummary: string;
    details: { sentiment: Sentiment; score: number; impact: Impact; explanation?: string }[];
  }> {
    company = InputSanitizer.sanitizeCompanyName(company);
    if (!process.env.GEMINI_API_KEY) {
      return { globalScore: 0, impactSummary: '', consolidatedSummary: '', details: [] };
    }

    // Calcul de la densité (Volume Boost)
    const recentNewsCount = news.length;
    const isHighVolume = recentNewsCount >= 5;
    const volumeDensityNote = isHighVolume 
      ? `\n⚠️ ALERTE DENSITÉ : ${recentNewsCount} articles détectés. Le marché est en pleine ébullition sur cette valeur. Augmente la pondération du sentiment de 20% si le flux est cohérent.`
      : "";

    try {
      const prompt = `
        En tant qu'analyste financier expert de la Bourse de Casablanca, analyse ces actualités EXCLUSIVEMENT pour la société "${company}".
        ${volumeDensityNote}
        
        TÂCHE : 
        1. Rédige une "consolidatedSummary" : Une synthèse professionnelle de 3-4 sentences qui combine TOUTES les informations pertinentes. 
           Ce résumé doit raconter l'histoire globale de ce qui se passe pour la société au vu des actualités récentes.
        2. Évalue chaque article individuellement pour le tableau de détails.
        
        PONDÉRATION DES SOURCES :
        - [OFFICIAL] (AMMC, etc.) : Poids 2.0 (Importance Critique).
        - [SPECIALIZED] (Médias24, BMCE) : Poids 1.5 (Expertise Marché).
        - [GENERAL] : Poids 1.0 (Information Standard).
        
        RÈGLES CRITIQUES :
        1. FILTRAGE INTELLIGENT: IGNORE toute actualité qui ne concerne PAS directement la société "${company}" ou ses filiales. (ex: "IAM" peut parfois désigner Identity Access Management dans des articles IT internationaux. Ce sont de FAUX POSITIFS, ignore-les en donnant un score de 0).
        2. Si un article parle du Maroc en général ou d'un secteur macro sans lien DIRECT avec "${company}", donne-lui un score de 0.
        3. Donne un score numérique précis entre -1.0 (Très Négatif) et 1.0 (Très Positif).
           Assigne le sentiment individuel selon ces seuils :
           - Score >= 0.6 : FORTEMENT_POSITIF
           - Score entre 0.15 (inclus) et 0.6 : POSITIF
           - Score entre -0.15 (exclus) et 0.15 (exclus) : NEUTRE
           - Score entre -0.6 et -0.15 (inclus) : NEGATIF
           - Score <= -0.6 : FORTEMENT_NEGATIF
        4. Le score global est la moyenne PONDÉRÉE des articles PERTINENTS uniquement.
        
        Réponds UNIQUEMENT en JSON valide avec ce schéma exact :
        {
          "globalScore": number,
          "impactSummary": "Bref résumé de l'impact immédiat",
          "consolidatedSummary": "Synthèse narrative complète combinant toutes les sources en un seul récit cohérent.",
          "details": [
            { 
              "articleId": "art-0",
              "sentiment": "FORTEMENT_POSITIF" | "POSITIF" | "NEUTRE" | "NEGATIF" | "FORTEMENT_NEGATIF", 
              "score": number, 
              "impact": "Court terme" | "Moyen terme" | "Long terme",
              "explanation": "1 phrase très percutante expliquant précisément pourquoi cette news a ce score."
            }
          ]
        }
        
        ACTUALITÉS À ANALYSER :
        ${news.map((n, i) => {
          const articleId = `art-${i}`;
          let entry = `[ID:${articleId}] ${i + 1}. [${n.sourceType || 'GENERAL'}] [${n.source}] TITLE: ${n.title}`;
          if (n.fullContent) {
            entry += `\n   CONTENT: ${n.fullContent.substring(0, 3000)}`; // On limite pour pas exploser le contexte inutilement
          } else {
            entry += `\n   SUMMARY: ${n.contentSnippet || 'N/A'}`;
          }
          return entry;
        }).join('\n\n')}
      `;

      let text = await unifiedAICall(prompt, true, 'gemini-1.5-flash', undefined, false, undefined, undefined, 0.3);
      const parsed = safeJsonParse(text);
      
      // BUG FIX #6: safeJsonParse can return null if AI response is malformed JSON.
      // Returning null from a function declared non-nullable causes crashes at the call site.
      if (!parsed) {
        console.warn('[GeminiService] ⚠️ analyzeNewsSentiment: AI returned unparseable JSON. Using neutral fallback.');
        return {
          globalScore: 0,
          impactSummary: 'Analyse indisponible (réponse IA non parseable).',
          consolidatedSummary: '⚠️ La synthèse IA est temporairement indisponible.',
          details: Array(news.length).fill({ sentiment: 'NEUTRE', score: 0, impact: 'Court terme' })
        };
      }
      return sanitizeAIResult(parsed);
    } catch (e) {
      console.error("Gemini News Sentiment Error:", e);
      return { 
        globalScore: 0, 
        impactSummary: 'Indisponible', 
        consolidatedSummary: '⚠️ La synthèse IA complète est temporairement indisponible.',
        details: Array(news.length).fill({ sentiment: 'NEUTRE', score: 0, impact: 'Court terme' }) 
      };
    }
  }

  /**
   * AUDIT FIX: Fonction d'estimation IA SUPPRIMÉE.
   * Un LLM ne doit JAMAIS inventer des ratios financiers.
   * Les données manquantes restent N/A et sont affichées comme telles.
   * @deprecated Supprimée par audit — ne plus utiliser
   */
  static async estimateMissingFundamentals(_company: string, _sector: string, _marketPrice?: string): Promise<any> {
    console.warn('[GeminiService] ⛔ estimateMissingFundamentals() désactivée par audit. Les données N/A restent N/A.');
    return null;
  }

  /**
   * Synthèse stratégique profonde (Gemini Flash)
   * Retourne TOUS les champs nécessaires au rapport complet
   */
  static async synthesizeAnalysis(
    company: string, 
    news: Partial<CompanyAnalysis>, 
    market: Partial<CompanyAnalysis>,
    sector?: string,
    fundamentals?: FundamentalInput,
    macro?: MacroInput
  ): Promise<OrchestratorResult | null> {
    
    if (!process.env.GEMINI_API_KEY) return null;

    company = InputSanitizer.sanitizeCompanyName(company);

    try {
      // Données dynamiques (change à chaque appel)
      const dataBlock = `
        PROFIL DE LA VALEUR :
        - Société: ${company}
        - Secteur: ${sector || 'Marché actions'}

        DONNÉES TEMPS RÉEL :
        - COURS ACTUEL: ${market.price}
        - RSI (14): ${typeof market.rsi === 'object' ? `${market.rsi.value} (${market.rsi.interpretation})` : market.rsi}
        - SUPPORT CLÉ: ${market.support}
        - RÉSISTANCE CLÉ: ${market.resistance}
        - SITUATION TECHNIQUE: ${market.marketSituation}
        - SIGNAUX VALIDÉS: ${market.signals?.join(' | ') || 'Aucun'}
        
        INDICATEURS FONDAMENTAUX :
        - P.E.R: ${fundamentals?.peRatio || 'N/A'}
        - RENDEMENT DIVIDENDE: ${fundamentals?.dividendYield || 'N/A'}
        - CAPITALISATION: ${fundamentals?.marketCap || 'N/A'}
        - RÉSULTAT NET: ${fundamentals?.netProfit || 'N/A'}

        ACTUALITÉS & SENTIMENT :
        - SCORE: ${news.globalScore || '0.0'}
        - SENTIMENT: ${news.globalSentiment}
        - IMPACT: ${news.probableImpact}
        - TITRES: ${news.news?.slice(0, 5).map(n => n.summary).join(' | ') || 'Aucune actualité'}

        ${macro ? `CONTEXTE MACRO :
        - BRENT: $${macro.brent?.price ?? 'N/A'} (${(macro.brent?.changePercent ?? 0) > 0 ? '+' : ''}${macro.brent?.changePercent ?? 0}%)
        - OR: $${macro.gold?.price ?? 'N/A'} (${(macro.gold?.changePercent ?? 0) > 0 ? '+' : ''}${macro.gold?.changePercent ?? 0}%)
        - USD/MAD: ${macro.usDmad?.price ?? 'N/A'} (${(macro.usDmad?.changePercent ?? 0) > 0 ? '+' : ''}${macro.usDmad?.changePercent ?? 0}%)
        - TAUX DIRECTEUR BAM: ${macro.keyRate?.value ?? 'N/A'}% (Dernière variation: ${macro.keyRate?.lastChange ?? 'N/A'})
        - INFLATION (MAROC): ${macro.inflation?.value ?? 'N/A'}% (${macro.inflation?.period ?? 'N/A'})
        - PROCHAIN CONSEIL BAM: ${macro.nextBAMMeeting ?? 'N/A'}` : ''}
      `;

      const prompt = `${dataBlock}\n\n${SYNTHESIS_SYSTEM_PROMPT}`;

      let text = await unifiedAICall(prompt, true, 'gemini-2.5-flash', undefined, false, undefined, undefined, 0.3);
      const parsed = safeJsonParse(text);
      return sanitizeAIResult(parsed);

    } catch (error) {
      console.error("Gemini Synthesis Error:", error);
      return null;
    }
  }

  /**
   * Résout un nom d'entreprise en symbole boursier officiel de la Bourse de Casablanca (CSE)
   */
  static async resolveTicker(query: string): Promise<{ symbol: string; companyName: string }> {
    if (!process.env.GEMINI_API_KEY) return { symbol: query.toUpperCase(), companyName: query };

    query = InputSanitizer.sanitizeCompanyName(query);

    try {
      const prompt = `
        Tu es l'expert du marché boursier marocain (CSE). 
        Trouve le SYMBOLE (Ticker) officiel pour : "${query}".
        
        EXEMPLES : 
        - Akdital -> { "symbol": "AKT", "companyName": "AKDITAL" }
        - Maroc Telecom -> { "symbol": "IAM", "companyName": "MAROC TELECOM" }
        - Alliances -> { "symbol": "ADI", "companyName": "ALLIANCES" }
        - Itissalat -> { "symbol": "IAM", "companyName": "MAROC TELECOM" }
        - Attijari -> { "symbol": "ATW", "companyName": "ATTIJARIWAFA BANK" }
        
        Réponds UNIQUEMENT en JSON valide :
        { "symbol": string, "companyName": string }
      `;

      let text = await unifiedAICall(prompt, true, 'gemini-1.5-flash', undefined, false, undefined, undefined, 0.1);
      return safeJsonParse(text);
    } catch (e) {
      console.error("Gemini Resolve Ticker Error:", e);
      return { symbol: query.toUpperCase(), companyName: query.toUpperCase() };
    }
  }

  /**
   * Synthèse technique IA (Gemini Flash)
   */
  static async synthesizeTechnicalAnalysis(
    company: string,
    market: Partial<CompanyAnalysis>
  ): Promise<{ marketSituation: string; finalAction: 'ACHETER' | 'VENDRE' | 'ATTENDRE'; why: string } | null> {
    if (!process.env.GEMINI_API_KEY) return null;

    company = InputSanitizer.sanitizeCompanyName(company);

    try {
      const dataBlock = `
        Société: ${company}
        Cours actuel: ${market.price}
        RSI (14): ${typeof market.rsi === 'object' ? `${market.rsi.value} (${market.rsi.interpretation})` : market.rsi}
        MMS 20: ${market.sma20 || 'N/A'}
        MMS 50: ${market.sma50 || 'N/A'}
        MACD: ${market.macd ? `Histogramme: ${market.macd.histogram}, Tendance: ${market.macd.trend}` : 'N/A'}
        Support: ${market.support}
        Pivot: ${market.pivot || 'N/A'}
        Résistance: ${market.resistance}
        Signaux techniques observés: ${market.signals?.join(' | ') || 'Aucun'}
      `;

      const prompt = `${dataBlock}\n\n${TECHNICAL_SYSTEM_PROMPT}`;

      const text = await unifiedAICall(prompt, true, 'gemini-2.5-flash', undefined, false, undefined, undefined, 0.3);
      const parsed = safeJsonParse(text);
      if (!parsed) return null;

      // Sanitization
      if (!['ACHETER', 'VENDRE', 'ATTENDRE'].includes(parsed.finalAction)) {
        parsed.finalAction = 'ATTENDRE';
      }

      return parsed;
    } catch (error) {
      console.error("Gemini Technical Synthesis Error:", error);
      return null;
    }
  }

  static async generateStrategyPlan(analysis: Partial<CompanyAnalysis>): Promise<string | null> {
    if (!process.env.GEMINI_API_KEY) return null;
    try {
      const prompt = `Tu es un stratégiste de la Bourse de Casablanca. Voici la situation de ${analysis.companyName} :
- Cours: ${analysis.price || 'N/A'}
- RSI: ${typeof analysis.rsi === 'object' ? `${analysis.rsi.value} (${analysis.rsi.interpretation})` : analysis.rsi || 'N/A'}
- Support: ${analysis.support || 'N/A'}
- Résistance: ${analysis.resistance || 'N/A'}
- Tendance: ${analysis.technicalTrend || 'N/A'}
- Sentiment: ${analysis.globalSentiment || 'N/A'}

Rédige un plan tactique de 3 phrases couvrant :
1. Le contexte immédiat du titre
2. Les niveaux techniques à surveiller
3. La gestion du risque appropriée

NE DONNE PAS de recommandation d'achat ou de vente. Concentre-toi sur les FAITS et les NIVEAUX à observer.`;
      // Celui ci est en texte brut
      return (await unifiedAICall(prompt, false, undefined, undefined, false, undefined, undefined, 0.3)).trim();
    } catch (e) {
      return null;
    }
  }

  static async optimizePortfolio(holdings: any[]): Promise<any> {
    try {
      const holdingsData = holdings.map(h => ({
        symbol: h.symbol,
        quantity: h.totalQuantity,
        pmp: h.weightedAveragePrice,
        valuation: h.valuation,
        sector: h.sector || 'Inconnu'
      }));

      const prompt = `
        Tu es un analyste financier et Robo-Advisor expert de la Bourse de Casablanca.
        Analyse ce portefeuille d'actions marocaines :
        ${JSON.stringify(holdingsData, null, 2)}

        Consignes d'optimisation (Théorie moderne du portefeuille / Markowitz ajusté) :
        1. Limite l'exposition à un seul secteur à 30% maximum et une seule action à 25% maximum.
        2. Propose une allocation cible en pourcentage pour chaque secteur actuel.
        3. Suggère des ordres d'achat (BUY) ou de vente (SELL) concrets pour rééquilibrer le portefeuille et tendre vers l'allocation idéale.
        4. Rédige un rationnel d'IA argumenté (en français, max 150 mots) expliquant les choix boursiers.

        Réponds UNIQUEMENT sous forme de JSON valide correspondant à cette structure :
        {
          "allocations": [
            { "sector": "Nom du secteur", "current": 45, "target": 25 }
          ],
          "orders": [
            { "type": "BUY" | "SELL", "symbol": "Symbole", "quantity": 10, "reason": "Raison" }
          ],
          "rationale": "Texte explicatif"
        }
      `;

      const text = await unifiedAICall(prompt, true, 'gemini-1.5-flash', undefined, false, undefined, undefined, 0.3);
      const parsed = safeJsonParse(text);
      if (!parsed) throw new Error("JSON_PARSE_FAILED");
      return parsed;
    } catch (e) {
      console.error("Gemini Optimize Portfolio Error:", e);
      // Calculer des pourcentages par secteur réels pour le fallback
      const sectorsMap: Record<string, number> = {};
      let total = 0;
      holdings.forEach(h => {
        const sec = h.sector || 'Inconnu';
        sectorsMap[sec] = (sectorsMap[sec] || 0) + (h.valuation || 0);
        total += (h.valuation || 0);
      });

      const allocations = Object.entries(sectorsMap).map(([sector, val]) => ({
        sector,
        current: total > 0 ? (val / total) * 100 : 0,
        target: Math.round(100 / Math.max(1, Object.keys(sectorsMap).length))
      }));

      return {
        allocations,
        orders: [],  // BUG FIX #8: Never generate fake trade orders when AI fails.
                     // An AI timeout must NOT translate into a real sell recommendation.
        rationale: '⚠️ Optimisation de secours calculée localement (la synthèse IA est temporairement indisponible). Aucun ordre d\'ajustement automatisé n\'est émis. Veuillez relancer l\'analyse pour obtenir des recommandations personnalisées.'
      };
    }
  }

  static async analyzeShariaCompliance(query: string, pdfData?: { data: string, mimeType: string }) {
    query = InputSanitizer.sanitizeCompanyName(query);

    const prompt = `
IMPORTANT: You do not have direct web or document access in this request unless a document is provided. 
Tu es un analyste financier expert en Sharia Screener, finance islamique (normes AAOIFI 2026), et comptabilité marocaine (PCGM). 
${pdfData ? "Un document financier officiel (PDF) a été fourni en pièce jointe. Tu DOIS extraire les chiffres EXCLUSIVEMENT de ce document." : "Recherche sur Internet les derniers états financiers annuels et rapports officiels publiés pour la société ou l'action : '" + query + "' en utilisant tes outils de recherche."}

1. Extrais les données financières brutes (en valeur numérique PURE, sans devise, sans espaces, sans virgules) pour la société ${query} :
   - Chiffre d'affaires total (Synonymes PCGM : Produits d'exploitation, Chiffre d'affaires consolidé)
   - Produits financiers issus d'intérêts ou Riba (Synonymes PCGM : Intérêts perçus, Produits financiers, Produits de placements à revenu fixe)
   - Total des dettes portant intérêt (Synonymes PCGM : Emprunts obligataires, Dettes de financement, Emprunts bancaires, Dettes auprès des établissements de crédit)
   - Trésorerie et placements portant intérêt (Synonymes PCGM : Titres et valeurs de placement, Dépôts à terme, Placements de trésorerie)
   - Capitalisation boursière (ou Total Actif à défaut, pour le calcul des ratios d'endettement)

2. GESTION DU "JE NE SAIS PAS" (CRITIQUE) : Si une métrique est introuvable ou si tu n'as aucune certitude sur le chiffre, tu DOIS retourner la valeur \`null\` (sans guillemets). NE DEVINE JAMAIS UN CHIFFRE.
3. DATE ET PÉRIODE PRÉCISE : Tu dois extraire la période exacte du rapport (ex: "T3 2025", "Semestre 1 2024", ou "Annuel 2023").
4. SECTEUR D'ACTIVITÉ : Extraire le secteur de l'entreprise (ex: "Banque", "Assurance", "Immobilier", "Agroalimentaire").

5. NE FAIS AUCUN CALCUL DE RATIO. Contente-toi d'extraire les montants bruts exacts. Notre système s'occupera de calculer la conformité AAOIFI.
`;

      const shariaSchema = {
        type: SchemaType.OBJECT,
        properties: {
          companyName: { type: SchemaType.STRING, description: "Nom officiel de l'entreprise" },
          ticker: { type: SchemaType.STRING, description: "Ticker ou Symbole boursier" },
          sector: { type: SchemaType.STRING, description: "Secteur d'activité exact" },
          fiscalYear: { type: SchemaType.STRING, description: "Période exacte trouvée (ex: T3 2025)" },
          confidenceScore: { type: SchemaType.NUMBER, description: "Score de confiance de l'extraction (0 à 100)" },
          explanation: { type: SchemaType.STRING, description: "Explication détaillée de l'origine des chiffres extraits et du lexique PCGM trouvé (ex: J'ai additionné les emprunts obligataires et les dettes bancaires...)" },
          rawFinancials: {
            type: SchemaType.OBJECT,
            properties: {
              totalRevenue: { type: SchemaType.NUMBER, description: "Chiffre d'affaires total ou Produits d'exploitation", nullable: true },
              interestIncome: { type: SchemaType.NUMBER, description: "Produits financiers issus d'intérêts ou Riba", nullable: true },
              interestDebt: { type: SchemaType.NUMBER, description: "Total des dettes portant intérêt (Emprunts)", nullable: true },
              interestCash: { type: SchemaType.NUMBER, description: "Trésorerie et placements portant intérêt", nullable: true },
              marketCap: { type: SchemaType.NUMBER, description: "Capitalisation boursière ou Total Actif", nullable: true }
            },
            required: ["totalRevenue", "interestIncome", "interestDebt", "interestCash", "marketCap"]
          },
          summary: { type: SchemaType.STRING, description: "Résumé explicatif court." },
          sources: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Liste des URLs exactes ou noms de documents sources."
          }
        },
        required: ["companyName", "ticker", "sector", "fiscalYear", "confidenceScore", "explanation", "rawFinancials", "summary", "sources"]
      };

    try {
      // Activate Search Grounding if no PDF is provided
      const useGrounding = !pdfData;
      const text = await unifiedAICall(prompt, true, 'gemini-2.5-flash', undefined, useGrounding, pdfData, shariaSchema, 0.2);
      const parsed = safeJsonParse(text);

      if (parsed) {
        // Extraction des valeurs brutes de l'IA (ou valeurs par défaut en cas d'échec)
        const raw = parsed.rawFinancials || {};
        
        // Validation des nombres extraits
        const parseNum = (val: any): number | null => {
            if (val === null || val === undefined) return null;
            const num = Number(val);
            return Number.isFinite(num) && num >= 0 ? num : null;
        };

        const totalRevenue = parseNum(raw.totalRevenue);
        const interestIncome = parseNum(raw.interestIncome);
        const interestDebt = parseNum(raw.interestDebt);
        const interestCash = parseNum(raw.interestCash);
        const marketCap = parseNum(raw.marketCap);

        if (
          totalRevenue === null || interestIncome === null ||
          interestDebt === null || interestCash === null || marketCap === null || totalRevenue <= 0 || marketCap <= 0
        ) {
          throw new Error("Une ou plusieurs données financières (Revenus, Intérêts, Dettes, Capitalisation) sont introuvables ou incomplètes. L'IA a bloqué le calcul pour éviter des données erronées. Veuillez fournir le PDF ou utiliser la saisie manuelle avec le bilan officiel.");
        }

        // CALCULS TYPESCRIPT DÉTERMINISTES (0% Hallucination)
        const purificationRate = (interestIncome / totalRevenue) * 100;
        const debtRatio = (interestDebt / marketCap) * 100;
        const cashRatio = (interestCash / marketCap) * 100;

        // REGLES STRICTES AAOIFI
        const strictCompliant = purificationRate <= 5.0 && debtRatio <= 33.0 && cashRatio <= 33.0;

        // VERIFICATION SECTEUR ILLICITE (Haram)
        const sectorLower = (parsed.sector || '').toLowerCase();
        const isHaramSector = ['banque', 'bank', 'assurance', 'insurance', 'alcool', 'alcohol', 'tabac', 'tobacco', 'jeux', 'gambling'].some(s => sectorLower.includes(s));

        // Formateur MAD
        const formatMAD = (num: number) => {
            return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' MAD';
        };

        return {
          companyName: parsed.companyName || parsed.company || query.toUpperCase(),
          ticker: parsed.ticker || query.toUpperCase(),
          sector: parsed.sector || 'Inconnu',
          fiscalYear: parsed.fiscalYear || '2024/2025',
          isCompliant: isHaramSector ? false : null,
          estimatedCompliance: isHaramSector ? false : strictCompliant,
          isHaramSector,
          dataQuality: 'UNVERIFIED' as const,
          purificationRate: parseFloat(purificationRate.toFixed(2)),
          debtRatio: parseFloat(debtRatio.toFixed(2)),
          cashRatio: parseFloat(cashRatio.toFixed(2)),
          // BUG FIX #7: The compliance verdict is deterministic BUT the input data
          // is AI-estimated (Gemini cannot actually browse the internet in standard mode).
          // Flagging this transparently is critical for a Halal compliance tool.
          isAIEstimated: !pdfData,
          dataWarning: pdfData ? "Données extraites directement du PDF fourni." : "⚠️ AVERTISSEMENT : Les données financières ont été extraites via Google Search. Vérifiez toujours avec les rapports AMMC pour confirmer l'exactitude des montants.",
          financialData: {
            totalRevenue: formatMAD(totalRevenue),
            interestIncome: formatMAD(interestIncome),
            interestDebt: formatMAD(interestDebt),
            interestCash: formatMAD(interestCash),
            marketCap: formatMAD(marketCap)
          },
          summary: parsed.summary || parsed.description || `Analyse de conformité Sharia et extraction des données financières brutes pour ${query}. Les ratios ont été calculés avec précision par notre moteur interne.`,
          confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 70,
          explanation: parsed.explanation || 'Analyse mathématique sans précision supplémentaire.',
          sources: Array.isArray(parsed.sources) ? parsed.sources : ['Recherche Automatisée Web']
        };
      }
      throw new Error("Impossible d'extraire les données JSON de la réponse de l'IA.");
    } catch (e: any) {
      console.error("Gemini Sharia Screener Error:", e);
      throw e;
    }
  }
}

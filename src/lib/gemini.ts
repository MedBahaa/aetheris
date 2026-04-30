import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompanyAnalysis, OrchestratorResult, Sentiment, Impact } from './schemas';
import { InputSanitizer } from './input-sanitizer';

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

// Modèles avec fallback automatique
// Gemma 4 31B (Raisonnement profond - 1500 req/j)
// Gemma 4 26B A4B (Vitesse & Agents - 1500 req/j)
const MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

/** Appel via Google Generative AI avec retry + fallback
 * AUDIT FIX: Retry sur les erreurs transitoires (timeout, 500, réseau),
 * pas seulement les erreurs 429 quota.
 */
async function callGoogleAI(prompt: string, isJson: boolean = false, preferredModel?: string): Promise<string> {
  const modelsToTry = preferredModel ? [preferredModel, ...MODELS.filter(m => m !== preferredModel)] : MODELS;
  const MAX_RETRIES_PER_MODEL = 2;
  
  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (e: any) {
        const isQuota = e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota');
        const isTransient = e?.status === 500 || e?.status === 503 || 
                           e?.message?.includes('ECONNRESET') || e?.message?.includes('timeout') ||
                           e?.message?.includes('fetch failed') || e?.message?.includes('network');
        
        console.warn(`[GoogleAI] ${modelName} attempt ${attempt}/${MAX_RETRIES_PER_MODEL} failed (${isQuota ? 'quota' : isTransient ? 'transient' : e.message}).`);
        
        // Quota exhausted on this model → skip to next model immediately
        if (isQuota) break;
        
        // Transient error → retry with backoff if attempts remain
        if (isTransient && attempt < MAX_RETRIES_PER_MODEL) {
          const delay = attempt * 1500; // 1.5s, 3s
          console.log(`[GoogleAI] Retrying ${modelName} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        // Non-transient, non-quota error (e.g. invalid API key, bad request) → throw immediately
        if (!isTransient && !isQuota) throw e;
      }
    }
  }
  throw new Error('QUOTA_EXCEEDED');
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
async function unifiedAICall(prompt: string, isJson: boolean = true, preferredModel?: string): Promise<string> {
  try {
    // 1. Essayer les modèles Google AI (Gemma 4 / Gemini)
    return await callGoogleAI(prompt, isJson, preferredModel);
  } catch (e: any) {
    if (e.message === 'QUOTA_EXCEEDED') {
      console.log("🔄 [Fallback] Quota Gemini atteint. Passage sur Mistral...");
      try {
        // 2. Basculement sur Mistral
        return await callMistral(prompt);
      } catch (mistralError: any) {
        console.error("❌ [Fallback] Mistral a également échoué.");
        throw mistralError;
      }
    }
    throw e;
  }
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
        4. Le score global est la moyenne PONDÉRÉE des articles PERTINENTS uniquement.
        
        Réponds UNIQUEMENT en JSON valide avec ce schéma exact :
        {
          "globalScore": number,
          "impactSummary": "Bref résumé de l'impact immédiat",
          "consolidatedSummary": "Synthèse narrative complète combinant toutes les sources en un seul récit cohérent.",
          "details": [
            { 
              "sentiment": "POSITIF" | "NEGATIF" | "NEUTRE", 
              "score": number, 
              "impact": "Court terme" | "Moyen terme" | "Long terme",
              "explanation": "1 phrase très percutante expliquant précisément pourquoi cette news a ce score."
            }
          ]
        }
        
        ACTUALITÉS À ANALYSER :
        ${news.map((n, i) => {
          let entry = `${i + 1}. [${n.sourceType || 'GENERAL'}] [${n.source}] TITLE: ${n.title}`;
          if (n.fullContent) {
            entry += `\n   CONTENT: ${n.fullContent.substring(0, 3000)}`; // On limite pour pas exploser le contexte inutilement
          } else {
            entry += `\n   SUMMARY: ${n.contentSnippet || 'N/A'}`;
          }
          return entry;
        }).join('\n\n')}
      `;

      let text = await unifiedAICall(prompt, true, 'gemini-2.0-flash');
      const parsed = safeJsonParse(text);
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
        - USD/MAD: ${macro.usDmad?.price ?? 'N/A'} (${(macro.usDmad?.changePercent ?? 0) > 0 ? '+' : ''}${macro.usDmad?.changePercent ?? 0}%)` : ''}
      `;

      const prompt = `${dataBlock}\n\n${SYNTHESIS_SYSTEM_PROMPT}`;

      let text = await unifiedAICall(prompt, true, 'gemma-4-31b-it');
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

      let text = await unifiedAICall(prompt, true, 'gemini-2.0-flash');
      return safeJsonParse(text);
    } catch (e) {
      console.error("Gemini Resolve Ticker Error:", e);
      return { symbol: query.toUpperCase(), companyName: query.toUpperCase() };
    }
  }

  static async generateStrategyPlan(analysis: Partial<CompanyAnalysis>): Promise<string | null> {
    if (!process.env.GEMINI_API_KEY) return null;
    try {
      const prompt = `Génère un plan tactique de 2 phrases pour ${analysis.companyName}. Action: ${analysis.orchestrator?.finalAction}, Prix: ${analysis.price}, RSI: ${JSON.stringify(analysis.rsi)}.`;
      // Celui ci est en texte brut
      return (await unifiedAICall(prompt, false)).trim();
    } catch (e) {
      return null;
    }
  }
}

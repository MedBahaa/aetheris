'use server';

import { AetherisOrchestrator, AgentType, CompanyAnalysis } from './agent-engine';

/**
 * SERVER ACTION: analyzeCompanyAction
 * ✅ Sécurise l'exécution des scrapers (HTTP) côté serveur.
 * ✅ Évite l'inclusion de modules serveur dans le bundle client.
 */
export async function analyzeCompanyAction(name: string, type: AgentType, forceRefresh: boolean = false): Promise<CompanyAnalysis> {
  console.log(`[Server Action] Analyzing ${name} (Type: ${type}, ForceRefresh: ${forceRefresh})...`);
  try {
    const result = await AetherisOrchestrator.process(name, type, forceRefresh);
    return result;
  } catch (error: any) {
    console.error(`[Server Action] Error analyzing ${name}:`, error);
    const msg = error.message || '';
    if (msg.includes('quota') || msg.includes('limite')) {
      throw new Error(msg);
    }
    throw new Error(`Erreur lors de l'analyse de ${name}. Veuillez réessayer plus tard.`);
  }
}

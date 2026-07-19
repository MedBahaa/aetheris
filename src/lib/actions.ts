'use server';

import { AetherisOrchestrator, AgentType, CompanyAnalysis } from './agent-engine';
import { createServerSupabase } from './supabase-server';
import { PortfolioService } from './portfolio-service';

/**
 * SERVER ACTION: analyzeCompanyAction
 * ✅ Sécurise l'exécution des scrapers (HTTP) côté serveur.
 * ✅ Évite l'inclusion de modules serveur dans le bundle client.
 * ✅ Enforce le Paywall côté serveur (Sécurité SaaS rentabilité).
 */
export async function analyzeCompanyAction(name: string, type: AgentType, forceRefresh: boolean = false): Promise<CompanyAnalysis> {
  console.log(`[Server Action] Analyzing ${name} (Type: ${type}, ForceRefresh: ${forceRefresh})...`);
  try {
    const client = await createServerSupabase();
    const profile = await PortfolioService.getUserProfile(client);
    const isPremium = profile?.subscription_tier === 'premium';

    // 🔒 SÉCURITÉ SAAS : Bloquer le contournement côté serveur
    if (type === 'STRATEGY' && !isPremium) {
      throw new Error('PAYWALL_BLOCKED: L\'analyse de stratégie multi-agents est réservée aux abonnés PRO.');
    }

    const result = await AetherisOrchestrator.process(name, type, forceRefresh);
    return result;
  } catch (error: any) {
    console.error(`[Server Action] Error analyzing ${name}:`, error);
    const msg = error.message || '';
    if (msg.includes('PAYWALL_BLOCKED') || msg.includes('quota') || msg.includes('limite')) {
      throw new Error(msg);
    }
    throw new Error(`Erreur lors de l'analyse de ${name}. ${msg || 'Veuillez réessayer plus tard.'}`);
  }
}

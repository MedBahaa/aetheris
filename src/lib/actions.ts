'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { AetherisOrchestrator, AgentType, CompanyAnalysis } from './agent-engine';
import { createServerSupabase } from './supabase-server';
import { PortfolioService } from './portfolio-service';
import { checkRateLimitAsync, getClientIpFromHeaders } from './rate-limiter';
import { InputSanitizer } from './input-sanitizer';

const AgentTypeActionSchema = z.enum(['SENTIMENT', 'TECHNICAL', 'STRATEGY', 'FUNDAMENTAL']);

/**
 * SERVER ACTION: analyzeCompanyAction
 * ✅ Sécurise l'exécution des scrapers (HTTP) côté serveur.
 * ✅ Évite l'inclusion de modules serveur dans le bundle client.
 * ✅ Enforce le Paywall et le Rate-Limiting par utilisateur/IP côté serveur (Protection Denial of Wallet IA).
 */
export async function analyzeCompanyAction(name: string, type: AgentType, forceRefresh: boolean = false): Promise<CompanyAnalysis> {
  const parsedType = AgentTypeActionSchema.safeParse(type);
  if (!parsedType.success) {
    throw new Error('Type d\'agent invalide.');
  }

  const cleanName = InputSanitizer.sanitizeCompanyName(name);
  if (!cleanName || InputSanitizer.detectInjection(name)) {
    throw new Error('Nom de société invalide ou requête bloquée par le filtre de sécurité.');
  }

  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    const profile = user ? await PortfolioService.getUserProfile(client) : null;
    const isPremium = profile?.subscription_tier === 'premium';

    // 🔒 SÉCURITÉ SAAS : Bloquer le contournement côté serveur
    if (parsedType.data === 'STRATEGY' && !isPremium) {
      throw new Error('PAYWALL_BLOCKED: L\'analyse de stratégie multi-agents est réservée aux abonnés PRO.');
    }

    // 🔒 SÉCURITÉ ANTI-ABUS IA : Rate limiting par utilisateur authentifié ou par IP réelle côté anonyme
    const reqHeaders = await headers();
    const clientIp = getClientIpFromHeaders(reqHeaders);
    const rateIdentifier = user ? `analyze:user:${user.id}` : `analyze:anon:${clientIp}`;
    const maxRequestsPerMin = isPremium ? 20 : user ? 10 : 4;
    const rateCheck = await checkRateLimitAsync(rateIdentifier, maxRequestsPerMin, 60_000);
    if (!rateCheck.allowed) {
      throw new Error('Limite de requêtes atteinte. Veuillez patienter quelques secondes avant de relancer une analyse.');
    }

    // 🔒 SÉCURITÉ CACHE : Seuls les utilisateurs connectés (et non-abusifs) peuvent forcer le rafraîchissement du cache
    let safeForceRefresh = false;
    if (Boolean(forceRefresh) && user) {
      const refreshLimit = await checkRateLimitAsync(`analyze:refresh:${user.id}`, isPremium ? 5 : 2, 5 * 60_000);
      safeForceRefresh = refreshLimit.allowed;
    }

    const result = await AetherisOrchestrator.process(cleanName, parsedType.data, safeForceRefresh);
    return result;
  } catch (error: any) {
    console.error(`[Server Action] Error analyzing ${cleanName}:`, error);
    const msg = error?.message || '';
    if (msg.includes('PAYWALL_BLOCKED') || msg.includes('quota') || msg.includes('limite') || msg.includes('Limite')) {
      throw new Error(msg);
    }
    throw new Error(`Erreur lors de l'analyse de ${cleanName}. Veuillez réessayer plus tard.`);
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AetherisOrchestrator } from '@/lib/agent-engine';
import { createServerSupabase } from '@/lib/supabase-server';
import { PortfolioService } from '@/lib/portfolio-service';
import { checkRateLimitAsync, getClientIpFromHeaders } from '@/lib/rate-limiter';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export const dynamic = 'force-dynamic';

const StreamAnalyzeSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['SENTIMENT', 'TECHNICAL', 'STRATEGY', 'FUNDAMENTAL']),
  forceRefresh: z.boolean().optional().default(false),
});

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = StreamAnalyzeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return corsHeaders(
        NextResponse.json({ status: 'error', message: 'Requête d\'analyse invalide.' }, { status: 400 })
      );
    }

    const { name, type, forceRefresh } = parsed.data;
    const cleanName = InputSanitizer.sanitizeCompanyName(name);
    if (!cleanName || InputSanitizer.detectInjection(name)) {
      return corsHeaders(
        NextResponse.json(
          { status: 'error', message: 'Nom de société invalide ou requête bloquée par le filtre de sécurité.' },
          { status: 400 }
        )
      );
    }

    const client = await createServerSupabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    const profile = user ? await PortfolioService.getUserProfile(client) : null;
    const isPremium = profile?.subscription_tier === 'premium';

    if (type === 'STRATEGY' && !isPremium) {
      return corsHeaders(
        NextResponse.json(
          {
            status: 'error',
            message: 'PAYWALL_BLOCKED: L\'analyse de stratégie multi-agents est réservée aux abonnés PRO.',
          },
          { status: 402 }
        )
      );
    }

    const clientIp = getClientIpFromHeaders(req.headers);
    const rateIdentifier = user ? `analyze:user:${user.id}` : `analyze:anon:${clientIp}`;
    const maxRequestsPerMin = isPremium ? 20 : user ? 10 : 4;
    const rateCheck = await checkRateLimitAsync(rateIdentifier, maxRequestsPerMin, 60_000);
    if (!rateCheck.allowed) {
      return corsHeaders(
        NextResponse.json(
          {
            status: 'error',
            message: 'Limite de requêtes atteinte. Veuillez patienter quelques secondes avant de relancer une analyse.',
          },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
        )
      );
    }

    let safeForceRefresh = false;
    if (Boolean(forceRefresh) && user) {
      const refreshLimit = await checkRateLimitAsync(`analyze:refresh:${user.id}`, isPremium ? 5 : 2, 5 * 60_000);
      safeForceRefresh = refreshLimit.allowed;
    }

    const encoder = new TextEncoder();
    let streamClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (payload: Record<string, unknown>) => {
          if (streamClosed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            streamClosed = true;
          }
        };

        try {
          sendEvent({ type: 'progress', message: `INITIALISATION DU MOTEUR (${type}) POUR : ${cleanName}` });
          const analysis = await AetherisOrchestrator.process(cleanName, type, safeForceRefresh, (stepMsg) => {
            sendEvent({ type: 'progress', message: stepMsg });
          });
          sendEvent({ type: 'progress', message: 'RAPPORT VALIDÉ & PRÊT POUR AFFICHAGE' });
          sendEvent({ type: 'result', data: analysis });
        } catch (err: any) {
          const rawMsg = typeof err?.message === 'string' ? err.message : '';
          const safeMsg =
            rawMsg.includes('PAYWALL_BLOCKED') ||
            rawMsg.includes('RATE_LIMIT') ||
            rawMsg.includes('quota') ||
            rawMsg.includes('limite') ||
            rawMsg.includes('Limite')
              ? rawMsg
              : `Erreur lors de l'analyse de ${cleanName}. Veuillez réessayer plus tard.`;
          sendEvent({ type: 'error', message: safeMsg });
        } finally {
          if (!streamClosed) {
            streamClosed = true;
            try {
              controller.close();
            } catch {}
          }
        }
      },
      cancel() {
        streamClosed = true;
      },
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });

    if (process.env.NEXT_PUBLIC_APP_URL) {
      headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL);
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      headers.set('Vary', 'Origin');
    }

    return new Response(stream, { headers });
  } catch (err) {
    console.error('[API analyze-stream Error]:', err);
    return corsHeaders(
      NextResponse.json({ status: 'error', message: 'Erreur interne du serveur.' }, { status: 500 })
    );
  }
}

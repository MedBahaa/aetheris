import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { createServerSupabase } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { shariaQuerySchema } from '@/lib/validations';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Authentification requise.' },
        { status: 401 }
      ));
    }

    const limit = checkRateLimit(`sharia:${user.id}`, 6, 60 * 60 * 1000);
    if (!limit.allowed) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Limite d’analyses atteinte. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      ));
    }

    const body = await req.json().catch(() => ({}));
    
    // Validation avec Zod
    const validationResult = shariaQuerySchema.safeParse(body);
    if (!validationResult.success) {
      return corsHeaders(
        NextResponse.json(
          { status: 'error', message: validationResult.error.issues[0].message },
          { status: 400 }
        )
      );
    }

    const { query } = validationResult.data;
    const cleanQuery = query.trim();
    const result = await GeminiService.analyzeShariaCompliance(cleanQuery);

    return corsHeaders(
      NextResponse.json({
        status: 'success',
        data: result
      })
    );
  } catch (error: any) {
    console.error('[API sharia-screener Error]:', error);
    return corsHeaders(
      NextResponse.json(
        {
          status: 'error',
          message: error?.message || 'Erreur lors de la recherche des états financiers et du calcul de conformité Sharia'
        },
        { status: 500 }
      )
    );
  }
}

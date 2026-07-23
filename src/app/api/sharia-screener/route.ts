import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, customApiKey } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return corsHeaders(
        NextResponse.json(
          { status: 'error', message: 'Veuillez fournir un nom de société ou un ticker (ex: DHO, Delta Holding...)' },
          { status: 400 }
        )
      );
    }

    const cleanQuery = query.trim();
    const result = await GeminiService.analyzeShariaCompliance(cleanQuery, customApiKey);

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

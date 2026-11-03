import { NextResponse } from 'next/server';
import { IndexScraper } from '@/lib/scrapers/index-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

export function OPTIONS() { return handleOptionsRequest(); }

export async function GET(req: Request) {
  const clientIp = getClientIp(req);
  const rateCheck = await checkRateLimitAsync(`market-index:${clientIp}`, 30, 60_000);
  if (!rateCheck.allowed) {
    return corsHeaders(
      NextResponse.json(
        { status: 'error', message: 'Trop de requêtes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    );
  }

  try {
    const data = await IndexScraper.getMASI();
    
    if (!data) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Indice non disponible' },
        { status: 404 }
      ));
    }

    return corsHeaders(NextResponse.json({
      status: 'success',
      data
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    }));

  } catch (error: any) {
    console.error('[API/market-index] Error:', error);
    return corsHeaders(NextResponse.json(
      { status: 'error', message: 'Erreur lors de la récupération de l\'indice.' },
      { status: 500 }
    ));
  }
}

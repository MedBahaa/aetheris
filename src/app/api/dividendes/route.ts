import { NextResponse } from 'next/server';
import { DividendScraper } from '@/lib/scrapers/dividend-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(req: Request) {
  const clientIp = getClientIp(req);
  const rateCheck = await checkRateLimitAsync(`dividendes:${clientIp}`, 20, 60_000);
  if (!rateCheck.allowed) {
    return corsHeaders(
      NextResponse.json(
        { success: false, error: 'Trop de requêtes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    );
  }

  try {
    const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1';
    const result = await DividendScraper.getDividendYieldsWithMeta(forceRefresh);

    if (result.data.length === 0) {
      return corsHeaders(
        NextResponse.json(
          {
            success: false,
            data: [],
            error: 'Données de dividendes temporairement indisponibles. Veuillez réessayer.',
          },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        )
      );
    }

    return corsHeaders(
      NextResponse.json(
        {
          success: true,
          data: result.data,
          source: result.source,
          updatedAt: result.updatedAt,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': forceRefresh
              ? 'no-store'
              : 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      )
    );
  } catch (error: any) {
    console.error('Error fetching dividends:', error);
    return corsHeaders(
      NextResponse.json(
        { success: false, error: 'Données de dividendes temporairement indisponibles.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    );
  }
}

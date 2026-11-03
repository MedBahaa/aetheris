import { NextResponse } from 'next/server';
import { DividendScraper } from '@/lib/scrapers/dividend-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

// Revalidate cache every 1 hour (3600 seconds)
export const revalidate = 3600;

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
    const data = await DividendScraper.getDividendYields();
    return corsHeaders(NextResponse.json({ success: true, data }));
  } catch (error: any) {
    console.error('Error fetching dividends:', error);
    return corsHeaders(
      NextResponse.json({ success: false, error: 'Données de dividendes temporairement indisponibles.' }, { status: 500 })
    );
  }
}

import { NextResponse } from 'next/server';
import { MacroScraper } from '@/lib/scrapers/macro-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

export function OPTIONS() { return handleOptionsRequest(); }

export async function GET(req: Request) {
  const clientIp = getClientIp(req);
  const rateCheck = await checkRateLimitAsync(`macro:${clientIp}`, 30, 60_000);
  if (!rateCheck.allowed) {
    return corsHeaders(
      NextResponse.json(
        { error: 'Trop de requêtes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    );
  }

  try {
    const data = await MacroScraper.getMacroData();
    if (!data) {
      return corsHeaders(NextResponse.json({ error: 'Data unavailable' }, { status: 503 }));
    }
    return corsHeaders(NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=150, stale-while-revalidate=300' }
    }));
  } catch (error) {
    return corsHeaders(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
  }
}

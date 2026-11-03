import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

// Preflight CORS
export function OPTIONS() { return handleOptionsRequest(); }

// Cache simple en mémoire (optionnel, pour éviter de spammer le site BMCE en dev)
let cachedData: any = null;
let lastScrapeTime = 0;
const CACHE_TTL = 50000; // 50 secondes (un peu moins que la minute de refresh client)

export async function GET(req: Request) {
  // AUDIT FIX: Rate limiting distribué + extraction IP sécurisée
  const clientIP = getClientIp(req);
  const rateCheck = await checkRateLimitAsync(`market-live:${clientIP}`, 30, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { status: 'error', error: 'Trop de requêtes. Réessayez dans quelques secondes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    );
  }

  const now = Date.now();
  
  // Utiliser le cache si encore valide
  if (cachedData && (now - lastScrapeTime < CACHE_TTL)) {
    console.log('[API MarketLive] Returning cached data');
    return corsHeaders(NextResponse.json(cachedData));
  }

  console.log('[API MarketLive] Triggering fresh scrape...');
  
  try {
    const result = await MarketListScraper.scrapeAll();
    
    if (result.status === 'success') {
      cachedData = result;
      lastScrapeTime = now;
    }
    
    return corsHeaders(NextResponse.json(result));
  } catch (error: any) {
    console.error('[API MarketLive] Error:', error);
    return corsHeaders(NextResponse.json({ 
      status: 'error', 
      error: 'Service de cotation en direct temporairement indisponible.',
      timestamp: new Date().toISOString() 
    }, { status: 500 }));
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { STATIC_SECTOR_MAP } from '@/lib/symbol-mapper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

export function OPTIONS() {
  return handleOptionsRequest();
}

/**
 * GET /api/companies/sectors
 * Returns a comprehensive map of symbol → sector for all companies.
 * Combines database entries with static sector mappings.
 */
export async function GET(req: Request) {
  const clientIp = getClientIp(req);
  const rateCheck = await checkRateLimitAsync(`sectors:${clientIp}`, 30, 60_000);
  if (!rateCheck.allowed) {
    return corsHeaders(
      NextResponse.json(
        { error: 'Trop de requêtes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    );
  }

  try {
    const sectorMap: Record<string, string> = { ...STATIC_SECTOR_MAP };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('companies')
        .select('symbol, sector')
        .not('sector', 'is', null);

      if (!error && data) {
        data.forEach((c: { symbol: string; sector: string }) => {
          if (c.symbol && c.sector) {
            sectorMap[c.symbol] = c.sector;
          }
        });
      }
    }

    return corsHeaders(NextResponse.json(sectorMap, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    }));
  } catch (e) {
    console.error('[API/sectors] Exception:', e);
    // Fallback to static sector map
    return corsHeaders(NextResponse.json(STATIC_SECTOR_MAP, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    }));
  }
}

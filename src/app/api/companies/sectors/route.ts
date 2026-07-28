import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { STATIC_SECTOR_MAP } from '@/lib/symbol-mapper';

/**
 * GET /api/companies/sectors
 * Returns a comprehensive map of symbol → sector for all companies.
 * Combines database entries with static sector mappings.
 */
export async function GET() {
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

    return NextResponse.json(sectorMap);
  } catch (e) {
    console.error('[API/sectors] Exception:', e);
    // Fallback to static sector map
    return NextResponse.json(STATIC_SECTOR_MAP);
  }
}

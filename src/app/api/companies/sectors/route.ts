import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/companies/sectors
 * Returns a map of symbol → sector for all companies in the database.
 * Used by the portfolio page for sector breakdown.
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({}, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('symbol, sector')
      .not('sector', 'is', null);

    if (error) {
      console.error('[API/sectors] Error:', error.message);
      return NextResponse.json({}, { status: 500 });
    }

    // Build { symbol: sector } map
    const sectorMap: Record<string, string> = {};
    (data || []).forEach((c: { symbol: string; sector: string }) => {
      sectorMap[c.symbol] = c.sector;
    });

    return NextResponse.json(sectorMap);
  } catch (e) {
    console.error('[API/sectors] Exception:', e);
    return NextResponse.json({}, { status: 500 });
  }
}

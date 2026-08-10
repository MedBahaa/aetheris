import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q');
  const query = rawQuery ? InputSanitizer.sanitizeForDb(rawQuery) : null;

  if (!query || query.length < 2) {
    return corsHeaders(NextResponse.json([]));
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('name, symbol, sector')
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .order('symbol', { ascending: true })
      .limit(6);

    if (error) throw error;

    const seenSymbols = new Set<string>();
    const results = (data || []).flatMap((item: { name: string; symbol: string; sector: string }) => {
      const symbol = SymbolMapper.resolve(item.symbol || item.name);
      if (!symbol || seenSymbols.has(symbol)) return [];
      seenSymbols.add(symbol);
      return [{
        ...item,
        symbol,
        name: item.name && item.name !== item.symbol ? item.name : item.symbol,
      }];
    });

    // Suggestions are called as the user types. Do not scrape the live market
    // here; the indexed company list is refreshed by the market sync jobs.
    return corsHeaders(NextResponse.json(results));
  } catch (error: unknown) {
    console.error('[API Search] Error:', error);
    return corsHeaders(NextResponse.json({ error: 'Recherche indisponible.' }, { status: 500 }));
  }
}

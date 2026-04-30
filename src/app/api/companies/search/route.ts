import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export function OPTIONS() { return handleOptionsRequest(); }

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('q');
  const query = rawQuery ? InputSanitizer.sanitizeForDb(rawQuery) : null;

  if (!query || query.length < 2) {
    return corsHeaders(NextResponse.json([]));
  }

  try {
    // 1. Recherche par nom ou symbole dans la DB
    const { data: dbData } = await supabaseAdmin
      .from('companies')
      .select('name, symbol, sector')
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .order('symbol', { ascending: true })
      .limit(10);

    // 2. Recherche dans le Marché Live (pour capter les actions récentes/manquantes)
    const marketResult = await MarketListScraper.scrapeAll();
    const liveMatches = marketResult.status === 'success' 
      ? marketResult.stocks.filter(s => 
          s.symbol.toLowerCase().includes(query.toLowerCase())
        ).map(s => ({
          name: s.symbol,
          symbol: s.symbol,
          sector: 'Marché Live'
        }))
      : [];

    // 3. Fusion, Normalisation Intelligence et Dédoublonnage
    const uniqueResults: any[] = [];
    const seenSymbols = new Set();
    
    // On priorise les résultats Live pour garantir la fraîcheur
    const combined = [...liveMatches, ...(dbData || [])];

    for (const item of combined) {
      // Normalisation Inteligente (ex: Maroc Telecom -> IAM)
      const officialSymbol = SymbolMapper.resolve(item.symbol || item.name);
      
      if (!seenSymbols.has(officialSymbol)) {
        uniqueResults.push({
          ...item,
          symbol: officialSymbol,
          // Si le symbole a été mappé, on garde le nom original s'il est plus descriptif
          name: item.name && item.name !== item.symbol ? item.name : item.symbol
        });
        seenSymbols.add(officialSymbol);
      }
      if (uniqueResults.length >= 6) break;
    }

    return corsHeaders(NextResponse.json(uniqueResults));
  } catch (error: any) {
    console.error('[API Search] Catch Error:', error);
    return corsHeaders(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

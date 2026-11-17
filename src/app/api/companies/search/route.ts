import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { SymbolMapper, CANONICAL_COMPANY_NAMES } from '@/lib/symbol-mapper';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limiter';

import { companySearchSchema } from '@/lib/validations';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateCheck = await checkRateLimitAsync(`search:${clientIp}`, 60, 60_000);
  if (!rateCheck.allowed) {
    return corsHeaders(
      NextResponse.json(
        { error: 'Trop de requêtes de recherche.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    );
  }

  const rawQuery = request.nextUrl.searchParams.get('q') || '';
  const validation = companySearchSchema.safeParse({ query: rawQuery });

  if (!validation.success) {
    return corsHeaders(NextResponse.json([]));
  }

  const query = InputSanitizer.sanitizePostgrestFilter(validation.data.query);
  if (!query) {
    return corsHeaders(NextResponse.json([]));
  }

  const resolvedQuery = InputSanitizer.sanitizePostgrestFilter(SymbolMapper.resolve(query));

  try {
    const orParts = [`name.ilike.%${query}%`, `symbol.ilike.%${query}%`];
    if (resolvedQuery && resolvedQuery !== query) {
      orParts.push(`symbol.ilike.%${resolvedQuery}%`, `name.ilike.%${resolvedQuery}%`);
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('name, symbol, sector')
      .or(orParts.join(','))
      .order('symbol', { ascending: true })
      .limit(8);

    if (error) throw error;

    const seenSymbols = new Set<string>();
    const results: Array<{ name: string; symbol: string; sector: string }> = (data || []).flatMap(
      (item: { name: string; symbol: string; sector: string }) => {
        const symbol = SymbolMapper.resolve(item.symbol || item.name);
        if (!symbol || seenSymbols.has(symbol)) return [];
        seenSymbols.add(symbol);
        const canonicalName =
          item.name && item.name !== item.symbol
            ? item.name
            : SymbolMapper.getCanonicalName(symbol) || item.symbol;
        return [
          {
            ...item,
            symbol,
            name: canonicalName,
            sector: SymbolMapper.getSector(symbol, item.sector),
          },
        ];
      }
    );

    // Fallback référentiel statique & Marché Live (pour capter instantanément les nouvelles IPO)
    if (results.length < 6) {
      const qUpper = query.toUpperCase();
      const resUpper = (resolvedQuery || query).toUpperCase();

      // 1. Vérifier le référentiel BVC complet (incluant les introductions récentes : Cash Plus, Vicenne, SGTM, T2S, etc.)
      for (const [sym, fullName] of Object.entries(CANONICAL_COMPANY_NAMES)) {
        if (results.length >= 6) break;
        if (seenSymbols.has(sym)) continue;
        if (
          sym.includes(qUpper) ||
          fullName.includes(qUpper) ||
          sym === resUpper ||
          fullName.includes(resUpper)
        ) {
          seenSymbols.add(sym);
          results.push({
            symbol: sym,
            name: fullName,
            sector: SymbolMapper.getSector(sym, fullName),
          });
        }
      }

      // 2. Si toujours aucun résultat (ex: toute nouvelle IPO introduite aujourd'hui), interroger le cache / flux Marché Live
      if (results.length === 0) {
        const liveMatch = await MarketListScraper.getLiveStock(query);
        if (liveMatch) {
          const sym = liveMatch.ticker || SymbolMapper.resolve(liveMatch.symbol) || liveMatch.symbol;
          if (!seenSymbols.has(sym)) {
            seenSymbols.add(sym);
            results.push({
              symbol: sym,
              name: liveMatch.name || SymbolMapper.getCanonicalName(sym) || liveMatch.symbol,
              sector: liveMatch.sector || SymbolMapper.getSector(sym, liveMatch.symbol),
            });
          }
        }
      }
    }

    return corsHeaders(NextResponse.json(results.slice(0, 6)));
  } catch (error: unknown) {
    console.error('[API Search] Error:', error);
    return corsHeaders(NextResponse.json({ error: 'Recherche indisponible.' }, { status: 500 }));
  }
}

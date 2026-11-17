import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { checkRateLimitAsync } from '@/lib/rate-limiter';
import { verifyCronSecret } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 🔒 Vérification Fail-Closed de la clé secrète via Authorization: Bearer
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting strict pour le cron (max 2 appels par minute)
  const rateCheck = await checkRateLimitAsync('market-cron', 2, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limited — Cron déjà en cours' }, { status: 429 });
  }

  console.log('--- CRON TRIGGERED VIA API (GLOBAL SYNC) ---');
  
  try {
    const url = new URL(req.url);
    // Vérification IPO uniquement 1 fois par jour le matin à 10h00 (ou si ?discover=1 est forcé)
    const shouldCheckIpos =
      url.searchParams.get('discover') === '1' || MarketListScraper.shouldRunDaily10AmIpoCheck();

    // 1. Scraper la liste globale
    const result = await MarketListScraper.scrapeAll({ forceDiscovery: shouldCheckIpos });
    
    if (result.status === 'error' || result.stocks.length === 0) {
      throw new Error(result.error || 'Aucune donnée récupérée');
    }

    // 2. Auto-découverte IPO uniquement à 10h00 (1 fois / jour)
    const ipoSync = shouldCheckIpos
      ? await MarketListScraper.syncCompaniesWithMarket(supabaseAdmin, result.stocks, true)
      : { added: [], updated: [], total: result.stocks.length };

    // 3. Récupérer toutes les compagnies connues en base
    const { data: companies, error: dbError } = await supabaseAdmin
      .from('companies')
      .select('id, symbol, name');

    if (dbError) throw dbError;
    if (!companies) return NextResponse.json({ status: 'no_companies' });

    const historyEntries = [];
    const results = [];

    // 4. Matcher et préparer le bulk insert
    for (const stock of result.stocks) {
      const resolvedStockTicker = (stock.ticker || SymbolMapper.resolve(stock.symbol) || stock.symbol).toLowerCase();
      const stockSymLower = stock.symbol.toLowerCase();

      const company = companies.find((c: { id: string; symbol: string; name: string }) => {
        const cSymLower = c.symbol.toLowerCase();
        const cResLower = SymbolMapper.resolve(c.symbol).toLowerCase();
        const cNameLower = c.name.toLowerCase();
        return (
          cSymLower === stockSymLower ||
          cSymLower === resolvedStockTicker ||
          cResLower === resolvedStockTicker ||
          cNameLower.includes(stockSymLower) ||
          stockSymLower.includes(cNameLower)
        );
      });

      if (company) {
        const price = parseFloat(stock.price.replace(',', '.').replace(/\s/g, '')) || 0;
        const volumeVal = parseInt(stock.volume.replace(/[\s\u00A0]/g, '').replace(',', '')) || 0;
        
        if (price > 0) {
          historyEntries.push({
            company_id: company.id,
            price: price,
            variation: stock.variation,
            volume: volumeVal,
            created_at: new Date().toISOString()
          });
          results.push({ symbol: stock.symbol, status: 'success' });
        } else {
          results.push({ symbol: stock.symbol, status: 'invalid_price' });
        }
      }
    }

    // 5. Bulk Insert dans market_history
    if (historyEntries.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('market_history')
        .insert(historyEntries);
        
      if (insertError) {
        console.error('[Market Cron] Erreur insertion bulk:', insertError.message);
        throw insertError;
      }
    }

    console.log(`[Market Cron] Succès. ${historyEntries.length} cours mis à jour.`);
    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      updatedCount: historyEntries.length,
      ipoCheckExecuted: shouldCheckIpos,
      newIposAdded: ipoSync.added,
      companiesUpdated: ipoSync.updated,
      results 
    });

  } catch (error: any) {
    console.error('[Market Cron] Exception:', error.message);
    return NextResponse.json({ error: 'Erreur interne lors de la synchronisation globale.' }, { status: 500 });
  }
}

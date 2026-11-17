import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyCronSecret } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 🔒 Sécurité Fail-Closed : Vérifier le token CRON_SECRET
  if (!verifyCronSecret(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    // L'auto-indexation IPO ne tourne qu'une seule fois par jour le matin à 10h00 (ou si ?discover=1 est forcé)
    const shouldCheckIpos =
      url.searchParams.get('discover') === '1' || MarketListScraper.shouldRunDaily10AmIpoCheck();

    console.log(`[Cron Sync Market] Démarrage de la synchronisation du marché (checkIPO=${shouldCheckIpos})...`);
    
    // 1. Scraper la liste globale
    const result = await MarketListScraper.scrapeAll({ forceDiscovery: shouldCheckIpos });
    
    if (result.status === 'error' || result.stocks.length === 0) {
      throw new Error(result.error || 'Aucune donnée récupérée');
    }

    // 2. Auto-indexation des nouvelles introductions (IPO) uniquement à 10h00 (1 fois / jour)
    const ipoSync = shouldCheckIpos
      ? await MarketListScraper.syncCompaniesWithMarket(result.stocks, true)
      : { added: [], updated: [], total: result.stocks.length };

    // 3. Récupérer toutes les compagnies connues en base
    const { data: companies, error: dbError } = await supabaseAdmin
      .from('companies')
      .select('id, symbol, name');

    if (dbError) throw dbError;

    let insertedCount = 0;

    // 4. Préparer les insertions d'historique (Batch insert)
    const historyEntries = [];

    for (const stock of result.stocks) {
      const resolvedStockTicker = (stock.ticker || SymbolMapper.resolve(stock.symbol) || stock.symbol).toLowerCase();
      const stockSymLower = stock.symbol.toLowerCase();

      const company = companies?.find((c: { id: string; symbol: string; name: string }) => {
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
        const volumeVal = parseInt(stock.quantity.replace(/[\s\u00A0]/g, '').replace(',', ''), 10) || 0;
        
        if (price > 0) {
          historyEntries.push({
            company_id: company.id,
            price: price,
            variation: stock.variation,
            volume: volumeVal,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    if (historyEntries.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('market_history')
        .insert(historyEntries);
        
      if (insertError) {
        console.error('[Cron Sync Market] Erreur insertion:', insertError.message);
      } else {
        insertedCount = historyEntries.length;
      }
    }

    console.log(`[Cron Sync Market] Succès. ${insertedCount} cours mis à jour.`);
    return NextResponse.json({
      success: true,
      updated: insertedCount,
      ipoCheckExecuted: shouldCheckIpos,
      newIposAdded: ipoSync.added,
      companiesUpdated: ipoSync.updated,
    });

  } catch (error: any) {
    console.error('[Cron Sync Market] Exception:', error.message);
    return NextResponse.json({ success: false, error: 'Erreur interne lors de la synchronisation du marché.' }, { status: 500 });
  }
}

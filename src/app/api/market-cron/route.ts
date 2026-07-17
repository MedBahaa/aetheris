import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { checkRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Rate limiting strict pour le cron (1 appel par minute max)
  const rateCheck = checkRateLimit('market-cron', 2, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limited — Cron déjà en cours' }, { status: 429 });
  }

  // Vérification d'une clé secrète pour éviter les appels abusifs
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('--- CRON TRIGGERED VIA API (GLOBAL SYNC) ---');
  
  try {
    // 1. Récupérer toutes les compagnies connues en base
    const { data: companies, error: dbError } = await supabaseAdmin
      .from('companies')
      .select('id, symbol, name');

    if (dbError) throw dbError;
    if (!companies) return NextResponse.json({ status: 'no_companies' });

    // 2. Scraper la liste globale (un seul appel HTTP ultra-rapide)
    const result = await MarketListScraper.scrapeAll();
    
    if (result.status === 'error' || result.stocks.length === 0) {
      throw new Error(result.error || 'Aucune donnée récupérée');
    }

    const historyEntries = [];
    const results = [];

    // 3. Matcher et préparer le bulk insert
    for (const stock of result.stocks) {
      const company = companies.find((c: { id: string; symbol: string; name: string }) => 
        c.symbol.toLowerCase() === stock.symbol.toLowerCase() ||
        c.name.toLowerCase().includes(stock.symbol.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(c.name.toLowerCase())
      );

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

    // 4. Bulk Insert dans market_history
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
      results 
    });

  } catch (error: any) {
    console.error('[Market Cron] Exception:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

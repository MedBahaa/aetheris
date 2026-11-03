import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { checkRateLimitAsync } from '@/lib/rate-limiter';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function verifyCronSecret(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }
  const authHeader = req.headers.get('authorization') || '';
  const expected = `Bearer ${cronSecret}`;
  if (authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

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

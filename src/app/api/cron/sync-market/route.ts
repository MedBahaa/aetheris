import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Sécurité : Vérifier le token CRON_SECRET de Vercel (ou requêtes locales manuelles)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('[Cron Sync Market] Démarrage de la synchronisation du marché...');
    
    // 1. Récupérer toutes les compagnies connues en base
    const { data: companies, error: dbError } = await supabaseAdmin
      .from('companies')
      .select('id, symbol, name');

    if (dbError) throw dbError;

    // 2. Scraper la liste globale (très rapide)
    const result = await MarketListScraper.scrapeAll();
    
    if (result.status === 'error' || result.stocks.length === 0) {
      throw new Error(result.error || 'Aucune donnée récupérée');
    }

    let insertedCount = 0;

    // 3. Préparer les insertions d'historique (Batch insert)
    const historyEntries = [];

    for (const stock of result.stocks) {
      // Nettoyer le nom/symbole pour faire le lien
      const company = companies?.find((c: { id: string; symbol: string; name: string }) => 
        c.symbol.toLowerCase() === stock.symbol.toLowerCase() ||
        c.name.toLowerCase().includes(stock.symbol.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(c.name.toLowerCase())
      );

      if (company) {
        const price = parseFloat(stock.price.replace(',', '.').replace(/\s/g, '')) || 0;
        const volumeStr = stock.high; // Dans market-list-scraper, high contient parfois le volume ou prix haut. Ajustons.
        // Si c'est juste l'historique de clôture, on insère.
        
        if (price > 0) {
          historyEntries.push({
            company_id: company.id,
            price: price,
            variation: stock.variation,
            volume: 0, // Le scraper liste globale n'a pas toujours le volume précis
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
    return NextResponse.json({ success: true, updated: insertedCount });

  } catch (error: any) {
    console.error('[Cron Sync Market] Exception:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

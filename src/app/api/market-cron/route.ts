import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BMCEBourseScraper } from '@/lib/scrapers/bmce-scraper';
import { checkRateLimit } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // AUDIT FIX: Rate limiting strict pour le cron (1 appel par minute max)
  const rateCheck = checkRateLimit('market-cron', 2, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limited — Cron déjà en cours' }, { status: 429 });
  }

  // Optionnel: Vérification d'une clé secrète pour éviter les appels abusifs
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('--- CRON TRIGGERED VIA API ---');
  
  try {
    const { data: companies } = await supabase.from('companies').select('symbol');
    
    if (!companies) return NextResponse.json({ status: 'no_companies' });

    const results = [];
    for (const company of companies) {
      const data = await BMCEBourseScraper.getStockData(company.symbol);
      results.push({ symbol: company.symbol, status: data.status });
    }

    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      results 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

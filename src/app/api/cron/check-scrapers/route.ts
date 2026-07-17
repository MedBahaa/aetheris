import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { IndexScraper } from '@/lib/scrapers/index-scraper';
import { MacroScraper } from '@/lib/scrapers/macro-scraper';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Protection par clé secrète
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const reports: any = {};
  const failures: string[] = [];

  // 1. Test MarketListScraper
  try {
    const start = Date.now();
    const result = await MarketListScraper.scrapeAll();
    const duration = Date.now() - start;
    
    if (result.status === 'success' && result.stocks.length > 0) {
      reports.marketList = { status: 'success', count: result.stocks.length, durationMs: duration };
    } else {
      throw new Error(result.error || 'Aucun titre retourné');
    }
  } catch (err: any) {
    reports.marketList = { status: 'error', message: err.message };
    failures.push(`MarketListScraper : ${err.message}`);
  }

  // 2. Test IndexScraper (MASI)
  try {
    const start = Date.now();
    const result = await IndexScraper.getMASI();
    const duration = Date.now() - start;
    
    if (result && result.price !== '---') {
      reports.indexMASI = { status: 'success', value: result.price, durationMs: duration };
    } else {
      throw new Error('Valeur MASI nulle ou invalide');
    }
  } catch (err: any) {
    reports.indexMASI = { status: 'error', message: err.message };
    failures.push(`IndexScraper (MASI) : ${err.message}`);
  }

  // 3. Test MacroScraper
  try {
    const start = Date.now();
    const result = await MacroScraper.getMacroData();
    const duration = Date.now() - start;
    
    if (result && result.brent && result.gold && result.usDmad) {
      reports.macro = { status: 'success', durationMs: duration };
    } else {
      throw new Error('Données macroéconomiques incomplètes');
    }
  } catch (err: any) {
    reports.macro = { status: 'error', message: err.message };
    failures.push(`MacroScraper : ${err.message}`);
  }

  // 4. Envoi de mail s'il y a des échecs
  if (failures.length > 0) {
    console.error(`[Scraper Health Check] 🚨 Échecs détectés :`, failures);
    
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'Aetheris Monitor <alerts@resend.dev>',
          to: 'admin@aetheris.ma', // Mail d'alerte admin
          subject: '🚨 ALERTE AETHERIS : Dysfonctionnement des Scrapers',
          html: `
            <h1>Rapport de santé des Scrapers Aetheris</h1>
            <p>Certains scrapers ont échoué lors du diagnostic.</p>
            <h3>Échecs :</h3>
            <ul>
              ${failures.map(f => `<li><strong>${f}</strong></li>`).join('')}
            </ul>
            <h3>Rapport Complet :</h3>
            <pre>${JSON.stringify(reports, null, 2)}</pre>
            <hr />
            <p>Date : ${new Date().toISOString()}</p>
          `
        });
        reports.emailSent = true;
      } catch (emailErr: any) {
        console.error('[Scraper Health Check] Erreur envoi mail alertes :', emailErr.message);
        reports.emailSent = false;
        reports.emailError = emailErr.message;
      }
    }
  }

  const overallStatus = failures.length === 0 ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    reports
  });
}

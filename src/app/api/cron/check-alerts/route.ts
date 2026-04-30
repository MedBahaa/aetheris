import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend('re_gMJwuKSH_CAcqHwDhVdPDAbZ39Qbx8SVS');

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('[Cron Check Alerts] Début de la vérification des alertes...');
    
    // 1. Récupérer toutes les alertes actives
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('portfolio_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucune alerte active.' });
    }

    // 2. Récupérer les prix actuels (Fast cache complet)
    const result = await MarketListScraper.scrapeAll();
    if (result.status === 'error' || result.stocks.length === 0) {
      throw new Error('Impossible de récupérer les cours du marché.');
    }

    let alertsTriggered = 0;

    // 3. Vérifier chaque alerte
    for (const alert of alerts) {
      const stock = result.stocks.find((s: { symbol: string; price: string }) => 
        s.symbol.toLowerCase() === alert.symbol.toLowerCase() ||
        s.symbol.toLowerCase().includes(alert.symbol.toLowerCase())
      );

      if (!stock) continue;

      const currentPrice = parseFloat(stock.price.replace(',', '.').replace(/\s/g, ''));
      if (isNaN(currentPrice) || currentPrice <= 0) continue;

      let triggered = false;
      let reason = '';

      if (alert.sl_price && currentPrice <= alert.sl_price) {
        triggered = true;
        reason = `Stop Loss atteint ! Prix actuel: ${currentPrice} MAD (Seuil: ${alert.sl_price} MAD)`;
      } else if (alert.tp_price && currentPrice >= alert.tp_price) {
        triggered = true;
        reason = `Take Profit atteint ! Prix actuel: ${currentPrice} MAD (Cible: ${alert.tp_price} MAD)`;
      }

      if (triggered) {
        alertsTriggered++;
        
        // 4. Récupérer l'email de l'utilisateur
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(alert.user_id);
        const userEmail = userData?.user?.email;

        if (userEmail) {
          // 5. Envoyer l'email via Resend
          try {
            await resend.emails.send({
              from: 'Aetheris Terminal <onboarding@resend.dev>', // Email test Resend (à changer en prod avec un domaine vérifié)
              to: userEmail,
              subject: `🚨 Alerte Aetheris : ${alert.symbol} a déclenché une alerte`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                  <h2>Alerte de Prix : ${alert.symbol}</h2>
                  <p>Bonjour,</p>
                  <p>Votre alerte sur <strong>${alert.symbol}</strong> vient de se déclencher :</p>
                  <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <strong>${reason}</strong>
                  </div>
                  <p>Connectez-vous à votre terminal pour gérer votre position.</p>
                  <br/>
                  <p><small>L'équipe Aetheris Financial Terminal</small></p>
                </div>
              `
            });
            console.log(`[Cron Check Alerts] Email envoyé à ${userEmail} pour ${alert.symbol}`);
          } catch (emailError: any) {
            console.error(`[Cron Check Alerts] Erreur envoi email:`, emailError.message);
          }
        }

        // 6. Désactiver l'alerte pour ne pas spammer
        await supabaseAdmin
          .from('portfolio_alerts')
          .update({ is_active: false })
          .eq('id', alert.id);
      }
    }

    return NextResponse.json({ success: true, alertsTriggered });

  } catch (error: any) {
    console.error('[Cron Check Alerts] Exception:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

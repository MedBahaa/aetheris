import { NextResponse } from 'next/server';
import { MarketListScraper } from '@/lib/scrapers/market-list-scraper';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Helper pour Telegram Bot API
async function sendTelegramAlert(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram Alert] TELEGRAM_BOT_TOKEN non configuré.');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      console.error('[Telegram Alert] Erreur API Telegram:', await res.text());
    } else {
      console.log('[Telegram Alert] Message envoyé avec succès à', chatId);
    }
  } catch (err: any) {
    console.error('[Telegram Alert] Exception:', err.message);
  }
}

// Helper pour WhatsApp (via CallMeBot API - passerelle gratuite très populaire au Maroc)
async function sendWhatsAppAlert(phone: string, text: string) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) {
    console.warn('[WhatsApp Alert] CALLMEBOT_API_KEY non configuré.');
    return;
  }
  try {
    // Nettoyer le numéro de téléphone pour CallMeBot (format sans + ni espaces, ex: 212600000000)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[WhatsApp Alert] Erreur API CallMeBot:', await res.text());
    } else {
      console.log('[WhatsApp Alert] Message WhatsApp envoyé avec succès à', phone);
    }
  } catch (err: any) {
    console.error('[WhatsApp Alert] Exception WhatsApp:', err.message);
  }
}

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
        
        // 4. Récupérer le profil utilisateur pour les préférences d'alertes
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('telegram_chat_id, whatsapp_phone, alert_channel')
          .eq('user_id', alert.user_id)
          .single();

        const channel = profile?.alert_channel || 'EMAIL';
        const rawMessage = `🚨 *Alerte Aetheris (${alert.symbol})*\n\n${reason}\n\nConnectez-vous à votre terminal pour gérer vos positions.`;

        // Notification Telegram
        if ((channel === 'TELEGRAM' || channel === 'ALL') && profile?.telegram_chat_id) {
          const telegramMessage = `🚨 <b>Alerte Aetheris (${alert.symbol})</b>\n\n${reason}\n\n<i>Connectez-vous à votre terminal pour gérer vos positions.</i>`;
          await sendTelegramAlert(profile.telegram_chat_id, telegramMessage);
        }

        // Notification WhatsApp
        if ((channel === 'WHATSAPP' || channel === 'ALL') && profile?.whatsapp_phone) {
          await sendWhatsAppAlert(profile.whatsapp_phone, rawMessage);
        }

        // Notification Email
        if (channel === 'EMAIL' || channel === 'ALL') {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(alert.user_id);
          const userEmail = userData?.user?.email;

          if (userEmail) {
            try {
              await resend.emails.send({
                from: 'Aetheris Terminal <onboarding@resend.dev>',
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
                    <p><small>L'équipe Aetheris Terminal</small></p>
                  </div>
                `
              });
              console.log(`[Cron Check Alerts] Email envoyé à ${userEmail} pour ${alert.symbol}`);
            } catch (emailError: any) {
              console.error(`[Cron Check Alerts] Erreur envoi email:`, emailError.message);
            }
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

'use server';

import { PortfolioService } from './portfolio-service';
import { PortfolioTransaction, DividendTransaction, PriceAlert } from './schemas';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from './supabase-server';
import { GeminiService } from './gemini';
import { Resend } from 'resend';

// ──────────────────────────────────────
// TRANSACTIONS (BUY & SELL)
// ──────────────────────────────────────

export async function getPortfolioTransactionsAction(isVirtual: boolean = false): Promise<PortfolioTransaction[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getTransactions(client, isVirtual);
}

export async function addPortfolioTransactionAction(
  tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addTransaction(client, tx);
  revalidatePath('/portfolio');
  return result;
}

export async function deletePortfolioTransactionAction(id: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteTransaction(client, id);
  revalidatePath('/portfolio');
}

export async function deleteSymbolPortfolioAction(symbol: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteSymbolTransactions(client, symbol);
  revalidatePath('/portfolio');
}

export async function bulkImportAction(data: { 
  transactions: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>[],
  dividends: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>[]
}) {
  const client = await createServerSupabase();
  await PortfolioService.bulkImport(client, data);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// DIVIDENDES
// ──────────────────────────────────────

export async function getDividendsAction(isVirtual: boolean = false): Promise<DividendTransaction[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getDividends(client, isVirtual);
}

export async function addDividendAction(
  div: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addDividend(client, div);
  revalidatePath('/portfolio');
  return result;
}

export async function deleteDividendAction(id: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteDividend(client, id);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// ALERTES PRIX (Stop-Loss / Take-Profit)
// ──────────────────────────────────────

export async function getAlertsAction(): Promise<PriceAlert[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getAlerts(client);
}

export async function upsertAlertAction(
  alert: { symbol: string; sl_price?: number | null; tp_price?: number | null }
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.upsertAlert(client, alert);
  revalidatePath('/portfolio');
  return result;
}

// ──────────────────────────────────────
// PROFIL UTILISATEUR (Settings)
// ──────────────────────────────────────

export async function getUserProfileAction() {
  try {
    const client = await createServerSupabase();
    const data = await PortfolioService.getUserProfile(client);
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in getUserProfileAction:', err);
    return { success: false, error: err.message || 'Impossible de charger le profil' };
  }
}

export async function upsertUserProfileAction(profile: { 
  initial_capital?: number; 
  subscription_tier?: string;
  telegram_chat_id?: string;
  whatsapp_phone?: string;
  alert_channel?: string;
  notification_email?: string;
  username?: string;
  virtual_initial_capital?: number;
  virtual_balance?: number;
}) {
  try {
    const client = await createServerSupabase();
    const data = await PortfolioService.upsertUserProfile(client, profile);
    revalidatePath('/portfolio');
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in upsertUserProfileAction:', err);
    return { success: false, error: err.message || 'Impossible de sauvegarder le profil' };
  }
}

export async function addVirtualTransactionAction(
  tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id' | 'is_virtual'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addVirtualTransaction(client, tx);
  revalidatePath('/portfolio');
  return result;
}

export async function resetVirtualPortfolioAction(initialCapital?: number) {
  const client = await createServerSupabase();
  const result = await PortfolioService.resetVirtualPortfolio(client, initialCapital);
  revalidatePath('/portfolio');
  return result;
}

export async function getLeaderboardAction() {
  const client = await createServerSupabase();
  return await PortfolioService.getLeaderboard(client);
}

export async function optimizePortfolioAction(holdings: any[]) {
  return await GeminiService.optimizePortfolio(holdings);
}

export async function sendTestAlertAction(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié. Veuillez vous connecter.' };

    const profile = await PortfolioService.getUserProfile(client);
    const targetEmail = profile?.notification_email || user.email;
    const channel = profile?.alert_channel || 'EMAIL';
    const telegramChatId = profile?.telegram_chat_id;
    const whatsappPhone = profile?.whatsapp_phone;

    const dispatched: string[] = [];
    const errors: string[] = [];

    // 1. Email Test
    if ((channel === 'EMAIL' || channel === 'ALL') && targetEmail) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          errors.push('RESEND_API_KEY non configurée');
        } else {
          const resend = new Resend(apiKey);
          const { error } = await resend.emails.send({
            from: 'Aetheris Terminal <onboarding@resend.dev>',
            to: targetEmail,
            subject: '🧪 Test d\'Alerte Aetheris Terminal',
            html: `
              <div style="font-family: sans-serif; padding: 25px; color: #1e293b; background-color: #0b0f19; border-radius: 12px; border: 1px solid #10b981;">
                <h2 style="color: #10b981; margin-top: 0;">🧪 Test d'Alerte Aetheris Réussi !</h2>
                <p style="color: #e2e8f0; font-size: 15px;">Bonjour,</p>
                <p style="color: #cbd5e1; line-height: 1.5;">Ceci est une notification de test confirmant que votre adresse email d'alerte est opérationnelle.</p>
                <div style="background-color: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 6px;">
                  <strong style="color: #34d399;">🚨 Exemple d'alerte :</strong>
                  <p style="color: #f8fafc; margin: 5px 0 0 0;">ATTIJARIWAFA BANK (ATW) a atteint votre seuil de Stop Loss / Take Profit !</p>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Aetheris Terminal • Bourse de Casablanca & International</p>
              </div>
            `
          });
          if (error) {
            console.error('[sendTestAlertAction] Resend error:', error);
            const msg = error.message?.toLowerCase().includes('api key') 
              ? 'Clé RESEND_API_KEY invalide ou expirée dans vos variables .env.local' 
              : error.message;
            errors.push(`Email: ${msg}`);
          } else {
            dispatched.push(`Email (${targetEmail})`);
          }
        }
      } catch (e: any) {
        console.error('[sendTestAlertAction] Email exception:', e.message);
        errors.push(`Email: ${e.message}`);
      }
    }

    // 2. Telegram Test
    if ((channel === 'TELEGRAM' || channel === 'ALL') && telegramChatId) {
      try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          errors.push('TELEGRAM_BOT_TOKEN non configuré');
        } else {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: `🧪 <b>Test d'Alerte Aetheris</b>\n\nVotre Telegram Bot est 100% opérationnel ! Vous recevrez ici vos alertes de Stop Loss & Take Profit.`,
              parse_mode: 'HTML'
            })
          });
          if (res.ok) {
            dispatched.push(`Telegram (${telegramChatId})`);
          } else {
            errors.push(`Telegram: ID chat invalide ou bot non démarré`);
          }
        }
      } catch (e: any) {
        errors.push(`Telegram: ${e.message}`);
      }
    }

    // 3. WhatsApp Test
    if ((channel === 'WHATSAPP' || channel === 'ALL') && whatsappPhone) {
      try {
        const apiKey = process.env.CALLMEBOT_API_KEY;
        if (!apiKey) {
          errors.push('CALLMEBOT_API_KEY non configurée');
        } else {
          const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
          const text = encodeURIComponent("🧪 Test d'Alerte Aetheris: Votre canal WhatsApp est 100% opérationnel !");
          const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${text}&apikey=${apiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            dispatched.push(`WhatsApp (${cleanPhone})`);
          } else {
            errors.push(`WhatsApp: Échec envoi CallMeBot`);
          }
        }
      } catch (e: any) {
        errors.push(`WhatsApp: ${e.message}`);
      }
    }

    if (dispatched.length > 0) {
      return {
        success: true,
        message: `Notification de test envoyée avec succès sur : ${dispatched.join(', ')} !` + (errors.length ? ` (Note: ${errors.join('; ')})` : '')
      };
    } else {
      return {
        success: false,
        error: errors.length ? errors.join(' | ') : 'Aucun canal de notification configuré ou disponible.'
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de l\'envoi du test.' };
  }
}


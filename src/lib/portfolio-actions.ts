'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { PortfolioService } from './portfolio-service';
import {
  PortfolioTransaction,
  DividendTransaction,
  PriceAlert,
  UserProfileClientInputSchema,
  PortfolioOptimizationHoldingSchema,
} from './schemas';
import { revalidatePath } from 'next/cache';
import { createServerSupabase, supabaseAdmin } from './supabase-server';
import { GeminiService } from './gemini';
import { checkRateLimitAsync, getClientIpFromHeaders } from './rate-limiter';
import { Resend } from 'resend';
import { SupabaseClient } from '@supabase/supabase-js';

async function requireAuthenticatedUser(client: SupabaseClient) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    throw new Error('Authentification requise.');
  }
  return user;
}

// ──────────────────────────────────────
// TRANSACTIONS (BUY & SELL)
// ──────────────────────────────────────

export async function getPortfolioTransactionsAction(isVirtual: boolean = false): Promise<PortfolioTransaction[]> {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  return await PortfolioService.getTransactions(client, Boolean(isVirtual));
}

export async function addPortfolioTransactionAction(
  tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  const result = await PortfolioService.addTransaction(client, tx);
  revalidatePath('/portfolio');
  return result;
}

export async function deletePortfolioTransactionAction(id: string) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  await PortfolioService.deleteTransaction(client, id);
  revalidatePath('/portfolio');
}

export async function deleteSymbolPortfolioAction(symbol: string) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  await PortfolioService.deleteSymbolTransactions(client, symbol);
  revalidatePath('/portfolio');
}

export async function bulkImportAction(data: {
  transactions: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>[];
  dividends: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>[];
}) {
  const client = await createServerSupabase();
  const user = await requireAuthenticatedUser(client);

  const limit = await checkRateLimitAsync(`bulk-import:${user.id}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    throw new Error('Trop d\'imports CSV récents. Veuillez patienter quelques minutes.');
  }

  await PortfolioService.bulkImport(client, data);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// DIVIDENDES
// ──────────────────────────────────────

export async function getDividendsAction(isVirtual: boolean = false): Promise<DividendTransaction[]> {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  return await PortfolioService.getDividends(client, Boolean(isVirtual));
}

export async function addDividendAction(
  div: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  const result = await PortfolioService.addDividend(client, div);
  revalidatePath('/portfolio');
  return result;
}

export async function deleteDividendAction(id: string) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  await PortfolioService.deleteDividend(client, id);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// ALERTES PRIX (Stop-Loss / Take-Profit)
// ──────────────────────────────────────

export async function getAlertsAction(): Promise<PriceAlert[]> {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  return await PortfolioService.getAlerts(client);
}

export async function upsertAlertAction(
  alert: { symbol: string; sl_price?: number | null; tp_price?: number | null }
) {
  const client = await createServerSupabase();
  const user = await requireAuthenticatedUser(client);

  // Anti-abus : empêcher la réactivation en boucle d'alertes pour saturer les quotas SMS/Email
  const limit = await checkRateLimitAsync(`alert-upsert:${user.id}`, 15, 5 * 60_000);
  if (!limit.allowed) {
    throw new Error('Trop de modifications d\'alertes récentes. Veuillez patienter quelques minutes.');
  }

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
    return { success: false, error: 'Impossible de charger le profil' };
  }
}

export async function upsertUserProfileAction(profile: {
  initial_capital?: number;
  telegram_chat_id?: string;
  whatsapp_phone?: string;
  alert_channel?: string;
  notification_email?: string;
  username?: string;
}) {
  try {
    const parsed = UserProfileClientInputSchema.safeParse({
      initial_capital: profile.initial_capital,
      telegram_chat_id: profile.telegram_chat_id,
      whatsapp_phone: profile.whatsapp_phone,
      alert_channel: profile.alert_channel,
      notification_email: profile.notification_email,
      username: profile.username,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Paramètres de profil invalides',
      };
    }

    const client = await createServerSupabase();
    const user = await requireAuthenticatedUser(client);

    const limit = await checkRateLimitAsync(`profile-upsert:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return { success: false, error: 'Trop de modifications récentes. Veuillez patienter.' };
    }

    // 🔒 SÉCURITÉ ANTI-SPAM TIERS : L'email de notification doit correspondre à l'email vérifié du compte
    if (
      parsed.data.notification_email &&
      user.email &&
      parsed.data.notification_email.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      return {
        success: false,
        error: "Pour votre sécurité et contre les abus, l'email de notification doit correspondre à l'adresse vérifiée de votre compte.",
      };
    }

    const data = await PortfolioService.upsertUserProfile(client, parsed.data);
    revalidatePath('/portfolio');
    revalidatePath('/profile');
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
  const user = await requireAuthenticatedUser(client);

  const limit = await checkRateLimitAsync(`virtual-order:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    throw new Error('Trop d\'ordres virtuels rapprochés. Veuillez patienter quelques secondes.');
  }

  const result = await PortfolioService.addVirtualTransaction(client, tx, supabaseAdmin || undefined);
  revalidatePath('/portfolio');
  return result;
}

export async function resetVirtualPortfolioAction(initialCapital?: number) {
  const client = await createServerSupabase();
  const user = await requireAuthenticatedUser(client);

  const limit = await checkRateLimitAsync(`virtual-reset:${user.id}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    throw new Error('Réinitialisation limitée. Veuillez patienter quelques minutes.');
  }

  const result = await PortfolioService.resetVirtualPortfolio(client, initialCapital, supabaseAdmin || undefined);
  revalidatePath('/portfolio');
  return result;
}

export async function getLeaderboardAction() {
  const client = await createServerSupabase();
  const { data: { user } } = await client.auth.getUser();
  const reqHeaders = await headers();
  const clientIp = getClientIpFromHeaders(reqHeaders);
  const limit = await checkRateLimitAsync(`leaderboard:${user?.id || clientIp}`, 20, 60_000);
  if (!limit.allowed) {
    throw new Error('Trop de requêtes sur le classement. Veuillez patienter.');
  }

  const hmacSecret =
    process.env.LEADERBOARD_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'aetheris-leaderboard-v1';

  return await PortfolioService.getLeaderboard(client, supabaseAdmin || undefined, hmacSecret);
}

const OptimizeHoldingsArraySchema = z
  .array(PortfolioOptimizationHoldingSchema)
  .min(1, 'Portefeuille vide.')
  .max(60, 'Trop de positions pour une seule optimisation.');

export async function optimizePortfolioAction(holdings: unknown[]) {
  const client = await createServerSupabase();
  const user = await requireAuthenticatedUser(client);

  // 🔒 SÉCURITÉ SAAS : Vérifier l'abonnement PRO côté serveur
  const profile = await PortfolioService.getUserProfile(client);
  if (profile?.subscription_tier !== 'premium') {
    throw new Error('PAYWALL_BLOCKED: Le Robo-Advisor IA est réservé aux abonnés PRO.');
  }

  // 🔒 Rate Limiting anti-abus IA (max 6 optimisations par 10 minutes par utilisateur)
  const limit = await checkRateLimitAsync(`optimize:${user.id}`, 6, 10 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error('Limite d\'optimisations IA atteinte. Veuillez patienter quelques minutes.');
  }

  // 🔒 Validation stricte Zod pour bloquer l'injection de prompt et le DoS de contexte via faux holdings
  const parsedHoldings = OptimizeHoldingsArraySchema.safeParse(holdings);
  if (!parsedHoldings.success) {
    throw new Error(parsedHoldings.error.issues[0]?.message || 'Données de portefeuille invalides.');
  }

  return await GeminiService.optimizePortfolio(parsedHoldings.data);
}

export async function sendTestAlertAction(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié. Veuillez vous connecter.' };

    // 🔒 Rate Limiting strict (max 3 tests d'alerte toutes les 15 minutes)
    const rateLimit = await checkRateLimitAsync(`test-alert:${user.id}`, 3, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMin = Math.ceil(rateLimit.retryAfterMs / 60000);
      return {
        success: false,
        error: `Trop de tests envoyés. Veuillez patienter ${waitMin} minute(s) avant de réessayer.`,
      };
    }

    const profile = await PortfolioService.getUserProfile(client);
    // 🔒 SÉCURITÉ : Envoi strictement vers l'adresse email vérifiée du compte authentifié
    const targetEmail = user.email;
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
          errors.push('Service email non configuré');
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
            `,
          });
          if (error) {
            console.error('[sendTestAlertAction] Resend error:', error);
            errors.push('Email: Échec d\'envoi du message');
          } else {
            dispatched.push(`Email (${targetEmail})`);
          }
        }
      } catch (e: any) {
        console.error('[sendTestAlertAction] Email exception:', e.message);
        errors.push('Email: Service temporairement indisponible');
      }
    }

    // 2. Telegram Test
    if ((channel === 'TELEGRAM' || channel === 'ALL') && telegramChatId) {
      try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          errors.push('Canal Telegram non configuré');
        } else {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: `🧪 <b>Test d'Alerte Aetheris</b>\n\nVotre Telegram Bot est 100% opérationnel ! Vous recevrez ici vos alertes de Stop Loss & Take Profit.`,
              parse_mode: 'HTML',
            }),
          });
          if (res.ok) {
            dispatched.push(`Telegram (${telegramChatId})`);
          } else {
            errors.push('Telegram: ID chat invalide ou bot non démarré');
          }
        }
      } catch {
        errors.push('Telegram: Service indisponible');
      }
    }

    // 3. WhatsApp Test
    if ((channel === 'WHATSAPP' || channel === 'ALL') && whatsappPhone) {
      try {
        const apiKey = process.env.CALLMEBOT_API_KEY;
        if (!apiKey) {
          errors.push('Canal WhatsApp non configuré');
        } else {
          const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
          const text = encodeURIComponent("🧪 Test d'Alerte Aetheris: Votre canal WhatsApp est 100% opérationnel !");
          const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${text}&apikey=${apiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            dispatched.push(`WhatsApp (${cleanPhone})`);
          } else {
            errors.push('WhatsApp: Échec envoi CallMeBot');
          }
        }
      } catch {
        errors.push('WhatsApp: Service indisponible');
      }
    }

    if (dispatched.length > 0) {
      return {
        success: true,
        message:
          `Notification de test envoyée avec succès sur : ${dispatched.join(', ')} !` +
          (errors.length ? ` (Note: ${errors.join('; ')})` : ''),
      };
    } else {
      return {
        success: false,
        error: errors.length ? errors.join(' | ') : 'Aucun canal de notification configuré ou disponible.',
      };
    }
  } catch {
    return { success: false, error: 'Erreur lors de l\'envoi du test.' };
  }
}

'use server';

import crypto from 'crypto';
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
import { checkRateLimitAsync } from './rate-limiter';
import { Resend } from 'resend';
import { SupabaseClient } from '@supabase/supabase-js';

async function requireAuthenticatedUser(client: SupabaseClient) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    throw new Error('Authentification requise.');
  }
  return user;
}

function getChannelOtpSecret(): string {
  return (
    process.env.LEADERBOARD_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'aetheris-channel-otp-v1'
  );
}

function hashChannelOtp(userId: string, channel: 'TELEGRAM' | 'WHATSAPP', target: string, code: string): string {
  return crypto
    .createHmac('sha256', getChannelOtpSecret())
    .update(`${userId}:${channel}:${target.trim()}:${code.trim()}`)
    .digest('hex');
}

function redactSecrets(message: string): string {
  let clean = message || '';
  const secrets = [process.env.CALLMEBOT_API_KEY, process.env.TELEGRAM_BOT_TOKEN];
  for (const s of secrets) {
    if (s && s.length > 4) {
      clean = clean.split(s).join('[REDACTED]');
    }
  }
  return clean;
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
  const result = await PortfolioService.addDividend(client, div, supabaseAdmin || undefined);
  revalidatePath('/portfolio');
  return result;
}

export async function deleteDividendAction(id: string) {
  const client = await createServerSupabase();
  await requireAuthenticatedUser(client);
  await PortfolioService.deleteDividend(client, id, supabaseAdmin || undefined);
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
// PROFIL UTILISATEUR & VÉRIFICATION OTP CANAUX
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

    const previousProfile = await PortfolioService.getUserProfile(client);
    const telegramChanged =
      parsed.data.telegram_chat_id !== undefined &&
      (parsed.data.telegram_chat_id || '') !== (previousProfile?.telegram_chat_id || '');
    const whatsappChanged =
      parsed.data.whatsapp_phone !== undefined &&
      (parsed.data.whatsapp_phone || '') !== (previousProfile?.whatsapp_phone || '');

    const data = await PortfolioService.upsertUserProfile(client, parsed.data);

    // Défense en profondeur côté serveur : révoquer la vérification si l'identifiant du canal a changé
    if (supabaseAdmin && (telegramChanged || whatsappChanged)) {
      const resetFields: Record<string, unknown> = {};
      if (telegramChanged) {
        resetFields.telegram_verified = false;
        resetFields.telegram_verify_code_hash = null;
        resetFields.telegram_verify_expires_at = null;
      }
      if (whatsappChanged) {
        resetFields.whatsapp_verified = false;
        resetFields.whatsapp_verify_code_hash = null;
        resetFields.whatsapp_verify_expires_at = null;
      }
      await supabaseAdmin.from('user_profiles').update(resetFields).eq('user_id', user.id);
    }

    revalidatePath('/portfolio');
    revalidatePath('/profile');
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in upsertUserProfileAction:', err);
    return { success: false, error: err.message || 'Impossible de sauvegarder le profil' };
  }
}

/**
 * Génère et envoie un code OTP à 6 chiffres (valide 5 minutes) pour prouver la possession
 * du canal Telegram ou WhatsApp avant d'autoriser tout envoi d'alertes automatisées.
 */
export async function requestChannelVerificationAction(
  channel: 'TELEGRAM' | 'WHATSAPP'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (channel !== 'TELEGRAM' && channel !== 'WHATSAPP') {
      return { success: false, error: 'Canal invalide.' };
    }

    const client = await createServerSupabase();
    const user = await requireAuthenticatedUser(client);
    if (!supabaseAdmin) {
      return { success: false, error: 'Service de vérification serveur non configuré.' };
    }

    const userLimit = await checkRateLimitAsync(`channel-otp-req:user:${user.id}`, 2, 15 * 60_000);
    if (!userLimit.allowed) {
      return { success: false, error: 'Trop de demandes de code OTP. Réessayez dans 15 minutes.' };
    }

    const profile = await PortfolioService.getUserProfile(client);
    const rawTarget = channel === 'TELEGRAM' ? profile?.telegram_chat_id : profile?.whatsapp_phone;
    const cleanTarget = (rawTarget || '').trim();

    if (!cleanTarget) {
      return {
        success: false,
        error: `Veuillez d'abord enregistrer votre identifiant ${channel === 'TELEGRAM' ? 'Telegram' : 'WhatsApp'} puis cliquer sur Sauvegarder.`,
      };
    }

    // Rate-limit par destinataire (empêche le harcèlement multi-comptes d'un même numéro tiers)
    const destHash = crypto.createHash('sha256').update(`${channel}:${cleanTarget}`).digest('hex').slice(0, 24);
    const destLimit = await checkRateLimitAsync(`channel-otp-req:dest:${destHash}`, 2, 60 * 60_000);
    if (!destLimit.allowed) {
      return { success: false, error: 'Limite horaire atteinte pour ce destinataire. Réessayez plus tard.' };
    }

    const otpCode = String(crypto.randomInt(100000, 1000000));
    const codeHash = hashChannelOtp(user.id, channel, cleanTarget, otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    const updatePayload =
      channel === 'TELEGRAM'
        ? {
            telegram_verified: false,
            telegram_verify_code_hash: codeHash,
            telegram_verify_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          }
        : {
            whatsapp_verified: false,
            whatsapp_verify_code_hash: codeHash,
            whatsapp_verify_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          };

    const { error: dbErr } = await supabaseAdmin
      .from('user_profiles')
      .update(updatePayload)
      .eq('user_id', user.id);

    if (dbErr) {
      console.error('[requestChannelVerificationAction] DB error:', dbErr.message);
      return {
        success: false,
        error: 'Migration SQL requise : exécutez supabase_rls_policies.sql pour activer la vérification OTP.',
      };
    }

    if (channel === 'TELEGRAM') {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return { success: false, error: 'Canal Telegram non configuré côté serveur.' };

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanTarget,
          text: `🔐 <b>Code de vérification Aetheris : ${otpCode}</b>\n\nValable 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return { success: false, error: 'Échec d\'envoi Telegram. Vérifiez le Chat ID et démarrez le bot.' };
      }
    } else {
      const apiKey = process.env.CALLMEBOT_API_KEY;
      if (!apiKey) return { success: false, error: 'Canal WhatsApp non configuré côté serveur.' };

      const cleanPhone = cleanTarget.replace(/[^0-9]/g, '');
      const text = encodeURIComponent(
        `🔐 Code de vérification Aetheris : ${otpCode} (valable 5 min). Ignorez si non sollicité.`
      );
      const res = await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${text}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) {
        return { success: false, error: 'Échec d\'envoi WhatsApp via CallMeBot.' };
      }
    }

    return { success: true, message: `Code à 6 chiffres envoyé sur ${channel}. Il expire dans 5 minutes.` };
  } catch (err: any) {
    console.error('[requestChannelVerificationAction] Exception:', redactSecrets(err?.message || ''));
    return { success: false, error: 'Impossible d\'envoyer le code de vérification.' };
  }
}

export async function confirmChannelVerificationAction(
  channel: 'TELEGRAM' | 'WHATSAPP',
  code: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (channel !== 'TELEGRAM' && channel !== 'WHATSAPP') {
      return { success: false, error: 'Canal invalide.' };
    }
    const cleanCode = (code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: 'Le code de vérification doit contenir exactement 6 chiffres.' };
    }

    const client = await createServerSupabase();
    const user = await requireAuthenticatedUser(client);
    if (!supabaseAdmin) {
      return { success: false, error: 'Service de vérification serveur non configuré.' };
    }

    const attemptLimit = await checkRateLimitAsync(`channel-otp-confirm:${user.id}`, 5, 15 * 60_000);
    if (!attemptLimit.allowed) {
      return { success: false, error: 'Trop de tentatives erronées. Veuillez demander un nouveau code plus tard.' };
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('user_profiles')
      .select(
        'telegram_chat_id, telegram_verify_code_hash, telegram_verify_expires_at, whatsapp_phone, whatsapp_verify_code_hash, whatsapp_verify_expires_at'
      )
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !row) {
      return { success: false, error: 'Profil introuvable.' };
    }

    const target = channel === 'TELEGRAM' ? row.telegram_chat_id : row.whatsapp_phone;
    const storedHash = channel === 'TELEGRAM' ? row.telegram_verify_code_hash : row.whatsapp_verify_code_hash;
    const expiresAt = channel === 'TELEGRAM' ? row.telegram_verify_expires_at : row.whatsapp_verify_expires_at;

    if (!target || !storedHash || !expiresAt) {
      return { success: false, error: 'Aucun code en attente. Demandez d\'abord un code de vérification.' };
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Ce code a expiré. Veuillez en demander un nouveau.' };
    }

    const candidateHash = hashChannelOtp(user.id, channel, target, cleanCode);
    const storedBuf = Buffer.from(storedHash, 'utf8');
    const candidateBuf = Buffer.from(candidateHash, 'utf8');

    if (storedBuf.length !== candidateBuf.length || !crypto.timingSafeEqual(storedBuf, candidateBuf)) {
      return { success: false, error: 'Code de vérification incorrect.' };
    }

    const verifiedUpdate =
      channel === 'TELEGRAM'
        ? {
            telegram_verified: true,
            telegram_verify_code_hash: null,
            telegram_verify_expires_at: null,
            updated_at: new Date().toISOString(),
          }
        : {
            whatsapp_verified: true,
            whatsapp_verify_code_hash: null,
            whatsapp_verify_expires_at: null,
            updated_at: new Date().toISOString(),
          };

    await supabaseAdmin.from('user_profiles').update(verifiedUpdate).eq('user_id', user.id);
    revalidatePath('/profile');
    return { success: true, message: `Canal ${channel} vérifié et activé avec succès !` };
  } catch (err: any) {
    console.error('[confirmChannelVerificationAction] Exception:', redactSecrets(err?.message || ''));
    return { success: false, error: 'Erreur lors de la validation du code.' };
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
  // 🔒 SÉCURITÉ ANTI-DoS : Le classement Paper Trading nécessite une session authentifiée
  const user = await requireAuthenticatedUser(client);
  await headers();
  const limit = await checkRateLimitAsync(`leaderboard:${user.id}`, 20, 60_000);
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
    const telegramVerified = Boolean(profile?.telegram_verified);
    const whatsappPhone = profile?.whatsapp_phone;
    const whatsappVerified = Boolean(profile?.whatsapp_verified);

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

    // 2. Telegram Test (uniquement si propriété du Chat ID vérifiée par OTP)
    if ((channel === 'TELEGRAM' || channel === 'ALL') && telegramChatId) {
      if (!telegramVerified) {
        errors.push('Telegram: Canal non vérifié (cliquez sur "Vérifier par code OTP")');
      } else {
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
                text: `🧪 <b>Test d'Alerte Aetheris</b>\n\nVotre Telegram Bot vérifié est 100% opérationnel ! Vous recevrez ici vos alertes de Stop Loss & Take Profit.`,
                parse_mode: 'HTML',
              }),
              signal: AbortSignal.timeout(8000),
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
    }

    // 3. WhatsApp Test (uniquement si propriété du numéro vérifiée par OTP)
    if ((channel === 'WHATSAPP' || channel === 'ALL') && whatsappPhone) {
      if (!whatsappVerified) {
        errors.push('WhatsApp: Numéro non vérifié (cliquez sur "Vérifier par code OTP")');
      } else {
        try {
          const apiKey = process.env.CALLMEBOT_API_KEY;
          if (!apiKey) {
            errors.push('Canal WhatsApp non configuré');
          } else {
            const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
            const text = encodeURIComponent("🧪 Test d'Alerte Aetheris: Votre canal WhatsApp vérifié est 100% opérationnel !");
            const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${text}&apikey=${apiKey}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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

'use server';

import Stripe from 'stripe';
import { createServerSupabase, supabaseAdmin } from './supabase-server';
import { checkRateLimitAsync } from './rate-limiter';
import { revalidatePath } from 'next/cache';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-01-27' as any,
  });
}

/**
 * Valide l'origine pour éviter toute attaque Open Redirect lors du retour Stripe
 */
function getSafeOrigin(clientOrigin?: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }
  if (
    clientOrigin &&
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clientOrigin)
  ) {
    return clientOrigin;
  }
  return 'http://localhost:3000';
}

/**
 * Met à jour le tier d'abonnement et les identifiants Stripe côté serveur (utilise supabaseAdmin pour passer le trigger RLS)
 */
async function setSubscriptionTierServerSide(
  userId: string,
  tier: 'free' | 'premium',
  stripeDetails?: { customerId?: string | null; subscriptionId?: string | null }
) {
  const dbClient = supabaseAdmin || (await createServerSupabase());
  const payload: Record<string, unknown> = {
    user_id: userId,
    subscription_tier: tier,
    updated_at: new Date().toISOString(),
  };

  if (stripeDetails?.customerId !== undefined) {
    payload.stripe_customer_id = stripeDetails.customerId;
  }
  if (stripeDetails?.subscriptionId !== undefined) {
    payload.stripe_subscription_id = stripeDetails.subscriptionId;
  }

  const { error } = await dbClient
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    // Fallback compatible si les colonnes stripe_* n'ont pas encore été migrées dans Supabase
    const { error: fallbackErr } = await dbClient
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          subscription_tier: tier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (fallbackErr) throw fallbackErr;
  }
}

/**
 * SERVER ACTION: Créer une session Stripe Checkout pour l'abonnement Pro (199 MAD/mois)
 */
export async function createCheckoutSessionAction(origin?: string) {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Veuillez vous authentifier pour souscrire.');

    const limit = await checkRateLimitAsync(`stripe:checkout:${user.id}`, 5, 10 * 60_000);
    if (!limit.allowed) {
      throw new Error('Trop de tentatives de paiement. Veuillez patienter quelques minutes.');
    }

    const stripe = getStripeClient();
    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error("Le service de paiement Stripe n'est pas configuré.");
      }
      console.warn('[Stripe] Clé secrète absente en dev. Utilisation du mode Sandbox de démonstration.');
      return { success: true, sandbox: true };
    }

    const safeOrigin = getSafeOrigin(origin);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: 'AETHERIS PRO',
              description: "Accès illimité aux agents d'Intelligence Stratégique et au Robo-Advisor",
            },
            unit_amount: 19900, // 199.00 MAD
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: user.id,
      success_url: `${safeOrigin}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeOrigin}/profile`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error('[Stripe Action] Session creation error:', error.message);
    return { success: false, error: error.message || 'Impossible d\'initialiser le paiement.' };
  }
}

/**
 * SERVER ACTION: Vérifier la session après le paiement et mettre à niveau en base
 */
export async function verifyStripeSessionAction(sessionId: string) {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { success: false, error: 'Authentification requise.' };
    }

    const limit = await checkRateLimitAsync(`stripe:verify:${user.id}`, 10, 10 * 60_000);
    if (!limit.allowed) {
      return { success: false, error: 'Trop de requêtes de vérification. Veuillez patienter.' };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Configuration Stripe manquante en production.' };
      }
      await setSubscriptionTierServerSide(user.id, 'premium');
      revalidatePath('/profile');
      revalidatePath('/portfolio');
      return { success: true, message: 'Sandbox activé avec succès (Environnement Dev).' };
    }

    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.length > 200 ||
      !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)
    ) {
      return { success: false, error: "Format d'identifiant de session Stripe invalide." };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 🔒 SÉCURITÉ CRITIQUE : Vérifier que la session appartient bien à l'utilisateur connecté
    if (session.metadata?.userId !== user.id && session.client_reference_id !== user.id) {
      console.error(`[Stripe Security] Tentative d'usurpation de session ${sessionId} par l'utilisateur ${user.id}`);
      return { success: false, error: 'Cette session de paiement ne correspond pas à votre compte.' };
    }

    // 🔒 Anti-Replay : Vérifier que la session a été créée au cours des dernières 24 heures
    const sessionAgeSeconds = Math.floor(Date.now() / 1000) - (session.created || 0);
    if (sessionAgeSeconds > 86400) {
      return { success: false, error: 'Cette session de paiement a expiré.' };
    }

    if (session.payment_status === 'paid') {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;

      await setSubscriptionTierServerSide(user.id, 'premium', { customerId, subscriptionId });
      revalidatePath('/profile');
      revalidatePath('/portfolio');
      return { success: true };
    }

    return { success: false, error: 'Paiement non complété.' };
  } catch (error: any) {
    console.error('[Stripe Verification] Error:', error.message);
    return { success: false, error: 'Erreur lors de la vérification du paiement.' };
  }
}

/**
 * SERVER ACTION: Résilier l'abonnement PRO (annule effectivement l'abonnement récurrent chez Stripe + rétrograde en base)
 */
export async function cancelSubscriptionAction() {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié.');

    const limit = await checkRateLimitAsync(`stripe:cancel:${user.id}`, 5, 10 * 60_000);
    if (!limit.allowed) {
      return { success: false, error: 'Trop de requêtes. Veuillez patienter.' };
    }

    const stripe = getStripeClient();
    const dbClient = supabaseAdmin || client;

    if (stripe) {
      // 1. Rechercher l'identifiant d'abonnement Stripe stocké sur le profil
      let subscriptionIdToCancel: string | null = null;
      let customerId: string | null = null;

      const { data: profile } = await dbClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      subscriptionIdToCancel = profile?.stripe_subscription_id || null;
      customerId = profile?.stripe_customer_id || null;

      // 2. Fallback si stripe_subscription_id absent : retrouver via customer_id ou email du compte
      if (!subscriptionIdToCancel && customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 5 });
        subscriptionIdToCancel = subs.data[0]?.id || null;
      }

      if (!subscriptionIdToCancel && user.email) {
        const customers = await stripe.customers.list({ email: user.email, limit: 5 });
        for (const cust of customers.data) {
          const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'active', limit: 5 });
          const matchedSub = subs.data.find((s) => !s.metadata?.userId || s.metadata.userId === user.id);
          if (matchedSub) {
            subscriptionIdToCancel = matchedSub.id;
            break;
          }
        }
      }

      if (subscriptionIdToCancel) {
        await stripe.subscriptions.cancel(subscriptionIdToCancel);
      }
    }

    await setSubscriptionTierServerSide(user.id, 'free', { subscriptionId: null });
    revalidatePath('/profile');
    revalidatePath('/portfolio');
    return { success: true };
  } catch (error: any) {
    console.error('[Stripe Cancel] Error:', error.message);
    return { success: false, error: 'Impossible de résilier l\'abonnement pour le moment.' };
  }
}

/**
 * SERVER ACTION: Activer le mode Sandbox uniquement en environnement de développement
 */
export async function activateSandboxSubscriptionAction() {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.STRIPE_SECRET_KEY) {
      return {
        success: false,
        error: "L'activation Sandbox directe est désactivée lorsque Stripe est actif ou en production.",
      };
    }
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié.');

    await setSubscriptionTierServerSide(user.id, 'premium');
    revalidatePath('/profile');
    revalidatePath('/portfolio');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

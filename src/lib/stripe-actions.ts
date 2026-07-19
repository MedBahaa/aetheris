'use server';

import Stripe from 'stripe';
import { createServerSupabase } from './supabase-server';
import { PortfolioService } from './portfolio-service';

// Initialisation de Stripe (Fallback sur clé de test publique si manquante)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51O...mock', {
  apiVersion: '2025-01-27' as any
});

/**
 * SERVER ACTION: Créer une session Stripe Checkout pour l'abonnement Pro (199 MAD/mois)
 */
export async function createCheckoutSessionAction(origin: string) {
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("Veuillez vous authentifier pour souscrire.");

    // Vérifier si Stripe est configuré en production
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("[Stripe] Clé secrète absente. Utilisation du mode Sandbox de démonstration.");
      // Fallback sandbox automatique : simule un succès immédiat en activant premium en DB
      await PortfolioService.upsertUserProfile(client, { subscription_tier: 'premium' });
      return { success: true, sandbox: true };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: 'AETHERIS PRO',
              description: 'Accès illimité aux agents d\'Intelligence Stratégique et au Robo-Advisor',
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
      success_url: `${origin}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile`,
      metadata: {
        userId: user.id
      }
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error("[Stripe Action] Session creation error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * SERVER ACTION: Vérifier la session après le paiement et mettre à niveau en base
 */
export async function verifyStripeSessionAction(sessionId: string) {
  try {
    const client = await createServerSupabase();
    
    // Si clé absente, mode simulation sandbox validé
    if (!process.env.STRIPE_SECRET_KEY) {
      await PortfolioService.upsertUserProfile(client, { subscription_tier: 'premium' });
      return { success: true, message: "Sandbox activé avec succès." };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      console.log(`[Stripe Verification] Paiement réussi pour la session ${sessionId}. Activation Pro...`);
      await PortfolioService.upsertUserProfile(client, { subscription_tier: 'premium' });
      return { success: true };
    }

    return { success: false, error: "Paiement non complété." };
  } catch (error: any) {
    console.error("[Stripe Verification] Error:", error.message);
    return { success: false, error: error.message };
  }
}

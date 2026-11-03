import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51O...mock', {
  apiVersion: '2025-01-27' as any,
});

/**
 * WEBHOOK STRIPE OFFICIEL (Vérification cryptographique HMAC-SHA256)
 * Gère le cycle de vie des abonnements AETHERIS PRO de manière 100% serveur.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');

  if (!webhookSecret || !signature) {
    return NextResponse.json(
      { error: 'Configuration Webhook ou signature Stripe manquante.' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature invalide :', err.message);
    return NextResponse.json({ error: 'Signature Webhook invalide.' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error('[Stripe Webhook] supabaseAdmin non configuré.');
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        if (userId && session.payment_status === 'paid') {
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .upsert(
              {
                user_id: userId,
                subscription_tier: 'premium',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          if (error) throw error;
          console.log(`[Stripe Webhook] Abonnement PRO activé pour l'utilisateur ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (error) throw error;
          console.log(`[Stripe Webhook] Abonnement PRO résilié pour l'utilisateur ${userId}`);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Erreur de traitement :', err.message);
    return NextResponse.json({ error: 'Erreur interne lors du traitement du webhook.' }, { status: 500 });
  }
}

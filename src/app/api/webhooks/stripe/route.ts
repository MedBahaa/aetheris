import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-01-27' as any,
  });
}

async function resolveUserIdFromStripe(
  metadataUserId?: string | null,
  customerId?: string | null,
  subscriptionId?: string | null
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  if (!supabaseAdmin) return null;

  if (subscriptionId) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (customerId) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

/**
 * WEBHOOK STRIPE OFFICIEL (Vérification cryptographique HMAC-SHA256 + Idempotence)
 * Gère l'intégralité du cycle de vie des abonnements AETHERIS PRO côté serveur.
 */
export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');

  if (!stripe || !webhookSecret || !signature) {
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
    // 🔒 IDEMPOTENCE : Ignorer tout événement Stripe déjà traité (table processed_stripe_events)
    const { data: existingEvent, error: checkEventErr } = await supabaseAdmin
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (!checkEventErr && existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;

        if (userId && session.payment_status === 'paid') {
          const payload: Record<string, unknown> = {
            user_id: userId,
            subscription_tier: 'premium',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabaseAdmin.from('user_profiles').upsert(payload, { onConflict: 'user_id' });
          if (error) {
            const { error: fallbackErr } = await supabaseAdmin.from('user_profiles').upsert(
              {
                user_id: userId,
                subscription_tier: 'premium',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
            if (fallbackErr) throw fallbackErr;
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;
        const userId = await resolveUserIdFromStripe(subscription.metadata?.userId, customerId, subscription.id);

        if (userId) {
          const activeStatuses = new Set(['active', 'trialing']);
          const nextTier = activeStatuses.has(subscription.status) ? 'premium' : 'free';
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: nextTier,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (error) throw error;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;
        const userId = await resolveUserIdFromStripe(subscription.metadata?.userId, customerId, subscription.id);

        if (userId) {
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (error) throw error;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;
        const rawSub = (invoice as any).subscription;
        const subscriptionId = typeof rawSub === 'string' ? rawSub : rawSub?.id || null;
        const userId = await resolveUserIdFromStripe(null, customerId, subscriptionId);

        if (userId) {
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (error) throw error;
        }
        break;
      }

      default:
        break;
    }

    // Enregistrer l'événement comme traité (tolérant si la table n'a pas encore été créée)
    await supabaseAdmin
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type })
      .then(() => undefined, () => undefined);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Erreur de traitement :', err.message);
    return NextResponse.json({ error: 'Erreur interne lors du traitement du webhook.' }, { status: 500 });
  }
}

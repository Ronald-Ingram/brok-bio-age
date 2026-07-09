import {
  applyStripeSubscription,
  cancelStripeSubscription,
} from "@/lib/stripePockCredit";
import { creditTopupFromCheckoutSession } from "@/lib/stripeTopupCredit";
import {
  accrueBuybackFromCheckoutSession,
  accrueBuybackFromInvoice,
} from "@/lib/stripeTreasuryHooks";
import { getTierById } from "@/lib/subscriptionConfig";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripeServer";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getServiceSupabase();

  if (session.mode === "subscription") {
    const userId = session.metadata?.brok_user_id;
    const tierId = session.metadata?.tier_id;
    const includedPock = parseInt(session.metadata?.included_pock ?? "0", 10);

    if (!userId || !tierId || includedPock < 1) {
      console.error("Subscription checkout missing metadata", session.metadata);
      throw new Error("invalid_subscription_metadata");
    }

    const tier = getTierById(tierId);
    const allowance = tier?.includedPockMonthly ?? includedPock;

    await applyStripeSubscription(supabase, {
      userId,
      tier: tierId,
      includedAllowance: allowance,
      stripeEventId: session.id,
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      eventKind: "checkout",
      note: `Stripe subscribe · ${tier?.name ?? tierId}`,
    });
    await accrueBuybackFromCheckoutSession(supabase, session);
    return;
  }

  const result = await creditTopupFromCheckoutSession(supabase, session);
  if (result.reason === "invalid_metadata") {
    console.error("Top-up checkout missing metadata", session.metadata);
    throw new Error("invalid_metadata");
  }
  await accrueBuybackFromCheckoutSession(supabase, session);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === "subscription_create") {
    return;
  }
  if (!invoice.subscription) return;

  const stripe = getStripe();
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subId);

  const userId = subscription.metadata?.brok_user_id;
  const tierId = subscription.metadata?.tier_id;
  const includedPock = parseInt(subscription.metadata?.included_pock ?? "0", 10);

  if (!userId || !tierId || includedPock < 1) {
    console.error("Invoice renewal missing subscription metadata", subscription.metadata);
    return;
  }

  const tier = getTierById(tierId);
  const allowance = tier?.includedPockMonthly ?? includedPock;
  const renewsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const supabase = getServiceSupabase();
  await applyStripeSubscription(supabase, {
    userId,
    tier: tierId,
    includedAllowance: allowance,
    stripeEventId: invoice.id,
    stripeSubscriptionId: subId,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
    renewsAt,
    eventKind: "renewal",
    note: `Stripe renewal · ${tier?.name ?? tierId}`,
  });
  await accrueBuybackFromInvoice(supabase, invoice, tierId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.brok_user_id;
  if (!userId) return;

  const supabase = getServiceSupabase();
  await cancelStripeSubscription(supabase, {
    userId,
    stripeEventId: `cancel_${subscription.id}_${subscription.canceled_at ?? Date.now()}`,
    note: "Stripe subscription ended",
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_succeeded": {
        const supabase = getServiceSupabase();
        const session = event.data.object as Stripe.Checkout.Session;
        await creditTopupFromCheckoutSession(supabase, session);
        await accrueBuybackFromCheckoutSession(supabase, session);
        break;
      }
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(`Webhook handler failed for ${event.type}:`, e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
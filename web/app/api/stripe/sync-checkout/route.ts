import { applyStripeSubscription } from "@/lib/stripePockCredit";
import { creditTopupFromCheckoutSession } from "@/lib/stripeTopupCredit";
import { getTierById } from "@/lib/subscriptionConfig";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripeServer";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function syncSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.brok_user_id;
  if (!userId) throw new Error("invalid_metadata");

  const supabase = getServiceSupabase();

  if (session.mode === "subscription") {
    const tierId = session.metadata?.tier_id;
    const includedPock = parseInt(session.metadata?.included_pock ?? "0", 10);
    if (!tierId || includedPock < 1) throw new Error("invalid_subscription_metadata");

    const tier = getTierById(tierId);
    const allowance = tier?.includedPockMonthly ?? includedPock;

    const user = await applyStripeSubscription(supabase, {
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

    return {
      mode: "subscription" as const,
      balance: Number(user.pock_balance ?? 0),
      subscriptionActive: Boolean(user.subscription_active),
      tier: (user.subscription_tier as string | null) ?? tierId,
    };
  }

  if (session.payment_status !== "paid") {
    return { mode: "payment" as const, pending: true as const };
  }

  const result = await creditTopupFromCheckoutSession(supabase, session);
  if (result.reason === "invalid_metadata") throw new Error("invalid_metadata");

  const { data: user } = await supabase
    .from("brok_users")
    .select("pock_balance")
    .eq("id", userId)
    .single();

  return {
    mode: "payment" as const,
    pending: false as const,
    balance: Number(user?.pock_balance ?? 0),
    credited: result.pockAmount ?? 0,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      accessToken?: string;
    };

    if (!body.sessionId || !body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);

    const sessionUserId = session.metadata?.brok_user_id;
    if (!sessionUserId || sessionUserId !== authData.user.id) {
      return NextResponse.json({ error: "session_mismatch" }, { status: 403 });
    }

    const result = await syncSession(session);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    console.error("Stripe sync-checkout error:", e);
    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
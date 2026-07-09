import { creditPockFromStripe } from "@/lib/stripePockCredit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/** Credit reserved $POCK from a paid Stripe Checkout session (idempotent). */
export async function creditTopupFromCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ credited: boolean; pockAmount?: number; reason?: string }> {
  if (session.mode === "subscription") {
    return { credited: false, reason: "subscription_session" };
  }

  if (session.payment_status !== "paid") {
    return { credited: false, reason: "payment_not_paid" };
  }

  const userId = session.metadata?.brok_user_id;
  const pockAmount = parseInt(session.metadata?.pock_amount ?? "0", 10);
  if (!userId || pockAmount < 1) {
    return { credited: false, reason: "invalid_metadata" };
  }

  await creditPockFromStripe(supabase, {
    userId,
    amount: pockAmount,
    stripeSessionId: session.id,
    amountCents: session.amount_total ?? null,
    note: `Stripe purchase · ${pockAmount} $POCK · locked at checkout`,
  });

  return { credited: true, pockAmount };
}
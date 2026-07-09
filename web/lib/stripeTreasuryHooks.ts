import { recordTreasuryBuybackAccrual } from "@/lib/treasuryBuybackAccrual";
import { maybeExecuteTreasuryBuyback } from "@/lib/treasuryBuybackExecutor";
import type { TreasuryProductLine } from "@/lib/treasuryBuybackPolicy";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

async function tryAutoBuyback(supabase: SupabaseClient): Promise<void> {
  await maybeExecuteTreasuryBuyback(supabase).catch((err) => {
    console.error("Treasury buyback auto-execute failed:", err);
  });
}

function grossCentsFromSession(session: Stripe.Checkout.Session): number {
  return session.amount_total ?? 0;
}

function grossCentsFromInvoice(invoice: Stripe.Invoice): number {
  return invoice.amount_paid ?? invoice.total ?? 0;
}

export async function accrueBuybackFromCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const grossUsdCents = grossCentsFromSession(session);
  if (grossUsdCents < 1) return;

  const productLine: TreasuryProductLine =
    session.mode === "subscription" ? "brok_subscription" : "brok_pock_topup";

  await recordTreasuryBuybackAccrual(supabase, {
    stripeEventId: `buyback:checkout:${session.id}`,
    grossUsdCents,
    productLine,
    userId: session.metadata?.brok_user_id ?? null,
    stripeSessionId: session.id,
    note:
      productLine === "brok_subscription"
        ? `Neobanx subscription · ${session.metadata?.tier_id ?? "tier"}`
        : `Neobanx $POCK top-up · ${session.metadata?.package_id ?? "prepaid"}`,
  })
    .then(() => tryAutoBuyback(supabase))
    .catch((err) => {
      console.error("Treasury buyback accrual failed (checkout):", err);
    });
}

export async function accrueBuybackFromInvoice(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  tierId?: string | null
): Promise<void> {
  const grossUsdCents = grossCentsFromInvoice(invoice);
  if (grossUsdCents < 1) return;

  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  await recordTreasuryBuybackAccrual(supabase, {
    stripeEventId: `buyback:invoice:${invoice.id}`,
    grossUsdCents,
    productLine: "brok_subscription",
    stripeInvoiceId: invoice.id,
    note: `Neobanx subscription renewal · ${tierId ?? subId ?? "subscription"}`,
  })
    .then(() => tryAutoBuyback(supabase))
    .catch((err) => {
      console.error("Treasury buyback accrual failed (invoice):", err);
    });
}
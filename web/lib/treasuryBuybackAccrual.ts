import {
  buybackUsdCentsFromGross,
  POCK_BUYBACK_PCT,
  type TreasuryProductLine,
} from "@/lib/treasuryBuybackPolicy";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RecordBuybackAccrualInput {
  stripeEventId: string;
  grossUsdCents: number;
  productLine: TreasuryProductLine;
  userId?: string | null;
  stripeSessionId?: string | null;
  stripeInvoiceId?: string | null;
  note?: string;
}

export interface BuybackAccrualResult {
  recorded: boolean;
  buybackUsdCents?: number;
  reason?: string;
}

async function insertAccrualFallback(
  supabase: SupabaseClient,
  input: RecordBuybackAccrualInput,
  buybackUsdCents: number
): Promise<BuybackAccrualResult> {
  const { data: existing } = await supabase
    .from("treasury_buyback_accruals")
    .select("id")
    .eq("stripe_event_id", input.stripeEventId)
    .maybeSingle();

  if (existing) {
    return { recorded: false, reason: "already_recorded", buybackUsdCents };
  }

  const { error } = await supabase.from("treasury_buyback_accruals").insert({
    stripe_event_id: input.stripeEventId,
    stripe_session_id: input.stripeSessionId ?? null,
    stripe_invoice_id: input.stripeInvoiceId ?? null,
    user_id: input.userId ?? null,
    product_line: input.productLine,
    gross_usd_cents: input.grossUsdCents,
    buyback_usd_cents: buybackUsdCents,
    buyback_pct: POCK_BUYBACK_PCT,
    status: "accrued",
    note: input.note ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { recorded: false, reason: "already_recorded", buybackUsdCents };
    }
    throw error;
  }

  return { recorded: true, buybackUsdCents };
}

/** Idempotent: reserve 20% of gross Neobanx service revenue for treasury buyback. */
export async function recordTreasuryBuybackAccrual(
  supabase: SupabaseClient,
  input: RecordBuybackAccrualInput
): Promise<BuybackAccrualResult> {
  const buybackUsdCents = buybackUsdCentsFromGross(input.grossUsdCents);
  if (buybackUsdCents < 1) {
    return { recorded: false, reason: "amount_too_small" };
  }

  const { data, error } = await supabase.rpc("record_treasury_buyback_accrual", {
    p_stripe_event_id: input.stripeEventId,
    p_gross_usd_cents: input.grossUsdCents,
    p_buyback_usd_cents: buybackUsdCents,
    p_product_line: input.productLine,
    p_user_id: input.userId ?? null,
    p_stripe_session_id: input.stripeSessionId ?? null,
    p_stripe_invoice_id: input.stripeInvoiceId ?? null,
    p_note: input.note ?? null,
  });

  if (!error) {
    const row = data as { recorded?: boolean; buyback_usd_cents?: number } | null;
    return {
      recorded: Boolean(row?.recorded),
      buybackUsdCents: row?.buyback_usd_cents ?? buybackUsdCents,
      reason: row?.recorded ? undefined : "already_recorded",
    };
  }

  const msg = error.message ?? "";
  if (
    error.code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("treasury_buyback_accruals")
  ) {
    return insertAccrualFallback(supabase, input, buybackUsdCents);
  }

  throw error;
}
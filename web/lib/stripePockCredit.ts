import type { SupabaseClient } from "@supabase/supabase-js";
import { isUserFrozen } from "@/lib/emergencyKill";

type BrokUserRow = Record<string, unknown>;

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("PGRST202")
  );
}

function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

async function fetchUser(
  supabase: SupabaseClient,
  userId: string
): Promise<BrokUserRow> {
  const { data, error } = await supabase
    .from("brok_users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) throw error ?? new Error("user_not_found");
  return data;
}

async function ledgerHasIdempotencyKey(
  supabase: SupabaseClient,
  userId: string,
  keyPrefix: string
): Promise<boolean> {
  const { data } = await supabase
    .from("pock_ledger")
    .select("id")
    .eq("user_id", userId)
    .like("note", `${keyPrefix}%`)
    .limit(1);
  return Boolean(data?.length);
}

async function appendLedger(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  balanceAfter: number,
  note: string
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    amount,
    balance_after: balanceAfter,
    kind: "stripe_credit",
    note: note.includes("reserved") ? note : `${note} · reserved custody`,
    custody_state: "reserved",
  };
  const { error } = await supabase.from("pock_ledger").insert(row);
  if (error) throw error;
}

export async function creditPockFromStripe(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    amount: number;
    stripeSessionId: string;
    amountCents?: number | null;
    note?: string;
  }
): Promise<BrokUserRow> {
  if (isUserFrozen(opts.userId)) {
    throw new Error("account_frozen");
  }
  const { data, error } = await supabase.rpc("credit_pock_from_stripe", {
    p_user_id: opts.userId,
    p_amount: opts.amount,
    p_stripe_session_id: opts.stripeSessionId,
    p_amount_cents: opts.amountCents ?? null,
    p_note: opts.note ?? `Stripe purchase · ${opts.amount} $POCK`,
  });
  if (!error) return data as BrokUserRow;
  if (!isMissingRpc(error)) throw error;

  const idem = `stripe_session:${opts.stripeSessionId}`;
  if (await ledgerHasIdempotencyKey(supabase, opts.userId, idem)) {
    return fetchUser(supabase, opts.userId);
  }

  const user = await fetchUser(supabase, opts.userId);
  const balance = Number(user.pock_balance ?? 0) + opts.amount;
  const note =
    opts.note ?? `Stripe purchase · ${opts.amount} $POCK`;
  const ledgerNote = `${idem} · ${note}`;

  const { data: updated, error: updErr } = await supabase
    .from("brok_users")
    .update({ pock_balance: balance, updated_at: new Date().toISOString() })
    .eq("id", opts.userId)
    .select("*")
    .single();
  if (updErr) throw updErr;

  await appendLedger(supabase, opts.userId, opts.amount, balance, ledgerNote);
  return updated as BrokUserRow;
}

export async function applyStripeSubscription(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    tier: string;
    includedAllowance: number;
    stripeEventId: string;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    renewsAt?: string | null;
    eventKind?: "checkout" | "renewal" | "cancel";
    note?: string;
  }
): Promise<BrokUserRow> {
  const { data, error } = await supabase.rpc("apply_stripe_subscription", {
    p_user_id: opts.userId,
    p_tier: opts.tier,
    p_included_allowance: opts.includedAllowance,
    p_stripe_event_id: opts.stripeEventId,
    p_stripe_subscription_id: opts.stripeSubscriptionId ?? null,
    p_stripe_customer_id: opts.stripeCustomerId ?? null,
    p_renews_at: opts.renewsAt ?? null,
    p_event_kind: opts.eventKind ?? "checkout",
    p_note: opts.note ?? "Stripe subscription",
  });
  if (!error) return data as BrokUserRow;
  if (!isMissingRpc(error)) throw error;

  const idem = `stripe_event:${opts.stripeEventId}`;
  if (await ledgerHasIdempotencyKey(supabase, opts.userId, idem)) {
    return fetchUser(supabase, opts.userId);
  }

  const user = await fetchUser(supabase, opts.userId);
  const now = new Date().toISOString();
  const renewsAt =
    opts.renewsAt ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const fullUpdate = {
    subscription_active: true,
    subscription_recurring: true,
    subscription_tier: opts.tier,
    subscription_started_at: user.subscription_started_at ?? now,
    subscription_renews_at: renewsAt,
    included_pock_remaining: opts.includedAllowance,
    included_pock_allowance: opts.includedAllowance,
    stripe_customer_id: opts.stripeCustomerId ?? null,
    stripe_subscription_id: opts.stripeSubscriptionId ?? null,
    updated_at: now,
  };

  let { data: updated, error: updErr } = await supabase
    .from("brok_users")
    .update(fullUpdate)
    .eq("id", opts.userId)
    .select("*")
    .single();

  if (updErr && isMissingColumn(updErr)) {
    const balance = Number(user.pock_balance ?? 0) + opts.includedAllowance;
    ({ data: updated, error: updErr } = await supabase
      .from("brok_users")
      .update({
        subscription_active: true,
        subscription_recurring: true,
        subscription_started_at: user.subscription_started_at ?? now,
        subscription_renews_at: renewsAt,
        pock_balance: balance,
        updated_at: now,
      })
      .eq("id", opts.userId)
      .select("*")
      .single());
    if (updErr) throw updErr;

    const ledgerNote = `${idem} · ${opts.note ?? "Stripe subscription"} · +${opts.includedAllowance} $POCK`;
    await appendLedger(
      supabase,
      opts.userId,
      opts.includedAllowance,
      balance,
      ledgerNote
    );
    return updated as BrokUserRow;
  }
  if (updErr) throw updErr;

  await appendLedger(
    supabase,
    opts.userId,
    0,
    Number(updated.pock_balance ?? 0),
    `${idem} · ${opts.note ?? "Stripe subscription"}`
  );
  return updated as BrokUserRow;
}

export async function cancelStripeSubscription(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    stripeEventId: string;
    note?: string;
  }
): Promise<BrokUserRow> {
  const { data, error } = await supabase.rpc("cancel_stripe_subscription", {
    p_user_id: opts.userId,
    p_stripe_event_id: opts.stripeEventId,
    p_note: opts.note ?? "Stripe subscription ended",
  });
  if (!error) return data as BrokUserRow;
  if (!isMissingRpc(error)) throw error;

  const idem = `stripe_event:${opts.stripeEventId}`;
  if (await ledgerHasIdempotencyKey(supabase, opts.userId, idem)) {
    return fetchUser(supabase, opts.userId);
  }

  const user = await fetchUser(supabase, opts.userId);
  const { data: updated, error: updErr } = await supabase
    .from("brok_users")
    .update({
      subscription_active: false,
      subscription_recurring: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.userId)
    .select("*")
    .single();
  if (updErr) throw updErr;

  await appendLedger(
    supabase,
    opts.userId,
    0,
    Number(updated.pock_balance ?? user.pock_balance ?? 0),
    `${idem} · ${opts.note ?? "Stripe subscription ended"}`
  );
  return updated as BrokUserRow;
}
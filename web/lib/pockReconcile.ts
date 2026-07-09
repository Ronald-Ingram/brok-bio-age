import { creditTopupFromCheckoutSession } from "@/lib/stripeTopupCredit";
import { getStripe } from "@/lib/stripeServer";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PockReconcileResult {
  ok: boolean;
  balanced: boolean;
  ledgerSum: number;
  latestBalanceAfter: number;
  balance: number;
  ledgerCount: number;
  repairedLedger: number;
  syncedSessions: number;
  issues: string[];
}

type LedgerRow = {
  id: string;
  amount: number;
  balance_after: number;
  kind: string;
  note: string;
  created_at: string;
};

type StripePaymentRow = {
  stripe_session_id: string;
  pock_amount: number;
  amount_cents: number | null;
  created_at: string;
};

function ledgerMatchesSession(entry: LedgerRow, sessionId: string): boolean {
  return (
    entry.note.includes(sessionId) ||
    entry.note.includes(`stripe_session:${sessionId}`)
  );
}

async function fetchLedger(
  supabase: SupabaseClient,
  userId: string
): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from("pock_ledger")
    .select("id, amount, balance_after, kind, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    amount: Number(row.amount),
    balance_after: Number(row.balance_after),
    kind: String(row.kind),
    note: String(row.note ?? ""),
    created_at: String(row.created_at),
  }));
}

async function fetchStripePayments(
  supabase: SupabaseClient,
  userId: string
): Promise<StripePaymentRow[]> {
  const { data, error } = await supabase
    .from("stripe_payments")
    .select("stripe_session_id, pock_amount, amount_cents, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    stripe_session_id: String(row.stripe_session_id),
    pock_amount: Number(row.pock_amount),
    amount_cents: row.amount_cents == null ? null : Number(row.amount_cents),
    created_at: String(row.created_at),
  }));
}

async function repairMissingStripeLedger(
  supabase: SupabaseClient,
  userId: string,
  ledger: LedgerRow[],
  payments: StripePaymentRow[]
): Promise<number> {
  let repaired = 0;

  for (const payment of payments) {
    if (ledger.some((entry) => ledgerMatchesSession(entry, payment.stripe_session_id))) {
      continue;
    }

    const chronological = [...ledger]
      .filter((entry) => new Date(entry.created_at) <= new Date(payment.created_at))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    let running = 0;
    for (const entry of chronological) {
      running += entry.amount;
    }
    running += payment.pock_amount;

    const note = `stripe_session:${payment.stripe_session_id} · Stripe purchase · ${payment.pock_amount} $POCK · locked at checkout · reserved custody`;

    const { error } = await supabase.from("pock_ledger").insert({
      user_id: userId,
      amount: payment.pock_amount,
      balance_after: running,
      kind: "stripe_credit",
      note,
      custody_state: "reserved",
      created_at: payment.created_at,
    });

    if (error) {
      console.error("repair ledger insert failed:", payment.stripe_session_id, error);
      continue;
    }

    ledger.push({
      id: `repaired-${payment.stripe_session_id}`,
      amount: payment.pock_amount,
      balance_after: running,
      kind: "stripe_credit",
      note,
      created_at: payment.created_at,
    });
    repaired += 1;
  }

  return repaired;
}

async function syncStripeSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<boolean> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return false;
    const result = await creditTopupFromCheckoutSession(supabase, session);
    return Boolean(result.credited);
  } catch (e) {
    console.error("syncStripeSession failed:", sessionId, e);
    return false;
  }
}

async function syncRecentPaidSessions(
  supabase: SupabaseClient,
  userId: string,
  payments: StripePaymentRow[]
): Promise<number> {
  if (!process.env.STRIPE_SECRET_KEY) return 0;

  const { data: userRow } = await supabase
    .from("brok_users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  const customerId = userRow?.stripe_customer_id as string | null | undefined;
  if (!customerId) return 0;

  try {
    const stripe = getStripe();
    const known = new Set(payments.map((p) => p.stripe_session_id));
    const { data: sessions } = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 20,
    });

    let synced = 0;
    for (const session of sessions ?? []) {
      if (known.has(session.id)) continue;
      if (session.metadata?.brok_user_id !== userId) continue;
      if (session.payment_status !== "paid") continue;
      const result = await creditTopupFromCheckoutSession(supabase, session);
      if (result.credited) synced += 1;
    }
    return synced;
  } catch (e) {
    console.error("syncRecentPaidSessions failed:", e);
    return 0;
  }
}

export async function reconcileUserPock(
  supabase: SupabaseClient,
  userId: string,
  opts?: { sessionId?: string }
): Promise<PockReconcileResult> {
  const issues: string[] = [];
  let repairedLedger = 0;
  let syncedSessions = 0;

  const { data: userRow, error: userErr } = await supabase
    .from("brok_users")
    .select("pock_balance")
    .eq("id", userId)
    .single();

  if (userErr || !userRow) {
    return {
      ok: false,
      balanced: false,
      ledgerSum: 0,
      latestBalanceAfter: 0,
      balance: 0,
      ledgerCount: 0,
      repairedLedger: 0,
      syncedSessions: 0,
      issues: ["user_not_found"],
    };
  }

  const balance = Number(userRow.pock_balance ?? 0);

  if (opts?.sessionId) {
    if (await syncStripeSession(supabase, opts.sessionId)) {
      syncedSessions += 1;
    }
  }

  let payments = await fetchStripePayments(supabase, userId);
  syncedSessions += await syncRecentPaidSessions(supabase, userId, payments);
  if (syncedSessions > 0) {
    payments = await fetchStripePayments(supabase, userId);
  }

  let ledger = await fetchLedger(supabase, userId);
  repairedLedger = await repairMissingStripeLedger(
    supabase,
    userId,
    ledger,
    payments
  );
  if (repairedLedger > 0) {
    ledger = await fetchLedger(supabase, userId);
  }

  const ledgerSum = ledger.reduce((sum, entry) => sum + entry.amount, 0);
  const latestBalanceAfter =
    ledger.length > 0
      ? [...ledger].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].balance_after
      : 0;
  const balanced =
    latestBalanceAfter === balance || ledgerSum === balance;

  if (!balanced) {
    issues.push(
      `ledger_mismatch: sum=${ledgerSum} latest=${latestBalanceAfter} balance=${balance}`
    );
  }

  const missingPayments = payments.filter(
    (payment) =>
      !ledger.some((entry) => ledgerMatchesSession(entry, payment.stripe_session_id))
  );
  if (missingPayments.length > 0) {
    issues.push(`missing_ledger_for_${missingPayments.length}_stripe_payments`);
  }

  return {
    ok: issues.length === 0,
    balanced,
    ledgerSum,
    latestBalanceAfter,
    balance,
    ledgerCount: ledger.length,
    repairedLedger,
    syncedSessions,
    issues,
  };
}
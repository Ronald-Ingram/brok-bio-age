import { getDeviceId } from "./deviceId";
import { BROK_USER_SELECT } from "./pockUserSelect";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import type {
  BrokUser,
  DebitResult,
  LedgerKind,
  PockLedgerEntry,
} from "./pockTypes";
import { MAX_OG_HISTORY } from "./ogEntitlementsConfig";
import { METER_RATES } from "./subscriptionConfig";

export const MAX_FREE_HISTORY = 2;

function mapUser(row: Record<string, unknown>): BrokUser {
  return {
    id: String(row.id),
    display_name: (row.display_name as string | null) ?? null,
    pock_balance: Number(row.pock_balance ?? 0),
    trial_credited: Boolean(row.trial_credited),
    subscription_active: Boolean(row.subscription_active),
    subscription_recurring: Boolean(row.subscription_recurring),
    subscription_tier:
      (row.subscription_tier as BrokUser["subscription_tier"]) ?? null,
    pock_og_wallet: (row.pock_og_wallet as string | null) ?? null,
    pock_og_verified_at: (row.pock_og_verified_at as string | null) ?? null,
    pock_og_source: (row.pock_og_source as BrokUser["pock_og_source"]) ?? null,
    subscription_started_at:
      (row.subscription_started_at as string | null) ?? null,
    subscription_renews_at:
      (row.subscription_renews_at as string | null) ?? null,
    included_pock_remaining: Number(row.included_pock_remaining ?? 0),
    included_pock_allowance: Number(row.included_pock_allowance ?? 0),
    calc_count: Number(row.calc_count ?? 0),
    custody_status:
      (row.custody_status as BrokUser["custody_status"]) ?? "reserved",
    solana_wallet_address:
      (row.solana_wallet_address as string | null) ?? null,
    solana_wallet_connected_at:
      (row.solana_wallet_connected_at as string | null) ?? null,
    on_chain_pock_balance: Number(row.on_chain_pock_balance ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapLedger(row: Record<string, unknown>): PockLedgerEntry {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    balance_after: Number(row.balance_after),
    kind: row.kind as LedgerKind,
    note: String(row.note ?? ""),
    custody_state: (row.custody_state as PockLedgerEntry["custody_state"]) ?? "reserved",
    solana_tx_signature: (row.solana_tx_signature as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function ensureAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return true;

  const deviceId = getDeviceId();
  const res = await fetch("/api/pock/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "auth_failed");
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw error;
  return true;
}

export async function fetchCurrentUser(): Promise<BrokUser | null> {
  if (!isSupabaseConfigured()) return null;
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("brok_users")
    .select(BROK_USER_SELECT)
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data) : null;
}

export async function fetchLedger(): Promise<PockLedgerEntry[]> {
  if (!isSupabaseConfigured()) return [];
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("pock_ledger")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map(mapLedger);
}

export async function bootstrapUser(): Promise<{
  user: BrokUser;
  credited: boolean;
}> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const before = await fetchCurrentUser();

  const { data, error } = await supabase.rpc("bootstrap_user");
  if (error) throw error;
  const user = mapUser(data as Record<string, unknown>);
  const credited = !before?.trial_credited && user.trial_credited;
  return { user, credited };
}

export async function debitForCalc(): Promise<DebitResult> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("debit_for_calc");
  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new Error("insufficient_pock");
    }
    throw error;
  }
  const result = data as {
    debited: boolean;
    balance: number;
    subscribed: boolean;
    from_included?: number;
    from_balance?: number;
    included_remaining?: number;
  };
  return {
    debited: Boolean(result.debited),
    balance: Number(result.balance),
    subscribed: Boolean(result.subscribed),
    from_included: result.from_included,
    from_balance: result.from_balance,
    included_remaining: result.included_remaining,
  };
}

async function spendPock(
  amount: number,
  kind: LedgerKind,
  note: string
): Promise<BrokUser> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("spend_pock", {
    p_amount: amount,
    p_kind: kind,
    p_note: note,
    p_activate_subscription: false,
  });
  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new Error("insufficient_pock");
    }
    if (error.message?.includes("amount_invalid")) {
      throw new Error("amount_invalid");
    }
    throw error;
  }
  return mapUser(data as Record<string, unknown>);
}

export async function spendOnPremium(
  featureName: string,
  cost: number
): Promise<BrokUser> {
  return spendPock(cost, "premium_spend", featureName);
}

export async function sendToUser(
  recipientId: string,
  amount: number
): Promise<BrokUser> {
  if (!recipientId.trim()) throw new Error("recipient_required");
  return spendPock(
    amount,
    "transfer_out",
    `Sent to ${recipientId.slice(0, 8)}…`
  );
}

export interface PockInviteResult {
  claimUrl: string;
  giftUrl?: string | null;
  claimPassword: string | null;
  amount: number;
  phone: string | null;
  email?: string | null;
  smsHint: string;
  shareMessage?: string;
  recipientBrokId: string | null;
  recipientWallet: string | null;
  expiresInHours: number;
  inviteKind: "transfer" | "gift";
  recipientName: string | null;
  usdEquivalent: number | null;
  usdPerPockQuote?: number | null;
  quoteSource?: "dexscreener" | "retail_anchor" | null;
  registerUrl: string | null;
  personalMessage?: string | null;
  senderName?: string | null;
  smsSent?: boolean;
  smsError?: string | null;
  smsManual?: boolean;
}

async function postPockInvite(body: Record<string, unknown>): Promise<PockInviteResult> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("auth_required");

  const res = await fetch("/api/pock/create-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      ...body,
    }),
  });

  const data = (await res.json()) as PockInviteResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "invite_failed");
  }
  return data;
}

export async function createPockInvite(options: {
  amount: number;
  phone: string;
  recipientBrokId?: string;
  recipientWallet?: string;
}): Promise<PockInviteResult> {
  return postPockInvite({
    inviteKind: "transfer",
    amount: options.amount,
    phone: options.phone,
    recipientBrokId: options.recipientBrokId,
    recipientWallet: options.recipientWallet,
  });
}

export interface GiftAutoClaimResult {
  ok: true;
  amount: number;
  alreadyClaimed: boolean;
  message: string;
}

export async function autoClaimGiftInvite(token: string): Promise<GiftAutoClaimResult> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("auth_required");

  const res = await fetch("/api/pock/auto-claim-gift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      token: token.trim(),
    }),
  });

  const data = (await res.json()) as GiftAutoClaimResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "claim_failed");
  }
  return data;
}

export async function createGiftInvite(options: {
  amount: number;
  usdEquivalent: number;
  recipientName: string;
  phone?: string;
  email?: string;
  personalMessage?: string;
  recipientBrokId?: string;
}): Promise<PockInviteResult> {
  if (!options.recipientName.trim()) throw new Error("recipient_name_required");
  return postPockInvite({
    inviteKind: "gift",
    amount: options.amount,
    usdEquivalent: options.usdEquivalent,
    recipientName: options.recipientName.trim(),
    phone: options.phone?.trim() || undefined,
    email: options.email?.trim() || undefined,
    personalMessage: options.personalMessage?.trim() || undefined,
    recipientBrokId: options.recipientBrokId,
  });
}

export async function withdrawToWallet(
  address: string,
  amount: number
): Promise<CustodyReleaseResult> {
  if (!address.trim()) throw new Error("address_required");
  return requestCustodyRelease({ amount, destWallet: address.trim() });
}

export async function impactDonationStub(
  causeName: string,
  amount: number
): Promise<BrokUser> {
  return spendPock(amount, "impact_donation", causeName);
}

export function totalSpendablePock(user: BrokUser | null): number {
  if (!user) return 0;
  let included = 0;
  if (user.included_pock_remaining > 0) {
    if (user.subscription_tier === "pock_og") {
      included = user.included_pock_remaining;
    } else if (user.subscription_active && user.subscription_tier != null) {
      included = user.included_pock_remaining;
    }
  }
  return user.pock_balance + included;
}

export function canAffordCalc(user: BrokUser | null): boolean {
  return totalSpendablePock(user) >= METER_RATES.calcPock;
}

export function getHistoryLimit(user: BrokUser | null): number {
  if (!user) return MAX_FREE_HISTORY;
  if (user.subscription_tier === "pock_og") return MAX_OG_HISTORY;
  if (user.subscription_active) return Number.POSITIVE_INFINITY;
  return MAX_FREE_HISTORY;
}

export function isHistoryUnlimited(user: BrokUser | null): boolean {
  return getHistoryLimit(user) === Number.POSITIVE_INFINITY;
}

export interface CustodySettlementResult {
  queueId: string;
  status: "sent" | "failed" | "skipped";
  txSignature?: string;
  error?: string;
  amountPock?: number;
}

export interface CustodyReleaseResult {
  released: number;
  wallet: string;
  on_chain_balance: number;
  status: string;
  release_id?: string;
  settlement?: CustodySettlementResult | null;
}

export async function connectSolanaWallet(address: string): Promise<BrokUser> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("connect_solana_wallet", {
    p_address: address.trim(),
  });
  if (error) {
    if (error.message?.includes("wallet_address_invalid")) {
      throw new Error("wallet_address_invalid");
    }
    if (error.message?.includes("wallet_already_linked")) {
      throw new Error("wallet_already_linked");
    }
    throw error;
  }
  return mapUser(data as Record<string, unknown>);
}

export async function requestCustodyRelease(opts?: {
  amount?: number;
  destWallet?: string;
}): Promise<CustodyReleaseResult> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("auth_required");

  const res = await fetch("/api/pock/request-release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      amount: opts?.amount,
      destWallet: opts?.destWallet?.trim() || undefined,
    }),
  });

  const data = (await res.json()) as CustodyReleaseResult & { error?: string };
  if (!res.ok) {
    const err = data.error ?? "release_failed";
    if (err === "wallet_not_connected") throw new Error("wallet_not_connected");
    if (err === "nothing_to_release") throw new Error("nothing_to_release");
    if (err.includes("insufficient_pock") || err === "amount_invalid") {
      throw new Error("amount_invalid");
    }
    if (err.includes("wallet_address_invalid")) {
      throw new Error("wallet_address_invalid");
    }
    throw new Error(err);
  }

  return {
    released: Number(data.released),
    wallet: String(data.wallet),
    on_chain_balance: Number(data.on_chain_balance),
    status: String(data.status),
    release_id: data.release_id,
    settlement: data.settlement ?? null,
  };
}

export async function settlePendingCustodyReleases(): Promise<CustodySettlementResult[]> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("auth_required");

  const res = await fetch("/api/pock/settle-pending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: session.access_token }),
  });

  const data = (await res.json()) as {
    results?: CustodySettlementResult[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "settle_failed");
  return data.results ?? [];
}
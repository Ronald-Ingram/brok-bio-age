import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import { ensureAuthSession } from "./pockService";

export interface GeniusSubWallet {
  id: string;
  parent_user_id: string;
  nickname: string;
  note: string | null;
  pock_balance: number;
  created_at: string;
  updated_at: string;
  total_funded?: number;
}

export interface GeniusSubWalletLedgerEntry {
  id: string;
  sub_wallet_id: string;
  amount: number;
  balance_after: number;
  kind: string;
  note: string | null;
  created_at: string;
}

async function getAccessToken(): Promise<string> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("auth_required");
  return token;
}

function mapSubWallet(row: Record<string, unknown>): GeniusSubWallet {
  return {
    id: String(row.id),
    parent_user_id: String(row.parent_user_id),
    nickname: String(row.nickname),
    note: (row.note as string | null) ?? null,
    pock_balance: Number(row.pock_balance ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    total_funded:
      row.total_funded != null ? Number(row.total_funded) : undefined,
  };
}

export async function fetchGeniusSubWallets(): Promise<GeniusSubWallet[]> {
  if (!isSupabaseConfigured()) return [];
  const accessToken = await getAccessToken();
  const res = await fetch("/api/pock/sub-wallets", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "load_failed");
  }
  const data = (await res.json()) as { wallets?: GeniusSubWallet[] };
  return data.wallets ?? [];
}

export async function createGeniusSubWallet(opts: {
  nickname: string;
  note?: string;
}): Promise<GeniusSubWallet> {
  const accessToken = await getAccessToken();
  const res = await fetch("/api/pock/sub-wallets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(opts),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "create_failed");
  return data.wallet as GeniusSubWallet;
}

export async function fundGeniusSubWallet(opts: {
  subWalletId: string;
  amount: number;
  note?: string;
}): Promise<{ parent_balance: number; sub_balance: number }> {
  const accessToken = await getAccessToken();
  const res = await fetch("/api/pock/sub-wallets/fund", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      subWalletId: opts.subWalletId,
      amount: opts.amount,
      note: opts.note,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "fund_failed");
  return {
    parent_balance: data.parent_balance,
    sub_balance: data.sub_balance,
  };
}

export async function reclaimGeniusSubWallet(opts: {
  subWalletId: string;
  amount: number;
  note?: string;
}): Promise<{ parent_balance: number; sub_balance: number }> {
  const accessToken = await getAccessToken();
  const res = await fetch("/api/pock/sub-wallets/reclaim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      subWalletId: opts.subWalletId,
      amount: opts.amount,
      note: opts.note,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "reclaim_failed");
  return {
    parent_balance: data.parent_balance,
    sub_balance: data.sub_balance,
  };
}

export async function fetchSubWalletLedger(
  subWalletId: string
): Promise<GeniusSubWalletLedgerEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const accessToken = await getAccessToken();
  const res = await fetch(
    `/api/pock/sub-wallets?ledgerFor=${encodeURIComponent(subWalletId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { ledger?: GeniusSubWalletLedgerEntry[] };
  return data.ledger ?? [];
}
import { corpWalletSignerConfigured } from "@/lib/solanaCorpWallet";
import { transferPockFromCorpWallet } from "@/lib/solanaPockTransfer";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CustodyReleaseQueueRow {
  id: string;
  user_id: string;
  ledger_id: string | null;
  dest_wallet: string;
  amount_pock: number;
  status: string;
  attempts: number;
  solana_tx_signature: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SettleReleaseResult {
  queueId: string;
  status: "sent" | "failed" | "skipped";
  txSignature?: string;
  error?: string;
  amountPock?: number;
}

async function markSending(
  supabase: SupabaseClient,
  queueId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("custody_release_queue")
    .update({ status: "sending" })
    .eq("id", queueId)
    .in("status", ["pending", "failed"])
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export async function settleCustodyRelease(
  supabase: SupabaseClient,
  queueId: string
): Promise<SettleReleaseResult> {
  if (!corpWalletSignerConfigured()) {
    return {
      queueId,
      status: "failed",
      error: "corp_signer_not_configured",
    };
  }

  const { data: row, error: loadErr } = await supabase
    .from("custody_release_queue")
    .select("*")
    .eq("id", queueId)
    .maybeSingle();

  if (loadErr || !row) {
    return { queueId, status: "failed", error: "queue_not_found" };
  }

  const q = row as CustodyReleaseQueueRow;
  if (q.status === "sent") {
    return {
      queueId,
      status: "skipped",
      txSignature: q.solana_tx_signature ?? undefined,
      amountPock: q.amount_pock,
    };
  }

  if (q.status === "failed") {
    const { error: prepErr } = await supabase.rpc("reprepare_failed_release", {
      p_queue_id: queueId,
    });
    if (prepErr) {
      return { queueId, status: "failed", error: prepErr.message };
    }
  }

  const claimed = await markSending(supabase, queueId);
  if (!claimed) {
    return { queueId, status: "skipped", error: "already_processing" };
  }

  try {
    const transfer = await transferPockFromCorpWallet({
      destWallet: q.dest_wallet,
      amountPock: q.amount_pock,
    });

    const { error: completeErr } = await supabase.rpc("complete_custody_release", {
      p_queue_id: queueId,
      p_tx_signature: transfer.txSignature,
    });

    if (completeErr) {
      throw new Error(completeErr.message);
    }

    return {
      queueId,
      status: "sent",
      txSignature: transfer.txSignature,
      amountPock: q.amount_pock,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "transfer_failed";
    await supabase.rpc("fail_custody_release", {
      p_queue_id: queueId,
      p_error: msg,
    });
    return { queueId, status: "failed", error: msg, amountPock: q.amount_pock };
  }
}

export async function settlePendingCustodyReleases(
  supabase: SupabaseClient,
  opts?: { limit?: number; userId?: string }
): Promise<SettleReleaseResult[]> {
  let query = supabase
    .from("custody_release_queue")
    .select("id")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(opts?.limit ?? 10);

  if (opts?.userId) {
    query = query.eq("user_id", opts.userId);
  }

  const { data: rows } = await query;
  const results: SettleReleaseResult[] = [];

  for (const row of rows ?? []) {
    results.push(await settleCustodyRelease(supabase, row.id as string));
  }

  return results;
}
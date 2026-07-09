import { executeJupiterPockBuy } from "@/lib/jupiterPockBuy";
import { corpWalletSignerConfigured } from "@/lib/solanaCorpWallet";
import {
  getTreasuryBuybackConfig,
  type TreasuryBuybackConfig,
} from "@/lib/treasuryBuybackConfig";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AccrualRow {
  id: string;
  buyback_usd_cents: number;
  status: string;
  created_at: string;
}

export interface BuybackBatchResult {
  executed: boolean;
  batchId?: string;
  totalUsdCents?: number;
  txSignature?: string;
  pockReceivedUi?: number;
  reason?: string;
  error?: string;
}

function selectAccrualsForBatch(
  accruals: AccrualRow[],
  thresholdUsdCents: number
): AccrualRow[] {
  const sorted = [...accruals]
    .filter((a) => a.status === "accrued")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const selected: AccrualRow[] = [];
  let sum = 0;
  for (const row of sorted) {
    selected.push(row);
    sum += Number(row.buyback_usd_cents ?? 0);
    if (sum >= thresholdUsdCents) break;
  }
  return sum >= thresholdUsdCents ? selected : [];
}

async function createBatchRecord(
  supabase: SupabaseClient,
  accrualIds: string[],
  totalUsdCents: number,
  inputAsset: string
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("create_treasury_buyback_batch", {
    p_accrual_ids: accrualIds,
    p_total_buyback_usd_cents: totalUsdCents,
    p_input_asset: inputAsset,
  });

  if (!error && data) {
    return { id: (data as { id: string }).id };
  }

  const { data: batch, error: insErr } = await supabase
    .from("treasury_buyback_batches")
    .insert({
      accrual_ids: accrualIds,
      total_buyback_usd_cents: totalUsdCents,
      input_asset: inputAsset,
      status: "executing",
    })
    .select("id")
    .single();

  if (insErr) throw insErr;

  const { error: updErr } = await supabase
    .from("treasury_buyback_accruals")
    .update({ status: "queued", batch_id: batch.id })
    .in("id", accrualIds)
    .eq("status", "accrued");

  if (updErr) throw updErr;
  return { id: batch.id as string };
}

async function completeBatch(
  supabase: SupabaseClient,
  batchId: string,
  result: {
    status: "executed" | "failed";
    txSignature?: string;
    pockReceivedUi?: number;
    inputAmountRaw?: bigint;
    quoteOutAmount?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const { error } = await supabase.rpc("complete_treasury_buyback_batch", {
    p_batch_id: batchId,
    p_status: result.status,
    p_solana_tx_signature: result.txSignature ?? null,
    p_pock_received_ui: result.pockReceivedUi ?? null,
    p_input_amount_raw: result.inputAmountRaw?.toString() ?? null,
    p_jupiter_quote_id: result.quoteOutAmount ?? null,
    p_error_message: result.errorMessage ?? null,
  });

  if (error) {
    await supabase
      .from("treasury_buyback_batches")
      .update({
        status: result.status,
        solana_tx_signature: result.txSignature ?? null,
        pock_received_ui: result.pockReceivedUi ?? null,
        error_message: result.errorMessage ?? null,
        executed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    const accrualStatus = result.status === "executed" ? "executed" : "accrued";
    await supabase
      .from("treasury_buyback_accruals")
      .update({
        status: accrualStatus,
        batch_id: result.status === "executed" ? batchId : null,
        solana_tx_signature: result.txSignature ?? null,
      })
      .eq("batch_id", batchId);
  }
}

const MIN_FORCE_BATCH_USD_CENTS = 1000;

export async function maybeExecuteTreasuryBuyback(
  supabase: SupabaseClient,
  opts?: { force?: boolean; forceBelowThreshold?: boolean }
): Promise<BuybackBatchResult> {
  const config = await getTreasuryBuybackConfig(supabase);

  if (!opts?.force && !config.autoExecuteEnabled) {
    return { executed: false, reason: "auto_execute_disabled" };
  }

  const { data: accruals, error } = await supabase
    .from("treasury_buyback_accruals")
    .select("id, buyback_usd_cents, status, created_at")
    .in("status", ["accrued"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  const accruedRows = (accruals ?? []) as AccrualRow[];
  let selected: AccrualRow[];

  if (opts?.forceBelowThreshold) {
    const total = accruedRows.reduce(
      (s, a) => s + Number(a.buyback_usd_cents),
      0
    );
    selected = total >= MIN_FORCE_BATCH_USD_CENTS ? accruedRows : [];
  } else {
    selected = selectAccrualsForBatch(
      accruedRows,
      config.batchThresholdUsdCents
    );
  }

  if (selected.length === 0) {
    const accruedTotal = (accruals ?? []).reduce(
      (s, a) => s + Number(a.buyback_usd_cents ?? 0),
      0
    );
    return {
      executed: false,
      reason: "below_threshold",
      totalUsdCents: accruedTotal,
    };
  }

  if (!corpWalletSignerConfigured()) {
    return {
      executed: false,
      reason: "corp_signer_not_configured",
      totalUsdCents: selected.reduce(
        (s, a) => s + Number(a.buyback_usd_cents),
        0
      ),
    };
  }

  const totalUsdCents = selected.reduce(
    (s, a) => s + Number(a.buyback_usd_cents),
    0
  );
  const accrualIds = selected.map((a) => a.id);

  const batch = await createBatchRecord(
    supabase,
    accrualIds,
    totalUsdCents,
    config.inputAsset
  );

  try {
    const buy = await executeJupiterPockBuy({
      usdCents: totalUsdCents,
      inputAsset: config.inputAsset,
      slippageBps: config.slippageBps,
    });

    await completeBatch(supabase, batch.id, {
      status: "executed",
      txSignature: buy.txSignature,
      pockReceivedUi: buy.pockReceivedUi,
      inputAmountRaw: buy.inputAmountRaw,
      quoteOutAmount: buy.quoteOutAmount,
    });

    return {
      executed: true,
      batchId: batch.id,
      totalUsdCents,
      txSignature: buy.txSignature,
      pockReceivedUi: buy.pockReceivedUi,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "buyback_execution_failed";
    await completeBatch(supabase, batch.id, {
      status: "failed",
      errorMessage: msg,
    });
    return {
      executed: false,
      batchId: batch.id,
      totalUsdCents,
      reason: "execution_failed",
      error: msg,
    };
  }
}

export function formatBuybackConfigForAdmin(config: TreasuryBuybackConfig) {
  return {
    batchThresholdUsd: config.batchThresholdUsdCents / 100,
    batchThresholdUsdCents: config.batchThresholdUsdCents,
    autoExecuteEnabled: config.autoExecuteEnabled,
    slippageBps: config.slippageBps,
    slippagePct: config.slippageBps / 100,
    inputAsset: config.inputAsset,
    updatedAt: config.updatedAt ?? null,
    updatedBy: config.updatedBy ?? null,
  };
}
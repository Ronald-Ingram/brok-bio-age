import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import { corpWalletSignerConfigured } from "@/lib/solanaCorpWallet";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_BUYBACK_BATCH_THRESHOLD_USD = 100;
export const DEFAULT_BUYBACK_SLIPPAGE_BPS = 100;

export type BuybackInputAsset = "usdc" | "sol";

export interface TreasuryBuybackConfig {
  batchThresholdUsdCents: number;
  autoExecuteEnabled: boolean;
  slippageBps: number;
  inputAsset: BuybackInputAsset;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface BuybackAccrualSummary {
  accruedUsdCents: number;
  queuedUsdCents: number;
  executedUsdCents: number;
  accruedCount: number;
  progressToNextBatchPct: number;
  readyForBatch: boolean;
}

const FALLBACK_CONFIG: TreasuryBuybackConfig = {
  batchThresholdUsdCents: DEFAULT_BUYBACK_BATCH_THRESHOLD_USD * 100,
  autoExecuteEnabled: true,
  slippageBps: DEFAULT_BUYBACK_SLIPPAGE_BPS,
  inputAsset: "usdc",
};

function rowToConfig(row: Record<string, unknown>): TreasuryBuybackConfig {
  return {
    batchThresholdUsdCents: Number(
      row.batch_threshold_usd_cents ?? FALLBACK_CONFIG.batchThresholdUsdCents
    ),
    autoExecuteEnabled: Boolean(
      row.auto_execute_enabled ?? FALLBACK_CONFIG.autoExecuteEnabled
    ),
    slippageBps: Number(row.slippage_bps ?? FALLBACK_CONFIG.slippageBps),
    inputAsset: (row.input_asset as BuybackInputAsset) ?? "usdc",
    updatedAt: row.updated_at as string | undefined,
    updatedBy: (row.updated_by as string | null) ?? null,
  };
}

export async function getTreasuryBuybackConfig(
  supabase: SupabaseClient
): Promise<TreasuryBuybackConfig> {
  const { data, error } = await supabase.rpc("get_treasury_buyback_config");
  if (!error && data) {
    return rowToConfig(data as Record<string, unknown>);
  }

  const { data: row } = await supabase
    .from("treasury_buyback_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  return row ? rowToConfig(row) : FALLBACK_CONFIG;
}

export async function updateTreasuryBuybackConfig(
  supabase: SupabaseClient,
  patch: Partial<TreasuryBuybackConfig> & { updatedBy?: string }
): Promise<TreasuryBuybackConfig> {
  const current = await getTreasuryBuybackConfig(supabase);
  const next: TreasuryBuybackConfig = {
    batchThresholdUsdCents:
      patch.batchThresholdUsdCents ?? current.batchThresholdUsdCents,
    autoExecuteEnabled: patch.autoExecuteEnabled ?? current.autoExecuteEnabled,
    slippageBps: patch.slippageBps ?? current.slippageBps,
    inputAsset: patch.inputAsset ?? current.inputAsset,
  };

  if (next.batchThresholdUsdCents < 1000 || next.batchThresholdUsdCents > 10_000_000) {
    throw new Error("threshold_out_of_range");
  }

  const { data, error } = await supabase.rpc("update_treasury_buyback_config", {
    p_batch_threshold_usd_cents: next.batchThresholdUsdCents,
    p_auto_execute_enabled: next.autoExecuteEnabled,
    p_slippage_bps: next.slippageBps,
    p_input_asset: next.inputAsset,
    p_updated_by: patch.updatedBy ?? null,
  });

  if (!error && data) {
    return rowToConfig(data as Record<string, unknown>);
  }

  const { data: row, error: updErr } = await supabase
    .from("treasury_buyback_config")
    .upsert({
      id: "default",
      batch_threshold_usd_cents: next.batchThresholdUsdCents,
      auto_execute_enabled: next.autoExecuteEnabled,
      slippage_bps: next.slippageBps,
      input_asset: next.inputAsset,
      updated_at: new Date().toISOString(),
      updated_by: patch.updatedBy ?? null,
    })
    .select("*")
    .single();

  if (updErr) throw updErr;
  return rowToConfig(row);
}

export function summarizeAccruals(
  accruals: { status: string; buyback_usd_cents: number }[],
  thresholdUsdCents: number
): BuybackAccrualSummary {
  let accruedUsdCents = 0;
  let queuedUsdCents = 0;
  let executedUsdCents = 0;
  let accruedCount = 0;

  for (const a of accruals) {
    const cents = Number(a.buyback_usd_cents ?? 0);
    if (a.status === "accrued") {
      accruedUsdCents += cents;
      accruedCount += 1;
    } else if (a.status === "queued") {
      queuedUsdCents += cents;
    } else if (a.status === "executed") {
      executedUsdCents += cents;
    }
  }

  const progressToNextBatchPct =
    thresholdUsdCents > 0
      ? Math.min(100, Math.round((accruedUsdCents / thresholdUsdCents) * 100))
      : 0;

  return {
    accruedUsdCents,
    queuedUsdCents,
    executedUsdCents,
    accruedCount,
    progressToNextBatchPct,
    readyForBatch: accruedUsdCents >= thresholdUsdCents,
  };
}

export function treasuryBuybackRuntimeStatus() {
  return {
    corpWallet: NEOBANX_CORP_WALLET,
    signerConfigured: corpWalletSignerConfigured(),
    solanaRpc: Boolean(process.env.SOLANA_RPC_URL?.trim()),
    jupiterApi: true,
  };
}
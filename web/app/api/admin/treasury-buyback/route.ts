import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import {
  formatBuybackConfigForAdmin,
  maybeExecuteTreasuryBuyback,
} from "@/lib/treasuryBuybackExecutor";
import {
  getTreasuryBuybackConfig,
  summarizeAccruals,
  treasuryBuybackRuntimeStatus,
  updateTreasuryBuybackConfig,
  type BuybackInputAsset,
} from "@/lib/treasuryBuybackConfig";
import { POCK_BUYBACK_PCT } from "@/lib/treasuryBuybackPolicy";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-brok-og-admin")?.trim() === secret;
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const [config, accrualsRes, batchesRes] = await Promise.all([
    getTreasuryBuybackConfig(supabase),
    supabase
      .from("treasury_buyback_accruals")
      .select(
        "id, status, buyback_usd_cents, gross_usd_cents, product_line, created_at, solana_tx_signature, batch_id"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("treasury_buyback_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const accruals = accrualsRes.data ?? [];
  const summary = summarizeAccruals(accruals, config.batchThresholdUsdCents);

  return NextResponse.json({
    policyPct: POCK_BUYBACK_PCT,
    corpWallet: NEOBANX_CORP_WALLET,
    config: formatBuybackConfigForAdmin(config),
    summary: {
      accruedUsd: summary.accruedUsdCents / 100,
      queuedUsd: summary.queuedUsdCents / 100,
      executedUsd: summary.executedUsdCents / 100,
      accruedCount: summary.accruedCount,
      progressToNextBatchPct: summary.progressToNextBatchPct,
      readyForBatch: summary.readyForBatch,
      amountToNextBatchUsd: Math.max(
        0,
        (config.batchThresholdUsdCents - summary.accruedUsdCents) / 100
      ),
    },
    runtime: treasuryBuybackRuntimeStatus(),
    recentAccruals: accruals.slice(0, 30),
    recentBatches: batchesRes.data ?? [],
  });
}

export async function PATCH(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    batchThresholdUsd?: number;
    autoExecuteEnabled?: boolean;
    slippageBps?: number;
    inputAsset?: BuybackInputAsset;
  };

  const patch: Parameters<typeof updateTreasuryBuybackConfig>[1] = {
    updatedBy: "admin_dashboard",
  };

  if (body.batchThresholdUsd != null) {
    const usd = Number(body.batchThresholdUsd);
    if (!Number.isFinite(usd) || usd < 10 || usd > 100_000) {
      return NextResponse.json({ error: "threshold_out_of_range" }, { status: 400 });
    }
    patch.batchThresholdUsdCents = Math.round(usd * 100);
  }
  if (body.autoExecuteEnabled != null) {
    patch.autoExecuteEnabled = Boolean(body.autoExecuteEnabled);
  }
  if (body.slippageBps != null) {
    const bps = Math.round(body.slippageBps);
    if (bps < 10 || bps > 2000) {
      return NextResponse.json({ error: "slippage_out_of_range" }, { status: 400 });
    }
    patch.slippageBps = bps;
  }
  if (body.inputAsset != null) {
    if (body.inputAsset !== "usdc" && body.inputAsset !== "sol") {
      return NextResponse.json({ error: "invalid_input_asset" }, { status: 400 });
    }
    patch.inputAsset = body.inputAsset;
  }

  try {
    const supabase = getServiceSupabase();
    const config = await updateTreasuryBuybackConfig(supabase, patch);
    return NextResponse.json({ config: formatBuybackConfigForAdmin(config) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    force?: boolean;
    forceBelowThreshold?: boolean;
  };
  const supabase = getServiceSupabase();
  const result = await maybeExecuteTreasuryBuyback(supabase, {
    force: Boolean(body.force),
    forceBelowThreshold: Boolean(body.forceBelowThreshold),
  });

  return NextResponse.json({ result });
}
"use client";

import { ExternalLink, Loader2, RefreshCw, Settings2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BuybackApiData {
  policyPct: number;
  corpWallet: string;
  config: {
    batchThresholdUsd: number;
    autoExecuteEnabled: boolean;
    slippageBps: number;
    slippagePct: number;
    inputAsset: "usdc" | "sol";
    updatedAt: string | null;
  };
  summary: {
    accruedUsd: number;
    queuedUsd: number;
    executedUsd: number;
    accruedCount: number;
    progressToNextBatchPct: number;
    readyForBatch: boolean;
    amountToNextBatchUsd: number;
  };
  runtime: {
    corpWallet: string;
    signerConfigured: boolean;
    solanaRpc: boolean;
  };
  recentBatches: {
    id: string;
    total_buyback_usd_cents: number;
    status: string;
    solana_tx_signature: string | null;
    pock_received_ui: number | null;
    error_message: string | null;
    created_at: string;
    executed_at: string | null;
  }[];
}

interface TreasuryBuybackPanelProps {
  adminSecret: string;
}

export function TreasuryBuybackPanel({ adminSecret }: TreasuryBuybackPanelProps) {
  const [data, setData] = useState<BuybackApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [thresholdUsd, setThresholdUsd] = useState("100");
  const [autoExecute, setAutoExecute] = useState(true);
  const [slippageBps, setSlippageBps] = useState("100");
  const [inputAsset, setInputAsset] = useState<"usdc" | "sol">("usdc");
  const [forceBelowThreshold, setForceBelowThreshold] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    "x-brok-og-admin": adminSecret,
  };

  const load = useCallback(async () => {
    if (!adminSecret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/treasury-buyback", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setData(json);
      setThresholdUsd(String(json.config.batchThresholdUsd));
      setAutoExecute(json.config.autoExecuteEnabled);
      setSlippageBps(String(json.config.slippageBps));
      setInputAsset(json.config.inputAsset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/treasury-buyback", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          batchThresholdUsd: parseFloat(thresholdUsd),
          autoExecuteEnabled: autoExecute,
          slippageBps: parseInt(slippageBps, 10),
          inputAsset,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "save_failed");
      setMessage("Buyback settings saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  };

  const runExecute = async () => {
    setExecuting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/treasury-buyback", {
        method: "POST",
        headers,
        body: JSON.stringify({ force: true, forceBelowThreshold }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "execute_failed");
      const r = json.result as {
        executed?: boolean;
        reason?: string;
        error?: string;
        txSignature?: string;
        totalUsdCents?: number;
      };
      if (r.executed) {
        setMessage(
          `Buyback executed · $${((r.totalUsdCents ?? 0) / 100).toFixed(2)} · tx ${r.txSignature?.slice(0, 12)}…`
        );
      } else {
        setMessage(
          `No execution: ${r.reason ?? "unknown"}${r.error ? ` — ${r.error}` : ""}`
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "execute_failed");
    } finally {
      setExecuting(false);
    }
  };

  if (!adminSecret.trim()) return null;

  return (
    <section className="rounded-xl border border-violet-400/25 bg-gradient-to-b from-violet-500/8 to-bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-300" />
            $POCK treasury buybacks
          </h2>
          <p className="text-xs text-white/45 mt-1 leading-relaxed">
            {Math.round((data?.policyPct ?? 0.2) * 100)}% of Neobanx gross service revenue accrues
            for on-chain buybacks. Batches execute automatically when accrued reserve hits the
            threshold (default ~$100).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 p-2 rounded-lg border border-white/10 text-white/45 hover:text-neon-cyan"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {data && (
        <>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-white/40 block">Accrued (pending)</span>
              <span className="text-violet-200 font-semibold tabular-nums">
                ${data.summary.accruedUsd.toFixed(2)}
              </span>
              <span className="text-white/35"> · {data.summary.accruedCount} payments</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-white/40 block">Progress to batch</span>
              <span className="text-white/85 font-semibold tabular-nums">
                {data.summary.progressToNextBatchPct}%
              </span>
              {!data.summary.readyForBatch && (
                <span className="text-white/35 block">
                  ${data.summary.amountToNextBatchUsd.toFixed(2)} to go
                </span>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-white/40 block">Executed (on-chain)</span>
              <span className="text-emerald-300/90 font-semibold tabular-nums">
                ${data.summary.executedUsd.toFixed(2)}
              </span>
            </div>
          </div>

          {!data.runtime.signerConfigured && (
            <p className="text-xs text-amber-300/90 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
              Set <code className="text-amber-200/80">NEOBANX_CORP_WALLET_SECRET_KEY</code> on
              the server to enable Jupiter swaps. Accruals still record without it.
            </p>
          )}

          <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
            <p className="text-xs font-medium text-white/70 flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Batch settings
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-white/40">Batch threshold (USD)</span>
                <input
                  type="number"
                  min={10}
                  max={100000}
                  step={1}
                  value={thresholdUsd}
                  onChange={(e) => setThresholdUsd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 tabular-nums"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-white/40">Slippage (bps, 100 = 1%)</span>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 tabular-nums"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-white/40">Swap input asset</span>
                <select
                  value={inputAsset}
                  onChange={(e) =>
                    setInputAsset(e.target.value as "usdc" | "sol")
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                >
                  <option value="usdc">USDC (recommended)</option>
                  <option value="sol">SOL</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-white/55 pt-6">
                <input
                  type="checkbox"
                  checked={autoExecute}
                  onChange={(e) => setAutoExecute(e.target.checked)}
                  className="rounded border-white/20"
                />
                Auto-execute when threshold reached
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={saveConfig}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-violet-400/40 text-violet-200 text-xs hover:bg-violet-400/10 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
              <button
                type="button"
                onClick={runExecute}
                disabled={executing || data.summary.accruedUsd < 0.01}
                className="px-4 py-2 rounded-lg border border-emerald-400/40 text-emerald-200 text-xs hover:bg-emerald-400/10 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {executing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Execute batch now
              </button>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-white/40">
              <input
                type="checkbox"
                checked={forceBelowThreshold}
                onChange={(e) => setForceBelowThreshold(e.target.checked)}
              />
              Force execute below threshold (min $10 accrued)
            </label>
          </div>

          {data.recentBatches.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="text-white/35 border-b border-white/10">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">USD</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">$POCK</th>
                    <th className="py-2">Tx</th>
                  </tr>
                </thead>
                <tbody className="text-white/55">
                  {data.recentBatches.map((b) => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        ${(b.total_buyback_usd_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3">{b.status}</td>
                      <td className="py-2 pr-3 tabular-nums text-neon-cyan/80">
                        {b.pock_received_ui != null
                          ? Number(b.pock_received_ui).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2">
                        {b.solana_tx_signature ? (
                          <a
                            href={`https://solscan.io/tx/${b.solana_tx_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon-cyan hover:underline inline-flex items-center gap-1"
                          >
                            {b.solana_tx_signature.slice(0, 8)}…
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : b.error_message ? (
                          <span className="text-red-400/80" title={b.error_message}>
                            failed
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[10px] text-white/30 font-mono">
            Corp wallet: {data.corpWallet}
          </p>
        </>
      )}

      {message && (
        <p className="text-xs text-emerald-300/90 border border-emerald-400/20 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
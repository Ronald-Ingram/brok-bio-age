"use client";

import { usePock } from "@/context/PockContext";
import { getDeviceId } from "@/lib/deviceId";
import { getSupabase } from "@/lib/supabase/client";
import { KeyRound, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

interface AccountRestorePanelProps {
  /** Pre-fill when wallet is already linked elsewhere */
  walletAddress?: string;
  accountSuffixHint?: string;
  className?: string;
}

export function AccountRestorePanel({
  walletAddress,
  accountSuffixHint,
  className = "",
}: AccountRestorePanelProps) {
  const { refresh } = usePock();
  const [targetUserId, setTargetUserId] = useState("");
  const [password, setPassword] = useState("");
  const [stripeSessionId, setStripeSessionId] = useState("");
  const [mode, setMode] = useState<"password" | "stripe">("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRestore = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const endpoint =
        mode === "stripe"
          ? "/api/pock/bind-account-checkout"
          : "/api/pock/bind-account";
      const payload =
        mode === "stripe"
          ? {
              deviceId,
              targetUserId: targetUserId.trim(),
              stripeSessionId: stripeSessionId.trim(),
            }
          : {
              deviceId,
              targetUserId: targetUserId.trim(),
              password,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
        userId?: string;
      };
      if (!res.ok) {
        const messages: Record<string, string> = {
          account_not_found: "Account ID not found",
          reveal_password_not_set:
            "Set a reveal password on your main account first (eye icon in header on that browser), or contact info@neobanx.com",
          password_invalid: "Incorrect reveal password",
        };
        throw new Error(messages[data.error ?? ""] ?? data.error ?? "restore_failed");
      }

      const supabase = getSupabase();
      await supabase.auth.setSession({
        access_token: data.access_token!,
        refresh_token: data.refresh_token!,
      });
      await refresh();
      setSuccess(
        `Restored account ${data.userId?.slice(0, 8)}… on this device. Transaction history and balance should update below.`
      );
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`rounded-xl border border-neon-cyan/25 bg-neon-cyan/8 px-4 py-4 space-y-3 text-sm ${className}`}
    >
      <div className="flex items-start gap-2">
        <RefreshCw className="h-4 w-4 text-neon-cyan shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-neon-cyan/90">Restore your main account</p>
          <p className="text-xs text-white/55 leading-relaxed">
            {walletAddress
              ? `This Solana wallet is linked to another BROK account${
                  accountSuffixHint ? ` (ending ${accountSuffixHint})` : ""
                }. Each browser can create a separate trial account — bind this device to your main account to see your $50 purchase and full transaction history.`
              : "If you only see 100 $POCK or empty history, you may be on a new device account. Bind this browser to your main account."}
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-white/40">
          Main account ID (full UUID)
        </span>
        <input
          type="text"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="c6c1e4c7-4ddc-46c4-8158-2501b1f1b182"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono outline-none focus:border-neon-cyan/40"
        />
      </label>

      <div className="flex gap-2 text-[10px]">
        <button
          type="button"
          onClick={() => setMode("stripe")}
          className={`px-2 py-1 rounded ${mode === "stripe" ? "bg-neon-cyan/20 text-neon-cyan" : "text-white/40"}`}
        >
          Stripe receipt
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`px-2 py-1 rounded ${mode === "password" ? "bg-neon-cyan/20 text-neon-cyan" : "text-white/40"}`}
        >
          Reveal password
        </button>
      </div>

      {mode === "stripe" ? (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            Stripe checkout session ID (from receipt URL)
          </span>
          <input
            type="text"
            value={stripeSessionId}
            onChange={(e) => setStripeSessionId(e.target.value)}
            placeholder="cs_live_…"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono outline-none focus:border-neon-cyan/40"
          />
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            Reveal password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon-cyan/40"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-400/90 border border-emerald-400/20 rounded-lg px-3 py-2 bg-emerald-400/5">
          {success}
        </p>
      )}

      <button
        type="button"
        disabled={
          submitting ||
          !targetUserId.trim() ||
          (mode === "password" ? !password : !stripeSessionId.trim())
        }
        onClick={() => void handleRestore()}
        className="inline-flex items-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-2.5 text-xs font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-40"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        Bind this device to main account
      </button>
    </section>
  );
}
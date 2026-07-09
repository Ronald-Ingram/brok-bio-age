"use client";

import { usePock } from "@/context/PockContext";
import { getSupabase } from "@/lib/supabase/client";
import { POCK_OG_MIN_HELD } from "@/lib/ogEntitlementsConfig";
import { ChevronDown, Loader2, Shield } from "lucide-react";
import { useState } from "react";

/** Low-profile OG claim — not marketed on landing pages */
export function PockOgClaimPanel() {
  const { user, ready, refresh } = usePock();
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState("");
  const [vipCode, setVipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!ready || !user || user.subscription_tier === "pock_og") return null;

  const run = async (mode: "wallet" | "code") => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("auth_required");

      if (mode === "wallet") {
        const res = await fetch("/api/pock/verify-og-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: wallet.trim(),
            userId: user.id,
            accessToken: session.access_token,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "verify_failed");
        setSuccess("POCK OG activated — basic Bio-Age access unlocked.");
      } else {
        const res = await fetch("/api/pock/redeem-og-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: vipCode.trim(),
            accessToken: session.access_token,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "redeem_failed");
        setSuccess("Access code accepted — POCK OG active.");
      }
      await refresh();
    } catch (e) {
      const key = e instanceof Error ? e.message : "failed";
      const messages: Record<string, string> = {
        insufficient_pock_on_chain: `Wallet must hold at least ${POCK_OG_MIN_HELD} $POCK`,
        wallet_already_claimed: "This wallet is already linked to another account",
        wallet_claim_closed: "Wallet verification period has ended",
        pock_mint_not_configured: "On-chain check not ready — use your access code",
        code_invalid: "Invalid access code",
        code_expired: "Access code expired",
        code_exhausted: "Access code already used",
        og_already_claimed: "This account already has OG access",
      };
      setError(messages[key] ?? "Could not verify — try again or use an access code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/8 bg-black/15">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/35" />
          Early $POCK supporter access
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          <p className="text-xs text-white/40 leading-relaxed">
            Hold {POCK_OG_MIN_HELD.toLocaleString()}+ on-chain $POCK (through Jul
            24, 2026) or enter a private access code.
          </p>

          <label className="block space-y-1.5">
            <span className="text-xs text-white/45">Solana wallet address</span>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Your $POCK wallet"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm font-mono focus:border-neon-cyan/40 outline-none"
            />
            <button
              type="button"
              disabled={loading || !wallet.trim()}
              onClick={() => run("wallet")}
              className="mt-2 w-full py-2 rounded-lg text-xs border border-white/15 text-white/60 hover:border-white/25 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Verify wallet"
              )}
            </button>
          </label>

          <div className="flex items-center gap-2 text-[10px] text-white/25 uppercase tracking-wide">
            <span className="flex-1 h-px bg-white/10" />
            or access code
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-white/45">Private access code</span>
            <input
              type="text"
              value={vipCode}
              onChange={(e) => setVipCode(e.target.value.toUpperCase())}
              placeholder="OG••••••••"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm font-mono tracking-wider focus:border-neon-cyan/40 outline-none"
            />
            <button
              type="button"
              disabled={loading || !vipCode.trim()}
              onClick={() => run("code")}
              className="mt-2 w-full py-2 rounded-lg text-xs border border-white/15 text-white/60 hover:border-white/25 disabled:opacity-40"
            >
              Redeem code
            </button>
          </label>

          {error && (
            <p className="text-xs text-amber-400/90">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400/90">{success}</p>
          )}
        </div>
      )}
    </section>
  );
}
"use client";

import { DevicePinInput } from "@/components/DevicePinInput";
import { usePock } from "@/context/PockContext";
import { getDeviceId } from "@/lib/deviceId";
import {
  listKnownAccounts,
  rememberKnownAccount,
} from "@/lib/knownAccounts";
import {
  formatBrokAccountNumber,
  loadMainAccountCode,
  saveMainAccountCode,
} from "@/lib/pockAccount";
import { getSupabase } from "@/lib/supabase/client";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Shown when this browser has no Genius Wallet yet.
 * Prevents auto-minting trial wallets; returning users open with code + PIN
 * (PIN-only when we already remember their BROK- code).
 */
export function WalletOnboardingGate() {
  const { needsWalletChoice, createAccount, loading, configured, refresh, user } =
    usePock();
  const [mode, setMode] = useState<"choose" | "restore">("choose");
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetAccount, setTargetAccount] = useState("");
  const [pin, setPin] = useState("");
  const [showCodeField, setShowCodeField] = useState(false);

  const rememberedCode = useMemo(() => {
    const main = loadMainAccountCode()?.trim().toUpperCase();
    if (main?.startsWith("BROK-")) return main;
    const known = listKnownAccounts();
    if (!known.length) return null;
    // Prefer highest last-seen balance, then most recently used
    const byBal = [...known].sort(
      (a, b) => (b.lastBalance ?? 0) - (a.lastBalance ?? 0)
    );
    return byBal[0]?.code ?? known[0]?.code ?? null;
  }, [needsWalletChoice]);

  useEffect(() => {
    if (!needsWalletChoice) return;
    if (rememberedCode) {
      setTargetAccount(rememberedCode);
      setShowCodeField(false);
    } else {
      setShowCodeField(true);
    }
  }, [needsWalletChoice, rememberedCode]);

  if (!configured || loading || !needsWalletChoice) return null;

  const handleNew = async () => {
    setError(null);
    setCreating(true);
    try {
      await createAccount();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create wallet";
      setError(
        msg.includes("corp_float_insufficient")
          ? "Trial pool is refilling — try again in a moment."
          : msg.includes("sign_in_failed") || msg.includes("Protected deployment")
            ? "Use https://brok.neobanx.com (not a preview URL)."
            : msg
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    setError(null);
    const code = targetAccount.trim().toUpperCase().replace(/\s/g, "");
    if (!code.startsWith("BROK-") || code.length < 10) {
      setError("Enter your account code (BROK-XXXXXXXX)");
      setShowCodeField(true);
      return;
    }
    if (pin.length < 4) {
      setError("Enter your Device PIN (4–8 digits)");
      return;
    }
    setRestoring(true);
    try {
      const deviceId = getDeviceId();
      const res = await fetch("/api/pock/bind-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          targetUserId: code,
          password: pin,
          currentUserId: user?.id,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        access_token?: string;
        refresh_token?: string;
        userId?: string;
        mergedPock?: number;
      };
      if (!res.ok) {
        const messages: Record<string, string> = {
          account_not_found: "Account not found — check the BROK- code",
          reveal_password_not_set:
            "That account has no Device PIN yet. Open it where you set the PIN, or try another code.",
          password_invalid: "Wrong Device PIN — try again",
        };
        throw new Error(
          data.hint ?? messages[data.error ?? ""] ?? data.error ?? "restore_failed"
        );
      }
      const supabase = getSupabase();
      await supabase.auth.setSession({
        access_token: data.access_token!,
        refresh_token: data.refresh_token!,
      });
      if (data.userId) {
        saveMainAccountCode(data.userId);
        rememberKnownAccount({ userId: data.userId });
      }
      setPin("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open wallet");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 px-3 py-6 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-onboard-title"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-neon-cyan/30 bg-bg-card shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
            Genius Wallet
          </p>
          <h2
            id="wallet-onboard-title"
            className="text-xl font-semibold text-white/95"
          >
            {mode === "restore" ? "Open your wallet" : "One wallet for this device"}
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">
            {mode === "restore"
              ? rememberedCode && !showCodeField
                ? "Enter the Device PIN for your saved account. One PIN opens this phone to your balance."
                : "Enter your BROK- account code and Device PIN once."
              : "If you already bought $POCK or set a PIN, open that wallet — don’t create another trial by accident."}
          </p>
        </div>

        {mode === "choose" && (
          <>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleNew()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-sm font-medium text-white/80 hover:border-white/25 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {creating ? "Creating…" : "I’m new — start free trial"}
            </button>
            <p className="text-[11px] text-center text-white/35 -mt-1">
              Only if you’ve never had a Genius Wallet on any device.
            </p>

            <button
              type="button"
              onClick={() => {
                setMode("restore");
                setError(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-3.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25"
            >
              <KeyRound className="h-4 w-4" />
              I already have a wallet
            </button>
          </>
        )}

        {mode === "restore" && (
          <form
            autoComplete="off"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleRestore();
            }}
          >
            {rememberedCode && !showCodeField ? (
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  Your account
                </p>
                <p className="font-mono text-base text-neon-cyan tracking-wider font-semibold">
                  {targetAccount || rememberedCode}
                </p>
                <button
                  type="button"
                  className="text-[11px] text-white/40 hover:text-neon-cyan underline"
                  onClick={() => setShowCodeField(true)}
                >
                  Use a different account code
                </button>
              </div>
            ) : (
              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-white/45">
                  Account code
                </span>
                <input
                  value={targetAccount}
                  onChange={(e) =>
                    setTargetAccount(
                      e.target.value.toUpperCase().replace(/\s/g, "")
                    )
                  }
                  placeholder="BROK-XXXXXXXX"
                  className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/15 text-base font-mono tracking-wider focus:border-neon-cyan/40 outline-none"
                  autoComplete="off"
                  name="brok_account_code"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </label>
            )}

            <DevicePinInput
              label="Device PIN"
              value={pin}
              onChange={setPin}
              autoFocus
            />

            <button
              type="submit"
              disabled={restoring || pin.length < 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-3.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-50"
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {restoring ? "Opening…" : "Open my wallet"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("choose");
                setError(null);
                setPin("");
              }}
              className="w-full text-center text-xs text-white/40 hover:text-white/60 py-1"
            >
              ← Back
            </button>
          </form>
        )}

        {error && (
          <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

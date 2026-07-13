"use client";

import { DevicePinInput } from "@/components/DevicePinInput";
import { usePock } from "@/context/PockContext";
import {
  displayAccountNumber,
  formatBrokAccountLabel,
  saveMainAccountCode,
} from "@/lib/pockAccount";
import { Check, Copy, KeyRound, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Variant = "compact" | "card";

interface AccountIdentityProps {
  variant?: Variant;
  className?: string;
}

/** Low balance → warn before treating this trial as Main for a new PIN. */
const LOW_BALANCE_PIN_WARN = 2000;

export function AccountIdentity({
  variant = "compact",
  className = "",
}: AccountIdentityProps) {
  const {
    user,
    hasRevealPassword,
    revealLoading,
    setRevealPassword,
  } = usePock();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "change">("create");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ackLowBalance, setAckLowBalance] = useState(false);

  const resetForm = useCallback(() => {
    setPin("");
    setConfirm("");
    setCurrentPin("");
    setError(null);
    setAckLowBalance(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    setMode(hasRevealPassword ? "change" : "create");
  }, [open, hasRevealPassword]);

  if (!user) return null;

  const accountLabel = formatBrokAccountLabel(user);
  const accountDisplay = displayAccountNumber(user.id);
  const balance = user.pock_balance ?? 0;
  const lowBalance = balance < LOW_BALANCE_PIN_WARN;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(accountDisplay);
      setCopied(true);
      saveMainAccountCode(user.id);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (pin !== confirm) {
        setError("PINs do not match");
        return;
      }
      if (pin.length < 4 || pin.length > 8) {
        setError("Use 4–8 digits");
        return;
      }
      if (mode === "create" && lowBalance && !ackLowBalance) {
        setError(
          "This balance looks small. If your full wallet is on another code, use Switch account first — don’t set a PIN on a temporary wallet."
        );
        return;
      }
      if (mode === "change" && !currentPin) {
        setError("Enter your current PIN");
        return;
      }

      await setRevealPassword(
        pin,
        mode === "change" ? currentPin : undefined
      );
      saveMainAccountCode(user.id);
      setOpen(false);
    } catch (e) {
      const code = e instanceof Error ? e.message : "request_failed";
      const messages: Record<string, string> = {
        password_too_short: "Use a 4–8 digit PIN",
        password_too_long: "PIN is too long",
        current_password_required: "Enter your current PIN",
        current_password_invalid: "Current PIN is incorrect",
        migration_required: "Account security not ready — contact support",
      };
      setError(messages[code] ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const pinButtonLabel =
    hasRevealPassword === false
      ? "Set PIN"
      : hasRevealPassword
        ? "Change PIN"
        : "PIN";

  const codeBlock = (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      <p
        className={`font-mono tracking-wider text-neon-cyan font-semibold tabular-nums ${
          variant === "card" ? "text-base sm:text-lg" : "text-sm sm:text-base"
        }`}
      >
        {accountDisplay}
      </p>
      <button
        type="button"
        onClick={() => void copyCode()}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white/70 hover:text-neon-cyan hover:border-neon-cyan/40"
        title="Copy account code"
        aria-label="Copy account code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-1 text-[11px] text-neon-cyan hover:bg-neon-cyan/20"
        aria-label={pinButtonLabel}
      >
        <KeyRound className="h-3.5 w-3.5" />
        {pinButtonLabel}
      </button>
    </div>
  );

  return (
    <>
      <div
        className={`${variant === "card" ? "space-y-2" : "text-right space-y-1"} ${className}`}
      >
        <p className="text-xs text-white/50">{accountLabel}</p>
        {variant === "card" && (
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            Account code
          </p>
        )}
        {codeBlock}
        {hasRevealPassword === false && (
          <p
            className={`text-xs text-amber-300/90 leading-snug max-w-[18rem] ${
              variant === "card" ? "ml-auto text-right" : ""
            }`}
          >
            {lowBalance
              ? "No PIN on this temporary wallet — open your full account via Switch account, then set a PIN there."
              : "Set a 4–8 digit Device PIN so phone and Mac can open this wallet."}
          </p>
        )}
        {revealLoading && (
          <p className="text-[10px] text-white/25 inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking…
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-pin-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-neon-cyan" />
                <h2
                  id="device-pin-title"
                  className="text-sm font-medium text-white/85"
                >
                  {mode === "create" ? "Create Device PIN" : "Change Device PIN"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white/70"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm font-mono text-neon-cyan tracking-wider font-semibold">
              {accountDisplay}
            </p>
            <p className="text-xs text-white/50 leading-relaxed">
              One simple 4–8 digit PIN for this account on every device. Not your
              Apple password, not Face ID — just digits for Switch account.
            </p>

            {mode === "create" && lowBalance && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 space-y-2">
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  This device only shows{" "}
                  <strong>{balance.toLocaleString()} $POCK</strong>. Prefer{" "}
                  <strong>Switch account</strong> if you already have a larger
                  balance elsewhere.
                </p>
                <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackLowBalance}
                    onChange={(e) => setAckLowBalance(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>This is my main wallet — set a PIN here.</span>
                </label>
              </div>
            )}

            {/* Prevent browser from treating parent as a login form */}
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="space-y-3"
            >
              {mode === "change" && (
                <DevicePinInput
                  label="Current PIN"
                  value={currentPin}
                  onChange={setCurrentPin}
                  autoFocus
                />
              )}
              <DevicePinInput
                label={mode === "create" ? "New PIN (4–8 digits)" : "New PIN"}
                value={pin}
                onChange={setPin}
                autoFocus={mode === "create"}
              />
              <DevicePinInput
                label="Confirm PIN"
                value={confirm}
                onChange={setConfirm}
              />

              {error && (
                <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  pin.length < 4 ||
                  !confirm ||
                  (mode === "create" && lowBalance && !ackLowBalance) ||
                  (mode === "change" && currentPin.length < 4)
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-3 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {mode === "create" ? "Save Device PIN" : "Update Device PIN"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

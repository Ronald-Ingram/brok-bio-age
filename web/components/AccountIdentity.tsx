"use client";

import { usePock } from "@/context/PockContext";
import {
  displayAccountNumber,
  displayUserId,
  formatBrokAccountLabel,
} from "@/lib/pockAccount";
import { Eye, EyeOff, KeyRound, Loader2, Lock, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Variant = "compact" | "card";

interface AccountIdentityProps {
  variant?: Variant;
  className?: string;
}

export function AccountIdentity({
  variant = "compact",
  className = "",
}: AccountIdentityProps) {
  const {
    user,
    accountIdRevealed,
    hasRevealPassword,
    revealLoading,
    revealAccountId,
    setRevealPassword,
    lockAccountId,
  } = usePock();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"unlock" | "create" | "change">("unlock");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setPassword("");
    setConfirm("");
    setCurrentPassword("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (open && hasRevealPassword === false) setMode("create");
    else if (open && hasRevealPassword) setMode("unlock");
  }, [open, hasRevealPassword]);

  if (!user) return null;

  const revealed = accountIdRevealed;
  const accountLabel = formatBrokAccountLabel(user);
  const userIdDisplay = displayUserId(user.id, revealed);
  const accountDisplay = displayAccountNumber(user.id, revealed);

  const openReveal = () => {
    if (revealed) {
      lockAccountId();
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "unlock") {
        const ok = await revealAccountId(password);
        if (!ok) {
          setError("Incorrect password");
          return;
        }
        setOpen(false);
        return;
      }

      if (password !== confirm) {
        setError("Passwords do not match");
        return;
      }

      await setRevealPassword(
        password,
        mode === "change" ? currentPassword : undefined
      );
      const ok = await revealAccountId(password);
      if (!ok) {
        setError("Password saved but unlock failed — try again");
        return;
      }
      setOpen(false);
    } catch (e) {
      const code = e instanceof Error ? e.message : "request_failed";
      const messages: Record<string, string> = {
        password_too_short: "Use at least 8 characters",
        password_too_long: "Password is too long",
        current_password_required: "Enter your current password",
        current_password_invalid: "Current password is incorrect",
        migration_required: "Account security not ready — run migration 013",
      };
      setError(messages[code] ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (variant === "compact") {
    return (
      <>
        <div className={`text-right leading-tight ${className}`}>
          <p className="text-[10px] text-white/55 truncate">{accountLabel}</p>
          <div className="flex items-center justify-end gap-1">
            <p className="text-[9px] font-mono text-white/35 tracking-wide">
              Acct {accountDisplay}
            </p>
            <button
              type="button"
              onClick={openReveal}
              className="text-white/30 hover:text-neon-cyan transition-colors"
              title={revealed ? "Hide full ID" : "Reveal full ID"}
              aria-label={revealed ? "Hide full user ID" : "Reveal full user ID"}
            >
              {revealed ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </button>
          </div>
          <p className="text-[8px] font-mono text-white/28 break-all max-w-[10rem] sm:max-w-[14rem] ml-auto">
            {userIdDisplay}
          </p>
        </div>
        {open && (
          <RevealModal
            mode={mode}
            setMode={setMode}
            hasPassword={hasRevealPassword}
            password={password}
            setPassword={setPassword}
            confirm={confirm}
            setConfirm={setConfirm}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            submitting={submitting}
            error={error}
            onClose={() => setOpen(false)}
            onSubmit={handleSubmit}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`space-y-1 ${className}`}>
        <p className="text-[10px] text-white/50">{accountLabel}</p>
        <div className="flex items-center justify-end gap-2">
          <p className="text-[9px] font-mono text-white/35">{accountDisplay}</p>
          <button
            type="button"
            onClick={openReveal}
            className="inline-flex items-center gap-1 text-[9px] text-neon-cyan/70 hover:text-neon-cyan"
          >
            {revealed ? (
              <>
                <EyeOff className="h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Reveal
              </>
            )}
          </button>
        </div>
        <p className="text-[9px] font-mono text-white/30 break-all">{userIdDisplay}</p>
        {revealLoading && (
          <p className="text-[9px] text-white/25 inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking security…
          </p>
        )}
      </div>
      {open && (
        <RevealModal
          mode={mode}
          setMode={setMode}
          hasPassword={hasRevealPassword}
          password={password}
          setPassword={setPassword}
          confirm={confirm}
          setConfirm={setConfirm}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          submitting={submitting}
          error={error}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

function RevealModal({
  mode,
  setMode,
  hasPassword,
  password,
  setPassword,
  confirm,
  setConfirm,
  currentPassword,
  setCurrentPassword,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  mode: "unlock" | "create" | "change";
  setMode: (m: "unlock" | "create" | "change") => void;
  hasPassword: boolean | null;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isCreate = mode === "create";
  const isChange = mode === "change";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-id-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-card p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-neon-cyan" />
            <h2 id="reveal-id-title" className="text-sm font-medium text-white/85">
              {isCreate
                ? "Create reveal password"
                : isChange
                  ? "Change reveal password"
                  : "Unlock full user ID"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white/70"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-white/45 leading-relaxed">
          {isCreate
            ? "Set a password to unlock your full BROK user ID and account number. Only the last 4 characters show until you unlock."
            : isChange
              ? "Enter your current password, then choose a new one."
              : "Enter your reveal password to show your full user ID for 30 minutes this session."}
        </p>

        {isChange && (
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-white/40">
              Current password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon-cyan/40"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            {isCreate || isChange ? "New password" : "Password"}
          </span>
          <input
            type="password"
            autoComplete={isCreate || isChange ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon-cyan/40"
          />
        </label>

        {(isCreate || isChange) && (
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-white/40">
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon-cyan/40"
            />
          </label>
        )}

        {error && (
          <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={submitting || !password || (isCreate && !confirm)}
            onClick={onSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-2.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isCreate ? "Save & reveal" : isChange ? "Update password" : "Unlock"}
          </button>

          {hasPassword && mode === "unlock" && (
            <button
              type="button"
              onClick={() => setMode("change")}
              className="text-[11px] text-white/40 hover:text-neon-cyan"
            >
              Change reveal password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
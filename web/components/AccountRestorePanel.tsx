"use client";

import { DevicePinInput } from "@/components/DevicePinInput";
import { usePock } from "@/context/PockContext";
import { getDeviceId } from "@/lib/deviceId";
import {
  forgetKnownAccount,
  labelForKnownAccount,
  listKnownAccounts,
  rememberKnownAccount,
  type KnownAccount,
} from "@/lib/knownAccounts";
import {
  displayAccountNumber,
  formatBrokAccountNumber,
  loadMainAccountCode,
  saveMainAccountCode,
} from "@/lib/pockAccount";
import { useHideIds } from "@/context/HideIdsContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  Check,
  ChevronDown,
  KeyRound,
  Loader2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AccountRestorePanelProps {
  walletAddress?: string;
  accountSuffixHint?: string;
  accountCodeHint?: string;
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Account switcher: open any wallet by BROK code + Device PIN.
 * Remembers accounts used on this browser; merges leftover trial into target.
 */
export function AccountRestorePanel({
  accountCodeHint,
  className = "",
  defaultOpen = true,
}: AccountRestorePanelProps) {
  const { user, refresh } = usePock();
  const [open, setOpen] = useState(defaultOpen);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [known, setKnown] = useState<KnownAccount[]>([]);
  const [targetAccount, setTargetAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { hideIds } = useHideIds();
  const thisCode = user ? formatBrokAccountNumber(user.id) : null;
  const thisCodeDisplay = user
    ? displayAccountNumber(user.id, hideIds)
    : null;
  const thisBalance = user?.pock_balance ?? 0;

  const reloadKnown = useCallback(() => {
    setKnown(listKnownAccounts());
  }, []);

  useEffect(() => {
    reloadKnown();
  }, [reloadKnown, user?.id]);

  useEffect(() => {
    if (!user) return;
    rememberKnownAccount({
      userId: user.id,
      balance: user.pock_balance,
      label: user.display_name ?? undefined,
    });
    reloadKnown();
  }, [user?.id, user?.pock_balance, user?.display_name, reloadKnown, user]);

  useEffect(() => {
    const prefill =
      accountCodeHint?.trim() || loadMainAccountCode() || "";
    if (prefill && !targetAccount) setTargetAccount(prefill);
  }, [accountCodeHint, targetAccount]);

  const selectKnown = (a: KnownAccount) => {
    setTargetAccount(a.code);
    setPickerOpen(false);
    setError(null);
    setSuccess(null);
  };

  const handleSwitch = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const res = await fetch("/api/pock/bind-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          targetUserId: targetAccount.trim(),
          password,
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
          account_not_found:
            "Account not found — check the BROK- code (Copy from the wallet that has that balance)",
          reveal_password_not_set:
            "That account has no Device PIN yet. Open it on the device where you last saw the full balance, or set a PIN there first.",
          password_invalid: "Wrong Device PIN for that account — try again",
        };
        throw new Error(
          data.hint ?? messages[data.error ?? ""] ?? data.error ?? "switch_failed"
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
      await refresh();
      reloadKnown();
      const mergeNote =
        data.mergedPock && data.mergedPock > 0
          ? ` Moved ${data.mergedPock.toLocaleString()} $POCK from the previous wallet on this device into this account.`
          : "";
      setSuccess(
        `Opened account ${data.userId ? formatBrokAccountNumber(data.userId) : ""}.${mergeNote}`
      );
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch account");
    } finally {
      setSubmitting(false);
    }
  };

  const otherKnown = known.filter((a) => a.code !== thisCode);

  return (
    <section
      className={`rounded-2xl border border-neon-cyan/25 bg-neon-cyan/5 px-4 py-4 space-y-3 text-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
      >
        <Wallet className="h-5 w-5 text-neon-cyan shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1 min-w-0">
          <p className="font-medium text-neon-cyan/95 flex items-center gap-2">
            Switch account
          </p>
          <p className="text-xs sm:text-sm text-white/55 leading-relaxed">
            Each browser only shows one wallet at a time. Open another by account
            code + Device PIN — including your full-balance wallet if this screen
            looks too small. Family sub-wallets live under this account (Genius
            family wallets below).
          </p>
          {thisCode && (
            <p className="text-sm sm:text-base font-mono text-white/90 pt-1 tracking-wider font-semibold">
              Now open:{" "}
              <span className="text-neon-cyan">{thisCodeDisplay ?? thisCode}</span>
              <span className="text-white/45 font-sans font-normal text-xs sm:text-sm ml-2">
                · {thisBalance.toLocaleString()} $POCK
              </span>
            </p>
          )}
        </div>
        <span className="text-[10px] text-white/40 uppercase tracking-wider shrink-0">
          {open ? "Hide" : "Open"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs sm:text-sm text-amber-50/90 leading-relaxed space-y-1">
            <p className="font-medium text-amber-100">Lost the big balance?</p>
            <p>
              It is usually still on another account code — not deleted. Enter that
              code below (example shape:{" "}
              <span className="font-mono text-neon-cyan/90">BROK-63A83DE5</span>)
              with the PIN you set on that wallet. This device will switch and can
              fold today’s smaller balance into it.
            </p>
          </div>

          {/* Known accounts dropdown */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-white/45">
              Accounts on this browser
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-left text-sm hover:border-neon-cyan/35"
              >
                <span className="flex items-center gap-2 text-white/70 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-white/40" />
                  <span className="truncate">
                    {otherKnown.length
                      ? `${otherKnown.length} saved — pick one or type a code`
                      : "No other accounts saved yet — type a BROK- code"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-white/40 shrink-0 transition-transform ${
                    pickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {pickerOpen && (
                <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-white/15 bg-bg-card shadow-xl py-1">
                  {thisCode && (
                    <li className="px-3 py-2 text-[11px] uppercase tracking-wider text-white/35 border-b border-white/10">
                      Current · {thisCodeDisplay ?? thisCode}
                    </li>
                  )}
                  {otherKnown.length === 0 && (
                    <li className="px-3 py-3 text-xs text-white/45">
                      After you open an account once, it appears here. You can also
                      type any BROK- code you wrote down.
                    </li>
                  )}
                  {otherKnown.map((a) => (
                    <li key={a.code} className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => selectKnown(a)}
                        className="flex-1 text-left px-3 py-2.5 hover:bg-neon-cyan/10 text-sm"
                      >
                        <span className="font-mono text-neon-cyan tracking-wide text-base">
                          {a.code}
                        </span>
                        <span className="block text-xs text-white/45 mt-0.5">
                          {typeof a.lastBalance === "number"
                            ? `${a.lastBalance.toLocaleString()} $POCK last seen`
                            : labelForKnownAccount(a)}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Remove from list"
                        onClick={() => {
                          forgetKnownAccount(a.code);
                          reloadKnown();
                        }}
                        className="px-3 text-white/30 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSwitch();
            }}
            className="space-y-3"
          >
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-white/45">
                Account code to open
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
                autoCapitalize="characters"
                name="brok_account_code"
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
              />
            </label>

            <DevicePinInput
              label="Device PIN (digits only — not your Apple password)"
              value={password}
              onChange={setPassword}
            />

            {error && (
              <p className="text-xs sm:text-sm text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs sm:text-sm text-emerald-400/90 border border-emerald-400/20 rounded-lg px-3 py-2 flex gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                !targetAccount.trim() ||
                password.length < 4 ||
                (thisCode !== null &&
                  targetAccount.trim().toUpperCase() === thisCode)
              }
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-4 py-3.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              {submitting ? "Opening…" : "Open this account on this device"}
            </button>
          </form>

          <p className="text-[11px] sm:text-xs text-white/40 leading-relaxed">
            <strong className="text-white/55">One PIN per account.</strong> Same
            account on phone + Mac = same code + same PIN. Family sub-wallets are
            allowances inside one parent account (not separate logins). After you
            open the full-balance account, use Copy on the code so it stays in this
            list.
          </p>
        </div>
      )}
    </section>
  );
}

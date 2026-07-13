"use client";

import { useToast } from "@/context/ToastContext";
import {
  bootstrapUser,
  canAffordCalc,
  debitForCalc,
  fetchCurrentUser,
  fetchLedger,
  impactDonationStub,
  ensureAuthSession,
  isHistoryUnlimited,
  createPockInvite,
  connectSolanaWallet,
  createGiftInvite,
  autoClaimGiftInvite,
  requestCustodyRelease,
  sendToUser,
  spendOnPremium,
  withdrawToWallet,
} from "@/lib/pockService";
import type { CustodyReleaseResult } from "@/lib/pockService";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchAccountRevealStatus,
  setAccountRevealPassword,
  verifyAccountRevealPassword,
} from "@/lib/accountRevealClient";
import {
  clearAccountIdRevealed,
  isAccountIdRevealed,
  setAccountIdRevealed,
} from "@/lib/pockAccount";
import type { PockReconcileResult } from "@/lib/pockReconcile";
import { syncPockReconcile } from "@/lib/syncPockReconcile";
import type { BrokUser, PockLedgerEntry } from "@/lib/pockTypes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface PockContextValue {
  user: BrokUser | null;
  ledger: PockLedgerEntry[];
  loading: boolean;
  ready: boolean;
  configured: boolean;
  reconciling: boolean;
  reconcile: PockReconcileResult | null;
  createAccount: () => Promise<void>;
  refresh: (opts?: { sessionId?: string }) => Promise<void>;
  debitCalc: () => Promise<DebitCalcResult>;
  spendPremium: (name: string, cost: number) => Promise<void>;
  sendPock: (recipientId: string, amount: number) => Promise<void>;
  sendPockInvite: (options: {
    amount: number;
    phone: string;
    recipientBrokId?: string;
    recipientWallet?: string;
  }) => Promise<import("@/lib/pockService").PockInviteResult>;
  sendGiftInvite: (options: {
    amount: number;
    usdEquivalent: number;
    recipientName: string;
    phone?: string;
    email?: string;
    personalMessage?: string;
    recipientBrokId?: string;
  }) => Promise<import("@/lib/pockService").PockInviteResult>;
  withdraw: (address: string, amount: number) => Promise<void>;
  donate: (cause: string, amount: number) => Promise<void>;
  connectWallet: (address: string) => Promise<void>;
  requestRelease: (opts?: {
    amount?: number;
    destWallet?: string;
  }) => Promise<CustodyReleaseResult>;
  canCalc: boolean;
  historyUnlimited: boolean;
  accountIdRevealed: boolean;
  hasRevealPassword: boolean | null;
  revealLoading: boolean;
  revealAccountId: (password: string) => Promise<boolean>;
  setRevealPassword: (password: string, currentPassword?: string) => Promise<void>;
  lockAccountId: () => void;
}

interface DebitCalcResult {
  debited: boolean;
  balance: number;
  fromIncluded?: number;
  includedRemaining?: number;
}

const PockContext = createContext<PockContextValue | null>(null);

export function PockProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<BrokUser | null>(null);
  const [ledger, setLedger] = useState<PockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcile, setReconcile] = useState<PockReconcileResult | null>(null);
  const [accountIdRevealed, setAccountIdRevealedState] = useState(false);
  const [hasRevealPassword, setHasRevealPassword] = useState<boolean | null>(
    null
  );
  const [revealLoading, setRevealLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const syncRevealState = useCallback(async (u: BrokUser | null) => {
    if (!u) {
      setAccountIdRevealedState(false);
      setHasRevealPassword(null);
      return;
    }
    setRevealLoading(true);
    try {
      const status = await fetchAccountRevealStatus().catch(() => ({
        hasPassword: false,
      }));
      setHasRevealPassword(status.hasPassword);
      setAccountIdRevealedState(isAccountIdRevealed(u.id));
    } finally {
      setRevealLoading(false);
    }
  }, []);

  const refresh = useCallback(
    async (opts?: { sessionId?: string }) => {
      if (!configured) return;
      try {
        const [u, l] = await Promise.all([fetchCurrentUser(), fetchLedger()]);
        setUser(u);
        setLedger(l);
        setReady(Boolean(u?.trial_credited));
        await syncRevealState(u);
      } catch (e) {
        console.error("POCK refresh failed:", e);
      }

      try {
        setReconciling(true);
        const reconcileResult = await syncPockReconcile(opts?.sessionId);
        if (reconcileResult) setReconcile(reconcileResult);

        if (
          reconcileResult &&
          (reconcileResult.repairedLedger > 0 || reconcileResult.syncedSessions > 0)
        ) {
          const [u2, l2] = await Promise.all([fetchCurrentUser(), fetchLedger()]);
          setUser(u2);
          setLedger(l2);
          await syncRevealState(u2);
        }
      } catch (e) {
        console.error("POCK reconcile failed:", e);
      } finally {
        setReconciling(false);
      }
    },
    [configured, syncRevealState]
  );

  const revealAccountId = useCallback(async (password: string) => {
    try {
      const result = await verifyAccountRevealPassword(password);
      if (!result.ok) return false;
      const u = await fetchCurrentUser();
      if (u) {
        setAccountIdRevealed(u.id);
        setAccountIdRevealedState(true);
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "password_invalid") return false;
      throw e;
    }
  }, []);

  const setRevealPasswordFn = useCallback(
    async (password: string, currentPassword?: string) => {
      await setAccountRevealPassword(password, currentPassword);
      setHasRevealPassword(true);
    },
    []
  );

  const lockAccountId = useCallback(() => {
    clearAccountIdRevealed();
    setAccountIdRevealedState(false);
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const authed = await ensureAuthSession();
        if (!authed) return;

        const sessionId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("session_id") ??
              undefined
            : undefined;

        const existing = await fetchCurrentUser();
        if (!existing?.trial_credited) {
          try {
            const { user: booted, credited } = await bootstrapUser();
            setUser(booted);
            setReady(true);
            if (credited) {
              showToast("🎁 100 $POCK credited!", "success");
            }
          } catch (bootErr) {
            console.error("POCK auto-bootstrap failed:", bootErr);
          }
        } else {
          const [u, l] = await Promise.all([fetchCurrentUser(), fetchLedger()]);
          setUser(u);
          setLedger(l);
          setReady(Boolean(u?.trial_credited));
        }

        setLoading(false);
        void refresh({ sessionId });
      } catch (e) {
        console.error("POCK init failed:", e);
        setLoading(false);
      }
    })();
  }, [configured, refresh, showToast]);

  useEffect(() => {
    if (!configured || !ready || !user) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const claimToken = params.get("claim")?.trim();
    if (!claimToken) return;

    const storageKey = `brok_gift_claim:${claimToken.slice(0, 24)}`;
    if (sessionStorage.getItem(storageKey)) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await autoClaimGiftInvite(claimToken);
        if (cancelled) return;
        sessionStorage.setItem(storageKey, "done");
        showToast(result.message, result.alreadyClaimed ? "info" : "success");
        await refresh();
        const url = new URL(window.location.href);
        url.searchParams.delete("claim");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      } catch (e) {
        if (cancelled) return;
        sessionStorage.setItem(storageKey, "failed");
        const msg = e instanceof Error ? e.message : "claim_failed";
        if (msg === "gift_already_claimed") {
          showToast("This gift was already claimed by someone else.", "warning");
        } else if (msg !== "invite_expired_or_invalid") {
          showToast("Could not claim gift — try again or ask the sender to resend.", "error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, ready, user, refresh, showToast]);

  const createAccount = useCallback(async () => {
    if (!configured) {
      showToast("Supabase not configured", "error");
      return;
    }
    try {
      const { user: u, credited } = await bootstrapUser();
      setUser(u);
      setReady(true);
      await refresh();
      if (credited) {
        showToast("🎁 100 $POCK credited!", "success");
      } else {
        showToast("Welcome back!", "info");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "bootstrap_failed";
      if (msg.includes("corp_float_insufficient")) {
        showToast(
          "Trial credits temporarily unavailable — corp float is being replenished. Try again in a minute.",
          "error"
        );
      } else if (msg.includes("brok_users")) {
        showToast("Run POCK migration in Supabase first", "error");
      } else if (msg.includes("sign_in_failed") || msg.includes("auth_failed")) {
        showToast("Could not sign in — refresh the page and try again.", "error");
      } else {
        showToast(msg, "error");
      }
      throw e;
    }
  }, [configured, showToast]);

  const debitCalc = useCallback(async (): Promise<DebitCalcResult> => {
    try {
      const result = await debitForCalc();
      await refresh();
      if (result.debited) {
        const fromInc = result.from_included ?? 0;
        const detail =
          fromInc > 0
            ? `−1 $POCK (included) · ${result.included_remaining ?? 0} pool left`
            : `−1 $POCK · ${result.balance} wallet`;
        showToast(detail, "info");
      }
      return {
        debited: result.debited,
        balance: result.balance,
        fromIncluded: result.from_included,
        includedRemaining: result.included_remaining,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "debit_failed";
      if (msg === "insufficient_pock") {
        showToast(
          "Not enough $POCK — subscribe or top up in Genius Wallet",
          "warning"
        );
      }
      throw e;
    }
  }, [refresh, showToast]);

  const spendPremiumFn = useCallback(
    async (name: string, cost: number) => {
      try {
        const u = await spendOnPremium(name, cost);
        setUser(u);
        setLedger(await fetchLedger());
        showToast(`✓ ${name} unlocked · −${cost} $POCK`, "success");
      } catch (e) {
        handleActionError(e, showToast);
      }
    },
    [showToast]
  );

  const sendPock = useCallback(
    async (recipientId: string, amount: number) => {
      try {
        const u = await sendToUser(recipientId, amount);
        setUser(u);
        setLedger(await fetchLedger());
        showToast(
          `✓ Sent ${amount} $POCK · balance ${u.pock_balance}`,
          "success"
        );
      } catch (e) {
        handleActionError(e, showToast);
      }
    },
    [showToast]
  );

  const sendPockInvite = useCallback(
    async (options: {
      amount: number;
      phone: string;
      recipientBrokId?: string;
      recipientWallet?: string;
    }) => {
      try {
        const result = await createPockInvite(options);
        await refresh();
        showToast(`✓ Invite created · ${result.amount} $POCK reserved`, "success");
        return result;
      } catch (e) {
        handleActionError(e, showToast);
        throw e;
      }
    },
    [refresh, showToast]
  );

  const withdraw = useCallback(
    async (address: string, amount: number) => {
      try {
        const result = await withdrawToWallet(address, amount);
        await refresh();
        const tx = result.settlement?.txSignature;
        showToast(
          tx
            ? `✓ Sent ${amount} $POCK on-chain → ${address.slice(0, 8)}…`
            : `✓ Queued ${amount} $POCK → ${address.slice(0, 8)}…`,
          "success"
        );
      } catch (e) {
        handleActionError(e, showToast);
      }
    },
    [refresh, showToast]
  );

  const sendGiftInvite = useCallback(
    async (options: {
      amount: number;
      usdEquivalent: number;
      recipientName: string;
      phone?: string;
      email?: string;
      personalMessage?: string;
      recipientBrokId?: string;
    }) => {
      try {
        const result = await createGiftInvite(options);
        await refresh();
        showToast(
          `🎁 Gift sent · ${result.amount} $POCK reserved for ${options.recipientName}`,
          "success"
        );
        return result;
      } catch (e) {
        handleActionError(e, showToast);
        throw e;
      }
    },
    [refresh, showToast]
  );

  const donate = useCallback(
    async (cause: string, amount: number) => {
      try {
        const u = await impactDonationStub(cause, amount);
        setUser(u);
        setLedger(await fetchLedger());
        showToast(`💚 ${amount} $POCK pledged to ${cause}`, "success");
      } catch (e) {
        handleActionError(e, showToast);
      }
    },
    [showToast]
  );

  const connectWallet = useCallback(
    async (address: string) => {
      const u = await connectSolanaWallet(address);
      setUser(u);
      setLedger(await fetchLedger());
      showToast("Solana wallet linked — self-custodial mode", "success");
    },
    []
  );

  const requestRelease = useCallback(
    async (opts?: { amount?: number; destWallet?: string }) => {
      const result = await requestCustodyRelease(opts);
      await refresh();
      return result;
    },
    [refresh]
  );

  return (
    <PockContext.Provider
      value={{
        user,
        ledger,
        loading,
        ready,
        configured,
        reconciling,
        reconcile,
        createAccount,
        refresh,
        debitCalc,
        spendPremium: spendPremiumFn,
        sendPock,
        sendPockInvite,
        sendGiftInvite,
        withdraw,
        donate,
        connectWallet,
        requestRelease,
        canCalc: ready && canAffordCalc(user),
        historyUnlimited: isHistoryUnlimited(user),
        accountIdRevealed,
        hasRevealPassword,
        revealLoading,
        revealAccountId,
        setRevealPassword: setRevealPasswordFn,
        lockAccountId,
      }}
    >
      {children}
    </PockContext.Provider>
  );
}

function handleActionError(
  e: unknown,
  showToast: (
    msg: string,
    variant?: "success" | "info" | "warning" | "error"
  ) => void
) {
  const msg = e instanceof Error ? e.message : "action_failed";
  const messages: Record<string, string> = {
    insufficient_pock: "Not enough $POCK",
    recipient_required: "Enter a recipient ID",
    phone_required: "Enter a valid mobile number",
    address_required: "Enter a wallet address",
    amount_invalid: "Enter a valid amount",
    invite_failed: "Could not create invite",
    recipient_name_required: "Enter recipient name",
    wallet_not_connected: "Connect a Solana wallet first (Custody section)",
    wallet_address_invalid: "Enter a valid Solana wallet address",
    nothing_to_release: "No reserved $POCK to send",
  };
  showToast(messages[msg] ?? "Something went wrong", "error");
}

export function usePock(): PockContextValue {
  const ctx = useContext(PockContext);
  if (!ctx) throw new Error("usePock must be used within PockProvider");
  return ctx;
}
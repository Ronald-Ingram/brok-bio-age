"use client";

import { usePock } from "@/context/PockContext";
import {
  CUSTODY_CONNECT_CTA,
  CUSTODY_CREATE_WALLET_CTA,
  CUSTODY_LINK_ONLY_NOTE,
  CUSTODY_MONEY_FLOW_EXPLAINER,
  CUSTODY_ONCHAIN_DEX_NOTE,
  CUSTODY_RELEASE_AMOUNT_CTA,
  CUSTODY_RELEASE_FAILED_NOTE,
  CUSTODY_RELEASE_PENDING_NOTE,
  CUSTODY_RELEASE_SENT_NOTE,
  CUSTODY_RESERVED_EXPLAINER,
  CUSTODY_RESERVED_HEADLINE,
  CUSTODY_SELF_HEADLINE,
  CUSTODY_SOLANA_TO_GENIUS_NOTE,
  CUSTODY_VOLATILITY_NOTE,
} from "@/lib/custodyCopy";
import { AccountRestorePanel } from "@/components/AccountRestorePanel";
import { ensureAuthSession } from "@/lib/pockService";
import { getSupabase } from "@/lib/supabase/client";
import { isValidSolanaAddress, shortSolanaAddress } from "@/lib/custody";
import type { CustodySettlementResult } from "@/lib/pockService";
import { settlePendingCustodyReleases } from "@/lib/pockService";
import { POCK_ONCHAIN_DEX_URL } from "@/lib/purchaseConfig";
import { solscanTxUrl } from "@/lib/solanaPockTransfer";
import { ExternalLink, Link2, Loader2, Shield, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function settlementMessage(
  released: number,
  wallet: string,
  settlement?: CustodySettlementResult | null
): { tone: "ok" | "pending" | "error"; text: string; tx?: string } {
  if (settlement?.status === "sent" && settlement.txSignature) {
    return {
      tone: "ok",
      text: `Sent ${released} $POCK to ${shortSolanaAddress(wallet)}.`,
      tx: settlement.txSignature,
    };
  }
  if (settlement?.status === "failed") {
    return {
      tone: "error",
      text: settlement.error ?? CUSTODY_RELEASE_FAILED_NOTE,
    };
  }
  return {
    tone: "pending",
    text: `Releasing ${released} $POCK to ${shortSolanaAddress(wallet)}…`,
  };
}

export function CustodyStatusPanel() {
  const { user, ready, connectWallet, requestRelease, refresh } = usePock();
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releaseNote, setReleaseNote] = useState<{
    tone: "ok" | "pending" | "error";
    text: string;
    tx?: string;
  } | null>(null);
  const [walletOnChainBalance, setWalletOnChainBalance] = useState<number | null>(
    null
  );
  const [walletHint, setWalletHint] = useState<{
    accountSuffix?: string;
    accountCode?: string;
  } | null>(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [destOverride, setDestOverride] = useState("");
  const [useCustomDest, setUseCustomDest] = useState(false);

  const trySettlePending = useCallback(async () => {
    if (!user || user.on_chain_pock_balance < 1) return;
    setSettling(true);
    try {
      const results = await settlePendingCustodyReleases();
      const sent = results.find((r) => r.status === "sent" && r.txSignature);
      if (sent?.txSignature) {
        setReleaseNote({
          tone: "ok",
          text: `Settled ${sent.amountPock ?? ""} $POCK on-chain.`,
          tx: sent.txSignature,
        });
        await refresh();
      }
    } catch {
      /* signer may be unavailable in dev */
    } finally {
      setSettling(false);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (user?.on_chain_pock_balance && user.on_chain_pock_balance > 0) {
      void trySettlePending();
    }
  }, [user?.on_chain_pock_balance, trySettlePending]);

  useEffect(() => {
    if (!user?.solana_wallet_address) {
      setWalletOnChainBalance(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await ensureAuthSession();
        const supabase = getSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) return;
        const res = await fetch("/api/pock/on-chain-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { balanceUi?: number };
        if (!cancelled) setWalletOnChainBalance(Number(data.balanceUi ?? 0));
      } catch {
        /* RPC optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.solana_wallet_address, user?.on_chain_pock_balance]);

  useEffect(() => {
    if (user?.pock_balance != null && user.pock_balance > 0) {
      setReleaseAmount(String(user.pock_balance));
    }
  }, [user?.pock_balance]);

  if (!ready || !user) return null;

  const reserved = user.custody_status === "reserved";
  const hasWallet = Boolean(user.solana_wallet_address);
  const pendingOnChain = user.on_chain_pock_balance > 0;

  const handleConnect = async () => {
    setError(null);
    if (!isValidSolanaAddress(address)) {
      setError("Enter a valid Solana wallet address");
      return;
    }
    setConnecting(true);
    try {
      await connectWallet(address.trim());
      setAddress("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "connect_failed";
      if (msg === "wallet_already_linked") {
        setError("wallet_already_linked");
        void fetch("/api/pock/wallet-account-hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address.trim() }),
        })
          .then((r) => r.json())
          .then((d: { found?: boolean; accountSuffix?: string; accountCode?: string }) => {
            if (d.found)
              setWalletHint({
                accountSuffix: d.accountSuffix,
                accountCode: d.accountCode,
              });
          })
          .catch(() => null);
      } else if (msg === "wallet_address_invalid") {
        setError("Invalid Solana address");
      } else {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleRelease = async () => {
    setError(null);
    setReleaseNote(null);
    const n = parseInt(releaseAmount, 10);
    if (!Number.isFinite(n) || n < 1 || n > user.pock_balance) {
      setError(`Enter 1–${user.pock_balance} $POCK`);
      return;
    }
    const dest = useCustomDest ? destOverride.trim() : undefined;
    if (useCustomDest && !isValidSolanaAddress(dest ?? "")) {
      setError("Enter a valid destination Solana address");
      return;
    }
    setReleasing(true);
    try {
      const result = await requestRelease({
        amount: n,
        destWallet: dest,
      });
      setReleaseNote(
        settlementMessage(result.released, result.wallet, result.settlement)
      );
      await refresh();
      if (result.settlement?.status !== "sent") {
        await trySettlePending();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "release_failed";
      if (msg === "nothing_to_release") {
        setError("No reserved $POCK to release");
      } else if (msg === "wallet_not_connected") {
        setError("Connect a Solana wallet first");
      } else if (msg === "amount_invalid") {
        setError(`Enter 1–${user.pock_balance} $POCK`);
      } else {
        setError(msg);
      }
    } finally {
      setReleasing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl border p-2.5 ${
            reserved
              ? "border-amber-400/30 bg-amber-400/10"
              : "border-emerald-400/30 bg-emerald-400/10"
          }`}
        >
          {reserved ? (
            <Shield className="h-5 w-5 text-amber-300" />
          ) : (
            <Wallet className="h-5 w-5 text-emerald-300" />
          )}
        </div>
        <div className="space-y-1 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Custody status
          </p>
          <h2 className="text-lg font-semibold text-white/90">
            {reserved ? CUSTODY_RESERVED_HEADLINE : CUSTODY_SELF_HEADLINE}
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">
            {CUSTODY_RESERVED_EXPLAINER}
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed border-l-2 border-white/10 pl-3 mt-2">
            {CUSTODY_MONEY_FLOW_EXPLAINER}
          </p>
          <p className="text-[11px] text-amber-200/70 leading-relaxed">
            {CUSTODY_LINK_ONLY_NOTE}
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            {CUSTODY_VOLATILITY_NOTE}{" "}
            <a
              href={POCK_ONCHAIN_DEX_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:underline"
            >
              Buy on-chain
            </a>
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Reserved balance
          </p>
          <p className="text-2xl font-semibold tabular-nums text-neon-cyan mt-1">
            {user.pock_balance}
            <span className="text-sm text-white/40 ml-1">$POCK</span>
          </p>
          <p className="text-[11px] text-white/40 mt-1">Spendable inside BROK</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            {pendingOnChain ? "Pending on-chain" : "Solana wallet"}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-white/80 mt-1">
            {pendingOnChain ? (
              <>
                {user.on_chain_pock_balance}
                <span className="text-sm text-white/40 ml-1">$POCK</span>
              </>
            ) : (
              <span className="text-base font-mono text-white/55">
                {hasWallet
                  ? shortSolanaAddress(user.solana_wallet_address)
                  : "Not linked"}
              </span>
            )}
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            {pendingOnChain
              ? settling
                ? "Settling transfer…"
                : "Awaiting treasury SPL transfer"
              : hasWallet
                ? walletOnChainBalance != null
                  ? `${walletOnChainBalance.toLocaleString()} $POCK on-chain (Phantom/DEX)`
                  : "Linked — tap Move on-chain to send reserved $POCK"
                : "Connect to receive on-chain $POCK"}
          </p>
        </div>
      </div>

      {hasWallet && !reserved && (
        <p className="text-[11px] text-white/45 leading-relaxed rounded-lg border border-white/8 bg-black/20 px-3 py-2">
          Linked:{" "}
          <span className="font-mono text-white/60">
            {user.solana_wallet_address}
          </span>
        </p>
      )}

      {reserved && (
        <div className="space-y-3 rounded-xl border border-white/8 bg-black/20 p-4">
          <p className="text-xs text-white/55 flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-neon-cyan" />
            {CUSTODY_CONNECT_CTA}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Solana wallet address (base58)"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-neon-cyan/40 font-mono"
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/12 px-5 py-2.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/22 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Connect
            </button>
          </div>
          <button
            type="button"
            disabled
            className="text-[11px] text-white/35 cursor-not-allowed"
            title="Coming soon"
          >
            {CUSTODY_CREATE_WALLET_CTA}
          </button>
        </div>
      )}

      {!reserved && hasWallet && user.pock_balance > 0 && (
        <div className="space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-xs text-white/55">Send reserved $POCK on-chain (partial or full)</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={user.pock_balance}
              value={releaseAmount}
              onChange={(e) => setReleaseAmount(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-400/40"
            />
            <button
              type="button"
              onClick={() => setReleaseAmount(String(user.pock_balance))}
              className="shrink-0 px-3 py-2 rounded-lg border border-white/15 text-xs text-white/55 hover:border-emerald-400/40"
            >
              Max
            </button>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-white/45 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomDest}
              onChange={(e) => setUseCustomDest(e.target.checked)}
              className="rounded border-white/20"
            />
            Send to a different Solana wallet (not my linked wallet)
          </label>
          {useCustomDest && (
            <input
              type="text"
              value={destOverride}
              onChange={(e) => setDestOverride(e.target.value)}
              placeholder="Destination Solana address"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-400/40"
            />
          )}
          <button
            type="button"
            onClick={handleRelease}
            disabled={releasing || settling}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"
          >
            {releasing || settling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {releaseAmount && parseInt(releaseAmount, 10) > 0
              ? CUSTODY_RELEASE_AMOUNT_CTA(parseInt(releaseAmount, 10))
              : "Move $POCK on-chain"}
          </button>
          <p className="text-[11px] text-white/40">{CUSTODY_ONCHAIN_DEX_NOTE}</p>
          <a
            href={POCK_ONCHAIN_DEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-neon-cyan hover:underline"
          >
            View $POCK on DexScreener
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {hasWallet && !reserved && (
        <p className="text-[11px] text-white/35 border-l-2 border-white/10 pl-3">
          {CUSTODY_SOLANA_TO_GENIUS_NOTE}
        </p>
      )}

      {pendingOnChain && !releaseNote && (
        <button
          type="button"
          onClick={() => void trySettlePending()}
          disabled={settling}
          className="text-xs text-neon-cyan hover:underline disabled:opacity-50"
        >
          {settling ? "Settling…" : "Retry on-chain settlement"}
        </button>
      )}

      {releaseNote && (
        <p
          className={`text-sm border rounded-lg px-3 py-2 ${
            releaseNote.tone === "ok"
              ? "text-emerald-300/90 border-emerald-400/20 bg-emerald-400/5"
              : releaseNote.tone === "error"
                ? "text-red-300/90 border-red-400/20 bg-red-400/5"
                : "text-amber-200/90 border-amber-400/20 bg-amber-400/5"
          }`}
        >
          {releaseNote.text}
          {releaseNote.tone === "ok" && (
            <span className="block text-[11px] text-white/45 mt-1">
              {CUSTODY_RELEASE_SENT_NOTE}
            </span>
          )}
          {releaseNote.tone === "pending" && (
            <span className="block text-[11px] text-white/45 mt-1">
              {CUSTODY_RELEASE_PENDING_NOTE}
            </span>
          )}
          {releaseNote.tx && (
            <a
              href={solscanTxUrl(releaseNote.tx)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-neon-cyan hover:underline mt-2"
            >
              View on Solscan
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </p>
      )}

      {error === "wallet_already_linked" && (
        <AccountRestorePanel
          walletAddress={address.trim() || user.solana_wallet_address || undefined}
          accountSuffixHint={walletHint?.accountSuffix}
          accountCodeHint={walletHint?.accountCode}
        />
      )}

      {error && error !== "wallet_already_linked" && (
        <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
          {error}
        </p>
      )}
    </section>
  );
}
"use client";

import { CustodyStatusPanel } from "@/components/CustodyStatusPanel";
import { GeniusSubWalletsPanel } from "@/components/GeniusSubWalletsPanel";
import { NeoWalletProductsPanel } from "@/components/NeoWalletProductsPanel";
import { NeoWalletServicesPanel } from "@/components/NeoWalletServicesPanel";
import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { PockOgClaimPanel } from "@/components/PockOgClaimPanel";
import { PockPriceTicker } from "@/components/PockPriceTicker";
import {
  GENIUS_WALLET_SUBTITLE,
  GENIUS_WALLET_TITLE,
} from "@/lib/geniusWalletCopy";
import {
  NEO_WALLET_SUBTITLE,
  NEO_WALLET_TITLE,
} from "@/lib/neoWalletCatalog";
import { usePock } from "@/context/PockContext";
import { AccountIdentity } from "@/components/AccountIdentity";
import { AccountRestorePanel } from "@/components/AccountRestorePanel";
import { TransactionHistorySection } from "@/components/TransactionHistorySection";
import {
  FREE_TIER_BENEFITS,
  PREMIUM_PRIZE_POOL_POCK,
  tierDisplayName,
} from "@/lib/subscriptionConfig";
import { FREE_TIER_COPY } from "@/lib/freeReport";
import type { PockInviteResult } from "@/lib/pockService";
import { totalSpendablePock } from "@/lib/pockService";
import { usePockMarketQuote } from "@/hooks/usePockMarketQuote";
import { balanceUsdValue } from "@/lib/pockPrice";
import {
  formatUsd,
  usdToPock,
} from "@/lib/purchaseConfig";
import { DigitalAssetDisclaimer } from "@/components/DigitalAssetDisclaimer";
import { GiftOneLinkTip } from "@/components/GiftOneLinkTip";
import { GiftShareActions } from "@/components/GiftShareActions";
import { formatGiftSmsMessage } from "@/lib/giftPockMessage";
import { motion } from "framer-motion";
import { Gift, Loader2, Send, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ActionPanel = "send" | "withdraw" | "gift" | null;

export interface WalletPanelProps {
  /** genius = Genius Wallet branding; neo = legacy BROK Neo-Wallet label */
  variant?: "genius" | "neo";
  /** Hide title block when the parent page supplies its own hero */
  hideHeader?: boolean;
}

export function WalletPanel({
  variant = "neo",
  hideHeader = false,
}: WalletPanelProps) {
  const isGenius = variant === "genius";
  const walletTitle = isGenius ? GENIUS_WALLET_TITLE : NEO_WALLET_TITLE;
  const walletSubtitle = isGenius ? GENIUS_WALLET_SUBTITLE : NEO_WALLET_SUBTITLE;
  const balanceLabel = isGenius ? "Genius Wallet balance" : "Neo-Wallet balance";
  const {
    user,
    ready,
    loading,
    configured,
    createAccount,
    sendPockInvite,
    sendGiftInvite,
    withdraw,
  } = usePock();

  const [panel, setPanel] = useState<ActionPanel>(null);
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientWallet, setRecipientWallet] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("10");
  const [usdAmount, setUsdAmount] = useState("2.00");
  const [giftName, setGiftName] = useState("");
  const [giftPhone, setGiftPhone] = useState("");
  const [giftRecipientId, setGiftRecipientId] = useState("");
  const [inviteResult, setInviteResult] = useState<PockInviteResult | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [pendingClaimUrl, setPendingClaimUrl] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { usdPerPock, quoteLabel, loading: quoteLoading } = usePockMarketQuote();

  useEffect(() => {
    const n = parseInt(amount, 10);
    if (panel === "gift" && Number.isFinite(n) && n > 0) {
      setUsdAmount(balanceUsdValue(n, usdPerPock).toFixed(2));
    }
  }, [usdPerPock, amount, panel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const claimToken = params.get("claim");
    if (claimToken) {
      setPendingClaimUrl(`/claim?token=${encodeURIComponent(claimToken)}`);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading wallet…
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-neon-cyan/20 bg-bg-card p-10 text-center space-y-4"
      >
        <Wallet className="w-12 h-12 text-neon-cyan mx-auto opacity-80" />
        <div>
          <h2 className="text-xl font-semibold">{walletTitle}</h2>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            Use the welcome panel: <strong className="text-white/70">I&apos;m new</strong>{" "}
            or <strong className="text-white/70">I already have a wallet</strong>. We no
            longer auto-create a trial on every visit.
          </p>
        </div>
        {!configured && (
          <p className="text-sm text-amber-400/90 border border-amber-400/20 rounded-lg px-4 py-3 bg-amber-400/5">
            Wallet backend not configured on this deployment — contact support.
          </p>
        )}
      </motion.section>
    );
  }

  const resetForm = () => {
    setPanel(null);
    setConfirming(false);
    setSubmitting(false);
    setGiftError(null);
    setRecipient("");
    setPhone("");
    setRecipientWallet("");
    setAddress("");
    setAmount("10");
    setUsdAmount("2.00");
    setGiftName("");
    setGiftPhone("");
    setGiftRecipientId("");
    setInviteResult(null);
  };

  const spendable = totalSpendablePock(user);

  const syncUsdFromPock = (pockStr: string) => {
    setAmount(pockStr);
    const n = parseInt(pockStr, 10);
    if (Number.isFinite(n) && n > 0) {
      setUsdAmount(balanceUsdValue(n, usdPerPock).toFixed(2));
    }
  };

  const syncPockFromUsd = (usdStr: string) => {
    setUsdAmount(usdStr);
    const n = parseFloat(usdStr);
    if (Number.isFinite(n) && n > 0) {
      setAmount(String(usdToPock(n, usdPerPock)));
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setGiftError(null);
    const n = parseInt(amount, 10);
    try {
      if (panel === "send") {
        if (!recipient.trim() || recipient.trim().length < 2) {
          setGiftError("Enter the recipient's name.");
          setSubmitting(false);
          return;
        }
        const result = await sendPockInvite({
          amount: n,
          recipientName: recipient.trim(),
          phone: phone.trim() || undefined,
          recipientBrokId: giftRecipientId.trim() || undefined,
        });
        setInviteResult(result);
        setConfirming(false);
        return;
      } else if (panel === "gift") {
        const result = await sendGiftInvite({
          amount: n,
          usdEquivalent: parseFloat(usdAmount) || balanceUsdValue(n, usdPerPock),
          recipientName: giftName.trim(),
          phone: giftPhone.trim() || undefined,
          recipientBrokId: giftRecipientId.trim() || undefined,
        });
        setInviteResult(result);
        setConfirming(false);
        return;
      } else if (panel === "withdraw") {
        await withdraw(address.trim(), n);
      }
      resetForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "action_failed";
      const friendly: Record<string, string> = {
        insufficient_pock: "Not enough $POCK for this transfer.",
        recipient_name_required: "Enter the recipient's name.",
        recipient_not_found:
          "BROK account code not found. Use their exact Genius Wallet code (e.g. BROK-BD66A7B6), or leave blank and share the claim link.",
        cannot_send_to_self: "That account code is this wallet.",
        invite_failed: "Could not create transfer — try again.",
        auth_required: "Session expired — refresh the page.",
      };
      if (panel === "gift" || panel === "send") {
        setGiftError(
          friendly[msg] ??
            (panel === "send"
              ? "Could not send — try again."
              : "Could not send gift — try again.")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-white/90">
            {walletTitle}
          </h2>
          <p className="text-sm text-white/45">{walletSubtitle}</p>
        </header>
      )}

      {pendingClaimUrl && (
        <section className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/8 px-4 py-3 text-sm text-white/75 space-y-1">
          <p className="font-medium text-neon-cyan/90">Finish claiming your gift</p>
          <p>
            Create your free account below if needed, copy your BROK user ID from
            this wallet, then return to the claim page.
          </p>
          <Link href={pendingClaimUrl} className="text-neon-cyan hover:underline text-xs">
            Return to claim page →
          </Link>
        </section>
      )}

      {/* Balance hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-neon-cyan/25 bg-gradient-to-br from-neon-cyan/8 via-bg-card to-bg-card p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
              {balanceLabel}
            </p>
            <p className="text-5xl font-semibold tabular-nums text-neon-cyan">
              {user.pock_balance}
              <span className="text-2xl text-white/40 ml-2">$POCK</span>
            </p>
            {(user.subscription_active || user.subscription_tier === "pock_og") && (
              <p className="text-sm text-emerald-400/90 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {tierDisplayName(user.subscription_tier)} ·{" "}
                {user.included_pock_remaining}/{user.included_pock_allowance}{" "}
                included $POCK/mo
              </p>
            )}
          </div>
          <div className="text-right text-sm text-white/40 space-y-1">
            <AccountIdentity variant="card" />
            <p>{user.calc_count} calculations run</p>
            {user.subscription_renews_at && (
              <p>
                Renews{" "}
                {new Date(user.subscription_renews_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {/* Primary actions — forms open immediately below (not buried under products) */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setPanel(panel === "gift" ? null : "gift");
            setConfirming(false);
          }}
          className={`w-full rounded-2xl border p-4 sm:p-5 text-left transition-colors ${
            panel === "gift"
              ? "border-neon-cyan/60 bg-neon-cyan/15 shadow-[0_0_24px_rgba(0,249,255,0.12)]"
              : "border-neon-cyan/40 bg-gradient-to-r from-neon-cyan/12 via-bg-card to-bg-card hover:border-neon-cyan/55"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-cyan/20 border border-neon-cyan/35">
              <Gift className="h-5 w-5 text-neon-cyan" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-white/95">Gift Credits</p>
              <p className="text-xs text-neon-cyan/80 mt-0.5">
                Sharing is caring
              </p>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "send" ? null : "send");
              setConfirming(false);
            }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              panel === "send"
                ? "border-neon-cyan/50 bg-neon-cyan/10"
                : "border-white/10 bg-bg-card hover:border-white/20"
            }`}
          >
            <Send className="w-5 h-5 mb-2 text-white/60" />
            <p className="text-xs font-medium text-white/80">Send to User</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "withdraw" ? null : "withdraw");
              setConfirming(false);
            }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              panel === "withdraw"
                ? "border-neon-cyan/50 bg-neon-cyan/10"
                : "border-white/10 bg-bg-card hover:border-white/20"
            }`}
          >
            <Wallet className="w-5 h-5 mb-2 text-white/60" />
            <p className="text-xs font-medium text-white/80">Withdraw</p>
          </button>
        </div>
      </section>

      {/* Expanded forms right under buttons so taps clearly open UI */}
      {panel && (panel === "gift" || panel === "send" || panel === "withdraw") && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-bg-card p-6 space-y-4"
        >
          {panel === "send" && (
            <>
              <h3 className="text-sm font-medium text-white/70">Send $POCK</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Same simple flow as Gift: enter a name, create a private link.
                If they already have BROK and open the link while signed in, the
                $POCK is added to their existing Genius Wallet. Optional BROK
                account ID credits them instantly (no link needed).
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  Recipient name (required)
                </span>
                <input
                  type="text"
                  placeholder="Friend or family name"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="bio-field__control w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  Mobile phone (optional — pre-fills Text message)
                </span>
                <input
                  type="tel"
                  placeholder="Optional"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bio-field__control w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  BROK account code (optional — instant credit)
                </span>
                <input
                  type="text"
                  placeholder="e.g. BROK-BD66A7B6"
                  value={giftRecipientId}
                  onChange={(e) => setGiftRecipientId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none font-mono text-xs"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <p className="text-[10px] text-white/35 leading-snug">
                  Paste their Genius Wallet code exactly (BROK-XXXXXXXX). Instantly
                  credits their existing wallet when found.
                </p>
              </label>
              {inviteResult && (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-3 space-y-2 text-xs text-white/70">
                  <p className="font-medium text-emerald-400/90">
                    {(inviteResult as { instantCredit?: boolean }).instantCredit
                      ? "Credited to their existing account"
                      : inviteResult.smsSent
                        ? "Send ready — SMS sent"
                        : "Send ready — share the link"}
                  </p>
                  {inviteResult.smsError && (
                    <p className="text-amber-400/90">
                      SMS failed ({inviteResult.smsError}) — copy the link below.
                    </p>
                  )}
                  <p>
                    <span className="text-white/45">Claim link:</span>{" "}
                    <a
                      href={
                        inviteResult.giftUrl ??
                        inviteResult.claimUrl
                      }
                      className="text-neon-cyan break-all hover:underline"
                    >
                      {inviteResult.giftUrl ?? inviteResult.claimUrl}
                    </a>
                  </p>
                  <p className="text-white/45 whitespace-pre-wrap">
                    {inviteResult.shareMessage ?? inviteResult.smsHint}
                  </p>
                </div>
              )}
            </>
          )}

          {panel === "withdraw" && (
            <>
              <h3 className="text-sm font-medium text-white/70">
                Send $POCK to any Solana wallet
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                SPL transfer from Neobanx treasury — usually confirms within a
                minute. Requires a linked Solana wallet on your account
                (Custody section). Specify amount below; recipient can be any
                valid Solana address.
              </p>
              {user.custody_status === "reserved" && (
                <p className="text-xs text-amber-300/90 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
                  Connect a Solana wallet in Custody before sending on-chain.
                </p>
              )}
              <input
                type="text"
                placeholder="Solana wallet address (base58)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none font-mono"
              />
            </>
          )}

          {panel === "gift" && (
            <>
              <h3 className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                Gift Credits
                <GiftOneLinkTip variant="tip" />
              </h3>
              <p className="text-xs text-neon-cyan/75 font-medium">
                Sharing is caring
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                Send $POCK as a gift. Your recipient gets one private link — they
                open it, create a free Genius Wallet, and the gift credits
                automatically.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  Recipient name (required)
                </span>
                <input
                  type="text"
                  placeholder="Friend or family name"
                  value={giftName}
                  onChange={(e) => setGiftName(e.target.value)}
                  className="bio-field__control w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  Mobile phone (optional — pre-fills Text message)
                </span>
                <input
                  type="tel"
                  placeholder="Optional — for one-tap Text after gift is created"
                  value={giftPhone}
                  onChange={(e) => setGiftPhone(e.target.value)}
                  className="bio-field__control w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-white/45 uppercase tracking-wide">
                  BROK account code (optional — instant credit)
                </span>
                <input
                  type="text"
                  placeholder="e.g. BROK-BD66A7B6"
                  value={giftRecipientId}
                  onChange={(e) => setGiftRecipientId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm focus:border-neon-cyan/40 outline-none font-mono text-xs"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs text-white/45 uppercase tracking-wide">
                    $POCK amount
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={spendable}
                    value={amount}
                    onChange={(e) => syncUsdFromPock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm tabular-nums focus:border-neon-cyan/40 outline-none"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-white/45 uppercase tracking-wide">
                    USD equivalent
                  </span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={usdAmount}
                    onChange={(e) => syncPockFromUsd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm tabular-nums focus:border-neon-cyan/40 outline-none"
                  />
                </label>
              </div>
              <p className="text-[11px] text-white/35">
                Delayed {quoteLabel} quote{" "}
                {quoteLoading ? "…" : formatUsd(usdPerPock)}/$POCK · spendable
                balance {spendable} $POCK
              </p>
              <DigitalAssetDisclaimer compact />
              {inviteResult?.inviteKind === "gift" && (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-3 space-y-2 text-xs text-white/70">
                  <GiftOneLinkTip />
                  <p className="font-medium text-emerald-400/90">
                    {inviteResult.smsSent
                      ? `Gift SMS sent to ${inviteResult.recipientName}`
                      : `Gift ready — share via SMS to ${inviteResult.recipientName}`}
                  </p>
                  {inviteResult.smsError && (
                    <p className="text-amber-400/90">
                      SMS failed ({inviteResult.smsError}) — copy the text below
                      manually.
                    </p>
                  )}
                  <p>
                    <span className="text-white/45">Gift link:</span>{" "}
                    <a
                      href={
                        inviteResult.giftUrl ??
                        inviteResult.registerUrl ??
                        inviteResult.claimUrl
                      }
                      className="text-neon-cyan break-all hover:underline"
                    >
                      {inviteResult.giftUrl ??
                        inviteResult.registerUrl ??
                        inviteResult.claimUrl}
                    </a>
                  </p>
                  <p className="text-white/45 whitespace-pre-wrap">
                    {inviteResult.smsHint}
                  </p>
                  {inviteResult.shareMessage && (
                    <GiftShareActions
                      compact
                      shareText={inviteResult.shareMessage}
                      smsText={formatGiftSmsMessage({
                        recipientName: inviteResult.recipientName ?? giftName,
                        amount: inviteResult.amount,
                        usdEquivalent: inviteResult.usdEquivalent,
                        quoteSource: inviteResult.quoteSource ?? null,
                        giftUrl:
                          inviteResult.giftUrl ??
                          inviteResult.registerUrl ??
                          inviteResult.claimUrl,
                        senderName: inviteResult.senderName ?? undefined,
                        personalMessage: inviteResult.personalMessage ?? undefined,
                      })}
                      giftUrl={
                        inviteResult.giftUrl ??
                        inviteResult.registerUrl ??
                        inviteResult.claimUrl
                      }
                      recipientName={inviteResult.recipientName ?? giftName}
                      phone={giftPhone.trim() || inviteResult.phone}
                      email={inviteResult.email}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {panel !== "gift" && (
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <label className="flex-1">
              <span className="text-xs text-white/40 block mb-1.5">Amount</span>
              <input
                type="number"
                min={1}
                max={spendable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm tabular-nums focus:border-neon-cyan/40 outline-none"
              />
            </label>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={
                  !amount ||
                  parseInt(amount, 10) < 1 ||
                  parseInt(amount, 10) > spendable ||
                  (panel === "send" && phone.replace(/\D/g, "").length < 10) ||
                  (panel === "withdraw" && !address.trim())
                }
                className="px-6 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-40 transition-colors"
              >
                Review
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            )}
          </div>
          )}

          {panel === "gift" && (
            <div className="flex gap-2 justify-end">
              {!confirming ? (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={
                    !amount ||
                    parseInt(amount, 10) < 1 ||
                    parseInt(amount, 10) > spendable ||
                    giftName.trim().length < 2
                  }
                  className="px-6 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-40 transition-colors"
                >
                  Review gift
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send gift"
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {giftError && (panel === "gift" || panel === "send") && (
            <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
              {giftError}
            </p>
          )}

          {confirming && (
            <p className="text-xs text-amber-400/80 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
              {panel === "gift" ? (
                <>
                  You&apos;re gifting {amount} $POCK
                  {usdAmount
                    ? ` (${formatUsd(parseFloat(usdAmount) || balanceUsdValue(parseInt(amount, 10), usdPerPock))} USD)`
                    : ""}{" "}
                  to {giftName.trim()}. Balance updates immediately; then tap
                  Text message to send from your phone.
                </>
              ) : (
                <>
                  You&apos;re about to spend {amount} $POCK. Balance will update
                  immediately after confirmation.
                </>
              )}
            </p>
          )}
        </motion.section>
      )}

      {/* Sync other devices — collapsed by default */}
      <AccountRestorePanel defaultOpen={false} />

      <NeoWalletProductsPanel featured={isGenius} />

      <PockPriceTicker user={user} />

      {isGenius && <CustodyStatusPanel />}

      {isGenius && <GeniusSubWalletsPanel />}

      <NeoWalletServicesPanel user={user} />

      <PockOgClaimPanel />

      {!user.subscription_active && user.subscription_tier !== "pock_og" && (
        <section className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/55 space-y-1">
          <p className="font-medium text-white/75">Free tier</p>
          <p>{FREE_TIER_COPY.label}</p>
          <p>
            Additional reports: {FREE_TIER_BENEFITS.historyPreviewEntries}{" "}
            preview entries in trends · subscribe to save full history.
          </p>
        </section>
      )}

      {user.subscription_tier === "premium" && (
        <section className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-4 py-3 text-xs text-white/60 space-y-1">
          <p className="font-medium text-neon-cyan/90">Pro prize eligibility</p>
          <p>
            {PREMIUM_PRIZE_POOL_POCK.toLocaleString()} $POCK pool for largest
            verified chrono − BROK bio-age delta. Winners may need notarized or
            third-party lab validation; names and rankings may be published
            promotionally.
          </p>
        </section>
      )}

      <TransactionHistorySection />

      <PockAssetDisclaimer className="text-center" />
    </div>
  );
}
"use client";

import { DigitalAssetDisclaimer } from "@/components/DigitalAssetDisclaimer";
import { GiftOneLinkTip } from "@/components/GiftOneLinkTip";
import { usePock } from "@/context/PockContext";
import { formatGiftShareMessage, formatGiftSmsMessage } from "@/lib/giftPockMessage";
import {
  GIFT_POCK_CLAIM_EXPLAINER,
  GIFT_POCK_HEADLINE,
  GIFT_POCK_SUBLINE,
} from "@/lib/geniusWalletCopy";
import { usePockMarketQuote } from "@/hooks/usePockMarketQuote";
import { balanceUsdValue } from "@/lib/pockPrice";
import { formatUsd, usdToPock } from "@/lib/purchaseConfig";
import { totalSpendablePock } from "@/lib/pockService";
import type { PockInviteResult } from "@/lib/pockService";
import { GiftShareActions } from "@/components/GiftShareActions";
import { Gift, Loader2, Mail, MessageSquare, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function GiftPockSection() {
  const { user, ready, loading, configured, createAccount, sendGiftInvite } =
    usePock();

  const [recipientName, setRecipientName] = useState("");
  const [contact, setContact] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [amount, setAmount] = useState("25");
  const [usdAmount, setUsdAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PockInviteResult | null>(null);
  const { usdPerPock, quoteLabel, loading: quoteLoading } = usePockMarketQuote();
  const spendable = totalSpendablePock(user);
  const contactIsEmail = isEmail(contact);

  useEffect(() => {
    const n = parseInt(amount, 10);
    if (Number.isFinite(n) && n > 0) {
      setUsdAmount(balanceUsdValue(n, usdPerPock).toFixed(2));
    }
  }, [usdPerPock, amount]);

  const shareInput = useMemo(() => {
    if (!result) return null;
    return {
      recipientName: result.recipientName ?? recipientName,
      amount: result.amount,
      usdEquivalent: result.usdEquivalent,
      quoteSource: result.quoteSource ?? null,
      giftUrl: result.giftUrl ?? result.registerUrl ?? result.claimUrl,
      senderName: result.senderName ?? "Ronald Ingram",
      personalMessage: result.personalMessage ?? personalMessage,
    };
  }, [result, recipientName, personalMessage]);

  const shareText = useMemo(
    () => (shareInput ? formatGiftShareMessage(shareInput) : ""),
    [shareInput]
  );

  const smsText = useMemo(
    () => (shareInput ? formatGiftSmsMessage(shareInput) : ""),
    [shareInput]
  );

  const syncUsdFromPock = (pock: string) => {
    setAmount(pock);
    const n = parseInt(pock, 10);
    if (Number.isFinite(n) && n > 0) {
      setUsdAmount(balanceUsdValue(n, usdPerPock).toFixed(2));
    }
  };

  const syncPockFromUsd = (usd: string) => {
    setUsdAmount(usd);
    const n = parseFloat(usd);
    if (Number.isFinite(n) && n > 0) setAmount(String(usdToPock(n, usdPerPock)));
  };

  const submit = async () => {
    setError(null);
    setResult(null);
    const n = parseInt(amount, 10);
    if (!recipientName.trim() || recipientName.trim().length < 2) {
      setError("Enter the recipient's name");
      return;
    }
    if (
      contact.trim() &&
      !contactIsEmail &&
      contact.replace(/\D/g, "").length < 10
    ) {
      setError("Enter a valid mobile number or email");
      return;
    }
    if (!Number.isFinite(n) || n < 1) {
      setError("Enter a $POCK amount of at least 1");
      return;
    }

    setSubmitting(true);
    try {
      if (!ready) await createAccount();
      const invite = await sendGiftInvite({
        amount: n,
        usdEquivalent: parseFloat(usdAmount) || balanceUsdValue(n, usdPerPock),
        recipientName: recipientName.trim(),
        phone: contactIsEmail ? "" : contact.trim(),
        email: contactIsEmail ? contact.trim() : undefined,
        personalMessage: personalMessage.trim() || undefined,
      });
      setResult(invite);
    } catch (e) {
      setError(e instanceof Error ? e.message : "gift_failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <section className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-6 text-sm text-amber-200/90">
        Wallet services are not configured yet — add Supabase keys before inner
        circle gifting.
      </section>
    );
  }

  return (
    <section
      id="gift-pock"
      className="rounded-2xl border border-neon-cyan/25 bg-gradient-to-br from-neon-cyan/6 via-bg-card to-bg-card p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 p-3">
          <Gift className="h-6 w-6 text-neon-cyan" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-1.5">
            {GIFT_POCK_HEADLINE}
            <GiftOneLinkTip variant="tip" />
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">{GIFT_POCK_SUBLINE}</p>
          <p className="text-xs text-white/40 leading-relaxed pt-1">
            {GIFT_POCK_CLAIM_EXPLAINER}
          </p>
          <p className="text-[11px] text-white/40 flex items-center gap-1.5 pt-1">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            After creating the gift, tap Text message to send from your phone — no
            third-party SMS signup required.
          </p>
        </div>
      </div>

      {!result ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-white/45">
              Recipient name
            </span>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Who is this for?"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-neon-cyan/40"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-2">
              {contactIsEmail ? (
                <Mail className="h-3.5 w-3.5" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              Mobile or email (optional — pre-fills Text / Email)
            </span>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Optional — for one-tap Text or Email"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-neon-cyan/40"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Personal message (optional)
            </span>
            <textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={3}
              placeholder="A short note they'll see when claiming…"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm resize-y outline-none focus:border-neon-cyan/40"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/45">
              $POCK amount
            </span>
            <input
              type="number"
              min={1}
              max={spendable || undefined}
              value={amount}
              onChange={(e) => syncUsdFromPock(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm tabular-nums outline-none focus:border-neon-cyan/40"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/45">
              USD equivalent
            </span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={
                usdAmount ||
                (amount
                  ? balanceUsdValue(parseInt(amount, 10) || 0, usdPerPock).toFixed(2)
                  : "")
              }
              onChange={(e) => syncPockFromUsd(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm tabular-nums outline-none focus:border-neon-cyan/40"
            />
          </label>

          {user && (
            <p className="text-[11px] text-white/40 sm:col-span-2">
              Spendable balance: {spendable} $POCK · delayed {quoteLabel} quote{" "}
              {quoteLoading ? "…" : formatUsd(usdPerPock)}/$POCK
            </p>
          )}

          <div className="sm:col-span-2 space-y-3">
            <DigitalAssetDisclaimer />
            <button
              type="button"
              onClick={submit}
              disabled={submitting || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-6 py-3.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {submitting ? "Creating gift…" : "Create gift link"}
            </button>
            {error && (
              <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <GiftOneLinkTip />
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4 space-y-2 text-sm">
            <p className="font-medium text-emerald-300/95">
              Gift ready for {result.recipientName}
              {result.smsSent
                ? " — sent via server SMS"
                : " — share using the buttons below"}
            </p>
            <p>
              <span className="text-white/45">Gift link:</span>{" "}
              <a
                href={result.giftUrl ?? result.registerUrl ?? result.claimUrl}
                className="text-neon-cyan break-all hover:underline"
              >
                {result.giftUrl ?? result.registerUrl ?? result.claimUrl}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
            <p className="text-xs uppercase tracking-wide text-white/40">
              Message to share
            </p>
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
              {shareText}
            </pre>
            <GiftShareActions
              shareText={shareText}
              smsText={smsText}
              giftUrl={result.giftUrl ?? result.registerUrl ?? result.claimUrl}
              recipientName={result.recipientName ?? recipientName}
              phone={contactIsEmail ? null : contact.trim() || result.phone}
              email={contactIsEmail ? contact.trim() : result.email}
            />
          </div>

          <DigitalAssetDisclaimer />
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="text-xs text-white/45 hover:text-neon-cyan underline"
          >
            Send another gift
          </button>
        </div>
      )}
    </section>
  );
}
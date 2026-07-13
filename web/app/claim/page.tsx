"use client";

import { DigitalAssetDisclaimer } from "@/components/DigitalAssetDisclaimer";
import { formatUsd } from "@/lib/purchaseConfig";
import { giftClaimRegisterUrl } from "@/lib/giftPockMessage";
import { Dna, Gift, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type ClaimMethod = "brok_id" | "wallet" | "password";

interface InviteInfo {
  kind: "transfer" | "gift";
  amount: number;
  usdEquivalent: number | null;
  recipientName: string | null;
  personalMessage: string | null;
  senderName: string | null;
}

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [method, setMethod] = useState<ClaimMethod>("password");
  const [brokUserId, setBrokUserId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(Boolean(token));
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registerUrl = token ? giftClaimRegisterUrl(token) : "/genius-wallet";

  useEffect(() => {
    if (!token) return;
    setInfoLoading(true);
    fetch(`/api/pock/invite-info?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as InviteInfo;
      })
      .then((data) => {
        if (data?.kind === "gift") {
          router.replace(`/genius-wallet?claim=${encodeURIComponent(token)}`);
          return;
        }
        setInviteInfo(data);
      })
      .catch(() => setInviteInfo(null))
      .finally(() => setInfoLoading(false));
  }, [token, router]);

  const submit = async () => {
    if (!token) {
      setError("Missing invite token in link");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pock/claim-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          method,
          brokUserId: method === "brok_id" ? brokUserId.trim() : undefined,
          walletAddress: method === "wallet" ? walletAddress.trim() : undefined,
          claimPassword: method === "password" ? claimPassword.trim() : undefined,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "claim_failed");
      setMessage(data.message ?? "Claim submitted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "claim_failed");
    } finally {
      setLoading(false);
    }
  };

  const isGift = inviteInfo?.kind === "gift";
  const sender = inviteInfo?.senderName ?? "Ronald Ingram";

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-6">
        {isGift ? (
          <Gift className="w-8 h-8 text-neon-cyan" />
        ) : (
          <Dna className="w-8 h-8 text-neon-cyan" />
        )}
        <div>
          <h1 className="text-xl font-semibold">
            {isGift ? "Claim your $POCK gift" : "Claim $POCK"}
          </h1>
          <p className="text-sm text-white/45">
            Free BROK ID · no KYC · under a minute
          </p>
        </div>
      </header>

      {!token && (
        <p className="text-sm text-amber-400/90 border border-amber-400/20 rounded-xl px-4 py-3 bg-amber-400/5">
          Invalid or missing invite link. Ask the sender to resend from Genius
          Wallet.
        </p>
      )}

      {token && infoLoading && (
        <div className="flex items-center gap-2 text-sm text-white/40 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading gift…
        </div>
      )}

      {token && inviteInfo && (
        <section className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-4 py-4 mb-4 text-sm text-white/75 space-y-2">
          {isGift && inviteInfo.recipientName && (
            <p>
              Hi <span className="text-neon-cyan">{inviteInfo.recipientName}</span>
              {" — "}
              <span className="text-white/85">{sender}</span> sent you a Genius
              Wallet gift from the BROK ecosystem.
            </p>
          )}
          <p className="font-medium text-neon-cyan tabular-nums text-lg">
            {inviteInfo.amount} $POCK
            {inviteInfo.usdEquivalent != null && (
              <span className="text-white/55 font-normal text-sm">
                {" "}
                ({formatUsd(inviteInfo.usdEquivalent)} USD equivalent)
              </span>
            )}
          </p>
          {inviteInfo.personalMessage && (
            <blockquote className="border-l-2 border-white/15 pl-3 text-white/65 italic">
              &ldquo;{inviteInfo.personalMessage}&rdquo;
              <footer className="text-[11px] text-white/40 not-italic mt-1">
                — {sender}
              </footer>
            </blockquote>
          )}
          <p className="text-xs text-white/45">
            Use the 8-character password from your message, or claim instantly
            with an existing BROK user ID.
          </p>
        </section>
      )}

      {token && (
        <section className="rounded-2xl border border-white/10 bg-bg-card p-6 space-y-4">
          <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2.5 text-xs text-white/55 space-y-1">
            <p className="font-medium text-white/75">New here? Two steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                <Link href={registerUrl} className="text-neon-cyan hover:underline">
                  Create free Genius Wallet
                </Link>{" "}
                (100 $POCK trial)
              </li>
              <li>Return here and claim with your password or BROK ID</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["password", "8-char password"],
                ["brok_id", "BROK user ID"],
                ["wallet", "Wallet address"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`bio-tab px-3 py-2 rounded-lg text-xs border ${
                  method === id
                    ? "bio-tab--active border-neon-cyan/40 text-neon-cyan"
                    : "border-white/10 text-white/55"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {method === "brok_id" && (
            <label className="bio-field block space-y-1.5">
              <span className="bio-field__label text-xs text-white/50">
                BROK user ID
              </span>
              <input
                type="text"
                value={brokUserId}
                onChange={(e) => setBrokUserId(e.target.value)}
                placeholder="From Genius Wallet after signup"
                className="bio-field__control w-full font-mono text-xs"
              />
            </label>
          )}

          {method === "wallet" && (
            <label className="bio-field block space-y-1.5">
              <span className="bio-field__label text-xs text-white/50">
                Wallet address
              </span>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x… or acceptable wallet"
                className="bio-field__control w-full font-mono text-xs"
              />
            </label>
          )}

          {method === "password" && (
            <label className="bio-field block space-y-1.5">
              <span className="bio-field__label text-xs text-white/50">
                8-character password (from gift message)
              </span>
              <input
                type="text"
                value={claimPassword}
                onChange={(e) =>
                  setClaimPassword(e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="AB12CD34"
                maxLength={8}
                className="bio-field__control w-full font-mono tracking-widest uppercase"
              />
            </label>
          )}

          <DigitalAssetDisclaimer />

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="bio-btn-primary w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : isGift ? (
              "Claim gift"
            ) : (
              "Claim $POCK"
            )}
          </button>

          {message && (
            <p className="text-sm text-emerald-400/90 border border-emerald-400/20 rounded-lg px-3 py-2 bg-emerald-400/5">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2 bg-red-400/5">
              {error}
            </p>
          )}
        </section>
      )}

      <p className="text-xs text-white/35 mt-6 text-center space-x-2">
        <Link href="/genius-wallet" className="text-neon-cyan hover:underline">
          Genius Wallet
        </Link>
        <span>·</span>
        <Link href="/" className="text-neon-cyan hover:underline">
          Home
        </Link>
      </p>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
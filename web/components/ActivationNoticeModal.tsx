"use client";

import { usePock } from "@/context/PockContext";
import { useToast } from "@/context/ToastContext";
import { getSupabase } from "@/lib/supabase/client";
import { absoluteUrl } from "@/lib/siteConfig";
import { MessageSquare, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NoticeKind = "day0" | "day5";

interface NoticeState {
  pending: boolean;
  kind: NoticeKind | null;
  amount: number | null;
}

async function accessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * First-receive activation notice + onboarding feedback (1–10 ease, Qs, suggestions).
 * Day-5 circle-back uses the same surface when email/SMS contact is missing.
 */
export function ActivationNoticeModal() {
  const { user, ready } = usePock();
  const { showToast } = useToast();
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [questions, setQuestions] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [whyNot, setWhyNot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!ready || !user) return;
    const token = await accessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/pock/activation-notice", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as NoticeState;
      setNotice(data);
      setOpen(Boolean(data.pending && data.kind));
    } catch {
      /* ignore */
    }
  }, [ready, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = async () => {
    if (!notice?.kind) {
      setOpen(false);
      return;
    }
    const token = await accessToken();
    if (token) {
      await fetch("/api/pock/activation-notice", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "dismiss", kind: notice.kind }),
      }).catch(() => null);
    }
    setOpen(false);
  };

  const submit = async () => {
    if (!notice?.kind) return;
    setSubmitting(true);
    try {
      const token = await accessToken();
      if (!token) throw new Error("auth_required");
      const res = await fetch("/api/pock/activation-notice", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "feedback",
          kind: notice.kind,
          source: notice.kind === "day5" ? "day5" : "in_app",
          easeScore: ease,
          questions,
          suggestions,
          whyNotEngaged: notice.kind === "day5" ? whyNot : undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "save_failed");
      }
      showToast("Thanks — your feedback helps us improve BROK.", "success");
      setOpen(false);
      setNotice((n) => (n ? { ...n, pending: false } : n));
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not save feedback",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !notice?.kind) return null;

  const isDay5 = notice.kind === "day5";
  const amountLabel =
    notice.amount && notice.amount > 0
      ? `${notice.amount.toLocaleString()} $POCK`
      : "your gift credits";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 px-3 py-4 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-title"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-neon-cyan/30 bg-bg-card p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-cyan shrink-0" />
            <h2
              id="activation-title"
              className="text-sm font-semibold text-white/90"
            >
              {isDay5
                ? "BROK is still waiting"
                : "You're activated on BROK"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-lg p-1 text-white/40 hover:text-white/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          {isDay5 ? (
            <>
              Your gift ({amountLabel}) is still in Genius Wallet. If something
              blocked you — technical hiccup, confusion, or just busy — tell us
              below or chat with BROK. No pressure.
            </>
          ) : (
            <>
              Opening your gift link activated your account.{" "}
              <strong className="text-white/90">{amountLabel}</strong> is in
              Genius Wallet. It can feel almost too easy vs usual sign-ups —
              that&apos;s intentional. You&apos;re in.
            </>
          )}
        </p>

        {!isDay5 && (
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/55 leading-snug space-y-1">
            <p className="text-white/70 font-medium">Mobile pop-ups</p>
            <p>
              Notifications, “Add to Home Screen,” and mic access are all
              optional. Voice/Avatar stay off by default to save credits — use
              text chat anytime.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/15 px-3 py-1.5 text-xs text-neon-cyan"
            onClick={() => void dismiss()}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat with BROK
          </Link>
          <Link
            href="/inneagram"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-neon-cyan/30"
            onClick={() => void dismiss()}
          >
            Try Inneagram
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/45 hover:text-white/70"
            onClick={() => void dismiss()}
          >
            Subscribe (optional)
          </Link>
        </div>

        <p className="text-[10px] text-white/40 leading-snug">
          Subscribe is not required. It helps BROK remember you while active and
          tailor help more precisely. Feedback: email{" "}
          <a
            className="text-neon-cyan/80 underline"
            href="mailto:info@neobanx.com"
          >
            info@neobanx.com
          </a>{" "}
          or talk to BROK in chat.
        </p>

        {isDay5 && (
          <label className="block space-y-1">
            <span className="text-[11px] text-white/55">
              Why not yet? (optional)
            </span>
            <textarea
              value={whyNot}
              onChange={(e) => setWhyNot(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white/85 outline-none focus:border-neon-cyan/40"
              placeholder="Busy, confusing, technical issue, not interested…"
            />
          </label>
        )}

        <div className="space-y-1">
          <span className="text-[11px] text-white/55">
            How smooth was onboarding? 1 hard → 10 easy
          </span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEase(n)}
                className={`h-8 w-8 rounded-md text-xs border transition-colors ${
                  ease === n
                    ? "border-neon-cyan bg-neon-cyan/20 text-neon-cyan"
                    : "border-white/15 text-white/50 hover:border-white/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] text-white/55">Questions?</span>
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white/85 outline-none focus:border-neon-cyan/40"
            placeholder="Anything unclear?"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-white/55">Suggestions?</span>
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white/85 outline-none focus:border-neon-cyan/40"
            placeholder="What would make this better?"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="flex-1 rounded-lg border border-neon-cyan/40 bg-neon-cyan/15 py-2 text-xs font-medium text-neon-cyan disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Send feedback"}
          </button>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/50"
          >
            Later
          </button>
        </div>

        <p className="text-[9px] text-white/30 text-center">
          Live app · {absoluteUrl("/chat").replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}

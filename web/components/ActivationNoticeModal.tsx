"use client";

import { usePock } from "@/context/PockContext";
import { useToast } from "@/context/ToastContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  Gift,
  KeyRound,
  MessageSquare,
  Sparkles,
  Star,
  X,
} from "lucide-react";
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
 * In-app activation / circle-back (no SMS required).
 * Day-0: congrats + “try first” actions. Day-5: soft re-engage + feedback.
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
  const [showFeedback, setShowFeedback] = useState(false);

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
      setShowFeedback(data.kind === "day5");
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
      : null;

  const actions = [
    {
      href: "/genius-wallet",
      icon: KeyRound,
      title: "Set your Device PIN",
      blurb: "Lock in access on this phone or laptop — digits only, not your Apple password.",
    },
    {
      href: "/genius-wallet#gift-pock",
      icon: Gift,
      title: "Send $POCK to a friend",
      blurb: "Share a gift link. When they open it, we’ll add 100 $POCK for you.",
    },
    {
      href: "/inneagram",
      icon: Star,
      title: "Quick Inneagram typology",
      blurb: "Find your type in minutes — great first map for how BROK can help you.",
    },
    {
      href: "/chat",
      icon: MessageSquare,
      title: "Ask about BROK capabilities",
      blurb: "You’re live — chat text is free of friction. Ask anything about what BROK can do.",
    },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-3 py-4 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-title"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-neon-cyan/35 bg-bg-card p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/40 bg-neon-cyan/15">
              <Sparkles className="h-4 w-4 text-neon-cyan" />
            </div>
            <div className="min-w-0">
              <h2
                id="activation-title"
                className="text-base font-semibold text-white tracking-tight"
              >
                {isDay5 ? "BROK is still here" : "Welcome — you’re live!"}
              </h2>
              <p className="text-[11px] text-neon-cyan/90 font-medium mt-0.5">
                {isDay5
                  ? "Your credits are waiting when you’re ready"
                  : "Congrats — your BROK account is active"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-white/75 leading-relaxed">
          {isDay5 ? (
            <>
              {amountLabel ? (
                <>
                  Your gift ({amountLabel}) is still in Genius Wallet.{" "}
                </>
              ) : (
                <>Your Genius Wallet is still ready. </>
              )}
              No pressure — pick a next step below, or tell us what got in the
              way.
            </>
          ) : (
            <>
              {amountLabel ? (
                <>
                  <strong className="text-white">{amountLabel}</strong> is in
                  your Genius Wallet.{" "}
                </>
              ) : (
                <>Your credits are ready in Genius Wallet. </>
              )}
              You can chat, try tools, and explore now.{" "}
              <span className="text-white/55">
                Persistent long-term memory is the main thing that needs a
                monthly subscription — everything else is open to try.
              </span>
            </>
          )}
        </p>

        {!isDay5 && (
          <p className="text-xs font-medium text-white/85">
            What would you like to try first?
          </p>
        )}

        <div className="space-y-2">
          {actions.map(({ href, icon: Icon, title, blurb }) => (
            <Link
              key={href + title}
              href={href}
              onClick={() => void dismiss()}
              className="flex gap-3 rounded-xl border border-white/12 bg-black/30 px-3 py-2.5 hover:border-neon-cyan/40 hover:bg-neon-cyan/5 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-neon-cyan" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/90">{title}</p>
                <p className="text-[11px] text-white/50 leading-snug mt-0.5">
                  {blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!isDay5 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/40 leading-snug">
              Mic & notifications are optional. Text chat is fine with Voice
              off.
            </p>
            {/* Phone-only: short bookmark tip (hidden on wider screens) */}
            <p className="sm:hidden text-[11px] text-white/55 leading-snug rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
              <span className="text-white/75 font-medium">On your phone:</span>{" "}
              bookmark this page so you can find BROK again.{" "}
              <span className="text-white/45">
                Safari: Share → Add Bookmark. Chrome: ★ or ⋮ → Bookmark. Open
                later from the bookmark list / star.
              </span>
            </p>
          </div>
        )}

        {/* Feedback: optional on day0, primary on day5 */}
        {!showFeedback && !isDay5 ? (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="text-[11px] text-white/45 underline underline-offset-2 hover:text-neon-cyan/80"
          >
            Optional: quick feedback (ease 1–10)
          </button>
        ) : (
          <div className="space-y-2.5 border-t border-white/10 pt-3">
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
                placeholder="Anything unclear about BROK?"
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

            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="w-full rounded-lg border border-neon-cyan/40 bg-neon-cyan/15 py-2 text-xs font-medium text-neon-cyan disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Send feedback"}
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => void dismiss()}
            className="flex-1 rounded-lg border border-white/15 py-2 text-xs text-white/55 hover:text-white/80"
          >
            {isDay5 ? "Later" : "I’m exploring — close"}
          </button>
        </div>
      </div>
    </div>
  );
}

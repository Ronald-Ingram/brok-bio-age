"use client";

import {
  BookMarked,
  Brain,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ChatLogItem {
  id: string;
  user_id: string | null;
  querent_label: string | null;
  question: string;
  answer: string | null;
  corrected_answer: string | null;
  correction_scope: string | null;
  created_at: string;
  highIq: boolean;
  adminNote: string | null;
}

interface HighIqAlert {
  id: string;
  querent_label: string | null;
  question: string;
  answer: string | null;
  created_at: string;
  adminNote: string | null;
}

interface CorrectAnswersPanelProps {
  adminSecret: string;
}

export function CorrectAnswersPanel({ adminSecret }: CorrectAnswersPanelProps) {
  const [items, setItems] = useState<ChatLogItem[]>([]);
  const [alerts, setAlerts] = useState<HighIqAlert[]>([]);
  const [querent, setQuerent] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [highIqFlags, setHighIqFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const headers = {
    "Content-Type": "application/json",
    "x-brok-og-admin": adminSecret,
  };

  const load = useCallback(async () => {
    if (!adminSecret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = querent.trim() ? `?querent=${encodeURIComponent(querent.trim())}` : "";
      const [listRes, alertRes] = await Promise.all([
        fetch(`/api/admin/correct-answers${q}`, { headers }),
        fetch("/api/admin/high-iq-alerts", { headers }),
      ]);
      const listJson = await listRes.json();
      const alertJson = await alertRes.json();
      if (!listRes.ok) throw new Error(listJson.error ?? "load_failed");
      setItems(listJson.items ?? []);
      setAlerts(alertJson.alerts ?? []);
      const flags: Record<string, boolean> = {};
      for (const item of listJson.items ?? []) {
        if (item.user_id) flags[item.user_id] = item.highIq;
      }
      setHighIqFlags(flags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [adminSecret, querent]);

  useEffect(() => {
    void load();
  }, [load]);

  const correct = async (id: string, scope: "short_term" | "canonical") => {
    const correctedAnswer = drafts[id]?.trim();
    if (!correctedAnswer) return;
    const row = items.find((i) => i.id === id);
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/correct-answers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          chatLogId: id,
          correctedAnswer,
          scope,
          userId: row?.user_id,
          highIq: row?.user_id ? highIqFlags[row.user_id] : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "save_failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSavingId(null);
    }
  };

  const dismissAlerts = async () => {
    if (!alerts.length) return;
    await fetch("/api/admin/high-iq-alerts", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ chatLogIds: alerts.map((a) => a.id) }),
    });
    await load();
  };

  const seedCanon = async () => {
    setSeedMsg(null);
    const res = await fetch("/api/admin/seed-faq-canon", {
      method: "POST",
      headers,
    });
    const json = await res.json();
    setSeedMsg(res.ok ? `Canon seeded: ${json.inserted} new, ${json.skipped} updated` : json.error);
  };

  const checkEmail = async () => {
    const res = await fetch("/api/admin/brok-email", { headers });
    const json = await res.json();
    setEmailStatus(
      json.configured
        ? `Inbox ${json.inbox}: ${json.messages?.length ?? 0} recent messages`
        : json.hint ?? json.error ?? "not configured"
    );
  };

  return (
    <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neon-cyan" />
          Correct answers
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void seedCanon()}
            className="text-[11px] px-2.5 py-1 rounded border border-white/15 text-white/55 hover:text-neon-cyan"
          >
            Seed FAQ → Canon
          </button>
          <button
            type="button"
            onClick={() => void checkEmail()}
            className="text-[11px] px-2.5 py-1 rounded border border-white/15 text-white/55 hover:text-neon-cyan inline-flex items-center gap-1"
          >
            <Mail className="w-3 h-3" />
            BROK inbox
          </button>
        </div>
      </div>

      {seedMsg && <p className="text-xs text-neon-cyan/80">{seedMsg}</p>}
      {emailStatus && <p className="text-xs text-white/45">{emailStatus}</p>}

      {alerts.length > 0 && (
        <div className="rounded-lg border border-violet-400/25 bg-violet-400/8 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-violet-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              High IQ? alerts ({alerts.length})
            </p>
            <button
              type="button"
              onClick={() => void dismissAlerts()}
              className="text-[10px] text-violet-300/80 hover:underline"
            >
              Mark seen
            </button>
          </div>
          <ul className="text-[11px] text-white/55 space-y-2 max-h-40 overflow-y-auto">
            {alerts.map((a) => (
              <li key={a.id} className="border-b border-white/5 pb-2">
                <span className="text-violet-200/90">{a.querent_label ?? "—"}</span>
                {" · "}
                {new Date(a.created_at).toLocaleString()}
                <p className="text-white/70 mt-0.5">{a.question}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="search"
            placeholder="Search by querent name or question…"
            value={querent}
            onChange={(e) => setQuerent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-neon-cyan/40 text-neon-cyan text-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-3 max-h-[520px] overflow-y-auto">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-white/8 bg-black/20 p-3 space-y-2 text-xs"
          >
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/40">
              <span className="text-white/65">{item.querent_label ?? "Anonymous"}</span>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              {item.correction_scope && (
                <span className="text-neon-cyan">Corrected · {item.correction_scope}</span>
              )}
            </div>
            {item.user_id && (
              <label className="flex items-center gap-2 text-[11px] text-violet-300/90">
                <input
                  type="checkbox"
                  checked={highIqFlags[item.user_id] ?? item.highIq}
                  onChange={(e) =>
                    setHighIqFlags((f) => ({
                      ...f,
                      [item.user_id!]: e.target.checked,
                    }))
                  }
                />
                High IQ? (priority alerts)
              </label>
            )}
            <p className="text-white/75 font-medium">Q: {item.question}</p>
            <p className="text-white/50 whitespace-pre-wrap">
              A: {item.corrected_answer ?? item.answer ?? "—"}
            </p>
            <textarea
              placeholder="Corrected answer…"
              value={drafts[item.id] ?? item.corrected_answer ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [item.id]: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white/80"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingId === item.id}
                onClick={() => void correct(item.id, "short_term")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-amber-400/35 text-amber-200/90 text-[11px] hover:bg-amber-400/10 disabled:opacity-50"
              >
                <Brain className="w-3 h-3" />
                Short-term memory
              </button>
              <button
                type="button"
                disabled={savingId === item.id}
                onClick={() => void correct(item.id, "canonical")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-neon-cyan/35 text-neon-cyan text-[11px] hover:bg-neon-cyan/10 disabled:opacity-50"
              >
                <BookMarked className="w-3 h-3" />
                Canonical → Kiron Canon
              </button>
            </div>
          </article>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-xs text-white/35 text-center py-6">
            No chat questions logged yet — they appear after users ask BROK on /chat or /avatar.
          </p>
        )}
      </div>
    </section>
  );
}
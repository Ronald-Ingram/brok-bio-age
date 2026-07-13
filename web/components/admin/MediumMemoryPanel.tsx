"use client";

import { adminAuthHeaders } from "@/lib/adminAuthClient";
import {
  Brain,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MediumRow {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  tags: string[] | null;
  question_patterns: string | null;
  source: string | null;
  expires_at: string;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

interface CanonRow {
  tags: string;
  content: string;
  created_at: string;
  preview: string;
}

interface SuggestionRow {
  id: string;
  user_id: string | null;
  suggested_title: string;
  suggested_content: string;
  suggested_tags: string[] | null;
  kind: string;
  status: string;
  verification_note: string | null;
  created_at: string;
  reason: string | null;
}

interface MediumMemoryPanelProps {
  adminSession: string;
}

export function MediumMemoryPanel({ adminSession }: MediumMemoryPanelProps) {
  const [medium, setMedium] = useState<MediumRow[]>([]);
  const [canon, setCanon] = useState<CanonRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("admin_medium");
  const [patterns, setPatterns] = useState("");
  const [ttlDays, setTtlDays] = useState(30);
  const [scopeGlobal, setScopeGlobal] = useState(true);
  const [xFeedCount, setXFeedCount] = useState<number | null>(null);
  const [xSyncing, setXSyncing] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    ...adminAuthHeaders({ session: adminSession }),
  };

  const loadXFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync-x-feed", { headers });
      const json = await res.json();
      if (res.ok) setXFeedCount(json.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [adminSession]);

  const syncXFeed = async () => {
    setXSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sync-x-feed", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "x_sync_failed");
      setMsg(
        `X feed synced (${json.source}): ${json.upserted} posts into proprietary cache.`
      );
      await loadXFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "x_sync_failed");
    } finally {
      setXSyncing(false);
    }
  };

  const load = useCallback(async () => {
    if (!adminSession.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const [memRes, sugRes] = await Promise.all([
        fetch(`/api/admin/medium-memory${qs}`, { headers }),
        fetch("/api/admin/memory-suggestions?status=pending", { headers }),
      ]);
      const memJson = await memRes.json();
      const sugJson = await sugRes.json();
      if (!memRes.ok) throw new Error(memJson.error ?? "load_failed");
      setMedium(memJson.medium ?? []);
      setCanon(memJson.canon ?? []);
      if (sugRes.ok) setSuggestions(sugJson.items ?? []);
      else setSuggestions([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [adminSession, q]);

  useEffect(() => {
    void load();
    void loadXFeed();
  }, [load, loadXFeed]);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setContent("");
    setTags("admin_medium");
    setPatterns("");
    setTtlDays(30);
    setScopeGlobal(true);
  };

  const startEdit = (row: MediumRow) => {
    setEditId(row.id);
    setTitle(row.title);
    setContent(row.content);
    setTags((row.tags ?? []).join(", "));
    setPatterns(row.question_patterns ?? "");
    setScopeGlobal(!row.user_id);
    setMsg(null);
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/medium-memory", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: editId ?? undefined,
          title: title.trim(),
          content: content.trim(),
          tags,
          question_patterns: patterns.trim() || undefined,
          ttl_days: ttlDays,
          user_id: scopeGlobal ? null : undefined,
          source: "admin_panel",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "save_failed");
      setMsg(editId ? "Medium memory updated." : "Medium memory created.");
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  };

  const removeMedium = async (id: string) => {
    if (!confirm("Delete this medium-memory entry?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/medium-memory", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ kind: "medium", id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "delete_failed");
      setMsg("Deleted medium memory entry.");
      if (editId === id) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setSaving(false);
    }
  };

  const removeCanon = async (row: CanonRow) => {
    if (!confirm("Delete this Canon/FAQ row? This cannot be undone easily.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/medium-memory", {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          kind: "canon",
          tags: row.tags,
          created_at: row.created_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "delete_failed");
      setMsg("Deleted Canon row.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setSaving(false);
    }
  };

  const reviewSuggestion = async (
    id: string,
    action: "approve" | "reject" | "verify_news"
  ) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/memory-suggestions", {
        method: "POST",
        headers,
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "review_failed");
      if (action === "verify_news") {
        setMsg(json.verification_note?.slice(0, 200) ?? "Verification done.");
      } else {
        setMsg(action === "approve" ? "Approved → medium memory." : "Rejected.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "review_failed");
    } finally {
      setSaving(false);
    }
  };

  const fillFromSuggestion = (s: SuggestionRow) => {
    setEditId(null);
    setTitle(s.suggested_title);
    setContent(s.suggested_content);
    setTags((s.suggested_tags ?? ["admin_medium"]).join(", "));
    setMsg("Loaded suggestion into form — edit then Save, or Approve to apply as-is.");
  };

  return (
    <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
            <Brain className="w-4 h-4 text-neon-cyan" />
            Medium memory, Canon & founder X feed
          </h2>
          <p className="text-[11px] text-white/40 mt-1 max-w-xl">
            Proprietary KB you control: medium (30d hot), Canon (durable), and{" "}
            <strong className="text-white/55">@RonaldIngram X cache</strong> for live
            $POCK progress. Only admin writes. Chat can only suggest.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={xSyncing}
            onClick={() => void syncXFeed()}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 disabled:opacity-50"
          >
            {xSyncing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Sync X feed
            {xFeedCount != null ? ` (${xFeedCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[11px] text-neon-cyan/80 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {msg && (
        <p className="text-xs text-emerald-400/90 border border-emerald-400/20 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      {/* Form */}
      <div className="rounded-lg border border-neon-cyan/20 bg-black/25 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/60">
          {editId ? (
            <>
              <Pencil className="w-3.5 h-3.5 text-neon-cyan" />
              Edit medium memory
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 text-neon-cyan" />
              Add medium memory (non-canonical)
            </>
          )}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm outline-none focus:border-neon-cyan/40"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Full answer / content (this is what BROK will ground on when relevant)"
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm outline-none focus:border-neon-cyan/40 resize-y min-h-[140px]"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs outline-none focus:border-neon-cyan/40"
          />
          <input
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            placeholder="Question patterns (keywords for retrieval)"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs outline-none focus:border-neon-cyan/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/50">
          <label className="inline-flex items-center gap-1.5">
            TTL days
            <input
              type="number"
              min={1}
              max={365}
              value={ttlDays}
              onChange={(e) => setTtlDays(Number(e.target.value) || 30)}
              className="w-16 px-2 py-1 rounded bg-black/40 border border-white/10"
            />
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={scopeGlobal}
              onChange={(e) => setScopeGlobal(e.target.checked)}
            />
            Global (all users)
          </label>
          <div className="flex-1" />
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-white/40 hover:text-white/70"
            >
              <X className="w-3.5 h-3.5" /> Cancel edit
            </button>
          )}
          <button
            type="button"
            disabled={saving || !title.trim() || !content.trim()}
            onClick={() => void save()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-xs disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {editId ? "Update" : "Save to medium memory"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter medium / canon…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs outline-none focus:border-neon-cyan/40"
          />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-white/40 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}

      {/* Pending suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-wider text-amber-300/80">
            Pending user suggestions ({suggestions.length})
          </h3>
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 space-y-2"
            >
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-white/80 font-medium">{s.suggested_title}</span>
                <span className="text-white/35 shrink-0">
                  {new Date(s.created_at).toLocaleString()} · {s.kind}
                </span>
              </div>
              <p className="text-[11px] text-white/55 whitespace-pre-wrap line-clamp-4">
                {s.suggested_content}
              </p>
              {s.verification_note && (
                <p className="text-[10px] text-neon-cyan/70 whitespace-pre-wrap border border-white/10 rounded p-2">
                  {s.verification_note}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => fillFromSuggestion(s)}
                  className="text-[10px] px-2 py-1 rounded border border-white/15 text-white/60 hover:border-neon-cyan/40"
                >
                  Load into form
                </button>
                {s.kind === "news" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void reviewSuggestion(s.id, "verify_news")}
                    className="text-[10px] px-2 py-1 rounded border border-white/15 text-white/60"
                  >
                    Grok fact-check
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void reviewSuggestion(s.id, "approve")}
                  className="text-[10px] px-2 py-1 rounded border border-emerald-400/40 text-emerald-300"
                >
                  Approve → medium
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void reviewSuggestion(s.id, "reject")}
                  className="text-[10px] px-2 py-1 rounded border border-red-400/30 text-red-300/90"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medium list */}
      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-wider text-white/40">
          Medium memory ({medium.length})
        </h3>
        {medium.length === 0 && !loading && (
          <p className="text-xs text-white/35">No medium entries yet.</p>
        )}
        {medium.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-1.5"
          >
            <div className="flex justify-between gap-2">
              <p className="text-sm text-white/85 font-medium">{row.title}</p>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="p-1.5 rounded hover:bg-white/10 text-white/45"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeMedium(row.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-300/70"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-white/40">
              Added {new Date(row.created_at).toLocaleString()}
              {row.source ? ` · source: ${row.source}` : ""}
              {" · "}
              {row.user_id ? `user ${row.user_id.slice(0, 8)}…` : "global"}
              {" · expires "}
              {new Date(row.expires_at).toLocaleDateString()}
              {row.access_count ? ` · accessed ${row.access_count}×` : ""}
            </p>
            <p className="text-[10px] text-neon-cyan/50">
              {(row.tags ?? []).join(", ") || "no tags"}
            </p>
            <p className="text-xs text-white/55 whitespace-pre-wrap max-h-28 overflow-y-auto">
              {row.content}
            </p>
          </div>
        ))}
      </div>

      {/* Canon list */}
      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-wider text-white/40">
          Kiron Canon / FAQ (recent, {canon.length})
        </h3>
        <p className="text-[10px] text-white/30">
          Canon is durable truth. Prefer Correct Answers → Canonical for FAQ-style
          adds. Delete carefully.
        </p>
        {canon.map((row) => (
          <div
            key={`${row.tags}-${row.created_at}`}
            className="rounded-lg border border-white/8 bg-black/15 p-3 space-y-1"
          >
            <div className="flex justify-between gap-2">
              <p className="text-[11px] text-white/70 break-all">{row.tags}</p>
              <button
                type="button"
                onClick={() => void removeCanon(row)}
                className="p-1.5 rounded hover:bg-red-500/10 text-red-300/60 shrink-0"
                title="Delete canon row"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-white/35">
              Added {new Date(row.created_at).toLocaleString()}
            </p>
            <p className="text-xs text-white/50 whitespace-pre-wrap max-h-20 overflow-y-auto">
              {row.preview}
              {row.content?.length > 280 ? "…" : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

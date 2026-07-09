"use client";

import { usePock } from "@/context/PockContext";
import {
  createGeniusSubWallet,
  fetchGeniusSubWallets,
  fetchSubWalletLedger,
  fundGeniusSubWallet,
  reclaimGeniusSubWallet,
  type GeniusSubWallet,
  type GeniusSubWalletLedgerEntry,
} from "@/lib/geniusSubWallet";
import {
  SUB_WALLET_CREATE_CTA,
  SUB_WALLET_HEADLINE,
  SUB_WALLET_PARENT_NOTE,
  SUB_WALLET_SUBLINE,
} from "@/lib/geniusWalletCopy";
import { ChevronDown, ChevronUp, Loader2, Plus, Users, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function GeniusSubWalletsPanel() {
  const { user, refresh } = usePock();
  const [wallets, setWallets] = useState<GeniusSubWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<GeniusSubWalletLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWallets(await fetchGeniusSubWallets());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setLedger([]);
      return;
    }
    setExpandedId(id);
    setLedgerLoading(true);
    try {
      setLedger(await fetchSubWalletLedger(id));
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCreate = async () => {
    const nick = nickname.trim();
    if (!nick) return;
    setCreating(true);
    setError(null);
    try {
      await createGeniusSubWallet({ nickname: nick, note: note.trim() || undefined });
      setNickname("");
      setNote("");
      await load();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "create_failed";
      setError(msg === "nickname_taken" ? "That name is already in use" : msg);
    } finally {
      setCreating(false);
    }
  };

  const handleFund = async (w: GeniusSubWallet) => {
    const amt = parseInt(fundAmount[w.id] ?? "0", 10);
    if (!Number.isFinite(amt) || amt < 1) return;
    setBusyId(w.id);
    setError(null);
    try {
      await fundGeniusSubWallet({ subWalletId: w.id, amount: amt });
      setFundAmount((prev) => ({ ...prev, [w.id]: "" }));
      await load();
      await refresh();
      if (expandedId === w.id) {
        setLedger(await fetchSubWalletLedger(w.id));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fund_failed";
      setError(msg === "insufficient_balance" ? "Not enough $POCK in your main wallet" : msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleReclaim = async (w: GeniusSubWallet) => {
    const amt = parseInt(fundAmount[w.id] ?? "0", 10);
    if (!Number.isFinite(amt) || amt < 1) return;
    setBusyId(w.id);
    setError(null);
    try {
      await reclaimGeniusSubWallet({ subWalletId: w.id, amount: amt });
      setFundAmount((prev) => ({ ...prev, [w.id]: "" }));
      await load();
      await refresh();
      if (expandedId === w.id) {
        setLedger(await fetchSubWalletLedger(w.id));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "reclaim_failed";
      setError(msg === "insufficient_sub_balance" ? "Not enough in this sub-wallet" : msg);
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  return (
    <section
      id="sub-wallets"
      className="scroll-mt-24 rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/6 to-bg-card p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-2.5">
          <Users className="h-5 w-5 text-violet-300" />
        </div>
        <div className="space-y-1 flex-1">
          <h2 className="text-lg font-semibold text-white/90">{SUB_WALLET_HEADLINE}</h2>
          <p className="text-sm text-white/50 leading-relaxed">{SUB_WALLET_SUBLINE}</p>
          <p className="text-[11px] text-white/40 leading-relaxed">{SUB_WALLET_PARENT_NOTE}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <p className="text-xs font-medium text-white/70">{SUB_WALLET_CREATE_CTA}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={40}
            placeholder="Nickname — e.g. Emma, Jake"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
          />
          <input
            type="text"
            maxLength={120}
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !nickname.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-violet-400/40 text-violet-200 text-sm hover:bg-violet-400/10 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-white/40 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sub-wallets…
        </p>
      ) : wallets.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-4">
          No sub-wallets yet — create one for each family member you want to fund.
        </p>
      ) : (
        <ul className="space-y-3">
          {wallets.map((w) => {
            const expanded = expandedId === w.id;
            const busy = busyId === w.id;
            return (
              <li
                key={w.id}
                className="rounded-xl border border-white/10 bg-black/25 overflow-hidden"
              >
                <div className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-violet-500/15 border border-violet-400/20 flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4 text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white/90 truncate">{w.nickname}</p>
                      <p className="text-[11px] text-white/40">
                        Total funded: {(w.total_funded ?? 0).toLocaleString()} $POCK
                        {w.note ? ` · ${w.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-neon-cyan">
                    {w.pock_balance.toLocaleString()}{" "}
                    <span className="text-sm text-white/40">$POCK</span>
                  </p>
                </div>

                <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border-t border-white/5 pt-3">
                  <input
                    type="number"
                    min={1}
                    placeholder="Amount"
                    value={fundAmount[w.id] ?? ""}
                    onChange={(e) =>
                      setFundAmount((prev) => ({ ...prev, [w.id]: e.target.value }))
                    }
                    className="w-full sm:w-28 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleFund(w)}
                    className="px-4 py-2 rounded-lg border border-neon-cyan/40 text-neon-cyan text-xs hover:bg-neon-cyan/10 disabled:opacity-50"
                  >
                    Fund from main
                  </button>
                  <button
                    type="button"
                    disabled={busy || w.pock_balance < 1}
                    onClick={() => handleReclaim(w)}
                    className="px-4 py-2 rounded-lg border border-white/15 text-white/55 text-xs hover:bg-white/5 disabled:opacity-50"
                  >
                    Reclaim to main
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(w.id)}
                    className="sm:ml-auto inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60"
                  >
                    History
                    {expanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-white/5 bg-black/20">
                    {ledgerLoading ? (
                      <p className="text-xs text-white/40 py-3 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </p>
                    ) : ledger.length === 0 ? (
                      <p className="text-xs text-white/40 py-3">No transfers yet.</p>
                    ) : (
                      <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                        {ledger.map((e) => (
                          <li
                            key={e.id}
                            className="py-2 flex justify-between gap-2 text-[11px]"
                          >
                            <span className="text-white/50 truncate">
                              {e.note ?? e.kind} ·{" "}
                              {new Date(e.created_at).toLocaleString()}
                            </span>
                            <span
                              className={`tabular-nums shrink-0 ${
                                e.amount > 0 ? "text-emerald-400" : "text-white/55"
                              }`}
                            >
                              {e.amount > 0 ? "+" : ""}
                              {e.amount} $POCK
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
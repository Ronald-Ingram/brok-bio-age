"use client";

import { usePock } from "@/context/PockContext";
import type { LedgerKind, PockLedgerEntry } from "@/lib/pockTypes";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

const KIND_LABELS: Record<LedgerKind, string> = {
  trial_credit: "Trial credit",
  calc_debit: "Calculation",
  subscription_debit: "Subscription",
  premium_spend: "Premium feature",
  transfer_out: "Sent",
  transfer_in: "Received",
  withdrawal: "Withdrawal",
  gift_sent: "Gift",
  gift_received: "Gift received",
  impact_donation: "Impact",
  admin_adjust: "Adjustment",
  stripe_credit: "Stripe top-up",
  included_debit: "Included pool",
  subscription_credit: "Subscription credit",
  meter_debit: "Metered usage",
  reserve_credit: "Reserved credit",
  custody_connect: "Wallet linked",
  custody_release: "On-chain release",
};

function LedgerRow({ entry }: { entry: PockLedgerEntry }) {
  const positive = entry.amount > 0;
  const Icon = positive ? ArrowDownLeft : ArrowUpRight;
  const color = positive ? "text-emerald-400" : "text-white/55";

  return (
    <li className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          positive ? "bg-emerald-400/10" : "bg-white/5"
        }`}
      >
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{entry.note}</p>
        <p className="text-[11px] text-white/35">
          {KIND_LABELS[entry.kind]} ·{" "}
          {new Date(entry.created_at).toLocaleString()}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-medium tabular-nums ${color}`}>
          {positive ? "+" : ""}
          {entry.amount} $POCK
        </p>
        <p className="text-[11px] text-white/30 tabular-nums">
          bal {entry.balance_after}
        </p>
      </div>
    </li>
  );
}

export function TransactionHistorySection() {
  const { ledger, reconciling, reconcile, refresh } = usePock();

  return (
    <section
      id="transaction-history"
      className="rounded-2xl border border-white/10 bg-bg-card p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-medium text-white/70">
            Transaction history
          </h3>
          <p className="text-[10px] text-white/35 mt-0.5">
            Card top-ups, trial credits, custody moves — synced from Supabase on
            load
          </p>
        </div>
        {reconciling ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-white/35">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing…
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-[10px] text-neon-cyan/70 hover:text-neon-cyan hover:underline shrink-0"
          >
            Refresh
          </button>
        )}
      </div>

      {reconcile?.syncedSessions ? (
        <p className="mb-3 text-[10px] text-emerald-400/80 border border-emerald-400/20 rounded-lg px-3 py-2 bg-emerald-400/5">
          Synced {reconcile.syncedSessions} Stripe payment
          {reconcile.syncedSessions === 1 ? "" : "s"} to your ledger.
        </p>
      ) : null}

      {reconcile && reconcile.balanced && reconcile.ledgerCount > 0 && !reconciling && (
        <p className="mb-3 text-[10px] text-white/40">
          Ledger verified · {reconcile.ledgerCount} entries · balance{" "}
          {reconcile.balance} $POCK
        </p>
      )}

      {reconcile && !reconcile.balanced && !reconciling && (
        <p className="mb-3 text-[10px] text-amber-200/90 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
          Balance ({reconcile.balance}) and ledger ({reconcile.ledgerSum}) differ
          — tap Refresh to re-sync Stripe payments.
        </p>
      )}

      {ledger.length === 0 ? (
        <p className="text-sm text-white/35 py-6 text-center">
          {reconciling
            ? "Loading transaction history…"
            : "No transactions yet — card top-ups and trial credits appear here after Stripe confirms."}
        </p>
      ) : (
        <ul className="max-h-96 overflow-y-auto">
          {ledger.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {reconcile && reconcile.repairedLedger > 0 && (
        <p className="mt-3 text-[10px] text-emerald-400/80">
          Restored {reconcile.repairedLedger} missing ledger{" "}
          {reconcile.repairedLedger === 1 ? "entry" : "entries"} from Stripe
          records.
        </p>
      )}
    </section>
  );
}
"use client";

import { usePock } from "@/context/PockContext";
import {
  isLowPockBalance,
  lowBalanceMessage,
  POCK_BALANCE_BANNER_BODY,
  POCK_BALANCE_BANNER_HEADLINE,
  POCK_RECOMMENDED_BUFFER,
} from "@/lib/pockBalanceAlert";
import { AlertTriangle, Coins } from "lucide-react";
import Link from "next/link";

interface PockBalanceAlertProps {
  /** Always show the buffer reminder (not only when low) */
  alwaysRemind?: boolean;
  className?: string;
}

export function PockBalanceAlert({
  alwaysRemind = false,
  className = "",
}: PockBalanceAlertProps) {
  const { user, ready } = usePock();
  const balance = user?.pock_balance ?? 0;

  if (!ready) return null;

  const low = isLowPockBalance(balance);
  if (!low && !alwaysRemind) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex gap-3 text-sm ${
        low
          ? "border-amber-400/30 bg-amber-400/8 text-amber-100/90"
          : "border-white/10 bg-white/[0.03] text-white/55"
      } ${className}`}
      role="status"
    >
      {low ? (
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      ) : (
        <Coins className="w-5 h-5 text-neon-cyan/70 shrink-0 mt-0.5" />
      )}
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-white/85">
          {low ? "Low $POCK balance" : POCK_BALANCE_BANNER_HEADLINE}
        </p>
        <p className="text-xs leading-relaxed">
          {low ? lowBalanceMessage(balance) : POCK_BALANCE_BANNER_BODY}
        </p>
        {(low || balance < POCK_RECOMMENDED_BUFFER) && (
          <Link
            href="/topup"
            className="inline-block text-xs text-neon-cyan hover:underline mt-1"
          >
            Top up $POCK →
          </Link>
        )}
      </div>
    </div>
  );
}
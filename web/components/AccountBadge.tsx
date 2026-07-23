"use client";

import { AccountIdentity } from "@/components/AccountIdentity";
import { useHideIds } from "@/context/HideIdsContext";
import { usePock } from "@/context/PockContext";
import { displayAccountNumber } from "@/lib/pockAccount";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function AccountBadge({
  compactNav = false,
}: {
  /** Single-line chip for the sticky mobile header (saves vertical space). */
  compactNav?: boolean;
} = {}) {
  const { user, ready, loading } = usePock();
  const { hideIds } = useHideIds();

  if (loading) {
    return (
      <div
        className="flex items-center gap-1.5 text-[10px] text-white/30 shrink-0"
        aria-label="Loading account"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (!ready || !user) return null;

  if (compactNav) {
    const code = displayAccountNumber(user.id, hideIds);
    // When hidden, show full masked chip (not last-6 of mask) so format stays clear
    const chip = hideIds
      ? code.replace(/^BROK-/, "")
      : code.length > 6
        ? code.slice(-6)
        : code;
    return (
      <Link
        href="/genius-wallet"
        title={hideIds ? "Account (IDs hidden)" : `Account ${code}`}
        className="inline-flex items-center rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-neon-cyan/90 hover:border-neon-cyan/30"
      >
        {chip}
      </Link>
    );
  }

  return (
    <AccountIdentity
      variant="compact"
      className="shrink-0 max-w-[10rem] sm:max-w-none"
    />
  );
}
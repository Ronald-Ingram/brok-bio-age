"use client";

import { AccountIdentity } from "@/components/AccountIdentity";
import { usePock } from "@/context/PockContext";
import { Loader2 } from "lucide-react";

export function AccountBadge() {
  const { user, ready, loading } = usePock();

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

  return (
    <AccountIdentity
      variant="compact"
      className="shrink-0 max-w-[10rem] sm:max-w-none"
    />
  );
}
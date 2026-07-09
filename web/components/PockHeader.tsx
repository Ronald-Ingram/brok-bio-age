"use client";

import { usePock } from "@/context/PockContext";
import { Coins, Sparkles } from "lucide-react";

interface PockHeaderProps {
  onOpenWallet?: () => void;
}

export function PockHeader({ onOpenWallet }: PockHeaderProps) {
  const { user, ready, createAccount } = usePock();

  if (!ready) {
    return (
      <button
        type="button"
        onClick={createAccount}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Create Free Account
      </button>
    );
  }

  if (!user) return null;

  if (user.subscription_active) {
    return (
      <button
        type="button"
        onClick={onOpenWallet}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-medium hover:bg-neon-cyan/20 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Genius Wallet · Pro
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenWallet}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-sm tabular-nums hover:border-neon-cyan/40 transition-colors"
    >
      <Coins className="w-4 h-4 text-neon-cyan" />
      <span className="text-neon-cyan font-medium">{user.pock_balance}</span>
      <span className="text-white/45 text-xs">$POCK</span>
    </button>
  );
}
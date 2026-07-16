"use client";

import { BrokAvatarPanel } from "@/components/BrokAvatarPanel";
import { NORTH_STAR } from "@/lib/siteCopy";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="mb-2 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <MessageSquare className="h-7 w-7 shrink-0 text-neon-cyan" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              BROK Chat
            </h1>
            <p className="hidden text-xs text-white/45 sm:block">
              BROK sees this page — ask about pricing, wallet, bio-age, or anything on
              screen
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="shrink-0 text-xs text-white/40 transition-colors hover:text-neon-cyan"
        >
          Home
        </Link>
      </header>

      <p className="mb-2 hidden text-[11px] italic leading-snug text-white/40 sm:mb-3 sm:block">
        {NORTH_STAR}
      </p>

      <BrokAvatarPanel layout="stacked" />
    </main>
  );
}

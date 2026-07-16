"use client";

import { BrokAvatarPanel } from "@/components/BrokAvatarPanel";
import { NORTH_STAR } from "@/lib/siteCopy";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ChatPage() {
  // Lock document scroll on mobile — only the in-panel conversation scrolls.
  // Prevents iPhone Safari from bouncing the whole page back to top after replies.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => {
      if (mq.matches) {
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
      } else {
        html.style.overflow = prevHtml;
        body.style.overflow = prevBody;
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.75rem)] max-w-5xl flex-col overflow-hidden px-3 pt-2 pb-0 sm:h-auto sm:min-h-screen sm:overflow-visible sm:px-6 sm:py-6">
      <header className="mb-1 flex shrink-0 items-center justify-between gap-3 sm:mb-4">
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

      <div className="min-h-0 flex-1 overflow-hidden sm:overflow-visible">
        <BrokAvatarPanel layout="stacked" />
      </div>
    </main>
  );
}

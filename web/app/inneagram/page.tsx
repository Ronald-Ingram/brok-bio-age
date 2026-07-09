"use client";

import { EnneagramStarIcon } from "@/components/EnneagramStarIcon";
import { InneagramPanel } from "@/components/InneagramPanel";
import { usePock } from "@/context/PockContext";
import { NORTH_STAR } from "@/lib/siteCopy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InneagramPage() {
  const { user } = usePock();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <EnneagramStarIcon className="h-8 w-8" size={32} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ingram Inneagram</h1>
            <p className="text-sm text-white/45">
              Nine Gates self-discovery · Tree of Life archetypes
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="text-sm text-white/45 hover:text-neon-cyan transition-colors"
        >
          Home
        </Link>
      </header>

      <p className="text-sm text-white/50 leading-relaxed mb-6 italic border-l-2 border-violet-400/30 pl-4 max-w-2xl">
        {NORTH_STAR}
      </p>

      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 px-5 py-6 text-center space-y-4">
        <p className="text-sm text-white/65 leading-relaxed max-w-xl mx-auto">
          Quick assessment from the Ingram Enneagram canon — dominant type, wings,
          repressed edge, and Riso-Hudson cross-reference. Saved locally and to your
          account when signed in.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/20 px-6 py-3 text-sm font-medium text-violet-200 hover:bg-violet-500/30 transition-colors"
        >
          <EnneagramStarIcon className="h-4 w-4" size={16} />
          Start Inneagram Assessment
        </button>
      </div>

      <InneagramPanel
        open={open}
        onClose={() => {
          setOpen(false);
          router.push("/");
        }}
        userId={user?.id}
      />
    </main>
  );
}
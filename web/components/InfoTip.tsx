"use client";

import type { GlossaryEntry } from "@/lib/glossary";
import { Info } from "lucide-react";
import { useId, useState } from "react";

interface InfoTipProps {
  entry: GlossaryEntry;
}

export function InfoTip({ entry }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center shrink-0 ml-1 align-middle">
      <button
        type="button"
        tabIndex={0}
        className="inline-flex text-white/35 hover:text-neon-cyan/80 transition-colors"
        aria-label={`${entry.term}: ${entry.full}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 bottom-full z-40 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/15 bg-[#12121a] px-3 py-2 text-left text-[11px] leading-snug text-white/80 shadow-xl"
        >
          <span className="block font-medium text-neon-cyan">{entry.full}</span>
          <span className="block text-white/55 mt-0.5 normal-case font-normal">
            {entry.definition}
          </span>
        </span>
      )}
    </span>
  );
}
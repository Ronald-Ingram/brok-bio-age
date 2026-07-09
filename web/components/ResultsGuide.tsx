"use client";

import { RESULTS_GUIDE } from "@/lib/resultsCopy";

export function ResultsGuide() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide text-white/45">
        {RESULTS_GUIDE.title}
      </p>
      <ul className="space-y-2.5 text-sm text-white/65">
        {RESULTS_GUIDE.items.map((item) => (
          <li key={item.label} className="leading-relaxed">
            <span className="font-medium text-white/85">{item.label}</span>
            <span className="text-white/45"> — </span>
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
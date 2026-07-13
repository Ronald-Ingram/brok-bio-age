"use client";

import {
  BROK_MEMORY_HIERARCHY_VERSION,
  BROK_MEMORY_LAYERS,
  BROK_TOPIC_SOURCE_ORDER,
} from "@/lib/brokMemoryHierarchy";
import { Layers } from "lucide-react";

/** Always-visible admin reference — update brokMemoryHierarchy.ts when structure changes. */
export function MemoryHierarchyPanel() {
  return (
    <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
          <Layers className="w-4 h-4 text-neon-cyan" />
          How BROK memory works
        </h2>
        <p className="text-[11px] text-white/40 mt-1">
          Hierarchy v{BROK_MEMORY_HIERARCHY_VERSION} — edit{" "}
          <code className="text-white/50">web/lib/brokMemoryHierarchy.ts</code> when
          layers or topic routing change, then redeploy.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className="py-2 pr-2">Layer</th>
              <th className="py-2 pr-2">Store</th>
              <th className="py-2 pr-2">Who writes</th>
              <th className="py-2 pr-2">TTL</th>
              <th className="py-2">Use for</th>
            </tr>
          </thead>
          <tbody className="text-white/60">
            {BROK_MEMORY_LAYERS.map((l) => (
              <tr key={l.id} className="border-b border-white/5 align-top">
                <td className="py-2 pr-2 text-white/80 font-medium whitespace-nowrap">
                  {l.name}
                </td>
                <td className="py-2 pr-2 font-mono text-[10px] text-white/45">
                  {l.store}
                </td>
                <td className="py-2 pr-2">{l.whoWrites}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{l.ttl}</td>
                <td className="py-2">{l.useFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-wider text-white/40">
          Topic source order
        </h3>
        {BROK_TOPIC_SOURCE_ORDER.map((t) => (
          <div
            key={t.topic}
            className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
          >
            <p className="text-xs text-neon-cyan/80 font-medium">{t.topic}</p>
            <ol className="mt-1 list-decimal list-inside text-[11px] text-white/55 space-y-0.5">
              {t.order.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white/35 leading-relaxed">
        Write rule: only admin (passkey/secret) can change medium memory or Canon.
        Chat can only suggest. Live markets/$POCK progress use @ronaldIngram + Grok —
        not Canon-only refusals.
      </p>
    </section>
  );
}

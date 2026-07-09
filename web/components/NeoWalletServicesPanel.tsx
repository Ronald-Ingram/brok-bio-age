"use client";

import {
  buildServiceCatalog,
  loadServicePrefs,
  saveServicePrefs,
  type NeoWalletService,
} from "@/lib/neoWalletCatalog";
import type { BrokUser } from "@/lib/pockTypes";
import { Check, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_STYLES: Record<
  NeoWalletService["status"],
  { label: string; className: string }
> = {
  active: { label: "On", className: "text-emerald-400 bg-emerald-400/10" },
  included: { label: "Included", className: "text-neon-cyan bg-neon-cyan/10" },
  off: { label: "Off", className: "text-white/40 bg-white/5" },
  coming_soon: { label: "Soon", className: "text-amber-400/80 bg-amber-400/10" },
};

interface NeoWalletServicesPanelProps {
  user: BrokUser;
}

export function NeoWalletServicesPanel({ user }: NeoWalletServicesPanelProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPrefs(loadServicePrefs());
  }, []);

  const services = buildServiceCatalog({
    subscriptionActive: user.subscription_active,
    subscriptionTier: user.subscription_tier,
    hasBalance: user.pock_balance > 0,
    servicePrefs: prefs,
  });

  const toggle = (id: string, current: boolean) => {
    const next = { ...prefs, [id]: !current };
    setPrefs(next);
    saveServicePrefs(next);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-bg-card p-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-white/80">Services & features</h3>
        <p className="text-xs text-white/40 mt-1">
          Toggle metered BROK services on or off. Subscriptions and core access
          follow your plan.
        </p>
      </div>

      <ul className="divide-y divide-white/5">
        {services.map((svc) => {
          const style = STATUS_STYLES[svc.status];
          const isOn = svc.status === "active" || svc.status === "included";

          return (
            <li
              key={svc.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white/85">{svc.name}</p>
                  <span
                    className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-white/45 mt-0.5">{svc.description}</p>
                <p className="text-[11px] text-neon-cyan/70 mt-1">{svc.priceLabel}</p>
              </div>

              {svc.toggleable ? (
                <button
                  type="button"
                  onClick={() => toggle(svc.id, isOn)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-neon-cyan transition-colors"
                  aria-pressed={isOn}
                >
                  {isOn ? (
                    <ToggleRight className="w-6 h-6 text-neon-cyan" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-white/35" />
                  )}
                  {isOn ? "On" : "Off"}
                </button>
              ) : svc.status === "coming_soon" ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-white/35">
                  <Clock className="w-3.5 h-3.5" />
                  Coming soon
                </span>
              ) : svc.status === "included" ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
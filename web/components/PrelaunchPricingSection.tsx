"use client";

import {
  PRELAUNCH_LABEL,
  PRELAUNCH_TIERS,
  USAGE_PRICING,
} from "@/lib/prelaunchPricing";
import { BROK_IN_EVERY_POCKET } from "@/lib/siteCopy";
import { SUBSCRIBE_PATH } from "@/lib/subscriptionConfig";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

export function PrelaunchPricingSection() {
  const premium = PRELAUNCH_TIERS.find((t) => t.id === "premium");
  const essential = PRELAUNCH_TIERS.find((t) => t.id === "essential");

  return (
    <section className="space-y-8" id="pricing">
      <div className="text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-neon-cyan/80">
          {PRELAUNCH_LABEL}
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
          Essential &amp; Pro — built for the mass market
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-white/50 leading-relaxed">
          {BROK_IN_EVERY_POCKET} Subscriptions unlock included $POCK pools.
          Metered voice and live avatar blocks bill only while BROK is actively
          speaking or animating — static mode stays free. Lock in{" "}
          {PRELAUNCH_LABEL.toLowerCase()} before July 24.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
        {essential && (
          <article className="rounded-2xl border border-white/10 bg-bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold">{essential.name}</h3>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm text-white/35 line-through">
                ${essential.strikethroughUsd}/mo
              </span>
              <span className="text-3xl font-semibold text-white">
                ${essential.priceUsd}
              </span>
              <span className="text-sm text-white/45">/mo</span>
            </div>
            <p className="text-xs text-amber-300/90 font-medium">{PRELAUNCH_LABEL}</p>
            <p className="text-sm text-white/55">{essential.tagline}</p>
            <ul className="space-y-2 text-sm text-white/60">
              {essential.highlights.slice(0, 4).map((h) => (
                <li key={h} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-neon-cyan mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </article>
        )}

        {premium && (
          <article className="relative rounded-2xl border border-neon-cyan/35 bg-gradient-to-b from-neon-cyan/8 to-bg-card p-6 space-y-4 shadow-[0_0_40px_rgba(0,249,255,0.08)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full border border-neon-cyan/40 bg-bg-dark px-3 py-1 text-[10px] uppercase tracking-wider text-neon-cyan">
                <Sparkles className="h-3 w-3" />
                Most valuable
              </span>
            </div>
            <h3 className="text-lg font-semibold pt-2">{premium.name}</h3>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg text-white/35 line-through decoration-white/25">
                ${premium.strikethroughUsd}/mo
              </span>
              <span className="text-4xl font-semibold text-neon-cyan">
                ${premium.priceUsd}
              </span>
              <span className="text-sm text-white/45">/mo</span>
            </div>
            <p className="text-xs text-amber-300/90 font-medium">{PRELAUNCH_LABEL}</p>
            <p className="text-sm text-white/60">{premium.tagline}</p>
            <ul className="space-y-2 text-sm text-white/65">
              {premium.highlights.slice(0, 5).map((h) => (
                <li key={h} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-neon-cyan mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>

      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/30 px-5 py-4 sm:px-6">
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-3">
          Active usage only — voice &amp; avatar (≈{USAGE_PRICING.marginTargetPct}%
          margin target)
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-white/80 font-medium">Voice blocks</p>
            <p className="text-white/45 text-xs mt-0.5">
              {USAGE_PRICING.voiceBlockPock} $POCK (~${USAGE_PRICING.voiceBlockUsd}) per{" "}
              {USAGE_PRICING.blockDurationSec}s while speaking
            </p>
          </div>
          <div>
            <p className="text-white/80 font-medium">Live avatar blocks</p>
            <p className="text-white/45 text-xs mt-0.5">
              {USAGE_PRICING.avatarBlockPock} $POCK (~${USAGE_PRICING.avatarBlockUsd}) per{" "}
              {USAGE_PRICING.blockDurationSec}s lip-sync
            </p>
          </div>
          <div>
            <p className="text-white/80 font-medium">Static mode</p>
            <p className="text-white/45 text-xs mt-0.5">
              $0 — static BROK image, no meter while not speaking
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href={SUBSCRIBE_PATH}
          className="inline-flex items-center justify-center rounded-xl border border-neon-cyan/50 bg-neon-cyan/12 px-8 py-3 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/22 transition-colors"
        >
          Subscribe — lock {PRELAUNCH_LABEL.toLowerCase()}
        </Link>
      </div>
    </section>
  );
}
"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Lock } from "lucide-react";

export interface PurchaseOptionProps {
  title: string;
  description: string;
  audience: string;
  ctaLabel: string;
  icon: LucideIcon;
  available?: boolean;
  badge?: string;
  highlight?: boolean;
  onAction?: () => void;
}

export function PurchaseOption({
  title,
  description,
  audience,
  ctaLabel,
  icon: Icon,
  available = true,
  badge,
  highlight = false,
  onAction,
}: PurchaseOptionProps) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 transition-colors ${
        highlight
          ? "border-neon-cyan/35 bg-gradient-to-br from-neon-cyan/8 to-bg-card"
          : "border-white/10 bg-bg-card"
      } ${!available ? "opacity-95" : ""}`}
    >
      {badge && (
        <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/45 border border-white/10">
          {badge}
        </span>
      )}

      <p className="text-[10px] uppercase tracking-widest text-white/35 mb-3">
        {audience}
      </p>

      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
          highlight ? "bg-neon-cyan/15" : "bg-white/5"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${highlight ? "text-neon-cyan" : "text-white/55"}`}
        />
      </div>

      <h3 className="text-base font-semibold text-white/90 pr-16">{title}</h3>
      <p className="text-sm text-white/50 mt-2 leading-relaxed flex-1">
        {description}
      </p>

      <button
        type="button"
        onClick={available ? onAction : undefined}
        disabled={!available}
        className={`mt-5 inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
          available
            ? highlight
              ? "bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30"
              : "bg-white/5 border border-white/15 text-white/80 hover:border-white/25 hover:bg-white/8"
            : "bg-white/5 border border-white/8 text-white/35 cursor-not-allowed"
        }`}
      >
        {!available && <Lock className="w-3.5 h-3.5" />}
        {ctaLabel}
        {available && <ArrowRight className="w-4 h-4" />}
      </button>
    </article>
  );
}
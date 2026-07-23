"use client";

import { useHideIds } from "@/context/HideIdsContext";
import { Eye, EyeOff } from "lucide-react";

/**
 * Demo / ambassador control: half-mask names & BROK account codes on screen.
 * Preference persists in localStorage (brok_hide_ids).
 */
export function HideIdsToggle({
  compact = false,
}: {
  /** Icon-only for tight mobile nav */
  compact?: boolean;
}) {
  const { hideIds, toggleHideIds, ready } = useHideIds();

  if (!ready) {
    return (
      <span
        className={`inline-flex shrink-0 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
        aria-hidden
      />
    );
  }

  const label = hideIds ? "Show IDs" : "Hide IDs";
  const title = hideIds
    ? "IDs hidden for demos — click to show full name and BROK code"
    : "Hide IDs — half-mask name and account code for demos and shared screens";

  return (
    <button
      type="button"
      onClick={toggleHideIds}
      title={title}
      aria-pressed={hideIds}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1 rounded-md border transition-colors ${
        hideIds
          ? "border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
          : "border-white/10 bg-black/20 text-white/50 hover:text-white/80 hover:border-white/20"
      } ${compact ? "h-7 w-7 p-0" : "h-8 px-2 sm:px-2.5"}`}
    >
      {hideIds ? (
        <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : (
        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      )}
      {!compact && (
        <span className="hidden text-[10px] font-medium tracking-wide sm:inline">
          {hideIds ? "IDs hidden" : "Hide IDs"}
        </span>
      )}
    </button>
  );
}

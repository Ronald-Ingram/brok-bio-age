import Image from "next/image";
import { GENIUS_TOKEN_LABEL, GENIUS_TOKEN_SYMBOL } from "@/lib/geniusWalletCopy";

interface GeniusDollarGLogoProps {
  size?: "hero" | "nav" | "inline";
  showLabel?: boolean;
}

const SIZES = {
  hero: {
    g: "w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52",
    gRound: "rounded-2xl sm:rounded-3xl",
    dollar: "text-4xl sm:text-5xl md:text-6xl",
    gap: "gap-3 sm:gap-5 md:gap-6",
    img: 208,
    pad: "p-3 sm:p-4",
  },
  nav: {
    g: "w-9 h-9",
    gRound: "rounded-lg",
    dollar: "text-sm",
    gap: "gap-1",
    img: 36,
    pad: "p-1",
  },
  inline: {
    g: "w-16 h-16",
    gRound: "rounded-xl",
    dollar: "text-2xl",
    gap: "gap-2",
    img: 64,
    pad: "p-2",
  },
} as const;

/** Dark green-teal tile — matches Genius Wallet hero gradient */
const G_TILE_BG =
  "bg-gradient-to-br from-[#181f1c] via-[#121916] to-[#0e1411] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export function GeniusDollarGLogo({
  size = "hero",
  showLabel = true,
}: GeniusDollarGLogoProps) {
  const s = SIZES[size];

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`relative flex items-center justify-center ${s.gap} ${
          size === "hero"
            ? "rounded-3xl border border-white/10 bg-gradient-to-b from-[#181f1c]/80 via-bg-card/60 to-bg-dark/80 px-6 py-5 sm:px-10 sm:py-7 shadow-[0_0_80px_rgba(0,249,255,0.08)]"
            : ""
        }`}
      >
        {size === "hero" && (
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(0,249,255,0.1)_0%,transparent_70%)]"
            aria-hidden
          />
        )}

        <span
          className={`shrink-0 font-semibold tracking-tight bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(200,220,240,0.25)] ${s.dollar}`}
          aria-hidden
        >
          $
        </span>

        <div
          className={`relative shrink-0 overflow-hidden ${s.g} ${s.gRound} ${G_TILE_BG} ${s.pad}`}
        >
          <Image
            src="/genius/genius-g-circuit-transparent.png"
            alt="Genius circuit G"
            fill
            priority={size === "hero"}
            sizes={`${s.img}px`}
            className="object-contain drop-shadow-[0_4px_24px_rgba(0,249,255,0.15)]"
          />
        </div>

        <span
          className={`shrink-0 font-semibold tracking-tight bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(200,220,240,0.25)] ${s.dollar}`}
          aria-hidden
        >
          $
        </span>
      </div>

      {showLabel && size === "hero" && (
        <div className="text-center space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            {GENIUS_TOKEN_LABEL}
          </p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-neon-cyan">
            {GENIUS_TOKEN_SYMBOL}
          </p>
        </div>
      )}
    </div>
  );
}
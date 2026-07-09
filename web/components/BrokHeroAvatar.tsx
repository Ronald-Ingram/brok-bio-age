"use client";

import { BROK_REFERENCE_IMAGE } from "@/lib/brokApiConfig";
import { BROK_AVATAR_LABEL } from "@/lib/brokProductLabels";
import Image from "next/image";
import Link from "next/link";

interface BrokHeroAvatarProps {
  size?: "landing" | "compact";
  showCta?: boolean;
}

export function BrokHeroAvatar({
  size = "landing",
  showCta = true,
}: BrokHeroAvatarProps) {
  const isLanding = size === "landing";

  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl">
      <div
        className={`relative overflow-hidden rounded-2xl border border-neon-cyan/25 bg-black shadow-[0_0_60px_rgba(0,249,255,0.12)] ${
          isLanding
            ? "aspect-[3/4] min-h-[320px] sm:min-h-[420px] lg:min-h-[520px]"
            : "aspect-[3/4] min-h-[280px]"
        }`}
      >
        <Image
          src={BROK_REFERENCE_IMAGE}
          alt="BROK — Rebel Banker Futurist avatar"
          fill
          priority
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 480px"
          className="object-contain object-center"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <p className="absolute bottom-3 inset-x-0 text-center text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
          {BROK_AVATAR_LABEL}
        </p>
      </div>

      {showCta && isLanding && (
        <Link
          href="/chat"
          className="absolute right-3 top-3 rounded-full border border-neon-cyan/35 bg-black/60 px-3 py-1.5 text-[10px] font-medium text-neon-cyan backdrop-blur-sm hover:bg-neon-cyan/15 transition-colors"
        >
          Talk to BROK →
        </Link>
      )}
    </div>
  );
}
import { BrokHeroAvatar } from "@/components/BrokHeroAvatar";
import { EnneagramStarIcon } from "@/components/EnneagramStarIcon";
import { GeniusWalletIcon } from "@/components/GeniusWalletIcon";
import { LandingSections } from "@/components/LandingSections";
import { PrelaunchPricingSection } from "@/components/PrelaunchPricingSection";
import { LANDING_LEDE } from "@/lib/landingCopy";
import {
  BROK_IN_EVERY_POCKET,
  BROK_TAGLINE,
  LAUNCH_DATE_LABEL,
  NORTH_STAR,
} from "@/lib/siteCopy";
import { Calculator, MessageSquare } from "lucide-react";
import Link from "next/link";

const CTAS = [
  {
    href: "/genius-wallet",
    label: "Genius Wallet",
    desc: "$POCK · hybrid custody · gifts",
    icon: GeniusWalletIcon,
    custom: true,
  },
  {
    href: "/chat",
    label: "Chat with BROK",
    desc: "Always-on proxy · voice optional",
    icon: MessageSquare,
    custom: false,
  },
  {
    href: "/bio-age",
    label: "Bio-Age",
    desc: "Levine + BROK-adjusted healthspan",
    icon: Calculator,
    custom: false,
  },
  {
    href: "/inneagram",
    label: "Inneagram",
    desc: "Mission · culture · self-knowledge",
    icon: EnneagramStarIcon,
    custom: true,
  },
] as const;

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <section className="flex flex-col items-center text-center">
        <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-neon-cyan/70">
          {BROK_TAGLINE} · {LAUNCH_DATE_LABEL}
        </p>

        <h1 className="max-w-3xl text-xl font-medium leading-snug text-white/90 sm:text-2xl md:text-[1.65rem] md:leading-relaxed">
          {NORTH_STAR}
        </h1>

        <p className="mt-4 max-w-2xl text-sm font-medium text-neon-cyan/80 sm:text-base">
          {BROK_IN_EVERY_POCKET}
        </p>

        <div className="mt-8 w-full sm:mt-10">
          <BrokHeroAvatar size="landing" />
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          {LANDING_LEDE}
        </p>

        <div className="mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {CTAS.map(({ href, label, desc, icon: Icon, custom }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center rounded-2xl border border-white/10 bg-bg-card px-4 py-5 text-center transition-colors hover:border-neon-cyan/35 hover:bg-neon-cyan/5"
            >
              {custom ? (
                <Icon
                  className="mb-3 h-6 w-6 transition-transform group-hover:scale-105"
                  size={24}
                />
              ) : (
                <Icon className="mb-3 h-6 w-6 text-neon-cyan transition-transform group-hover:scale-105" />
              )}
              <span className="text-sm font-semibold text-white/90">{label}</span>
              <span className="mt-1.5 text-[11px] leading-snug text-white/45">
                {desc}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <LandingSections />

      <div className="mt-16 sm:mt-20">
        <PrelaunchPricingSection />
      </div>

      <footer className="mt-16 border-t border-white/8 pt-8 text-center text-[11px] text-white/35 space-y-1">
        <p>BROK by Neobanx · Sovereign intelligence for wealth-first rebels</p>
        <p>
          Bio-Age is a research tool — not medical advice. Content is not tax,
          legal, or investment advice.
        </p>
        <p>
          <Link href="/bio-age" className="text-neon-cyan/70 hover:underline">
            Calculator
          </Link>
          {" · "}
          <Link href="/subscribe" className="text-neon-cyan/70 hover:underline">
            Subscribe
          </Link>
          {" · "}
          <Link href="/trust" className="text-neon-cyan/70 hover:underline">
            Trust &amp; security
          </Link>
          {" · "}
          <Link href="/#capabilities" className="text-neon-cyan/70 hover:underline">
            Capabilities
          </Link>
          {" · "}
          <Link href="/#ftep" className="text-neon-cyan/70 hover:underline">
            FTEP
          </Link>
          {" · "}
          <Link href="/#about" className="text-neon-cyan/70 hover:underline">
            About
          </Link>
        </p>
      </footer>
    </main>
  );
}

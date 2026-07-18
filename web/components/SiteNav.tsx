"use client";

import { AccountBadge } from "@/components/AccountBadge";
import { EnneagramStarIcon } from "@/components/EnneagramStarIcon";
import { GeniusWalletIcon } from "@/components/GeniusWalletIcon";
import { BROK_TAGLINE } from "@/lib/siteCopy";
import { Bot, Calculator, Dna, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/genius-wallet",
    label: "Genius Wallet",
    icon: GeniusWalletIcon,
    custom: true,
  },
  { href: "/bio-age", label: "Bio-Age", icon: Calculator, custom: false },
  {
    href: "/inneagram",
    label: "Inneagram",
    icon: EnneagramStarIcon,
    custom: true,
  },
  { href: "/chat", label: "Chat", icon: MessageSquare, custom: false },
  { href: "/trust", label: "Trust", icon: ShieldCheck, custom: false },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-bg-dark/90 backdrop-blur-md">
      {/* Ultra-compact mobile chrome — limited phone screen space */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-1.5 py-1 sm:gap-4 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-1 text-white/90 hover:text-neon-cyan transition-colors sm:gap-2.5"
        >
          <Dna
            className="h-4 w-4 shrink-0 text-neon-cyan sm:h-6 sm:w-6"
            strokeWidth={1.5}
          />
          <div className="min-w-0 leading-none sm:leading-tight">
            <span className="block text-[11px] font-semibold tracking-tight sm:text-sm">
              BROK
            </span>
            <span className="hidden text-[10px] text-white/40 sm:block">
              {BROK_TAGLINE}
            </span>
          </div>
        </Link>

        <nav
          className="flex items-center gap-0 sm:gap-2"
          aria-label="Main"
        >
          {LINKS.map(({ href, label, icon: Icon, custom }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
                  active
                    ? "bg-neon-cyan/12 text-neon-cyan border border-neon-cyan/25"
                    : "text-white/55 hover:text-white/90 hover:bg-white/5 border border-transparent"
                }`}
              >
                {custom ? (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" size={14} />
                ) : (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/avatar"
            className={`ml-0.5 inline-flex items-center justify-center rounded-md p-1.5 transition-colors sm:ml-1 sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
              pathname === "/avatar"
                ? "bg-neon-cyan/12 text-neon-cyan border border-neon-cyan/25"
                : "text-white/55 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/30"
            }`}
            title="BROK Live Avatar"
          >
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Avatar</span>
          </Link>
          <div className="ml-1 hidden border-l border-white/10 pl-3 sm:ml-2 sm:block">
            <AccountBadge />
          </div>
        </nav>
        {/* Mobile: icon-only account chip — full AccountBadge is too tall for the bar */}
        <div className="shrink-0 sm:hidden">
          <AccountBadge compactNav />
        </div>
      </div>
    </header>
  );
}

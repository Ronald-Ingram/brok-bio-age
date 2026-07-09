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
  const onLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-bg-dark/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 text-white/90 hover:text-neon-cyan transition-colors"
        >
          <Dna className="h-6 w-6 shrink-0 text-neon-cyan" strokeWidth={1.5} />
          <div className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold tracking-tight">BROK</span>
            <span className="hidden text-[10px] text-white/40 sm:block">
              {BROK_TAGLINE}
            </span>
          </div>
        </Link>

        <nav
          className={`flex items-center gap-1 sm:gap-2 ${
            onLanding ? "" : "text-sm"
          }`}
          aria-label="Main"
        >
          {LINKS.map(({ href, label, icon: Icon, custom }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  active
                    ? "bg-neon-cyan/12 text-neon-cyan border border-neon-cyan/25"
                    : "text-white/55 hover:text-white/90 hover:bg-white/5 border border-transparent"
                }`}
              >
                {custom ? (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" size={16} />
                ) : (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/avatar"
            className={`ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              pathname === "/avatar"
                ? "bg-neon-cyan/12 text-neon-cyan border border-neon-cyan/25"
                : "text-white/55 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/30"
            }`}
            title="BROK Live Avatar"
          >
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Avatar</span>
          </Link>
          <div className="ml-2 hidden border-l border-white/10 pl-3 sm:block">
            <AccountBadge />
          </div>
        </nav>
        <div className="sm:hidden">
          <AccountBadge />
        </div>
      </div>
    </header>
  );
}
import { DigitalAssetDisclaimer } from "@/components/DigitalAssetDisclaimer";
import {
  TRUST_FAQ_ITEMS,
  TRUST_FOOTNOTE,
  TRUST_PAGE_SUBTITLE,
  TRUST_PAGE_TITLE,
  TRUST_SECTIONS,
} from "@/lib/trustFaqCopy";
import { BROK_IN_EVERY_POCKET } from "@/lib/siteCopy";
import { Shield } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Trust · Security & Compliance | BROK",
  description:
    "Genius Wallet security, $POCK digital-asset treatment, self-sovereignty vision, and compliance FAQ.",
};

export default function TrustPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <Link
        href="/"
        className="text-sm text-white/45 hover:text-neon-cyan transition-colors"
      >
        ← BROK Home
      </Link>

      <header className="mt-6 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/8 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-neon-cyan">
          <Shield className="h-3.5 w-3.5" />
          Security & compliance
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
          {TRUST_PAGE_TITLE}
        </h1>
        <p className="text-sm leading-relaxed text-white/55">{TRUST_PAGE_SUBTITLE}</p>
        <p className="text-sm font-medium text-neon-cyan/85">{BROK_IN_EVERY_POCKET}</p>
      </header>

      <div className="mt-10 space-y-6">
        {TRUST_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border border-white/10 bg-bg-card p-5 sm:p-6 space-y-3"
          >
            <h2 className="text-base font-semibold text-white/90">{section.title}</h2>
            <p className="text-sm leading-relaxed text-white/60 whitespace-pre-line">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-base font-semibold text-white/90 px-1">
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {TRUST_FAQ_ITEMS.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-bg-card open:border-neon-cyan/20"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-white/85 marker:content-none flex justify-between gap-3">
                {item.question}
                <span className="text-white/30 group-open:rotate-45 transition-transform shrink-0">
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-white/55 border-t border-white/5 pt-3">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <DigitalAssetDisclaimer className="mt-10 text-center max-w-2xl mx-auto" />

      <p className="mt-6 text-center text-[11px] text-white/35 leading-relaxed">
        {TRUST_FOOTNOTE}
      </p>

      <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/45">
        <Link href="/genius-wallet" className="hover:text-neon-cyan transition-colors">
          Genius Wallet
        </Link>
        <Link href="/buy-pock" className="hover:text-neon-cyan transition-colors">
          Buy $POCK
        </Link>
        <Link href="/subscribe" className="hover:text-neon-cyan transition-colors">
          Subscriptions
        </Link>
      </nav>
    </main>
  );
}
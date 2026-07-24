import {
  ABOUT_BROK,
  ABOUT_INGRAM,
  CAPABILITIES_INTRO,
  CAPABILITIES_NOW,
  CAPABILITIES_SOON,
  FTEP_BODY,
  FTEP_METRICS,
  FTEP_TITLE,
  LANDING_CLOSING_CTA,
  LANDING_CLOSING_QUESTION,
  SINGULARITY_ECONOMICS_DEFINITION,
  SINGULARITY_ECONOMICS_FOOTNOTE,
  SINGULARITY_ECONOMICS_FORMULAS,
  SINGULARITY_ECONOMICS_TEASER,
  SINGULARITY_ECONOMICS_TITLE,
  USE_CASES,
} from "@/lib/landingCopy";
import Link from "next/link";
import type { ReactNode } from "react";

/** Stacked fraction — pure CSS, no KaTeX / no new deps (demo-safe). */
function MathFrac({
  num,
  den,
}: {
  num: ReactNode;
  den: ReactNode;
}) {
  return (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-0.5 text-[0.95em] leading-none">
      <span className="px-1.5 pb-1 border-b border-current">{num}</span>
      <span className="px-1.5 pt-1">{den}</span>
    </span>
  );
}

function MathSub({ children }: { children: ReactNode }) {
  return <sub className="text-[0.65em] opacity-90">{children}</sub>;
}

/** Proper notation without third-party math libraries. */
function FormulaDisplay({ id, fallback }: { id: string; fallback: string }) {
  const base =
    "inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1 font-serif text-base sm:text-lg text-neon-cyan";
  switch (id) {
    case "ftep":
      return (
        <span className={base} role="math" aria-label={fallback}>
          FTEP ={" "}
          <MathFrac
            num={
              <>
                O<MathSub>AI</MathSub>
              </>
            }
            den={
              <>
                O<MathSub>H</MathSub>
              </>
            }
          />
        </span>
      );
    case "energy-efficiency":
      return (
        <span className={base} role="math" aria-label={fallback}>
          E = <MathFrac num="FTEP" den="W" />
        </span>
      );
    case "p-nat":
      return (
        <span className={base} role="math" aria-label={fallback}>
          P
          <MathSub>nat</MathSub> = Σ
          <MathSub>i=1</MathSub>
          <sup className="text-[0.65em] relative -top-1">n</sup> FTEP
          <MathSub>i</MathSub> + J
        </span>
      );
    case "zpe":
      return (
        <span className={base} role="math" aria-label={fallback}>
          Z = m × FTEP̄
          <MathSub>ZPE</MathSub>
        </span>
      );
    case "c-roi":
      return (
        <span className={base} role="math" aria-label={fallback}>
          C-ROI ={" "}
          <MathFrac
            num={
              <>
                V<MathSub>out</MathSub> × E<MathSub>space</MathSub> × S
                <MathSub>settle</MathSub> × R<MathSub>free</MathSub>
              </>
            }
            den={
              <>
                C<MathSub>in</MathSub> + P<MathSub>consumed</MathSub> + R
                <MathSub>residual</MathSub>
              </>
            }
          />
        </span>
      );
    default:
      return (
        <span className={`${base} font-mono text-sm`} role="math">
          {fallback}
        </span>
      );
  }
}

export function LandingSections() {
  return (
    <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
      {/* Capabilities */}
      <section id="capabilities" className="space-y-6">
        <header className="space-y-2 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
            Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
            What BROK does now — and what&apos;s next
          </h2>
          <p className="text-sm sm:text-base text-white/55 leading-relaxed">
            {CAPABILITIES_INTRO}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <CapabilityCard
            badge="Available now"
            badgeClass="border-neon-cyan/40 text-neon-cyan"
            cardClass="border-neon-cyan/25 bg-gradient-to-b from-neon-cyan/8 to-bg-card"
            items={CAPABILITIES_NOW}
            bulletClass="bg-neon-cyan"
          />
          <CapabilityCard
            badge="Coming soon"
            badgeClass="border-amber-400/40 text-amber-300"
            cardClass="border-amber-400/20 bg-gradient-to-b from-amber-400/6 to-bg-card"
            items={CAPABILITIES_SOON}
            bulletClass="bg-amber-400"
          />
        </div>
      </section>

      {/* FTEP */}
      <section
        id="ftep"
        className="rounded-2xl border border-neon-cyan/30 bg-[radial-gradient(ellipse_at_top,rgba(0,249,255,0.12),transparent_55%)] from-neon-cyan/10 to-bg-card p-6 sm:p-8 space-y-4"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
          The new KPI
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
          {FTEP_TITLE}
        </h2>
        {FTEP_BODY.map((p) => (
          <p key={p.slice(0, 40)} className="text-sm sm:text-base text-white/55 leading-relaxed max-w-3xl">
            {p}
          </p>
        ))}
        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          {FTEP_METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/10 bg-black/25 px-4 py-4 space-y-2 cursor-default select-text"
            >
              <p className="text-neon-cyan font-semibold text-base">{m.label}</p>
              <p className="text-[12px] text-white/50 leading-snug font-medium">
                {m.detail}
              </p>
              <p className="text-[12px] sm:text-[13px] text-white/40 leading-relaxed">
                {m.body}
              </p>
            </div>
          ))}
        </div>

        {/* Singularity Economics — compact, click to expand (no new deps) */}
        <details
          id="singularity-economics"
          className="mt-4 group rounded-lg border border-white/10 bg-black/20 open:border-violet-400/25 open:bg-black/30"
        >
          <summary className="cursor-pointer list-none px-4 py-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 select-none [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-white/75 group-open:text-violet-200 shrink-0">
              {SINGULARITY_ECONOMICS_TITLE}
              <span className="ml-2 text-[11px] font-normal text-white/35 group-open:hidden">
                · expand
              </span>
              <span className="ml-2 text-[11px] font-normal text-white/35 hidden group-open:inline">
                · collapse
              </span>
            </span>
            <span className="text-[12px] sm:text-[13px] text-white/40 leading-snug group-open:hidden">
              {SINGULARITY_ECONOMICS_TEASER}
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/8">
            <p className="text-[13px] text-white/50 leading-relaxed max-w-3xl">
              {SINGULARITY_ECONOMICS_DEFINITION}
            </p>
            <div className="space-y-3">
              {SINGULARITY_ECONOMICS_FORMULAS.map((f) => (
                <article
                  key={f.id}
                  id={`formula-${f.id}`}
                  className="rounded-md border border-white/8 bg-black/25 px-3 py-3 space-y-2"
                >
                  <h4 className="text-[13px] font-medium text-white/70">
                    {f.title}
                  </h4>
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    {f.blurb}
                  </p>
                  <div className="rounded border border-neon-cyan/15 bg-black/40 px-3 py-3 overflow-x-auto text-center">
                    <FormulaDisplay id={f.id} fallback={f.formula} />
                  </div>
                  <dl className="space-y-1.5">
                    {f.symbols.map((s) => (
                      <div
                        key={s.symbol}
                        className="grid grid-cols-[minmax(4rem,auto)_1fr] gap-x-2 text-[11px] sm:text-[12px]"
                      >
                        <dt className="font-serif text-neon-cyan/85 shrink-0">
                          {s.symbol}
                        </dt>
                        <dd className="text-white/40 leading-snug">
                          {s.meaning}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed">
              {SINGULARITY_ECONOMICS_FOOTNOTE}
            </p>
          </div>
        </details>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="space-y-6">
        <header className="space-y-2 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
            Use cases
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
            Who BROK is for
          </h2>
          <p className="text-sm text-white/50">
            Eight starting personas — same stack, different missions.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <article
              key={u.title}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 space-y-1.5"
            >
              <h3 className="text-sm font-semibold text-white/90">{u.title}</h3>
              <p className="text-[12px] text-white/40 leading-snug">{u.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="space-y-6">
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80">
            Who we are
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
            About BROK · About Ronald Ingram
          </h2>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-bg-card p-5 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold text-white/90">About BROK</h3>
            {ABOUT_BROK.map((p) => (
              <p key={p.slice(0, 32)} className="text-sm text-white/55 leading-relaxed">
                {p}
              </p>
            ))}
          </article>
          <article className="rounded-2xl border border-white/10 bg-bg-card p-5 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold text-white/90">
              About Ronald Ingram
            </h3>
            {ABOUT_INGRAM.map((p) => (
              <p key={p.slice(0, 32)} className="text-sm text-white/55 leading-relaxed">
                {p}
              </p>
            ))}
          </article>
        </div>
      </section>

      {/* Closing CTA */}
      <section
        id="ask-brok"
        className="rounded-2xl border border-neon-cyan/35 bg-gradient-to-br from-neon-cyan/12 via-bg-card to-bg-card px-6 py-8 sm:px-10 sm:py-10 text-center space-y-4"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-neon-cyan/80">
          Next step
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
          {LANDING_CLOSING_QUESTION}
        </h2>
        <p className="text-base sm:text-lg text-neon-cyan/90 font-medium">
          {LANDING_CLOSING_CTA}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-6 py-3 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/25 transition-colors"
          >
            Chat with BROK
          </Link>
          <Link
            href="/avatar"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/30 px-6 py-3 text-sm font-medium text-white/75 hover:border-neon-cyan/30 hover:text-neon-cyan transition-colors"
          >
            Live avatar
          </Link>
        </div>
      </section>
    </div>
  );
}

function CapabilityCard({
  badge,
  badgeClass,
  cardClass,
  items,
  bulletClass,
}: {
  badge: string;
  badgeClass: string;
  cardClass: string;
  items: string[];
  bulletClass: string;
}) {
  return (
    <article className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cardClass}`}>
      <p
        className={`inline-flex text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeClass}`}
      >
        {badge}
      </p>
      <ul className="space-y-0">
        {items.map((item) => (
          <li
            key={item}
            className="relative pl-4 py-2.5 text-sm text-white/55 leading-snug border-b border-white/5 last:border-0"
          >
            <span
              className={`absolute left-0 top-[0.95rem] h-1.5 w-1.5 rounded-full ${bulletClass}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

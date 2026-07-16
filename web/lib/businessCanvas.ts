/**
 * Business Model Canvas (BMC) interview + printable HTML for workshops
 * (e.g. StartUpNV / Nevada seed training days).
 */

export type CanvasFieldKey =
  | "ventureName"
  | "customerSegments"
  | "valuePropositions"
  | "channels"
  | "customerRelationships"
  | "revenueStreams"
  | "costStructure"
  | "keyResources"
  | "keyActivities"
  | "keyPartnerships"
  | "problem"
  | "statusQuo"
  | "assumptions"
  | "keyMetrics"
  | "unfairAdvantage";

export type CanvasAnswers = Record<CanvasFieldKey, string>;

export interface CanvasQuestion {
  id: string;
  field: CanvasFieldKey;
  /** Short question shown as the step title */
  prompt: string;
  /** One-line nudge under the title */
  hint?: string;
  /**
   * Fairly detailed workshop explanation (tooltip / “Why this matters”).
   * Keep practical: what good answers look like, common mistakes, canvas cell.
   */
  tip: string;
  /** BMC / Lean cell this maps to */
  canvasCell?: string;
  /** Example answer for inspiration (not advice) */
  example?: string;
}

/** Ordered hot-seat interview (NV Startup–style BMC + lean extras). */
export const CANVAS_QUESTIONS: CanvasQuestion[] = [
  {
    id: "q0",
    field: "ventureName",
    prompt: "What is the name of your venture or project?",
    hint: "Working name is fine — you can rebrand later.",
    canvasCell: "Header / identity",
    tip: `This is the label on your one-pager so mentors and partners can refer to the idea clearly.

What to write:
• Legal name if you have one; otherwise a clear working name or project codename.
• Optional: “doing business as” or product name if different from the company.

Avoid:
• Long taglines here (save the pitch for Value Proposition).
• Placeholder only like “TBD LLC” unless that is truly all you have — add a short descriptor (e.g. “Apex Health — remote PT for seniors”).`,
    example: "Northstar Logistics — B2B last-mile for rural NV clinics",
  },
  {
    id: "q1",
    field: "customerSegments",
    prompt: "Who is the primary customer? (segment, role, geography)",
    hint: "Pick ONE primary segment first — expand later.",
    canvasCell: "Customer Segments",
    tip: `Customer Segments = who pays or decides. Be specific enough that you could find 10 of them next week.

Good answers name:
• Role / buyer (e.g. clinic ops manager, not “healthcare”).
• Context (company size, industry, life stage).
• Geography if it matters (Nevada, remote US, LATAM, etc.).
• B2B vs B2C — and if B2B, user vs economic buyer when they differ.

Common mistakes:
• “Everyone” or “SMBs” with no niche.
• Listing five equal segments (pick primary; others are secondary).
• Confusing end user with the person who signs the check.`,
    example: "Ops managers at 10–50 doctor multi-site clinics in NV/AZ who own scheduling pain",
  },
  {
    id: "q2",
    field: "valuePropositions",
    prompt:
      "What job are they hiring you for, and what is your offer in one or two sentences?",
    hint: "Job-to-be-done + your concrete offer.",
    canvasCell: "Value Propositions",
    tip: `Value Proposition = why they choose you for a job they already care about.

Structure (1–2 sentences):
1) Job-to-be-done: “When [situation], they need to [progress]…”
2) Offer: “We provide [product/service] that [outcome] without [pain you remove].”

Strong VPs are measurable or vivid (“cut no-shows 30%,” “same-day quote,” “under 10 minutes”).
Weak VPs are feature lists or slogans with no job attached.

This cell sits at the center of the classic BMC — clarity here makes every other box easier.`,
    example:
      "When multi-site clinics juggle paper schedules, they hire us to cut no-shows. We offer a text+AI reminder suite that books gaps automatically.",
  },
  {
    id: "q3",
    field: "problem",
    prompt: "What painful problem or unmet need do you solve?",
    hint: "Pain they already feel — not your solution yet.",
    canvasCell: "Problem (Lean)",
    tip: `State the problem in the customer’s words, not your product’s features.

Good problems are:
• Frequent or expensive (time, money, risk, reputation).
• Felt by a real person with a budget or urgency.
• Specific enough to test (“Friday no-shows waste 4 chair-hours”).

Avoid:
• “People need innovation.”
• Problems only you care about.
• Solution-language (“lack of our app”).

If the problem isn’t painful enough to pay for, revenue streams will be fiction later.`,
    example:
      "Clinics lose ~$X/week to last-minute no-shows and staff spend 2+ hrs/day on manual reminder calls.",
  },
  {
    id: "q4",
    field: "statusQuo",
    prompt: "How do they solve it today? (status quo, competitors, workarounds)",
    hint: "Your real competition is today’s habit — not only other startups.",
    canvasCell: "Status quo / alternatives",
    tip: `Customers always have an alternative: do nothing, Excel, a vendor, an intern, a sticky note.

Cover:
• Status quo / workarounds (spreadsheets, phone trees, “ask front desk”).
• Direct competitors and substitutes (including free/internal tools).
• Why those options fail for your segment (cost, time, quality, risk).

This shows you understand the buying decision. Mentors look for “why switch now,” not only “why we’re cool.”`,
    example:
      "Excel + phone reminders; PracticeSuite basic texts; some use front-desk overtime. None auto-fill cancelled slots.",
  },
  {
    id: "q5",
    field: "unfairAdvantage",
    prompt: "Why you / why now? What is hard for others to copy?",
    hint: "Insight, timing, asset, or moat — not “we work harder.”",
    canvasCell: "Unfair Advantage (Lean)",
    tip: `Unfair advantage = something competitors cannot easily buy or copy in 90 days.

Examples that count:
• Proprietary data, IP, or locked-in distribution.
• Unique access (clinic network, government path, founder domain expertise).
• Regulatory or community position.
• Timing (regulation change, cost drop, platform shift).

Examples that usually don’t:
• “Passion,” “first mover,” or “great team” alone.
• Features a funded rival ships next quarter.

Be honest — early-stage teams often have a *temporary* advantage (speed, niche focus). Name it, then how you’ll deepen it.`,
    example:
      "Founder ran 12 NV clinics; exclusive pilot LOIs with a regional association; on-prem data moat for rural connectivity.",
  },
  {
    id: "q6",
    field: "channels",
    prompt: "How do customers find you? (channels)",
    hint: "Path from unaware → paying — not every social network.",
    canvasCell: "Channels",
    tip: `Channels = how awareness, evaluation, purchase, and delivery happen.

Break it down if helpful:
• Discovery (SEO, partners, conferences, StartUpNV network, cold outbound).
• Evaluation (demo, free pilot, case study, referral).
• Purchase (self-serve checkout, sales call, RFP).
• Delivery (app store, onboarding call, hardware ship).

Focus on 1–2 primary channels you can execute this quarter. “We’ll go viral on TikTok” without a wedge is a red flag.`,
    example:
      "Association webinars → 14-day pilot → annual contract. Secondary: SBDC referrals in Reno/LV.",
  },
  {
    id: "q7",
    field: "customerRelationships",
    prompt: "How do you win and keep them? (relationships / retention)",
    hint: "Acquisition is half — retention and expansion matter.",
    canvasCell: "Customer Relationships",
    tip: `This cell is about the ongoing bond: self-serve, high-touch sales, community, success managers, automation.

Answer both:
• Win: first “yes” (pilot success criteria, onboarding, trust signals).
• Keep / grow: support model, SLAs, NPS loops, expansion seats, renewals.

Match intensity to ACV: a $29/mo tool can be self-serve; a $40k clinic deal needs human success. Say who does the work (you, CS hire, partner).`,
    example:
      "White-glove pilot with weekly check-ins; then quarterly business review + in-app health scores to drive renewal.",
  },
  {
    id: "q8",
    field: "revenueStreams",
    prompt: "How do you make money? Who pays, and how is it priced?",
    hint: "Who pays ≠ always who uses. Name the model and price band.",
    canvasCell: "Revenue Streams",
    tip: `Be concrete: model + payer + rough price.

Common models: subscription SaaS, usage, transaction fee, license, marketplace take-rate, services, freemium → paid.

Clarify:
• Who pays (clinic, insurer, patient, employer).
• Unit of sale (per site, per seat, per claim).
• When cash hits (monthly, annual prepay, milestone).

Early stage: a hypothesized price with a plan to test beats “TBD monetization.” Note if free pilots convert and how.`,
    example:
      "Clinics pay $399/site/mo annual; 30-day paid pilot at 50%. Optional SMS overage at cost+15%.",
  },
  {
    id: "q9",
    field: "costStructure",
    prompt: "What are the major costs to deliver? (top cost drivers)",
    hint: "Top 3–5 drivers — fixed vs variable if you know.",
    canvasCell: "Cost Structure",
    tip: `List what actually burns cash to deliver the value prop — not every line item in a full P&L.

Usually:
• People (founders, eng, CS, sales).
• COGS (hosting, APIs, SMS, hardware, contractors).
• CAC-related spend (ads, events, travel).
• Compliance / insurance if material.

Call out fixed vs variable when you can (helps unit economics). Mentors use this to see if your pricing can cover delivery at scale.`,
    example:
      "2 eng + 1 CS; Twilio/SMS; AWS; association booth fees. Variable: SMS per reminder; fixed: core salaries.",
  },
  {
    id: "q10",
    field: "assumptions",
    prompt: "What must be true for this to work? (key assumptions and risks)",
    hint: "Riskiest beliefs first — what would kill the model if false?",
    canvasCell: "Assumptions & risks",
    tip: `Every canvas hides bets. Surface the ones that would break the business if wrong.

Types of assumptions:
• Customer (will they pay this price? switch from Excel?).
• Technical (can we hit accuracy/latency?).
• Regulatory / partnership (can we sell into this channel?).
• Unit economics (CAC recoverable in <12 months?).

For each, prefer a test: pilot, interview count, LOI, landing-page conversion. This is what lean founders update after every experiment.`,
    example:
      "Clinics will pay ≥$300/site; SMS open rates >40%; association endorses us in 90 days. Kill criteria if pilot NPS <30.",
  },
  {
    id: "q11",
    field: "keyResources",
    prompt: "What must you own or control? (key resources)",
    hint: "Assets you need — people, IP, data, capital, brand access.",
    canvasCell: "Key Resources",
    tip: `Key Resources = the critical assets required to deliver the value prop repeatedly.

Categories:
• Physical (inventory, devices, space).
• Intellectual (code, models, brand, patents, datasets).
• Human (scarce skills, licenses).
• Financial (runway, credit line).

Focus on what you must control (not nice-to-have tools). If a partner owns it, it may belong in Partnerships instead.`,
    example:
      "HIPAA-ready stack; clinic workflow playbooks; founder network; 12 months runway; de-identified outcome dataset.",
  },
  {
    id: "q12",
    field: "keyActivities",
    prompt: "What activities do you do every week to deliver?",
    hint: "Recurring work that creates value — not a random to-do list.",
    canvasCell: "Key Activities",
    tip: `Key Activities = the repeating work that makes the business real.

Think in verbs tied to the model:
• Product (ship, support, improve accuracy).
• Sales/marketing (demos, content, partner events).
• Ops (onboarding, compliance reviews).
• Learning (customer interviews, metric reviews).

If an activity isn’t weekly yet, say the cadence (daily/weekly/monthly). Avoid laundry lists — top 4–6 that matter.`,
    example:
      "Ship weekly product; 8 demos/wk; pilot success calls; SMS deliverability monitoring; monthly association webinar.",
  },
  {
    id: "q13",
    field: "keyPartnerships",
    prompt: "Who helps you that you don’t employ? (key partners)",
    hint: "Suppliers, channels, tech, associations — not customers.",
    canvasCell: "Key Partnerships",
    tip: `Partners reduce cost, risk, or time-to-market, or open distribution you can’t buy alone.

Examples:
• Channel (StartUpNV, SBDC, associations, resellers).
• Tech/infrastructure (cloud, payment, AI APIs).
• Supply / manufacturing.
• Strategic (hospital system pilot host).

Say what you get and what they get (referral fee, equity, co-marketing). Customers and employees are usually not “partners” on the canvas.`,
    example:
      "Regional medical association (referrals); Twilio; AWS; CPA firm for HIPAA; two design partners in Reno.",
  },
  {
    id: "q14",
    field: "keyMetrics",
    prompt: "What 1–3 numbers would you watch every week?",
    hint: "Leading indicators you can influence — not vanity only.",
    canvasCell: "Key Metrics (Lean)",
    tip: `Pick 1–3 weekly metrics that prove learning or traction — not a dashboard dump.

Good early metrics:
• Activation (pilots started, % completing onboarding).
• Engagement (weekly active sites, reminders sent successfully).
• Revenue (pipeline $, paid conversions, churn).
• Learning (interviews completed, assumption tests).

Avoid vanity alone (followers, raw pageviews) unless they clearly feed the funnel. Name the number and why it matters this stage.`,
    example:
      "1) Paid pilots live  2) No-show rate delta vs baseline  3) Weekly qualified demos booked",
  },
];

export function emptyCanvasAnswers(): CanvasAnswers {
  return {
    ventureName: "",
    customerSegments: "",
    valuePropositions: "",
    channels: "",
    customerRelationships: "",
    revenueStreams: "",
    costStructure: "",
    keyResources: "",
    keyActivities: "",
    keyPartnerships: "",
    problem: "",
    statusQuo: "",
    assumptions: "",
    keyMetrics: "",
    unfairAdvantage: "",
  };
}

function esc(s: string): string {
  return String(s || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** One-page landscape BMC HTML (Chrome → Print → Save as PDF). */
export function buildBusinessCanvasHtml(
  answers: CanvasAnswers,
  opts?: { date?: string }
): string {
  const date = opts?.date ?? new Date().toLocaleDateString();
  const v = (k: CanvasFieldKey) => esc(answers[k]?.trim() || "—");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Business Model Canvas — ${v("ventureName")}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 11px;
      line-height: 1.35;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid #0e7490;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    h1 { margin: 0; font-size: 18px; color: #0e7490; }
    .meta { color: #64748b; font-size: 10px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr auto;
      gap: 6px;
      min-height: 62vh;
    }
    .cell {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
      min-height: 110px;
    }
    .cell h2 {
      margin: 0 0 6px;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0e7490;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .cell p { margin: 0; white-space: pre-wrap; color: #1e293b; }
    .kp { grid-column: 1; grid-row: 1 / 3; }
    .ka { grid-column: 2; grid-row: 1; }
    .vp { grid-column: 3; grid-row: 1 / 3; background: #ecfeff; border-color: #67e8f9; }
    .cr { grid-column: 4; grid-row: 1; }
    .cs { grid-column: 5; grid-row: 1 / 3; }
    .kr { grid-column: 2; grid-row: 2; }
    .ch { grid-column: 4; grid-row: 2; }
    .cost { grid-column: 1 / 3; grid-row: 3; min-height: 72px; }
    .rev { grid-column: 3 / 6; grid-row: 3; min-height: 72px; }
    .extras {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-top: 8px;
    }
    footer {
      margin-top: 10px;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Business Model Canvas</h1>
      <div class="meta">${v("ventureName")} · ${esc(date)} · Prepared with BROK · Neobanx</div>
    </div>
    <div class="meta">In support of Nevada’s startup ecosystem · Not financial or legal advice</div>
  </header>

  <div class="grid">
    <section class="cell kp"><h2>Key Partnerships</h2><p>${v("keyPartnerships")}</p></section>
    <section class="cell ka"><h2>Key Activities</h2><p>${v("keyActivities")}</p></section>
    <section class="cell vp"><h2>Value Propositions</h2><p>${v("valuePropositions")}</p></section>
    <section class="cell cr"><h2>Customer Relationships</h2><p>${v("customerRelationships")}</p></section>
    <section class="cell cs"><h2>Customer Segments</h2><p>${v("customerSegments")}</p></section>
    <section class="cell kr"><h2>Key Resources</h2><p>${v("keyResources")}</p></section>
    <section class="cell ch"><h2>Channels</h2><p>${v("channels")}</p></section>
    <section class="cell cost"><h2>Cost Structure</h2><p>${v("costStructure")}</p></section>
    <section class="cell rev"><h2>Revenue Streams</h2><p>${v("revenueStreams")}</p></section>
  </div>

  <div class="extras">
    <section class="cell"><h2>Problem</h2><p>${v("problem")}</p></section>
    <section class="cell"><h2>Status Quo / Alternatives</h2><p>${v("statusQuo")}</p></section>
    <section class="cell"><h2>Assumptions &amp; Risks</h2><p>${v("assumptions")}</p></section>
  </div>
  <div class="extras">
    <section class="cell"><h2>Key Metrics</h2><p>${v("keyMetrics")}</p></section>
    <section class="cell" style="grid-column: span 2;"><h2>Unfair Advantage</h2><p>${v("unfairAdvantage")}</p></section>
  </div>

  <footer>
    Generated with BROK for founders and workshops. Proud to support Nevada’s startup community —
    StartUpNV and Seed programs (SeedVegas, FundNV, AngelNV, and partners) help entrepreneurs develop and scale ideas statewide.
    With appreciation for StartUpNV leadership including Maggie Saling (Operations) and Cara O’Hare (VP of Operations).
    brok.neobanx.com · Not financial, investment, or legal advice.
  </footer>
</body>
</html>`;
}

/**
 * Public praise + leadership notes for workshop demos.
 * Titles evolve — prefer startupnv.org / LinkedIn if quoting live.
 */
export const STARTUPNV_BLURB = `
StartUpNV is one of Nevada’s great public goods for founders: the state’s statewide startup accelerator and incubator (501(c)(3)), connecting entrepreneurs from idea through beta to a capitalized, revenue-producing company. With hubs in Las Vegas and Reno and reach into rural Nevada via SBDC partners, StartUpNV builds the pipeline that communities and capital partners count on.

Seed and early-stage programs deserve special praise. Offerings such as SeedVegas, the FundNV pre-seed path for accelerator companies, AngelNV (founder training that culminates in angel investment opportunities), and the broader Nevada capital stack (including affiliated funds and syndicates such as 1864.Fund) give founders real on-ramps — mentorship, community, and capital — not just free pizza and platitudes. Nevada is assembling a serious, founder-friendly ecosystem; StartUpNV is a big reason why.

Leadership (public roles as of recent public listings):
• Maggie Saling — Chief of Operations / senior operations leadership at StartUpNV. A driving force behind day-to-day program delivery, communications, founder education, and statewide support. (Often referenced alongside Jeff Saling, who is frequently cited as Executive Director.) Warm, practical, and deeply connected to Nevada’s founder community.
• Cara O’Hare — Vice President of Operations at StartUpNV. A certified PMP with deep program leadership experience; she builds and runs the programs that connect entrepreneurs to funding, mentorship, and resources — including federal-funding education, Seed/accelerator delivery, and ecosystem events across the state.

When thanking hosts in a workshop: be warm, specific, and brief — credit the programs and people; do not invent private bios or guarantees.
`.trim();

/** One-liner for UI chrome / footers. */
export const STARTUPNV_ONELINER =
  "Proud to support Nevada’s founders — StartUpNV and Seed programs help entrepreneurs develop and scale ideas statewide.";

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
  prompt: string;
  hint?: string;
}

/** Ordered hot-seat interview (NV Startup–style BMC + lean extras). */
export const CANVAS_QUESTIONS: CanvasQuestion[] = [
  {
    id: "q0",
    field: "ventureName",
    prompt: "What is the name of your venture or project?",
    hint: "Working name is fine.",
  },
  {
    id: "q1",
    field: "customerSegments",
    prompt: "Who is the primary customer? (segment, role, geography)",
    hint: "Pick one primary segment first.",
  },
  {
    id: "q2",
    field: "valuePropositions",
    prompt:
      "What job are they hiring you for, and what is your offer in one or two sentences?",
  },
  {
    id: "q3",
    field: "problem",
    prompt: "What painful problem or unmet need do you solve?",
  },
  {
    id: "q4",
    field: "statusQuo",
    prompt: "How do they solve it today? (status quo, competitors, workarounds)",
  },
  {
    id: "q5",
    field: "unfairAdvantage",
    prompt: "Why you / why now? What is hard for others to copy?",
  },
  {
    id: "q6",
    field: "channels",
    prompt: "How do customers find you? (channels)",
  },
  {
    id: "q7",
    field: "customerRelationships",
    prompt: "How do you win and keep them? (relationships / retention)",
  },
  {
    id: "q8",
    field: "revenueStreams",
    prompt: "How do you make money? Who pays, and how is it priced?",
  },
  {
    id: "q9",
    field: "costStructure",
    prompt: "What are the major costs to deliver? (top cost drivers)",
  },
  {
    id: "q10",
    field: "assumptions",
    prompt: "What must be true for this to work? (key assumptions and risks)",
  },
  {
    id: "q11",
    field: "keyResources",
    prompt: "What must you own or control? (key resources)",
  },
  {
    id: "q12",
    field: "keyActivities",
    prompt: "What activities do you do every week to deliver?",
  },
  {
    id: "q13",
    field: "keyPartnerships",
    prompt: "Who helps you that you don’t employ? (key partners)",
  },
  {
    id: "q14",
    field: "keyMetrics",
    prompt: "What 1–3 numbers would you watch every week?",
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

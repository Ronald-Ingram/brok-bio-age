/** Public landing page copy — capabilities, FTEP, about, use cases */

export const LANDING_LEDE =
  "Your always-available intelligence layer for capital, strategy, and self-sovereignty — structured, explainable, and auditable. Access insights institutions pay Ingram thousands an hour for — at pennies on the dollar. Powered by $POCK, the first crypto stack built by a banking innovator, creator, and futurist.";

export const CAPABILITIES_INTRO =
  "BROK is an always-on proxy for how you work, decide, and build wealth: financial literacy for the singularity economy, foresight at whatever level you’re at, and structured decision-making with patented IEM (Ingram Evaluation Matrix) insights — from banking to healthcare to warfare and everything between.";

export const CAPABILITIES_NOW: string[] = [
  "Always-on proxy — chat, voice, and live avatar for strategy, deals, and daily decisions",
  "Institutional-grade insight, consumer price — banking, capital, and structure thinking that once cost four figures an hour",
  "Financial literacy for the singularity economy — foresight scaled to your level (solo → org → nation-scale framing)",
  "Rebel budget intelligence — far beyond “save more, spend less” expense-tracking that almost no one sustains; contrarian, proactive advice aimed at growing the top line dynamically through growth and development when that is what you want (with more features coming)",
  "IEM decision intelligence — structured, explainable, auditable evaluation across verticals",
  "Genius Wallet + $POCK — buy, gift, reserve, and self-custody path; crypto designed by a banking innovator",
  "Bio-Age — Levine PhenoAge + BROK-adjusted healthspan tracking",
  "Ingram Inneagram — personality, culture, and mission–vision–goal clarity for you or your organization",
  "Tax scenario review — complex situations (educational; founder case studies, not tax advice)",
  "Agreements & templates — review and draft business agreement patterns",
  "Funding & capital — prepare applications, sharpen pitches, map investor conversations",
  "Kiron Canon memory — founder-grade knowledge hierarchy, not a generic chatbot",
  "Family / sub-wallets — parent-controlled $POCK pockets",
];

export const CAPABILITIES_SOON: string[] = [
  "Multi-account reconciliation — one picture across banks, wallets, and entities",
  "CRM design & operation — run relationships as a Zero Person Enterprise",
  "Due diligence & opportunity analysis — personal POV + IEM scoring on deals",
  "Neoscore — patented alternative credit scoring for humans and AI agents",
  "Deeper founder twin — continuous sync from public Ingram / Grokipedia / LinkedIn-class corpus",
  "BROK-controlled spend wallet — agentic payments inside limits you set",
  "Org culture OS — Inneagram + goals + FTEP dashboards for teams and nations",
  "Full ZPE stack — ops, compliance, billing, multi-channel creator empire tools",
  "Cross-border & VBZ-ready privacy rails — self-sovereign banking vision at scale",
  "Agent API & multi-language — BROK as infrastructure for builders and communities",
];

export const FTEP_TITLE = "FTEP — Full-Time Equivalent Person output";

export const FTEP_BODY = [
  "In the singularity economy, the unit that matters is not headcount — it is how many full-time people you can output with leverage. FTEP measures productive capacity: one person + BROK aiming at ~100 FTEP of analyst, CFO, ops, and strategist work.",
  "Every individual, community, organization, and nation will eventually be scored on FTEP — how much real wealth, healthspan, and sovereign capability they produce per unit of human time. BROK is the console that raises your FTEP without hiring a hundred people.",
] as const;

export const FTEP_METRICS: {
  label: string;
  detail: string;
  body: string;
}[] = [
  {
    label: "~100 FTEP",
    detail: "One FTEP ≈ one average human in the role",
    body:
      "One FTEP is equivalent to the output of one average human in that role — so ~100 FTEP means an AI engine (here, BROK) is approximately equal to the productivity of 100 people. BROK aims to be the first 100-FTEP machine: one human plus BROK matching a pre-singularity legacy company that employed ~100 humans. Ingram argues this is how nations will measure economic capacity and growth.",
  },
  {
    label: "ZPE",
    detail: "Zero Person Enterprise — team-scale output, sovereign control",
    body:
      "Imagine the impact on GDP if unemployed, disabled, and disenfranchised humans can each create ZPEs — team-scale enterprises without a traditional org chart. Scaled to families and nations, that is a step change in national productivity, revenue, and abundance: more people generating real economic output under sovereign control, not locked out of the legacy payroll model.",
  },
  {
    label: "Time + healthspan",
    detail: "The assets FTEP and abundance are meant to protect",
    body:
      "With abundance and economic stability come higher aspirations — and wealth without health is hollow. From the start of the wealth-and-abundance journey, BROK provides health education and access to non-medical health research: tools and knowledge for seekers on the quest for health alongside financial freedom. Not medical advice — education and research framing so you can pursue longevity with the same intentionality as capital.",
  },
];

/** Extensible Singularity Economics block (formulas + symbols) — add entries over time. */
export const SINGULARITY_ECONOMICS_TITLE = "Singularity Economics";

/** One line under the title when collapsed (click to expand). */
export const SINGULARITY_ECONOMICS_TEASER =
  "A new economic theory for the singularity age — AI, crypto, robotics, energy, and health reshaping civilization faster than the industrial revolution.";

export const SINGULARITY_ECONOMICS_DEFINITION =
  "A new economic theory for a new age — the age of the singularity in AI — encompassing crypto, robotics, energy, and health breakthroughs that disrupt models across actuarial risk, health, education, and civilization more profoundly than the shift from agrarian economies to the industrial age. We are in the singularity age: progress multiplies exponentially across fields. Old limits and “laws” as seen through binary financial systems, rigid logic, and reductionist scientific theories must bend or break.";

export type FormulaBlock = {
  id: string;
  title: string;
  blurb: string;
  /** Display lines for the equation (rendered as stacked formula card). */
  formula: string;
  symbols: { symbol: string; meaning: string }[];
};

export const SINGULARITY_ECONOMICS_FORMULAS: FormulaBlock[] = [
  {
    id: "ftep",
    title: "FTEP — Full-Time Equivalent Person (FTEPower)",
    blurb:
      "AI/robotic productive capacity relative to a human baseline in the same metric. Unit: human-equivalents (h-eq). FTEP ≈ 100 means roughly the output of 100 average humans in that role — the target for one human + BROK.",
    formula: "FTEP = O_AI / O_H",
    symbols: [
      {
        symbol: "O_AI",
        meaning:
          "AI / system output (tasks completed, value created, or standardized units such as computations per second)",
      },
      {
        symbol: "O_H",
        meaning:
          "Average human full-time output in the same metric — one baseline worker in that role",
      },
      {
        symbol: "FTEP",
        meaning:
          "Human-equivalent productivity ratio (h-eq). Core productivity multiplier of Singularity Economics",
      },
    ],
  },
  {
    id: "energy-efficiency",
    title: "Energy efficiency (E) — MPG for productive capacity",
    blurb:
      "How much human-equivalent output you get per unit of energy — sustainable leverage, not brute force.",
    formula: "E = FTEP / W",
    symbols: [
      {
        symbol: "E",
        meaning: "Energy efficiency (human-equivalents per watt, or per kWh at scale)",
      },
      {
        symbol: "W",
        meaning: "Energy consumption in watts (or kWh for larger systems)",
      },
    ],
  },
  {
    id: "p-nat",
    title: "National / aggregate productive capacity (P_nat)",
    blurb:
      "How nations and communities will measure economic capacity in the singularity age: sum of machine FTEP plus remaining human work.",
    formula: "P_nat = Σ FTEP_i  +  J   (i = 1 … n)",
    symbols: [
      {
        symbol: "P_nat",
        meaning: "Total productive capacity of a nation, network, or community",
      },
      {
        symbol: "n",
        meaning: "Number of AI systems and/or Zero Person Enterprises (ZPEs)",
      },
      {
        symbol: "FTEP_i",
        meaning: "FTEP of the i-th AI system or ZPE",
      },
      {
        symbol: "J",
        meaning: "Remaining human jobs (hybrid measure — people still in the loop)",
      },
    ],
  },
  {
    id: "zpe",
    title: "ZPE contribution (Z)",
    blurb:
      "Zero Person Enterprises as a scalable term: many sovereign ZPEs, each carrying average FTEP, compound national and family abundance.",
    formula: "Z = m × FTEP̄_ZPE",
    symbols: [
      {
        symbol: "Z",
        meaning: "Aggregate ZPE productive contribution (human-equivalents)",
      },
      {
        symbol: "m",
        meaning: "Number of Zero Person Enterprises",
      },
      {
        symbol: "FTEP̄_ZPE",
        meaning: "Average FTEP per ZPE",
      },
    ],
  },
  {
    id: "c-roi",
    title: "C-ROI — Computational Return on Investment",
    blurb:
      "Master efficiency metric for singularity stacks: economic, transactional, agentic, and societal value per unit of compute, energy, and residual regulatory drag. Higher C-ROI systems attract capital, talent, and network effects. V_out includes ZPE activations and BROK/IEM decisions.",
    formula:
      "C-ROI = (V_out × E_space × S_settle × R_free) / (C_in + P_consumed + R_residual)",
    symbols: [
      {
        symbol: "V_out",
        meaning:
          "Value output (USD or tokenized) — settled volume, BROK/IEM decisions, ZPE activations, network utility",
      },
      {
        symbol: "E_space",
        meaning:
          "Space infrastructure efficiency multiplier (orbital compute, energy, latency advantages as they scale)",
      },
      {
        symbol: "S_settle",
        meaning:
          "Settlement security premium (e.g. Bitcoin finality with efficient execution layers)",
      },
      {
        symbol: "R_free",
        meaning:
          "Regulatory freedom / sovereign-collapse multiplier — gains from collapsing irrational compliance drag",
      },
      {
        symbol: "C_in",
        meaning: "Computational input (FLOPs, core-hours, normalized compute units)",
      },
      {
        symbol: "P_consumed",
        meaning: "Power / energy consumed (kWh or normalized energy units)",
      },
      {
        symbol: "R_residual",
        meaning:
          "Residual regulatory cost remaining; approaches zero in a fully sovereign / extraterritorial model",
      },
    ],
  },
];

export const SINGULARITY_ECONOMICS_FOOTNOTE =
  "Conceptual framework for education and product design — not investment advice, not audited financial statements, not medical advice. Formulas will expand as Singularity Economics develops.";

export const USE_CASES: { title: string; body: string }[] = [
  {
    title: "Veteran / operator",
    body: "Console for banking, ops, and 100-FTEP execution after service or career transition.",
  },
  {
    title: "Artist & creator",
    body: "Gallery, royalties, merch, investments — multi-channel empire without a 20-person team.",
  },
  {
    title: "Small business owner",
    body: "24/7 CFO brain: cash flow, compliance, structure, scalable engine.",
  },
  {
    title: "Trader",
    body: "Explainable risk and portfolio logic — hedge-desk clarity on a personal stack.",
  },
  {
    title: "Investor",
    body: "Deal flow, diligence, allocation — family-office thinking without the payroll.",
  },
  {
    title: "Freelancer",
    body: "Productize skills, automate billing, 100× leverage on delivery.",
  },
  {
    title: "Young founder / grad",
    body: "Full startup brain: finance, taxes, ops, fundraising, pitch craft.",
  },
  {
    title: "Nation / community builder",
    body: "FTEP literacy, culture (Inneagram), and self-sovereign economic tooling at scale.",
  },
];

export const ABOUT_BROK = [
  "BROK is Neobanx’s sovereign intelligence product — an always-available proxy that combines capital strategy, decision science (IEM), healthspan tools, and Genius Wallet ($POCK) in one stack. Private by design, self-sovereign by intent: you hold the account code and Device PIN; hybrid custody today, full on-chain path for those who want it.",
  "Built for wealth-first rebels who refuse to trade ownership for convenience — and for institutions ready to measure themselves in FTEP, not bureaucracy.",
] as const;

export const ABOUT_INGRAM = [
  "Founder · Rebel Banker Futurist · creator of the Ingram Evaluation Matrix (IEM), Ingram Inneagram, Neoscore vision, and the BROK / $POCK stack. Banking innovator, creator, and owner who prices institutional insight for the mass market.",
  "Public corpus (Grokipedia, LinkedIn, talks, Canon) trains the founder-grade memory BROK draws on — so you get Ingram-class structure without Ingram-class hourly fees.",
] as const;

export const USAGE_PUBLIC_BLURB =
  "Voice and live avatar use small $POCK blocks only while BROK is speaking or lip-syncing. Looking at a static image costs nothing. Transparent rates in-app.";

/** Closing CTA — landing page + chat memory */
export const LANDING_CLOSING_QUESTION = "What does all this mean for you?";
export const LANDING_CLOSING_CTA = "Ask BROK and find out.";

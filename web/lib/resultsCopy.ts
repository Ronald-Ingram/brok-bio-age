/** User-facing explanations for the results dashboard. */

export const RESULTS_GUIDE = {
  title: "How to read these results",
  items: [
    {
      label: "Calendar age",
      text: "Your chronological age from the form — not derived from labs.",
    },
    {
      label: "Reference labs",
      text: "Hypothetical Levine score if your biomarkers were replaced with fixed US-adult placeholder values at the same calendar age. It is not the average person’s bio-age and often sits below calendar age because the placeholders skew favorable.",
    },
    {
      label: "Standard Levine",
      text: "Levine PhenoAge from your actual labs and calendar age. No BROK context adjustments (DEXA, testosterone, creatinine discount, etc.).",
    },
    {
      label: "BROK PhenoAge",
      text: "Standard Levine plus transparent BROK adjustments shown in the audit list below (age scaling, HbA1c glucose, creatinine context, body composition).",
    },
  ],
} as const;

export const CARD_COPY = {
  standard: {
    subtitle: "Your labs · Levine formula only",
  },
  brok: {
    subtitle: "Your labs + BROK context adjustments",
  },
} as const;

export const CHART_COPY = {
  ageComparison: {
    title: "Age comparison",
    referenceNote:
      "Reference labs often read younger than calendar age: placeholders are static healthy-adult values, not age-matched population means.",
  },
  biomarkers: {
    title: "Your labs vs reference values",
    subtitle:
      "Lab units (not years). Gray = fixed US-adult placeholders for side-by-side comparison — not age-stratified norms.",
  },
  sensitivity: {
    subtitle: "How much ±1 SD perturbation moves standard Levine for your panel.",
  },
} as const;
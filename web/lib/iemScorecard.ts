import scorecard from "./data/iem-scorecard-detailed.json";

export type IemCategory = "Financial" | "Feasibility" | "Strategic" | "Risk";

export const IEM_CATEGORY_WEIGHTS = scorecard.category_weights as Record<
  IemCategory,
  number
>;

export const IEM_CATEGORY_MAX: Record<IemCategory, number> = {
  Financial: 6,
  Feasibility: 4,
  Strategic: 6,
  Risk: 4,
};

export function getIemFactorNames(): { category: IemCategory; name: string }[] {
  const out: { category: IemCategory; name: string }[] = [];
  for (const [category, data] of Object.entries(scorecard.categories)) {
    for (const factor of data.factors as { name: string }[]) {
      out.push({ category: category as IemCategory, name: factor.name });
    }
  }
  return out;
}

/** Compact factor list for LLM system prompt (authoritative spreadsheet model). */
export function formatIemReferenceForPrompt(): string {
  const lines: string[] = [
    "IEM SCORECARD REFERENCE (IEM_Scorecard_Detailed_v1 — operational spreadsheet model):",
    "Scoring: each sub-factor 1–5 (5 = ideal). Category weights: Financial 30%, Feasibility 20%, Strategic 30%, Risk 20%.",
    "Overall IEM = sum of weighted category scores, reported as X/20 (Financial /6, Feasibility /4, Strategic /6, Risk /4).",
    "",
  ];

  for (const [category, data] of Object.entries(scorecard.categories)) {
    const max = IEM_CATEGORY_MAX[category as IemCategory];
    const names = (data.factors as { name: string }[])
      .map((f) => f.name)
      .join("; ");
    lines.push(`${category} (${data.factor_count} factors, max ${max}/20): ${names}`);
  }

  return lines.join("\n");
}

export function isDealOrHighStakesEvaluation(
  message: string,
  opts?: { hasFileContext?: boolean; filenames?: string[] }
): boolean {
  const corpus = [message, ...(opts?.filenames ?? [])].join("\n");
  if (opts?.hasFileContext) return true;
  return /\b(iem|evaluate|evaluation|review|analyze|analyse|assess|score|decision|deal|proposal|pitch|deck|investment|partnership|cfo|term\s*sheet|due\s*diligence|loan|approve|approval|offer|agreement|memo|high[- ]stakes)\b/i.test(
    corpus
  );
}
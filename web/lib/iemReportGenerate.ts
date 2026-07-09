import { formatFileContextsForPrompt } from "./brokFileIngest";
import { formatIemReferenceForPrompt } from "./iemScorecard";
import type { IemReportData } from "./iemReportTypes";

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() ?? "";
const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() ?? "llama-3.3-70b-versatile";

const REPORT_SYSTEM = `You are BROK, producing a formal Ingram Evaluation Matrix (IEM) decision report.
Output ONLY valid JSON matching the schema below. No markdown fences, no commentary outside JSON.

${formatIemReferenceForPrompt()}

JSON schema:
{
  "subject": "string — deal or opportunity title",
  "counterparty": "string — other party name if known",
  "executive_summary": "string — 2-4 sentences, banker tone",
  "overall_score": number (0-20, one decimal allowed),
  "recommendation": "Proceed" | "Proceed with Conditions" | "Decline" | "Needs More Data",
  "categories": [
    {
      "name": "Financial" | "Feasibility" | "Strategic" | "Risk",
      "score": number,
      "max_score": 6 for Financial, 4 for Feasibility, 6 for Strategic, 4 for Risk,
      "factors": [
        { "name": "exact factor name from scorecard", "score": 1-5, "rationale": "one sentence tied to deal evidence" }
      ]
    }
  ],
  "strengths": ["string"],
  "gaps": ["string"],
  "conditions": ["string — conditions precedent if Proceed with Conditions"],
  "cfo_questions": ["string — max 5"],
  "methodology_note": "string — brief note that scores use IEM_Scorecard_Detailed_v1 (49 factors, 1-5 scale)"
}

Rules:
- Include all four categories in order: Financial, Feasibility, Strategic, Risk.
- Each category: 4-6 most relevant scored factors from the scorecard reference.
- Category scores must align with factor scores and weights (Financial max 6, Feasibility 4, Strategic 6, Risk 4).
- Do not invent bio-age, Kiron, or $POCK context unless documents explicitly require it.
- Do not repeat boilerplate already in source documents; add evaluative judgment.`;

function extractJson(raw: string): IemReportData {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as IemReportData;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("iem_report_json_parse_failed");
    return JSON.parse(match[0]) as IemReportData;
  }
}

function validateReport(data: IemReportData): IemReportData {
  if (!data.subject?.trim()) data.subject = "Opportunity Evaluation";
  if (!Array.isArray(data.categories) || data.categories.length < 4) {
    throw new Error("iem_report_incomplete_categories");
  }
  if (typeof data.overall_score !== "number") {
    throw new Error("iem_report_missing_score");
  }
  return data;
}

export async function generateIemReport(opts: {
  message: string;
  fileContexts?: { filename: string; text: string }[];
}): Promise<IemReportData> {
  if (!GROQ_API_KEY) throw new Error("groq_not_configured");

  const fileBlock = formatFileContextsForPrompt(opts.fileContexts ?? []);
  const userPrompt = [
    opts.message.trim() ||
      "Produce a full IEM evaluation report for the attached opportunity.",
    fileBlock ? `\n${fileBlock}` : "",
  ].join("");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REPORT_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`iem_report_failed: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("iem_report_empty_response");

  return validateReport(extractJson(content));
}
import { formatFileContextsForPrompt } from "./brokFileIngest";
import type {
  AccountingBasis,
  FinancialLine,
  FinancialsPackage,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
} from "./financialsTypes";

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() ?? "";
const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() ?? "openai/gpt-oss-120b";

const SYSTEM = `You are BROK, Neobanx agentic banker, producing INTERNALLY PREPARED financial statements for management use.

Output ONLY valid JSON matching the schema. No markdown fences.

PURPOSE:
- Walk founders/operators through management financials when they provide data, documents, or answers.
- Draft Income Statement, Balance Sheet, and Cash Flow from provided numbers.
- If data is thin: still produce best-effort statements with zeros/partial lines AND list interview_questions + data_gaps. Never invent fake bank balances or revenue as if known.

SCHEMA:
{
  "entity_name": "string",
  "period_label": "string e.g. Year ended December 31, 2025 or Month of June 2026",
  "currency": "USD" | "other ISO code",
  "basis": "cash" | "accrual" | "mixed" | "unknown",
  "prepared_for": "string optional",
  "executive_summary": "2-4 sentences banker tone",
  "income_statement": {
    "revenue": [{"label":"string","amount":number,"note":"optional"}],
    "cogs": [...],
    "operating_expenses": [...],
    "other_income_expense": [...],
    "gross_profit": number,
    "operating_income": number,
    "net_income": number
  },
  "balance_sheet": {
    "assets": [...],
    "liabilities": [...],
    "equity": [...],
    "total_assets": number,
    "total_liabilities": number,
    "total_equity": number
  },
  "cash_flow": {
    "operating": [...],
    "investing": [...],
    "financing": [...],
    "beginning_cash": number,
    "ending_cash": number,
    "net_change": number
  },
  "assumptions": ["string"],
  "data_gaps": ["what is still missing"],
  "interview_questions": ["next questions to ask the user — max 8"],
  "incomplete": boolean,
  "notes": ["accounting notes / classifications"]
}

RULES:
- Amounts are numbers in the stated currency (no $ signs). Use 0 when unknown rather than inventing.
- Prefer standard labels: Revenue, Cost of goods sold, Operating expenses, Cash, AR, Inventory, Fixed assets, AP, Debt, Owner equity, etc.
- Balance sheet: try Assets ≈ Liabilities + Equity; if unbalanced, note the plug gap in data_gaps and notes — do not silently invent equity to force balance unless labeled "Balancing plug (unverified)".
- Cash flow: indirect style OK; beginning + net_change ≈ ending when possible.
- Never claim audited/CPA/reviewed status.
- incomplete=true if key figures missing or mostly zeros.`;

function sumLines(lines: FinancialLine[]): number {
  return lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
}

function normalizeLines(raw: unknown): FinancialLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        label: String(r.label ?? "Line").trim() || "Line",
        amount: Number(r.amount) || 0,
        note: r.note != null ? String(r.note) : undefined,
      };
    })
    .filter((l) => l.label);
}

function extractJson(raw: string): FinancialsPackage {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as FinancialsPackage;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("financials_json_parse_failed");
    return JSON.parse(match[0]) as FinancialsPackage;
  }
}

function recompute(pkg: FinancialsPackage): FinancialsPackage {
  const is = pkg.income_statement;
  const rev = sumLines(is.revenue);
  const cogs = sumLines(is.cogs);
  const opex = sumLines(is.operating_expenses);
  const other = sumLines(is.other_income_expense);
  is.gross_profit = rev - cogs;
  is.operating_income = is.gross_profit - opex;
  is.net_income = is.operating_income + other;

  const bs = pkg.balance_sheet;
  bs.total_assets = sumLines(bs.assets);
  bs.total_liabilities = sumLines(bs.liabilities);
  bs.total_equity = sumLines(bs.equity);

  const cf = pkg.cash_flow;
  const op = sumLines(cf.operating);
  const inv = sumLines(cf.investing);
  const fin = sumLines(cf.financing);
  cf.net_change = op + inv + fin;
  if (cf.beginning_cash != null && cf.ending_cash == null) {
    cf.ending_cash = Number(cf.beginning_cash) + cf.net_change;
  }

  if (!Array.isArray(pkg.assumptions)) pkg.assumptions = [];
  if (!Array.isArray(pkg.data_gaps)) pkg.data_gaps = [];
  if (!Array.isArray(pkg.interview_questions)) pkg.interview_questions = [];
  if (!Array.isArray(pkg.notes)) pkg.notes = [];

  const basis = String(pkg.basis || "unknown") as AccountingBasis;
  if (!["cash", "accrual", "mixed", "unknown"].includes(basis)) {
    pkg.basis = "unknown";
  }

  const hasNumbers =
    rev !== 0 ||
    cogs !== 0 ||
    opex !== 0 ||
    (bs.total_assets ?? 0) !== 0 ||
    (bs.total_liabilities ?? 0) !== 0;
  if (!hasNumbers) pkg.incomplete = true;

  // Flag imbalance
  const assets = bs.total_assets ?? 0;
  const le = (bs.total_liabilities ?? 0) + (bs.total_equity ?? 0);
  const gap = Math.abs(assets - le);
  if (gap > 0.02 && assets + le > 0) {
    const msg = `Balance sheet imbalance: assets ${assets.toFixed(2)} vs L+E ${le.toFixed(2)} (gap ${gap.toFixed(2)}).`;
    if (!pkg.data_gaps.some((d) => d.includes("imbalance"))) {
      pkg.data_gaps.push(msg);
    }
  }

  pkg.entity_name = pkg.entity_name?.trim() || "Entity (unnamed)";
  pkg.period_label = pkg.period_label?.trim() || "Period (unspecified)";
  pkg.currency = pkg.currency?.trim() || "USD";
  pkg.executive_summary =
    pkg.executive_summary?.trim() ||
    "Internally prepared draft from available inputs.";

  return pkg;
}

function emptyPackage(message: string): FinancialsPackage {
  return recompute({
    entity_name: "Entity (unnamed)",
    period_label: "Period (unspecified)",
    currency: "USD",
    basis: "unknown",
    executive_summary:
      "Insufficient structured data returned. Use interview questions to complete.",
    income_statement: {
      revenue: [],
      cogs: [],
      operating_expenses: [],
      other_income_expense: [],
    },
    balance_sheet: { assets: [], liabilities: [], equity: [] },
    cash_flow: { operating: [], investing: [], financing: [] },
    assumptions: [],
    data_gaps: ["Model returned incomplete package"],
    interview_questions: [
      "What is the legal entity name and period (month/quarter/year)?",
      "Cash or accrual basis?",
      "Total revenue and main cost lines for the period?",
      "Cash balance, receivables, payables, debt, and equity at period end?",
    ],
    incomplete: true,
    notes: [message.slice(0, 200)],
  });
}

export async function generateFinancialsPackage(opts: {
  message: string;
  fileContexts?: { filename: string; text: string }[];
}): Promise<FinancialsPackage> {
  if (!GROQ_API_KEY) throw new Error("groq_not_configured");

  const fileBlock = formatFileContextsForPrompt(opts.fileContexts ?? []);
  const userPrompt = [
    opts.message.trim() ||
      "Prepare internally prepared financial statements from the attached materials and any figures in this request. If data is incomplete, draft partial statements and list interview questions.",
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
      temperature: 0.25,
      max_tokens: 5000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`financials_failed: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("financials_empty_response");

  try {
    const pkg = extractJson(content);
    // Ensure nested objects exist
    pkg.income_statement = {
      revenue: normalizeLines(pkg.income_statement?.revenue),
      cogs: normalizeLines(pkg.income_statement?.cogs),
      operating_expenses: normalizeLines(
        pkg.income_statement?.operating_expenses
      ),
      other_income_expense: normalizeLines(
        pkg.income_statement?.other_income_expense
      ),
      gross_profit: pkg.income_statement?.gross_profit,
      operating_income: pkg.income_statement?.operating_income,
      net_income: pkg.income_statement?.net_income,
    } as IncomeStatement;
    pkg.balance_sheet = {
      assets: normalizeLines(pkg.balance_sheet?.assets),
      liabilities: normalizeLines(pkg.balance_sheet?.liabilities),
      equity: normalizeLines(pkg.balance_sheet?.equity),
      total_assets: pkg.balance_sheet?.total_assets,
      total_liabilities: pkg.balance_sheet?.total_liabilities,
      total_equity: pkg.balance_sheet?.total_equity,
    } as BalanceSheet;
    pkg.cash_flow = {
      operating: normalizeLines(pkg.cash_flow?.operating),
      investing: normalizeLines(pkg.cash_flow?.investing),
      financing: normalizeLines(pkg.cash_flow?.financing),
      beginning_cash: pkg.cash_flow?.beginning_cash,
      ending_cash: pkg.cash_flow?.ending_cash,
      net_change: pkg.cash_flow?.net_change,
    } as CashFlowStatement;
    return recompute(pkg);
  } catch {
    return emptyPackage(content);
  }
}

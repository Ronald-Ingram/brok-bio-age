/** Internally prepared financial statements package (management-use only). */

export type AccountingBasis = "cash" | "accrual" | "mixed" | "unknown";

export interface FinancialLine {
  label: string;
  amount: number;
  note?: string;
}

export interface IncomeStatement {
  revenue: FinancialLine[];
  cogs: FinancialLine[];
  operating_expenses: FinancialLine[];
  other_income_expense: FinancialLine[];
  gross_profit?: number;
  operating_income?: number;
  net_income?: number;
}

export interface BalanceSheet {
  assets: FinancialLine[];
  liabilities: FinancialLine[];
  equity: FinancialLine[];
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
}

export interface CashFlowStatement {
  operating: FinancialLine[];
  investing: FinancialLine[];
  financing: FinancialLine[];
  beginning_cash?: number;
  ending_cash?: number;
  net_change?: number;
}

export interface FinancialsPackage {
  entity_name: string;
  period_label: string;
  currency: string;
  basis: AccountingBasis;
  prepared_for?: string;
  executive_summary: string;
  income_statement: IncomeStatement;
  balance_sheet: BalanceSheet;
  cash_flow: CashFlowStatement;
  assumptions: string[];
  data_gaps: string[];
  interview_questions: string[];
  incomplete: boolean;
  notes: string[];
}

export interface FinancialsPayload {
  package: FinancialsPackage;
  html: string;
  markdown: string;
  /** Base64-encoded .xlsx workbook */
  xlsx_base64: string;
  xlsx_filename: string;
  generated_at: string;
  sources: string[];
  provider: string;
  meter_cost?: number;
  disclaimer: string;
}

export const FINANCIALS_DISCLAIMER =
  "INTERNALLY PREPARED — management-use draft only. Not audited, not a CPA compilation/review/audit, not tax advice, not investment advice. Figures reflect information you provided (and reasonable roll-ups). Verify before external use.";

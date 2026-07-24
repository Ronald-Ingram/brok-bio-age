import ExcelJS from "exceljs";
import {
  FINANCIALS_DISCLAIMER,
  type FinancialLine,
  type FinancialsPackage,
} from "./financialsTypes";

function addLineRows(
  sheet: ExcelJS.Worksheet,
  lines: FinancialLine[],
  startRow: number
): number {
  let r = startRow;
  for (const line of lines) {
    sheet.getCell(r, 1).value = line.label;
    sheet.getCell(r, 2).value = line.amount;
    sheet.getCell(r, 2).numFmt = "#,##0.00";
    if (line.note) sheet.getCell(r, 3).value = line.note;
    r++;
  }
  return r;
}

function styleHeader(sheet: ExcelJS.Worksheet, title: string) {
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, 3);
  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 40;
}

export async function financialsToXlsxBuffer(
  pkg: FinancialsPackage,
  meta: { generated_at: string; sources: string[] }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BROK / Neobanx";
  wb.created = new Date();
  wb.modified = new Date();

  // Cover
  {
    const s = wb.addWorksheet("Cover");
    styleHeader(s, "Internally Prepared Financial Statements");
    s.getCell(3, 1).value = "Entity";
    s.getCell(3, 2).value = pkg.entity_name;
    s.getCell(4, 1).value = "Period";
    s.getCell(4, 2).value = pkg.period_label;
    s.getCell(5, 1).value = "Currency";
    s.getCell(5, 2).value = pkg.currency;
    s.getCell(6, 1).value = "Basis";
    s.getCell(6, 2).value = pkg.basis;
    s.getCell(7, 1).value = "Generated";
    s.getCell(7, 2).value = meta.generated_at;
    s.getCell(8, 1).value = "Sources";
    s.getCell(8, 2).value = meta.sources.join(", ") || "Chat / user inputs";
    s.getCell(9, 1).value = "Status";
    s.getCell(9, 2).value = pkg.incomplete
      ? "Incomplete draft"
      : "Draft ready";
    s.getCell(11, 1).value = "Disclaimer";
    s.getCell(11, 2).value = FINANCIALS_DISCLAIMER;
    s.mergeCells(11, 2, 14, 3);
    s.getCell(11, 2).alignment = { wrapText: true, vertical: "top" };
    s.getCell(16, 1).value = "Executive summary";
    s.getCell(16, 1).font = { bold: true };
    s.getCell(17, 1).value = pkg.executive_summary;
    s.mergeCells(17, 1, 20, 3);
    s.getCell(17, 1).alignment = { wrapText: true };
  }

  // Income statement
  {
    const s = wb.addWorksheet("Income Statement");
    styleHeader(s, `Income Statement — ${pkg.entity_name}`);
    s.getCell(2, 1).value = pkg.period_label;
    let r = 4;
    s.getCell(r, 1).value = "Revenue";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.income_statement.revenue, r);
    s.getCell(r, 1).value = "COGS";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.income_statement.cogs, r);
    s.getCell(r, 1).value = "Gross profit";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.income_statement.gross_profit ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r += 2;
    s.getCell(r, 1).value = "Operating expenses";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.income_statement.operating_expenses, r);
    s.getCell(r, 1).value = "Operating income";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.income_statement.operating_income ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r += 2;
    s.getCell(r, 1).value = "Other income / (expense)";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.income_statement.other_income_expense, r);
    s.getCell(r, 1).value = "Net income";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.income_statement.net_income ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
  }

  // Balance sheet
  {
    const s = wb.addWorksheet("Balance Sheet");
    styleHeader(s, `Balance Sheet — ${pkg.entity_name}`);
    s.getCell(2, 1).value = pkg.period_label;
    let r = 4;
    s.getCell(r, 1).value = "Assets";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.balance_sheet.assets, r);
    s.getCell(r, 1).value = "Total assets";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.balance_sheet.total_assets ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r += 2;
    s.getCell(r, 1).value = "Liabilities";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.balance_sheet.liabilities, r);
    s.getCell(r, 1).value = "Total liabilities";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.balance_sheet.total_liabilities ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r += 2;
    s.getCell(r, 1).value = "Equity";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.balance_sheet.equity, r);
    s.getCell(r, 1).value = "Total equity";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.balance_sheet.total_equity ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r++;
    s.getCell(r, 1).value = "Liabilities + equity";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value =
      (pkg.balance_sheet.total_liabilities ?? 0) +
      (pkg.balance_sheet.total_equity ?? 0);
    s.getCell(r, 2).numFmt = "#,##0.00";
  }

  // Cash flow
  {
    const s = wb.addWorksheet("Cash Flow");
    styleHeader(s, `Cash Flow — ${pkg.entity_name}`);
    s.getCell(2, 1).value = pkg.period_label;
    let r = 4;
    s.getCell(r, 1).value = "Operating";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.cash_flow.operating, r);
    r++;
    s.getCell(r, 1).value = "Investing";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.cash_flow.investing, r);
    r++;
    s.getCell(r, 1).value = "Financing";
    s.getCell(r, 1).font = { bold: true };
    r++;
    r = addLineRows(s, pkg.cash_flow.financing, r);
    r++;
    s.getCell(r, 1).value = "Net change in cash";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.cash_flow.net_change ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r++;
    s.getCell(r, 1).value = "Beginning cash";
    s.getCell(r, 2).value = pkg.cash_flow.beginning_cash ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
    r++;
    s.getCell(r, 1).value = "Ending cash";
    s.getCell(r, 1).font = { bold: true };
    s.getCell(r, 2).value = pkg.cash_flow.ending_cash ?? 0;
    s.getCell(r, 2).numFmt = "#,##0.00";
  }

  // Notes
  {
    const s = wb.addWorksheet("Notes & Gaps");
    styleHeader(s, "Assumptions, gaps, interview questions");
    let r = 3;
    s.getCell(r, 1).value = "Assumptions";
    s.getCell(r, 1).font = { bold: true };
    r++;
    for (const a of pkg.assumptions) {
      s.getCell(r, 1).value = a;
      r++;
    }
    r++;
    s.getCell(r, 1).value = "Data gaps";
    s.getCell(r, 1).font = { bold: true };
    r++;
    for (const a of pkg.data_gaps) {
      s.getCell(r, 1).value = a;
      r++;
    }
    r++;
    s.getCell(r, 1).value = "Interview questions";
    s.getCell(r, 1).font = { bold: true };
    r++;
    for (const a of pkg.interview_questions) {
      s.getCell(r, 1).value = a;
      r++;
    }
    r++;
    s.getCell(r, 1).value = "Notes";
    s.getCell(r, 1).font = { bold: true };
    r++;
    for (const a of pkg.notes) {
      s.getCell(r, 1).value = a;
      r++;
    }
    r += 2;
    s.getCell(r, 1).value = FINANCIALS_DISCLAIMER;
    s.mergeCells(r, 1, r + 2, 3);
    s.getCell(r, 1).alignment = { wrapText: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function slugifyEntity(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "entity";
}

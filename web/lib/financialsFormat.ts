import {
  FINANCIALS_DISCLAIMER,
  type FinancialLine,
  type FinancialsPackage,
} from "./financialsTypes";

function money(n: number | undefined, currency: string): string {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function linesMd(lines: FinancialLine[], currency: string): string {
  if (!lines.length) return "_None provided_\n";
  return lines
    .map(
      (l) =>
        `| ${l.label} | ${money(l.amount, currency)} |${l.note ? ` ${l.note}` : ""}`
    )
    .join("\n");
}

function linesHtml(lines: FinancialLine[], currency: string): string {
  if (!lines.length) {
    return `<tr><td colspan="2" class="muted">None provided</td></tr>`;
  }
  return lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.label)}${l.note ? `<div class="note">${escapeHtml(l.note)}</div>` : ""}</td><td class="num">${escapeHtml(money(l.amount, currency))}</td></tr>`
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function financialsToMarkdown(
  pkg: FinancialsPackage,
  meta: { generated_at: string; sources: string[] }
): string {
  const c = pkg.currency;
  const is = pkg.income_statement;
  const bs = pkg.balance_sheet;
  const cf = pkg.cash_flow;

  return [
    `# Internally Prepared Financial Statements`,
    ``,
    `**Entity:** ${pkg.entity_name}  `,
    `**Period:** ${pkg.period_label}  `,
    `**Currency:** ${c} · **Basis:** ${pkg.basis}  `,
    `**Generated:** ${meta.generated_at}  `,
    meta.sources.length
      ? `**Sources:** ${meta.sources.join(", ")}  `
      : `**Sources:** Chat / user inputs  `,
    ``,
    `> ${FINANCIALS_DISCLAIMER}`,
    ``,
    `## Executive summary`,
    pkg.executive_summary,
    ``,
    `## Income statement`,
    `| Line | Amount |`,
    `| --- | ---: |`,
    linesMd(is.revenue, c),
    linesMd(is.cogs, c),
    `| **Gross profit** | **${money(is.gross_profit, c)}** |`,
    linesMd(is.operating_expenses, c),
    `| **Operating income** | **${money(is.operating_income, c)}** |`,
    linesMd(is.other_income_expense, c),
    `| **Net income** | **${money(is.net_income, c)}** |`,
    ``,
    `## Balance sheet`,
    `### Assets`,
    `| Line | Amount |`,
    `| --- | ---: |`,
    linesMd(bs.assets, c),
    `| **Total assets** | **${money(bs.total_assets, c)}** |`,
    ``,
    `### Liabilities`,
    `| Line | Amount |`,
    `| --- | ---: |`,
    linesMd(bs.liabilities, c),
    `| **Total liabilities** | **${money(bs.total_liabilities, c)}** |`,
    ``,
    `### Equity`,
    `| Line | Amount |`,
    `| --- | ---: |`,
    linesMd(bs.equity, c),
    `| **Total equity** | **${money(bs.total_equity, c)}** |`,
    `| **Liabilities + equity** | **${money((bs.total_liabilities ?? 0) + (bs.total_equity ?? 0), c)}** |`,
    ``,
    `## Cash flow`,
    `| Section | Amount |`,
    `| --- | ---: |`,
    linesMd(cf.operating, c),
    linesMd(cf.investing, c),
    linesMd(cf.financing, c),
    `| **Net change in cash** | **${money(cf.net_change, c)}** |`,
    `| Beginning cash | ${money(cf.beginning_cash, c)} |`,
    `| Ending cash | ${money(cf.ending_cash, c)} |`,
    ``,
    `## Assumptions`,
    ...(pkg.assumptions.length
      ? pkg.assumptions.map((a) => `- ${a}`)
      : ["- None stated"]),
    ``,
    `## Data gaps`,
    ...(pkg.data_gaps.length
      ? pkg.data_gaps.map((a) => `- ${a}`)
      : ["- None noted"]),
    ``,
    `## Interview questions (to complete)`,
    ...(pkg.interview_questions.length
      ? pkg.interview_questions.map((a, i) => `${i + 1}. ${a}`)
      : ["1. None — package looks complete enough for a draft."]),
    ``,
    `## Notes`,
    ...(pkg.notes.length ? pkg.notes.map((a) => `- ${a}`) : ["- —"]),
    ``,
    pkg.incomplete
      ? `**Status:** Incomplete draft — answer interview questions and re-run Financials.`
      : `**Status:** Complete enough for an internally prepared draft.`,
    ``,
  ].join("\n");
}

export function financialsToHtml(
  pkg: FinancialsPackage,
  meta: { generated_at: string; sources: string[] }
): string {
  const c = pkg.currency;
  const is = pkg.income_statement;
  const bs = pkg.balance_sheet;
  const cf = pkg.cash_flow;

  const list = (items: string[]) =>
    items.length
      ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
      : `<p class="muted">None</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Financials — ${escapeHtml(pkg.entity_name)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; max-width: 880px; margin: 0 auto; padding: 28px 20px 48px; line-height: 1.45; }
  h1 { font-size: 1.35rem; margin: 0 0 4px; }
  h2 { font-size: 1.05rem; margin: 28px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h3 { font-size: 0.95rem; margin: 16px 0 8px; }
  .banner { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 12px 14px; border-radius: 10px; font-size: 0.85rem; margin: 14px 0 20px; }
  .meta { color: #64748b; font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 0.9rem; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.total td { font-weight: 700; background: #f1f5f9; }
  .note { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .muted { color: #94a3b8; }
  .status { display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .status.incomplete { background: #fef3c7; color: #92400e; }
  .status.ok { background: #d1fae5; color: #065f46; }
</style>
</head>
<body>
  <p class="meta">BROK · Neobanx · Internally prepared financials</p>
  <h1>${escapeHtml(pkg.entity_name)}</h1>
  <p class="meta">${escapeHtml(pkg.period_label)} · ${escapeHtml(c)} · ${escapeHtml(pkg.basis)} basis<br/>
  Generated ${escapeHtml(meta.generated_at)}${meta.sources.length ? ` · Sources: ${escapeHtml(meta.sources.join(", "))}` : ""}</p>
  <div class="banner">${escapeHtml(FINANCIALS_DISCLAIMER)}</div>
  <span class="status ${pkg.incomplete ? "incomplete" : "ok"}">${pkg.incomplete ? "Incomplete draft" : "Draft ready"}</span>
  <h2>Executive summary</h2>
  <p>${escapeHtml(pkg.executive_summary)}</p>

  <h2>Income statement</h2>
  <table>
    <thead><tr><th>Line</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${linesHtml(is.revenue, c)}
      ${linesHtml(is.cogs, c)}
      <tr class="total"><td>Gross profit</td><td class="num">${escapeHtml(money(is.gross_profit, c))}</td></tr>
      ${linesHtml(is.operating_expenses, c)}
      <tr class="total"><td>Operating income</td><td class="num">${escapeHtml(money(is.operating_income, c))}</td></tr>
      ${linesHtml(is.other_income_expense, c)}
      <tr class="total"><td>Net income</td><td class="num">${escapeHtml(money(is.net_income, c))}</td></tr>
    </tbody>
  </table>

  <h2>Balance sheet</h2>
  <h3>Assets</h3>
  <table>
    <thead><tr><th>Line</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${linesHtml(bs.assets, c)}
      <tr class="total"><td>Total assets</td><td class="num">${escapeHtml(money(bs.total_assets, c))}</td></tr>
    </tbody>
  </table>
  <h3>Liabilities</h3>
  <table>
    <thead><tr><th>Line</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${linesHtml(bs.liabilities, c)}
      <tr class="total"><td>Total liabilities</td><td class="num">${escapeHtml(money(bs.total_liabilities, c))}</td></tr>
    </tbody>
  </table>
  <h3>Equity</h3>
  <table>
    <thead><tr><th>Line</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${linesHtml(bs.equity, c)}
      <tr class="total"><td>Total equity</td><td class="num">${escapeHtml(money(bs.total_equity, c))}</td></tr>
      <tr class="total"><td>Liabilities + equity</td><td class="num">${escapeHtml(money((bs.total_liabilities ?? 0) + (bs.total_equity ?? 0), c))}</td></tr>
    </tbody>
  </table>

  <h2>Cash flow</h2>
  <table>
    <thead><tr><th>Line</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${linesHtml(cf.operating, c)}
      ${linesHtml(cf.investing, c)}
      ${linesHtml(cf.financing, c)}
      <tr class="total"><td>Net change in cash</td><td class="num">${escapeHtml(money(cf.net_change, c))}</td></tr>
      <tr><td>Beginning cash</td><td class="num">${escapeHtml(money(cf.beginning_cash, c))}</td></tr>
      <tr class="total"><td>Ending cash</td><td class="num">${escapeHtml(money(cf.ending_cash, c))}</td></tr>
    </tbody>
  </table>

  <h2>Assumptions</h2>
  ${list(pkg.assumptions)}
  <h2>Data gaps</h2>
  ${list(pkg.data_gaps)}
  <h2>Interview questions</h2>
  ${
    pkg.interview_questions.length
      ? `<ol>${pkg.interview_questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ol>`
      : `<p class="muted">None</p>`
  }
  <h2>Notes</h2>
  ${list(pkg.notes)}
</body>
</html>`;
}

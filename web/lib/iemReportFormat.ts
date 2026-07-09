import type { IemReportData } from "./iemReportTypes";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreClass(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.75) return "score-strong";
  if (pct >= 0.55) return "score-mid";
  return "score-weak";
}

export function iemReportToMarkdown(
  report: IemReportData,
  meta: { generated_at: string; sources: string[] }
): string {
  const lines: string[] = [
    `# Ingram Evaluation Matrix (IEM) Report`,
    ``,
    `**Subject:** ${report.subject}`,
    report.counterparty ? `**Counterparty:** ${report.counterparty}` : "",
    `**Date:** ${meta.generated_at}`,
    `**Overall IEM Score:** ${report.overall_score.toFixed(1)} / 20`,
    `**Recommendation:** ${report.recommendation}`,
    ``,
    `## Executive Summary`,
    report.executive_summary,
    ``,
    `## IEM Scorecard`,
  ].filter(Boolean);

  for (const cat of report.categories) {
    lines.push(
      `### ${cat.name} — ${cat.score.toFixed(1)} / ${cat.max_score}`,
      ``
    );
    for (const f of cat.factors) {
      lines.push(`- **${f.name}** (${f.score}/5): ${f.rationale}`);
    }
    lines.push("");
  }

  lines.push(
    `## Strengths`,
    ...report.strengths.map((s) => `- ${s}`),
    ``,
    `## Gaps & Risks`,
    ...report.gaps.map((g) => `- ${g}`),
    ``
  );

  if (report.conditions.length) {
    lines.push(
      `## Conditions Precedent`,
      ...report.conditions.map((c) => `- ${c}`),
      ``
    );
  }

  lines.push(
    `## CFO / Investor Questions`,
    ...report.cfo_questions.map((q) => `- ${q}`),
    ``,
    `## Methodology`,
    report.methodology_note,
    ``,
    `**Sources:** ${meta.sources.join(", ") || "User-provided context"}`,
    ``,
    `*Prepared by BROK — Ingram Evaluation Matrix (IEM_Scorecard_Detailed_v1). For discussion purposes; not legal or investment advice.*`
  );

  return lines.join("\n");
}

export function iemReportToHtml(
  report: IemReportData,
  meta: { generated_at: string; sources: string[] }
): string {
  const categoryRows = report.categories
    .map((cat) => {
      const factorRows = cat.factors
        .map(
          (f) => `
        <tr>
          <td>${esc(f.name)}</td>
          <td class="num">${f.score}/5</td>
          <td>${esc(f.rationale)}</td>
        </tr>`
        )
        .join("");

      return `
      <section class="category-block">
        <div class="category-header">
          <h3>${esc(cat.name)}</h3>
          <div class="category-score ${scoreClass(cat.score, cat.max_score)}">
            ${cat.score.toFixed(1)} <span>/ ${cat.max_score}</span>
          </div>
        </div>
        <table class="factor-table">
          <thead>
            <tr><th>Factor</th><th>Score</th><th>Rationale</th></tr>
          </thead>
          <tbody>${factorRows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const list = (items: string[]) =>
    items.map((i) => `<li>${esc(i)}</li>`).join("");

  const recClass = report.recommendation
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z-]/g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IEM Report — ${esc(report.subject)}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --line: #e2e8f0;
      --accent: #0e7490;
      --accent-soft: #ecfeff;
      --strong: #047857;
      --mid: #b45309;
      --weak: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background: #f8fafc;
      line-height: 1.55;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    }
    .masthead {
      padding: 36px 48px 28px;
      border-bottom: 3px solid var(--accent);
      background: linear-gradient(180deg, #fff 0%, #f0fdfa 100%);
    }
    .brand {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 12px;
    }
    h1 {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 28px;
      line-height: 1.2;
      margin: 0 0 8px;
      font-weight: 700;
    }
    .meta {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      color: var(--muted);
      display: grid;
      gap: 4px;
    }
    .score-banner {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      margin-top: 24px;
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
    }
    .overall {
      font-family: "Helvetica Neue", Arial, sans-serif;
    }
    .overall .label {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .overall .value {
      font-size: 42px;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
    }
    .overall .value span { font-size: 18px; color: var(--muted); font-weight: 500; }
    .recommendation {
      font-family: "Helvetica Neue", Arial, sans-serif;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid var(--line);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .recommendation.proceed-with-conditions { background: #fffbeb; color: var(--mid); }
    .recommendation.decline { background: #fef2f2; color: var(--weak); }
    .recommendation.needs-more-data { background: #f1f5f9; color: var(--muted); }
    .content { padding: 28px 48px 40px; }
    h2 {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent);
      margin: 28px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--line);
    }
    h2:first-child { margin-top: 0; }
    p, li { font-size: 15px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 6px; }
    .category-block { margin-bottom: 22px; }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }
    .category-header h3 {
      font-family: "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      font-size: 18px;
    }
    .category-score {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 22px;
      font-weight: 700;
    }
    .category-score span { font-size: 14px; color: var(--muted); font-weight: 500; }
    .category-score.score-strong { color: var(--strong); }
    .category-score.score-mid { color: var(--mid); }
    .category-score.score-weak { color: var(--weak); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    td.num { width: 72px; text-align: center; font-weight: 700; white-space: nowrap; }
    .footer {
      padding: 20px 48px 32px;
      border-top: 1px solid var(--line);
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      color: var(--muted);
      background: #f8fafc;
    }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="masthead">
      <div class="brand">BROK · Ingram Evaluation Matrix</div>
      <h1>${esc(report.subject)}</h1>
      <div class="meta">
        ${report.counterparty ? `<div><strong>Counterparty:</strong> ${esc(report.counterparty)}</div>` : ""}
        <div><strong>Report date:</strong> ${esc(meta.generated_at)}</div>
        <div><strong>Sources:</strong> ${esc(meta.sources.join(", ") || "User-provided context")}</div>
      </div>
      <div class="score-banner">
        <div class="overall">
          <div class="label">Overall IEM Score</div>
          <div class="value">${report.overall_score.toFixed(1)}<span> / 20</span></div>
        </div>
        <div class="recommendation ${recClass}">${esc(report.recommendation)}</div>
      </div>
    </header>
    <main class="content">
      <h2>Executive Summary</h2>
      <p>${esc(report.executive_summary)}</p>

      <h2>IEM Scorecard</h2>
      ${categoryRows}

      <h2>Strengths</h2>
      <ul>${list(report.strengths)}</ul>

      <h2>Gaps &amp; Risks</h2>
      <ul>${list(report.gaps)}</ul>

      ${
        report.conditions.length
          ? `<h2>Conditions Precedent</h2><ul>${list(report.conditions)}</ul>`
          : ""
      }

      <h2>CFO / Investor Questions</h2>
      <ul>${list(report.cfo_questions)}</ul>

      <h2>Methodology</h2>
      <p>${esc(report.methodology_note)}</p>
    </main>
    <footer class="footer">
      Prepared by BROK using IEM_Scorecard_Detailed_v1 (49-factor model). For discussion purposes only — not legal, tax, or investment advice.
    </footer>
  </div>
</body>
</html>`;
}
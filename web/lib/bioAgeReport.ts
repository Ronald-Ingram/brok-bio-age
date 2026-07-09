import type { BiomarkerInput, CalculateResponse, ContextFlags } from "@/lib/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bioAgeReportHtml(
  result: CalculateResponse,
  opts: {
    chronologicalAge: number;
    biomarkers: BiomarkerInput;
    context: ContextFlags;
    generated_at: string;
    test_date?: string;
  }
): string {
  const { chronologicalAge, biomarkers, context, generated_at, test_date } = opts;
  const adjRows = result.adjustments
    .map(
      (a) =>
        `<tr><td>${esc(a.field)}</td><td>${esc(a.reason)}</td></tr>`
    )
    .join("");

  const sensRows = (result.sensitivity ?? [])
    .slice(0, 8)
    .map(
      (s) =>
        `<tr><td>${esc(s.biomarker)}</td><td class="num">${s.delta_pheno_years_standard > 0 ? "+" : ""}${s.delta_pheno_years_standard.toFixed(2)} yr</td></tr>`
    )
    .join("");

  const paceBlock =
    result.pace?.pheno_elapsed_brok != null && result.pace.chrono_elapsed_years != null
      ? `<p><strong>Pace of aging:</strong> ${result.pace.pheno_elapsed_brok > 0 ? "+" : ""}${result.pace.pheno_elapsed_brok.toFixed(2)} yr pheno elapsed (BROK) vs calendar ${result.pace.chrono_elapsed_years.toFixed(2)} yr</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BROK Bio-Age Report — ${generated_at}</title>
<style>
  body{margin:0;font-family:Georgia,serif;color:#0f172a;background:#f8fafc}
  .page{max-width:820px;margin:0 auto;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.08)}
  .masthead{padding:32px 40px 24px;border-bottom:3px solid #06b6d4;background:linear-gradient(180deg,#fff,#ecfeff)}
  .brand{font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#0891b2;font-weight:700}
  h1{font-family:Helvetica,Arial,sans-serif;font-size:26px;margin:8px 0 4px}
  .sub{font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif}
  .content{padding:28px 40px 36px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
  .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;background:#fafafa}
  .card.brok{border-color:#67e8f9;background:#ecfeff}
  .label{font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#64748b}
  .age{font-size:36px;font-weight:700;margin:6px 0;font-family:Helvetica,Arial,sans-serif}
  .age.brok{color:#0891b2}
  h2{font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#0891b2;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:24px 0 12px}
  table{width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:12px}
  th{text-align:left;padding:8px 6px;border-bottom:2px solid #e2e8f0;color:#0891b2;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
  td{padding:7px 6px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  .num{text-align:right;font-weight:600}
  .interp{font-size:14px;line-height:1.65;color:#334155;border-left:3px solid #06b6d4;padding-left:14px;margin:16px 0}
  .disc{font-size:11px;color:#94a3b8;line-height:1.5}
  .footer{padding:18px 40px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;font-family:Helvetica,Arial,sans-serif;background:#f8fafc}
  @media print{body{background:#fff}.page{box-shadow:none}}
  @media (max-width:600px){.grid{grid-template-columns:1fr}.masthead,.content,.footer{padding-left:20px;padding-right:20px}}
</style></head><body>
<div class="page">
  <div class="masthead">
    <p class="brand">BROK · Neobanx Kiron</p>
    <h1>Bio-Age Report</h1>
    <p class="sub">Generated ${esc(generated_at)}${test_date ? ` · Lab date ${esc(test_date)}` : ""} · Calendar age ${chronologicalAge.toFixed(1)} yr</p>
  </div>
  <div class="content">
    <div class="grid">
      <div class="card">
        <p class="label">Standard Levine PhenoAge</p>
        <p class="age">${result.standard.pheno_age.toFixed(1)}</p>
        <p>Mortality risk ${(result.standard.mortality_risk * 100).toFixed(2)}% · vs calendar ${result.standard.delta_vs_chronological > 0 ? "+" : ""}${result.standard.delta_vs_chronological.toFixed(1)} yr</p>
      </div>
      <div class="card brok">
        <p class="label">BROK PhenoAge</p>
        <p class="age brok">${result.brok.pheno_age.toFixed(1)}</p>
        <p>Mortality risk ${(result.brok.mortality_risk * 100).toFixed(2)}% · vs standard ${result.delta_brok_vs_standard > 0 ? "+" : ""}${result.delta_brok_vs_standard.toFixed(1)} yr</p>
      </div>
    </div>
    ${paceBlock}
    ${result.interpretation ? `<p class="interp">${esc(result.interpretation)}</p>` : ""}
    ${
      adjRows
        ? `<h2>BROK adjustments</h2><table><thead><tr><th>Field</th><th>Reason</th></tr></thead><tbody>${adjRows}</tbody></table>`
        : ""
    }
    ${
      sensRows
        ? `<h2>Sensitivity (top drivers)</h2><table><thead><tr><th>Biomarker</th><th>Δ age</th></tr></thead><tbody>${sensRows}</tbody></table>`
        : ""
    }
    <h2>Context flags</h2>
    <p style="font-size:13px;color:#475569">Creatine supplementation: ${context.creatine_supplementation ? "Yes" : "No"}${context.testosterone_ng_dl != null ? ` · Testosterone ${context.testosterone_ng_dl} ng/dL` : ""}${context.body_fat_pct != null ? ` · Body fat ${context.body_fat_pct}%` : ""}</p>
    <h2>Disclaimers</h2>
    ${result.disclaimers.map((d) => `<p class="disc">${esc(d)}</p>`).join("")}
  </div>
  <div class="footer">
    Educational biohacker calculator — not medical advice. Model ${esc(result.model_version)} · brok.neobanx.com
  </div>
</div></body></html>`;
}
import {
  INGRAM_TYPES,
  formatIngramWithRiso,
  type IngramTypeId,
  type InneagramScoreResult,
} from "./ingramInneagram";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeBlock(id: number, label: string, score: number): string {
  const t = INGRAM_TYPES[id as keyof typeof INGRAM_TYPES];
  if (!t) return "";
  return `
    <div class="type-card">
      <div class="type-head">
        <span class="role">${esc(label)}</span>
        <span class="score-badge">${score} / 8</span>
      </div>
      <h3>${esc(t.name)} <span class="num">Ingram Type ${t.id}</span></h3>
      <p class="riso-pair">Riso-Hudson Type ${t.risoHudsonId} — ${esc(t.risoHudsonName)}</p>
      <p class="meta">${esc(t.sephirah)} · ${esc(t.planet)}</p>
      <p><strong>Strengths:</strong> ${esc(t.strengths)}</p>
      <p><strong>Challenges:</strong> ${esc(t.challenges)}</p>
      <p><strong>Path:</strong> ${esc(t.path)}</p>
    </div>`;
}

export function inneagramReportHtml(
  result: InneagramScoreResult,
  meta: { generated_at: string; subject?: string }
): string {
  const dom = INGRAM_TYPES[result.dominant];
  const counts = result.typeCounts;

  const barRows = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const)
    .map((id) => {
      const t = INGRAM_TYPES[id];
      const c = counts[id];
      const pct = Math.round((c / 8) * 100);
      return `<tr>
        <td class="bar-label">${esc(t.name)}</td>
        <td class="bar-ingram">Ingram ${t.id}</td>
        <td class="bar-riso">RH ${t.risoHudsonId} ${esc(t.risoHudsonName)}</td>
        <td class="bar-track-cell"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
        <td class="bar-num">${c}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Ingram Inneagram Profile — ${esc(dom.name)}</title>
<style>
  body{margin:0;font-family:Georgia,serif;color:#0f172a;background:#f8fafc}
  .page{max-width:820px;margin:0 auto;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.08)}
  .masthead{padding:32px 40px 24px;border-bottom:3px solid #7c3aed;background:linear-gradient(180deg,#fff,#faf5ff)}
  .brand{font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7c3aed;font-weight:700}
  h1{font-family:Helvetica,Arial,sans-serif;font-size:26px;margin:8px 0 4px}
  .sub{font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif}
  .content{padding:28px 40px 36px}
  h2{font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:24px 0 12px}
  h2:first-child{margin-top:0}
  .type-card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:14px;background:#fafafa}
  .type-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .role{font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;font-weight:700}
  .score-badge{font-family:Helvetica,Arial,sans-serif;font-weight:700;color:#0f172a}
  h3{margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:18px}
  .num{font-size:13px;color:#64748b;font-weight:500}
  .riso-pair{font-size:13px;color:#5b21b6;font-weight:600;margin:0 0 6px;font-family:Helvetica,Arial,sans-serif}
  .meta{font-size:13px;color:#64748b;margin:0 0 8px}
  .freq-table{width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:12px}
  .freq-table th{text-align:left;padding:8px 6px;border-bottom:2px solid #e2e8f0;color:#7c3aed;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
  .freq-table td{padding:7px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  .bar-label{font-weight:600;width:88px}
  .bar-ingram{color:#64748b;width:72px}
  .bar-riso{color:#5b21b6;width:130px}
  .bar-track-cell{width:40%}
  .bar-track{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa)}
  .bar-num{text-align:right;font-weight:700;width:28px}
  .note{font-size:13px;color:#475569;line-height:1.6}
  .footer{padding:18px 40px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;font-family:Helvetica,Arial,sans-serif;background:#f8fafc}
  @media print{body{background:#fff}.page{box-shadow:none}}
</style></head><body>
<div class="page">
  <header class="masthead">
    <div class="brand">BROK · Ingram Inneagram Analysis</div>
    <h1>${esc(meta.subject ?? `${dom.name} Profile`)}</h1>
    <p class="sub">${esc(meta.generated_at)} · Quick Assessment · ${esc(formatIngramWithRiso(result.dominant))}</p>
  </header>
  <main class="content">
    <h2>Executive Summary</h2>
    <p class="note">Your dominant Ingram archetype is <strong>${esc(dom.name)}</strong> (Ingram Type ${dom.id} / Riso-Hudson Type ${dom.risoHudsonId} ${esc(dom.risoHudsonName)}), mapped to ${esc(dom.sephirah)} on the Tree of Life. Types evolve — this is a snapshot, not a fixed label. Wings (2nd/3rd dominants) support your core; the repressed type is the shadow growth edge per Ingram Enneagram Summary (7.22).</p>

    <h2>Profile</h2>
    ${typeBlock(result.dominant, "Dominant", counts[result.dominant])}
    ${result.second ? typeBlock(result.second, "Second Dominant", counts[result.second]) : ""}
    ${result.third ? typeBlock(result.third, "Third Dominant", counts[result.third]) : ""}
    ${result.repressed ? typeBlock(result.repressed, "Repressed / Growth Edge", counts[result.repressed]) : ""}

    <h2>Type Frequency</h2>
    <table class="freq-table">
      <thead>
        <tr>
          <th>Ingram Type</th>
          <th>#</th>
          <th>Riso-Hudson</th>
          <th>Frequency</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>${barRows}</tbody>
    </table>

    <h2>Integration Guidance</h2>
    <p class="note">Strengthen your dominant and wing types as allies. Integrate the repressed type through self-remembering — do not attack it directly; assimilate its gifts. Reassess quarterly. Pair with IEM for high-stakes decisions.</p>
  </main>
  <footer class="footer">
    Ingram Enneagram © Ronald Ingram · Canonical sources: Ingram Enneagram Summary (7.22), Seven Secrets Book 2009 Manuscript.
    Riso-Hudson correspondence per Summary 7.22 table. For self-discovery — not clinical diagnosis.
  </footer>
</div></body></html>`;
}

export function inneagramReportMarkdown(
  result: InneagramScoreResult,
  meta: { generated_at: string }
): string {
  const dom = INGRAM_TYPES[result.dominant];
  const lines = [
    `# Ingram Inneagram Profile`,
    ``,
    `**Date:** ${meta.generated_at}`,
    `**Dominant:** ${formatIngramWithRiso(result.dominant)} — ${dom.sephirah}`,
    ``,
    `| Ingram Type | # | Riso-Hudson | Score |`,
    `|-------------|---|-------------|-------|`,
  ];

  for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9] as IngramTypeId[]) {
    const t = INGRAM_TYPES[id];
    lines.push(
      `| ${t.name} | ${t.id} | ${t.risoHudsonId} ${t.risoHudsonName} | ${result.typeCounts[id]} / 8 |`
    );
  }

  lines.push(``);
  const roles: [string, IngramTypeId | null][] = [
    ["Dominant", result.dominant],
    ["Second", result.second],
    ["Third", result.third],
    ["Repressed", result.repressed],
  ];
  for (const [role, id] of roles) {
    if (!id) continue;
    const t = INGRAM_TYPES[id];
    lines.push(
      `## ${role}: ${formatIngramWithRiso(id)}`,
      `- Score: ${result.typeCounts[id]} / 8`,
      `- Strengths: ${t.strengths}`,
      `- Path: ${t.path}`,
      ``
    );
  }
  return lines.join("\n");
}
---
name: business-canvas
description: >
  Run a lean Business Model Canvas interview (NV Startup / BMC style) via BROK-oriented
  questions, then generate a one-page printable customer PDF (HTML → Print to PDF).
  Use when the user says business canvas, BMC, lean canvas, startup training canvas,
  /business-canvas, or wants a PDF business model one-pager from interview answers.
---

# Business Model Canvas (BROK-assisted)

## When to use
- Live demos, NV Startup training, founder workshops
- User wants a **Business Model Canvas** (or close Lean Canvas) as a **shareable PDF**

## Do not
- Invent financial projections or legal claims
- Skip disclaimers on the PDF footer
- Require new product APIs unless building in-app later

## Phase 1 — Interview (ask in this order)

Keep each question **one at a time** in a hot-seat demo. Capture answers as structured notes.

### Block A — Customer & problem
1. **Who is the customer?** (segment, role, geography — one primary segment first)
2. **What job are they hiring you for?** (job-to-be-done in one sentence)
3. **What painful problem or unmet need do you solve?**
4. **How do they solve it today?** (status quo / competitors / workarounds)

### Block B — Value & offer
5. **What is your offer in one sentence?** (product/service)
6. **Why you / why now?** (unfair advantage, timing, insight)
7. **What are the top 3 benefits they feel in the first 30 days?**

### Block C — Channels & relationships
8. **How do customers find you?** (channels)
9. **How do you win and keep them?** (relationship / retention)

### Block D — Revenue & costs
10. **How do you make money?** (pricing model, who pays)
11. **What are the major costs to deliver?** (top cost drivers)
12. **What must be true for this to work?** (key assumptions / risks)

### Block E — Resources & partners
13. **What must you own or control?** (key resources)
14. **What activities do you do every week to deliver?** (key activities)
15. **Who helps you that you don’t employ?** (key partners)

Optional Lean Canvas extras (if time):
16. **Key metrics** (1–3 numbers you’d watch weekly)
17. **Unfair advantage** (cannot easily copy)

## Phase 2 — Map answers → BMC cells

| Canvas cell | From questions |
|-------------|----------------|
| Customer Segments | 1 |
| Value Propositions | 2, 5, 6, 7 |
| Channels | 8 |
| Customer Relationships | 9 |
| Revenue Streams | 10 |
| Cost Structure | 11 |
| Key Resources | 13 |
| Key Activities | 14 |
| Key Partnerships | 15 |
| (footer) Problem / Status quo | 3, 4 |
| (footer) Assumptions | 12 |
| (optional) Metrics / Unfair advantage | 16, 17 |

## Phase 3 — Generate PDF

1. Fill `references/canvas-template.html` placeholders (see script).
2. Run:

```bash
node .grok/skills/business-canvas/scripts/generate-canvas-html.mjs \
  --out ~/Downloads/business-canvas-<slug>.html \
  --data /path/to/answers.json
```

Or write answers JSON then generate (template also supports inline `--json '{...}'`).

3. Open the HTML in Chrome → **Print → Save as PDF** (landscape, backgrounds on).
4. Tell the user the file path.

### answers.json shape

```json
{
  "ventureName": "Acme",
  "date": "2026-07-16",
  "customerSegments": "...",
  "valuePropositions": "...",
  "channels": "...",
  "customerRelationships": "...",
  "revenueStreams": "...",
  "costStructure": "...",
  "keyResources": "...",
  "keyActivities": "...",
  "keyPartnerships": "...",
  "problem": "...",
  "statusQuo": "...",
  "assumptions": "...",
  "keyMetrics": "...",
  "unfairAdvantage": "..."
}
```

## In-app (preferred for room demos)
On production BROK (`/chat` or `/avatar`): tap **Business Canvas** (emerald button). Interview runs in a modal; **Print / Save PDF** or Download HTML. No voice/avatar $POCK for the canvas itself. StartUpNV praise + Maggie Saling / Cara O’Hare bios are in the done-screen note and FAQ knowledge.

## Live demo tip
- Mic STT into BROK for answers; after all blocks, use in-app canvas or generate HTML/PDF offline with this skill.
- Keep each spoken answer under ~30 seconds so the room stays moving.

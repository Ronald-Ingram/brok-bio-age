---
name: bio-age
description: >
  Calculate biological age using Levine PhenoAge and BROK-adjusted PhenoAge.
  Use when the user asks about biological age, pheno age, blood biomarkers,
  aging pace, deacceleration years, creatine/creatinine confounders, or
  invokes /bio-age.
metadata:
  short-description: "Biological age calculator — Levine + BROK PhenoAge"
---

# BROK Bio-Age

Compute **standard Levine PhenoAge** and **BROK-adjusted PhenoAge** via the local API.
BROK applies transparent adjustments for biohackers (creatine loading, high testosterone,
HbA1c preference, age scaling) while preserving Levine coefficients for comparability.

## Prerequisites

1. API running locally (default `http://127.0.0.1:8000`):

```bash
cd /Users/kiki/bio-age-tool
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

2. Set `BIOAGE_API_URL` if not using the default:

```bash
export BIOAGE_API_URL=http://127.0.0.1:8000
```

3. Verify health: `GET $BIOAGE_API_URL/health`

## Workflow

### 1. Parse lab report (optional)

If the user provides a PDF or pasted lab text:

```bash
curl -s -X POST "$BIOAGE_API_URL/api/v1/parse-pdf" \
  -F "file=@/path/to/lab_report.pdf"
```

Review extracted biomarkers and confidence scores before calculating.
Merge high-confidence values into the calculate payload; ask the user to confirm
ambiguous fields.

### 2. Calculate pheno age

`POST $BIOAGE_API_URL/api/v1/calculate` with JSON body:

| Section | Required fields |
|---------|-----------------|
| `biomarkers` | `albumin_g_dl`, `creatinine_mg_dl`, `crp_mg_l`, `lymphocyte_pct`, `mcv_fl`, `rdw_pct`, `alp_u_l`, `wbc_10e3`, `chronological_age` |
| `biomarkers` (one of) | `glucose_mg_dl` **or** `hba1c_pct` |
| `context` (optional) | `creatine_supplementation`, `testosterone_ng_dl`, `egfr`, DEXA fields |
| `config` (optional) | `age_mode`, `age_alpha`, `use_hba1c_over_glucose` |
| `prior_tests` (optional) | Prior draw dates + pheno ages for pace metrics |

**Default BROK config** (use unless user overrides):

```json
{
  "config": {
    "age_mode": "scaled",
    "age_alpha": 0.95,
    "use_hba1c_over_glucose": true
  }
}
```

Creatinine discount is capped at **50%** when creatine supplementation and testosterone ≥ 800 ng/dL.

Example curl (20260630 golden case):

```bash
curl -s -X POST "$BIOAGE_API_URL/api/v1/calculate" \
  -H 'Content-Type: application/json' \
  -d '{
    "biomarkers": {
      "albumin_g_dl": 4.4,
      "creatinine_mg_dl": 0.93,
      "glucose_mg_dl": 95,
      "crp_mg_l": 1.55,
      "lymphocyte_pct": 28,
      "mcv_fl": 94,
      "rdw_pct": 12.8,
      "alp_u_l": 160,
      "wbc_10e3": 5.5,
      "chronological_age": 57
    },
    "context": {
      "creatine_supplementation": true,
      "testosterone_ng_dl": 1239
    }
  }'
```

### 3. Present results

Always show:

| Metric | API field |
|--------|-----------|
| Standard PhenoAge | `standard.pheno_age` |
| BROK PhenoAge | `brok.pheno_age` |
| Delta (BROK − standard) | `delta_brok_vs_standard` |
| vs chronological | `standard.delta_vs_chronological`, `brok.delta_vs_chronological` |
| Adjustments audit | `adjustments[]` (age, glucose, creatinine) |
| Top sensitivities | `sensitivity[]` (± perturbation impact) |
| Pace (if prior_tests) | `pace` — `pace_ratio_brok`, `deceleration_years_brok` |
| Interpretation | `interpretation` |

Highlight the largest sensitivity drivers (typically RDW, glucose, creatinine).

### 4. Pace of aging (optional)

Supply `prior_tests` with the most recent prior draw and set `biomarkers.test_date`:

```json
{
  "biomarkers": { "...": "...", "test_date": "2026-06-30" },
  "prior_tests": [
    {
      "test_date": "2025-11-24",
      "chronological_age": 57,
      "pheno_age_standard": 52.28,
      "pheno_age_brok": 45.98
    }
  ]
}
```

Pace ratio > 1 means aging faster than calendar time; < 1 means deceleration.

### 5. Disclaimer (mandatory)

Always end with the API disclaimers (`disclaimers[]`) or this summary:

> BROK PhenoAge is an educational biohacker tool, not a medical diagnosis.
> Consult a clinician for health decisions. Adjustments are transparent and
> user-controlled; they do not replace standard Levine PhenoAge for clinical context.

## Install this skill

Source lives in the repo; copy or symlink for Grok discovery:

```bash
mkdir -p ~/.grok/skills/bio-age
cp /Users/kiki/bio-age-tool/.grok/skills/bio-age/SKILL.md ~/.grok/skills/bio-age/
# Or: ln -sf /Users/kiki/bio-age-tool/.grok/skills/bio-age ~/.grok/skills/bio-age
```

Invoke with `/bio-age` or by asking about biological age with lab values.

## Reference

- Design doc: `/Users/kiki/bio-age-tool/DESIGN.md`
- Golden fixtures: `tests/fixtures/brok_expected.json`
- Web UI: `cd web && npm run dev` → http://localhost:3000
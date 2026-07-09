# BROK Bio-Age Tool

Levine PhenoAge + BROK-adjusted biological age calculator for biohackers who want transparent,
auditable adjustments (creatine/creatinine, high testosterone, HbA1c preference, age scaling).

| Layer | Path | Role |
|-------|------|------|
| Engine | `brok_bioage/` | Pure Python math (source of truth) |
| API | `api/` | FastAPI — calculate, parse-pdf, health |
| Web | `web/` | Next.js 15 dark UI with charts + PDF upload |
| Skill | `.grok/skills/bio-age/` | Grok `/bio-age` terminal command |

See [DESIGN.md](./DESIGN.md) for architecture.  
See [PRIVACY.md](./PRIVACY.md) and [DEPLOY.md](./DEPLOY.md) for production posture.

## Quick start (local)

### API

```bash
cd /Users/kiki/bio-age-tool
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt

cp api/.env.example api/.env
uvicorn api.main:app --reload --port 8000
```

Health: http://localhost:8000/health

Calculate (20260630 golden case — standard ~53.57, BROK ~46.81):

```bash
curl -s -X POST http://localhost:8000/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"biomarkers":{"albumin_g_dl":4.4,"creatinine_mg_dl":0.93,"glucose_mg_dl":95,"crp_mg_l":1.55,"lymphocyte_pct":28,"mcv_fl":94,"rdw_pct":12.8,"alp_u_l":160,"wbc_10e3":5.5,"chronological_age":57},"context":{"creatine_supplementation":true,"testosterone_ng_dl":1239}}' \
  | python3 -m json.tool
```

Parse lab PDF/text:

```bash
curl -s -X POST http://localhost:8000/api/v1/parse-pdf \
  -F "file=@tests/fixtures/lab_report_quest_style.txt"
```

### Web

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `web/.env.local` if needed.

### Docker

Production stack (built images):

```bash
docker compose up --build
```

Dev stack with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

### Tests

```bash
pytest tests/ -v
```

Contract tests validate `POST /api/v1/calculate` against `tests/fixtures/brok_expected.json`.

Regenerate Levine golden fixtures from the spreadsheet:

```bash
python scripts/export_reference_fixtures.py
```

## Grok skill (`/bio-age`)

Install for terminal discovery:

```bash
mkdir -p ~/.grok/skills/bio-age
cp .grok/skills/bio-age/SKILL.md ~/.grok/skills/bio-age/
# Or symlink: ln -sf $(pwd)/.grok/skills/bio-age ~/.grok/skills/bio-age
```

Start the API, then invoke `/bio-age` or ask about biological age with lab values.
See [.grok/skills/bio-age/SKILL.md](./.grok/skills/bio-age/SKILL.md).

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness + model version |
| `POST` | `/api/v1/calculate` | Standard + BROK pheno age, sensitivity, pace |
| `POST` | `/api/v1/parse-pdf` | Regex lab report extraction (.pdf, .txt) |

## BROK defaults

- `age_mode: scaled`, `age_alpha: 0.95`
- Creatinine discount cap **50%** (creatine + testosterone ≥ 800 ng/dL)
- HbA1c glucose via ADA eAG: `28.7 × hba1c − 46.7`
- Pace uses **calendar elapsed** between test dates

## Status

| PR | Status |
|----|--------|
| PR 1 — Scaffold | ✅ |
| PR 2 — Levine engine | ✅ |
| PR 3 — BROK adjustments | ✅ |
| PR 4 — Calculate API | ✅ |
| PR 5 — PDF parser | ✅ |
| PR 6 — Web form + results | ✅ |
| PR 7 — Charts + history | ✅ |
| PR 8 — PDF upload UI | ✅ |
| PR 9 — Skill + docs + contract tests | ✅ |
| PR 10 — Docker CI + rate limits | ✅ |
| PR 11 — Prometheus metrics | ✅ |

## Observability

Optional Prometheus metrics — set `BIOAGE_METRICS_ENABLED=true` and scrape `GET /metrics`.
See [DEPLOY.md](./DEPLOY.md#observability-prometheus).

## CI

GitHub Actions (`.github/workflows/ci.yml`): pytest on Python 3.12, `npm run build`, Docker image builds.

## Reference data

`data/reference-phenoage.xlsx` — Levine PhenoAge spreadsheet (tabs `UseThisNextX` + historical `*(RI)` tabs).
# Deployment Guide — BROK Bio-Age Tool

Deploy the **Next.js web UI** and **FastAPI calculation API** separately.
The API is stateless; the web app calls it via `NEXT_PUBLIC_API_URL`.

## Architecture

```
Browser → Vercel (Next.js static/SSR) → Your API (Docker on Fly.io/Railway/Render)
```

Calculation math runs only in the API container (`brok_bioage/`).
The web app uses **Supabase** for $POCK wallets and **Stripe** for card top-ups.

## Prerequisites

- Python **3.12** for the API (matches `pyproject.toml`)
- Node **20+** for the web build
- Docker (optional, recommended for API)

## Local development

```bash
# API
cd /Users/kiki/bio-age-tool
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r api/requirements.txt
cp api/.env.example api/.env
uvicorn api.main:app --reload --port 8000

# Web
cd web && npm install && npm run dev
```

Or full production stack (built images):

```bash
docker compose up --build
```

Dev stack with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

- API: http://localhost:8000/health  
- Web: http://localhost:3000

## API deployment (Docker)

### Build and run

```bash
docker build -t brok-bioage-api --target api .
docker run -p 8000:8000 \
  -e BIOAGE_CORS_ORIGINS=https://your-app.vercel.app \
  brok-bioage-api
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BIOAGE_CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `BIOAGE_DEFAULT_AGE_ALPHA` | `0.95` | Default age scaling α |
| `BIOAGE_ENABLE_LLM_PARSE` | `false` | Enable LLM PDF fallback |
| `BIOAGE_PERSIST_UPLOADS` | `false` | Save uploaded PDFs to disk (not recommended) |
| `BIOAGE_METRICS_ENABLED` | `false` | Expose Prometheus `/metrics` endpoint |
| `XAI_API_KEY` | — | Required only if LLM parse enabled |
| `XAI_MODEL` | `grok-3` | LLM model for PDF fallback |

Copy `api/.env.example` to `api/.env` for local use. In production, inject vars via
your platform's secret manager.

### Fly.io (example)

```bash
fly launch --name brok-bioage-api --dockerfile Dockerfile
fly secrets set BIOAGE_CORS_ORIGINS=https://your-app.vercel.app
fly deploy
```

Note the public URL (e.g. `https://brok-bioage-api.fly.dev`) for the web app.

### Railway / Render

1. Connect the repo
2. Set Dockerfile path: `Dockerfile`, target: `api`
3. Expose port `8000`
4. Add environment variables from the table above
5. Deploy and copy the service URL

### Health check

Configure your platform to probe:

```
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "model_version": "brok-phenoage-0.1.0",
  "levine_verified": true,
  "llm_parse_enabled": false
}
```

## Web deployment (Vercel)

### Option A — Vercel CLI (recommended)

```bash
npm install -g vercel
vercel login
cd /Users/kiki/bio-age-tool
./scripts/deploy-vercel.sh
```

The script links the project, pushes env vars from `web/.env.local`, and runs `vercel deploy --prod`.
Add **Stripe** keys on the Vercel dashboard if not in `.env.local`:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

After first deploy, set `NEXT_PUBLIC_SITE_URL` to your production URL.

### Option B — Vercel Dashboard

1. Import the `web/` directory as a Vercel project (monorepo root: `web`)
2. Set build command: `npm run build`
3. Set environment variable:

```
NEXT_PUBLIC_API_URL=https://brok-bioage-api.fly.dev
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional — serve checkout at `kiron.ai/buy-pock`:

```
NEXT_PUBLIC_POCK_STRIPE_URL=https://kiron.ai/buy-pock
NEXT_PUBLIC_SITE_URL=https://kiron.ai
```

See [`deploy/kiron-buy-pock-proxy.example`](./deploy/kiron-buy-pock-proxy.example).

4. Deploy

The web app makes client-side `fetch` calls to the API. Ensure `BIOAGE_CORS_ORIGINS` on the
API includes your Vercel domain (e.g. `https://brok-bioage.vercel.app`).

### Preview deployments

Add preview URLs to CORS if you need branch previews:

```
BIOAGE_CORS_ORIGINS=https://brok-bioage.vercel.app,https://brok-bioage-*.vercel.app
```

(CORS does not support wildcards in all setups — list explicit preview origins or use a
staging API instance.)

## Rate limiting (required for public deploys)

The API does **not** embed rate limiting in v1 application code. Public deployments must
terminate TLS at a reverse proxy and enforce **100 requests/minute per IP** on `/api/v1/*`.

| Route | Limit | Rationale |
|-------|-------|-----------|
| `POST /api/v1/calculate` | 100/min/IP | Primary compute endpoint |
| `POST /api/v1/parse-pdf` | 100/min/IP | Upload + parse (heavier) |
| `GET /health` | Exempt or 300/min | Load balancer probes |

A ready-to-copy Caddy config lives at [`deploy/Caddyfile.example`](./deploy/Caddyfile.example).

### Caddy example

```caddyfile
brok-bioage-api.example.com {
    rate_limit {
        zone api_v1 {
            match path /api/v1/*
            key {remote_host}
            events 100
            window 1m
        }
    }
    reverse_proxy api:8000
}
```

### nginx example

```nginx
limit_req_zone $binary_remote_addr zone=bioage:10m rate=100r/m;

server {
    location /api/v1/ {
        limit_req zone=bioage burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

### Docker Compose + Caddy (optional sidecar)

For self-hosted full stack behind Caddy with rate limiting:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./deploy/Caddyfile.example:/etc/caddy/Caddyfile:ro
    depends_on:
      - api
```

Adjust limits for your expected traffic. Exceeding the limit should return HTTP 429.

## Observability (Prometheus)

Set `BIOAGE_METRICS_ENABLED=true` to expose `GET /metrics` (Prometheus text format).

| Metric | Type | Description |
|--------|------|-------------|
| `bioage_http_request_duration_seconds` | Histogram | Per-route HTTP latency |
| `bioage_http_requests_total` | Counter | Requests by method, route, status |
| `bioage_calculate_duration_seconds` | Histogram | Calculate handler latency |
| `bioage_calculate_requests_total` | Counter | Calculate success/error |
| `bioage_parse_pdf_duration_seconds` | Histogram | PDF parse handler latency |
| `bioage_parse_pdf_requests_total` | Counter | Parse success/error |

`/health` includes `metrics_enabled` for probe discovery. Biomarker values are never
included in metrics labels (privacy-safe).

Example scrape config:

```yaml
scrape_configs:
  - job_name: brok-bioage
    static_configs:
      - targets: ["api:8000"]
    metrics_path: /metrics
```

Enable in Docker Compose:

```yaml
environment:
  BIOAGE_METRICS_ENABLED: "true"
```

## Grok skill (terminal)

Install the `/bio-age` skill for local Grok CLI use:

```bash
mkdir -p ~/.grok/skills/bio-age
cp .grok/skills/bio-age/SKILL.md ~/.grok/skills/bio-age/
```

Point `BIOAGE_API_URL` at your deployed API if not running locally.
See [.grok/skills/bio-age/SKILL.md](./.grok/skills/bio-age/SKILL.md).

## Supabase migrations

**Automated (preferred):**

```bash
# Reset DB password in Supabase dashboard if SASL auth fails, update web/.env.local DATABASE_URL
python3 scripts/apply_pock_migration.py          # 002–005
python3 scripts/seed_corp_float.py --amount 500000
```

**Manual fallback:** paste [`supabase/migrations/002_through_005_combined.sql`](./supabase/migrations/002_through_005_combined.sql) in Supabase SQL Editor (001 already applied in cloud).

Individual files (in order):

1. [`supabase/migrations/001_pock_system.sql`](./supabase/migrations/001_pock_system.sql) — applied
2. [`supabase/migrations/002_stripe_pock.sql`](./supabase/migrations/002_stripe_pock.sql)
3. [`supabase/migrations/003_tiered_subscriptions.sql`](./supabase/migrations/003_tiered_subscriptions.sql)
4. [`supabase/migrations/004_pock_og_grandfather.sql`](./supabase/migrations/004_pock_og_grandfather.sql)
5. [`supabase/migrations/005_corp_wallet_funding.sql`](./supabase/migrations/005_corp_wallet_funding.sql)

## Stripe ($POCK top-up)

1. Create a Stripe account and enable Checkout
2. Add webhook endpoint: `https://your-app.vercel.app/api/stripe/webhook`
3. Subscribe to events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`
5. Copy secret key → `STRIPE_SECRET_KEY`

Packages (configured in `web/lib/purchaseConfig.ts`):

| $POCK | Price |
|-------|-------|
| 50 | $9.99 |
| 100 | $19.99 |
| 500 | $99.99 |

Test flow: My $POCK → Buy with Card → `/buy-pock` → Stripe → success page → balance updates via webhook.

## Kiron.AI checkout path

The BROK shopping cart lives at **`/buy-pock`** in this app (Kiron.AI branded).
Proxy `kiron.ai/buy-pock` to your deployed web app, or set `NEXT_PUBLIC_POCK_STRIPE_URL`.

## Verification checklist

After deployment:

```bash
# Health
curl -s https://your-api.example.com/health | jq .

# Golden calculate case (should return standard ~53.57, BROK ~46.81)
curl -s -X POST https://your-api.example.com/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"biomarkers":{"albumin_g_dl":4.4,"creatinine_mg_dl":0.93,"glucose_mg_dl":95,"crp_mg_l":1.55,"lymphocyte_pct":28,"mcv_fl":94,"rdw_pct":12.8,"alp_u_l":160,"wbc_10e3":5.5,"chronological_age":57},"context":{"creatine_supplementation":true,"testosterone_ng_dl":1239}}' \
  | jq '.standard.pheno_age, .brok.pheno_age'
```

Run the full test suite locally before promoting:

```bash
pytest tests/ -v
cd web && npm run build
```

## CI

GitHub Actions runs on every push/PR to `main`:

| Job | Command |
|-----|---------|
| `api-tests` | `pytest tests/ -v` (Python 3.12) |
| `web-build` | `npm ci && npm run build` (Node 20) |
| `docker-build` | `docker build` for `api` and `web` targets |

Workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

Reproduce locally:

```bash
pytest tests/ -v
cd web && npm ci && npm run build
docker compose build
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Add frontend origin to `BIOAGE_CORS_ORIGINS` |
| 422 on calculate | Ensure `glucose_mg_dl` or `hba1c_pct` is present |
| PDF parse empty | Try `.txt` export; enable LLM only if needed |
| Wrong pheno ages | Confirm API image includes latest `brok_bioage/` |

## Privacy

See [PRIVACY.md](./PRIVACY.md) before enabling LLM parsing or upload persistence in production.
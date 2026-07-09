# Privacy Policy — BROK Bio-Age Tool

**Last updated:** 2026-06-24  
**Scope:** BROK Bio-Age Tool v1 (local + self-hosted deployments)

This tool processes blood biomarker data that may constitute personal health information (PHI).
The default architecture is designed to minimize server-side retention and third-party exposure.

## Summary

| Data | Default handling |
|------|------------------|
| Biomarker values in `/calculate` | Processed in memory; **not logged or persisted** |
| Uploaded lab PDFs | Parsed in memory; **not saved** unless `BIOAGE_PERSIST_UPLOADS=true` |
| Calculation history (web UI) | Stored in **browser localStorage only** (`brok_bioage_history_v1`) |
| LLM PDF parsing | **Off by default** (`BIOAGE_ENABLE_LLM_PARSE=false`) |
| Server database | **None in v1** — no accounts, no multi-user storage |

## What we collect (server)

By default, the API does **not** store:

- Request bodies from `POST /api/v1/calculate`
- Uploaded files from `POST /api/v1/parse-pdf`
- User identity or session tokens

The API may emit structured logs for operational health (request path, status code, latency).
**Biomarker values and PDF contents are not written to logs.**

## What stays on your device

The Next.js web UI saves calculation results to `localStorage` so you can view history charts.
This data never leaves your browser unless you explicitly share it.
Clear it anytime via browser dev tools or by removing the `brok_bioage_history_v1` key.

## Optional LLM PDF parsing

When `BIOAGE_ENABLE_LLM_PARSE=true` and an API key is configured, extracted lab text may be
sent to an external LLM provider for parsing. This is **opt-in per deployment**.

Implications:

- Lab report text leaves your infrastructure
- Provider terms and data handling apply
- Regex parsing is attempted first; LLM is a fallback only

**Recommendation:** Keep LLM parsing disabled for maximum privacy. Use manual entry or
regex-only PDF parsing.

## Third parties

| Component | When involved | Data shared |
|-----------|---------------|-------------|
| LLM provider (xAI, etc.) | Only if `BIOAGE_ENABLE_LLM_PARSE=true` | Lab report text (truncated to 15k chars) |
| Vercel (frontend hosting) | If you deploy the web UI to Vercel | Static assets; API calls go to your API host |
| Fly.io / Railway / Render | If you deploy the API container | Traffic you route to your instance |

The calculation engine (`brok_bioage/`) runs entirely in your API process — no external
math services.

## Security measures

- **Upload limit:** 10 MB per file
- **PDF text cap:** 15,000 characters before parsing
- **CORS allowlist:** `BIOAGE_CORS_ORIGINS` — explicit origins only; credentials disabled
- **No request body logging:** Prevents accidental PHI in log aggregators
- **Rate limiting:** Recommended at reverse proxy (100 req/min/IP) — see [DEPLOY.md](./DEPLOY.md)

## HIPAA and compliance

This tool is **not** HIPAA-certified and is not intended as a covered entity or business
associate solution. It is an educational biohacker calculator.

If you deploy in a regulated environment:

- Do not enable `BIOAGE_PERSIST_UPLOADS`
- Do not enable LLM parsing without a BAA with your provider
- Add authentication, audit logging, and encryption at the infrastructure layer
- Consult your compliance team before processing real patient data

## Your responsibilities

When self-hosting or using the local dev stack:

- Control who can reach the API (firewall, VPN, auth proxy)
- Rotate API keys if LLM parsing is enabled
- Do not commit `.env` files with secrets
- Inform users that browser history is stored locally on their device

## Changes

Privacy posture may evolve in v2 (e.g., optional cloud history sync).
Material changes will be documented here and in [DESIGN.md](./DESIGN.md).

## Contact

For privacy questions about this open-source tool, open an issue in the project repository
or review the architecture in [DESIGN.md](./DESIGN.md#security--privacy-considerations).
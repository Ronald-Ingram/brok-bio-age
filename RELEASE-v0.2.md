# BROK Kiron Ecosystem — Release v0.2

**Release date:** July 2026  
**Live:** [https://brok.neobanx.com](https://brok.neobanx.com)  
**Contest:** XPRIZE Build with Gemini (deadline Aug 17, 2026)

---

## Executive summary

v0.2 is the first public-ready MVP of the **BROK Kiron ecosystem** — a rebel-banker futurist platform combining Levine PhenoAge bio-age science, Ingram Inneagram self-discovery, IEM intelligence reports, live BROK voice/avatar, and **Genius Wallet** ($POCK prepaid utility credits with hybrid custody and Solana SPL settlement).

Early prototypes, pitch graphics, and design exploration were developed with **Google Gemini**. Post-funding, the data plane migrates to **Google Cloud Spanner** for quantum-resilient, globally consistent ledger semantics and HIPAA-ready compliance boundaries. Inference is architected for **Llama 3.3 70B** on **Vertex AI** and Google Compute Engine VMs as the sovereign model tier.

---

## What shipped in v0.2

### Bio-Age Calculator (`/bio-age`)
- Levine PhenoAge + transparent BROK adjustments (creatine/creatinine, testosterone, HbA1c preference, age scaling)
- Lab PDF upload (LabCorp, Quest, Canadian PLIS, DEXA, PhenoAge spreadsheets)
- Sensitivity charts, pace-of-aging, biomarker baselines
- **Download Report** + **Print / Save PDF** (mobile-friendly HTML export)
- Calculation history in browser `localStorage`

### Ingram Inneagram (`/inneagram`)
- Canonical Ingram Enneagram quick assessment (Tree of Life / Nine Gates)
- Riso-Hudson cross-reference
- Download + Print/PDF report

### IEM Reports (BROK Avatar / Chat)
- Structured Intelligence Evaluation Matrix reports
- HTML, Markdown, and Print/PDF export

### BROK Intelligence
- Kiron Canon–grounded chat (`/chat`)
- Live avatar with HeyGen + Cartesia voice (`/avatar`)
- File ingest (PDF/DOCX) for context-aware answers
- $POCK metering for calc, voice, and premium features

### Genius Wallet (`/genius-wallet`)
- Device auth + account identity masking (reveal password)
- Stripe card top-ups → reserved $POCK (live webhook on `brok.neobanx.com`)
- Transaction history + Stripe/ledger reconciliation
- Account restore across devices (Stripe session or reveal password)
- Hybrid custody: connect Solana wallet, **partial** on-chain release, send to **any** Solana address
- Family sub-wallets, Send/Gift invites, subscriptions (Essential / Pro)
- Trust page + FAQs (`/trust`)

### Infrastructure
- Next.js 15 on Vercel (production)
- Supabase Postgres (auth, ledger, custody queue, Kiron Canon)
- FastAPI bio-age engine (`brok_bioage/` Python source of truth)
- Solana Token-2022 SPL transfers from Neobanx treasury
- Stripe Checkout + webhook fulfillment

---

## Security & repository hygiene (contest checklist)

| Item | Status |
|------|--------|
| API keys / webhook secrets in source | **None** — env vars only (`STRIPE_*`, `GROQ_*`, `SUPABASE_*`, corp wallet signer) |
| `.env.local` gitignored | Yes |
| Corp wallet private key in repo | **No** — `NEOBANX_CORP_WALLET_SECRET_KEY` is Vercel-only |
| Supabase service role in repo | **No** |
| Public Supabase anon key in test script | Anon key only (client-safe); prefer env in CI |

**Recommended before public Git push:**
1. `git status` — confirm no `.env*` files staged
2. Rotate any key ever pasted into chat or committed by mistake
3. Use a **private** GitHub repo for the contest; share read access to judges only
4. Redact `DATABASE_URL` and live keys from docs/handoff files

---

## Privacy posture

- Bio-age biomarker values: processed in memory; not persisted server-side by default
- Reports exported **client-side** (HTML/PDF) — user chooses save location
- Genius Wallet ledger in Supabase (user-linked, authenticated)
- PRIVACY.md documents PHI handling and HIPAA roadmap

---

## Roadmap (post–v0.2 / post-funding)

- Spanner migration for ledger + canon (quantum resilience, multi-region)
- HIPAA BAA boundaries on Vertex / GCP
- Solana → Genius reserved inbound automation
- Twilio SMS gift delivery (configured, not required for MVP)
- Full public launch: July 24, 2026

---

## Version tags

```
web/package.json     → 0.2.0
pyproject.toml       → 0.2.0
```

Suggested git tag: `v0.2.0`
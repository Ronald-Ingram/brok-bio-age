# BROK Handoff — Jul 2026

Paste-ready context for another Grok terminal working on **BROK Bio-Age calculator** + **$POCK token checkout** rollout, and parallel **Cartesia/HeyGen avatar** work.

---

## Context

Ronald is rolling out **BROK Bio-Age calculator** with **$POCK wallet + Stripe checkout**, aligned with the **premium-first** investor story. Shared Supabase project links `bio-age-tool` and `neobanx-brok-mvp`. Web avatar path is **Cartesia (voice) + HeyGen LiveAvatar Lite (face)** on a **24/7 GCP VM** (orchestration only — APIs are metered SaaS).

---

## Work completed this session

### 1. Investor materials — premium pricing (v2.0)

- Revised pitch deck: premium list pricing, Cartesia/HeyGen, July 2026
- Added **Appendix A** (pricing strategy + assumptions) and **Appendix B** (glossary)
- Patched financial model **v2.0** with recalculated projections (0 formula errors)
- Updated slide 8 callouts + 5-year chart; slide 9 scenario chart (Bear/Base/Bull)

### 2. Strategic decisions (product + economics)

- **Premium-first pricing** — anchor high, promos down (~90% effective ARPU Y1)
- **Voice + avatar toggles** — metered $POCK debits when on (no unlimited subsidy)
- **Groq Llama 70B** = production brain on VM; Grok = advanced/file tier
- **Vertex Llama 70B** — parked (never worked); don't block rollout on it
- VM = **24/7 control plane** (FastAPI, POCK ledger, API keys); not self-hosted voice/face

### 3. Kiron / Supabase (earlier in arc — still relevant)

- Kiron Canon: **8 docs** in cloud `core_knowledge` (project `avfuuzloxgqqkrdxkqzf`)
- POCK tables live: `brok_users`, `pock_ledger`, `bioage_history` (with data)
- Migrations `0002` / `0001` agent_memory on neobanx side — **not all applied** in cloud

---

## Updated files (absolute paths)

### Investor / model

| File | Notes |
|------|--------|
| `/Users/kiki/Downloads/Neobanx_KIRON_Investor_Pitch_Deck-Premium-Jul2026.pptx` | 15 slides, premium pricing + appendices |
| `/Users/kiki/Downloads/Neobanx_KIRON_Investor_Pitch_Deck-Premium-Jul2026.pdf` | PDF export |
| `/Users/kiki/neobanx-brok-mvp/docs/Neobanx_KIRON_Investor_Pitch_Deck-Premium-Jul2026.pptx` | Repo copy |
| `/Users/kiki/neobanx-brok-mvp/docs/Neobanx_KIRON_Investor_Pitch_Deck-Premium-Jul2026.pdf` | Repo copy |
| `/Users/kiki/Downloads/Neobanx_KIRON_Ecosystem_Financial_Model_v2.0-Jul2026.xlsx` | **v2.0** premium assumptions |
| `/Users/kiki/neobanx-brok-mvp/docs/Neobanx_KIRON_Ecosystem_Financial_Model_v2.0-Jul2026.xlsx` | Repo copy |
| `/Users/kiki/Downloads/Neobanx_KIRON_Ecosystem_Financial_Model.xlsx` | Master in Downloads (synced to v2.0) |

### Bio-Age app (separate repo — rollout target)

| Path | Role |
|------|------|
| `/Users/kiki/bio-age-tool/` | Bio-Age Next.js + FastAPI |
| `/Users/kiki/bio-age-tool/web/.env.local` | Supabase + `DATABASE_URL` configured |
| `/Users/kiki/bio-age-tool/web/lib/purchaseConfig.ts` | **Stripe POCK packs** (still legacy prices — see below) |
| `/Users/kiki/bio-age-tool/supabase/migrations/001_pock_system.sql` | POCK schema |
| `/Users/kiki/bio-age-tool/scripts/test_pock_supabase.py` | Integration test |
| `/Users/kiki/bio-age-tool/scripts/apply_pock_migration.py` | Migration runner |
| `/Users/kiki/bio-age-tool/DEPLOY.md` | Deploy guide |

### Neobanx BROK stack (avatar/voice — parallel track)

| Path | Role |
|------|------|
| `/Users/kiki/neobanx-brok-mvp/api/main.py` | FastAPI — chat, `/voicebox/*` → XTTS proxy |
| `/Users/kiki/neobanx-brok-mvp/xtts_service/` | Local XTTS voice (interim; Cartesia next) |
| `/Users/kiki/neobanx-brok-mvp/web/components/BROKAvatar.tsx` | Static face + audio (replace with HeyGen) |
| `/Users/kiki/neobanx-brok-mvp/docs/architecture.md` | Architecture |
| `/Users/kiki/neobanx-brok-mvp/docs/vm-local-llm-setup.md` | GCP VM + SSD setup |

---

## Premium pricing reference (deck + model v2.0 — align checkout)

### Subscriptions

- Unified Essential: **$99/mo**
- Unified Premium: **$149/mo**
- Avatar + Voice add-on: **$59/mo**
- Blended list ARPU: **~$1,404/yr** ($117/mo, 64/36 mix)

### $POCK (model v2.0 — **not yet in bio-age UI**)

- **Retail anchor: ~$0.20/POCK** (target packs: $9.99–12 / 50 POCK)
- **Current `purchaseConfig.ts`:** $5/50, $10/100, $40/500 (~$0.10/POCK) — **update for rollout**

### Metered agent usage (BROK web — implement in API)

| Toggle | POCK debit |
|--------|------------|
| Base turn (Groq) | 2 POCK |
| + Voice (Cartesia) | +3 POCK |
| + Avatar (HeyGen) | +8 POCK |
| Grok/files/advanced | +30% on base |

### Financial projections (v2.0 model)

| Metric | Value |
|--------|-------|
| Y1 gross revenue | ~$59.5M |
| Y3 gross revenue | ~$684.4M |
| Y3 EBIT | ~$387.3M |
| Y5 gross revenue | ~$8.07B |
| Y1 gross margin | ~82.3% |

---

## Supabase (shared cloud)

- **Project URL:** `https://avfuuzloxgqqkrdxkqzf.supabase.co`
- **Wrong hostname (NXDOMAIN):** `avfuuzloxqqkrdxkqzf` — do not use
- **Env locations:**
  - `bio-age-tool/web/.env.local` — anon key, service role, `DATABASE_URL`
  - `neobanx-brok-mvp/api/.env` — service role for BROK API
- **POCK RPCs:** `bootstrap_user`, `debit_for_calc` (see `001_pock_system.sql`)
- **Do not paste service role keys in chat** — read from `.env.local` on machine

---

## Bio-Age + $POCK rollout checklist

### P0 — Verify POCK loop

```bash
cd /Users/kiki/bio-age-tool/web && npm run dev   # note port
cd /Users/kiki/bio-age-tool && python scripts/test_pock_supabase.py
```

Expect: auth → `bootstrap_user` → `debit_for_calc` → balance update.

### P1 — Stripe checkout

- Confirm Stripe webhook route + `STRIPE_*` secrets in `web/.env.local`
- Test: My $POCK → Buy with Card → `/buy-pock` → success → ledger credit
- Per `DEPLOY.md`: proxy `kiron.ai/buy-pock` or set `NEXT_PUBLIC_POCK_STRIPE_URL`

### P2 — Align POCK retail with v2.0 model

Update `/Users/kiki/bio-age-tool/web/lib/purchaseConfig.ts` e.g.:

- 50 POCK @ **$9.99–12** (not $5)
- Stripe `create-checkout` must use same package IDs
- Update Stripe Price IDs if already created at old amounts

### P3 — Deploy

- **Web:** Vercel (`web/`)
- **API:** Fly/Railway/Docker (`api/`, `DEPLOY.md`)
- Set `NEXT_PUBLIC_API_URL`, `BIOAGE_CORS_ORIGINS`, Supabase public vars

### P4 — Debit on calc

- Ensure Bio-Age calc calls `debit_for_calc` RPC before returning results (1 POCK per calc unless promo/trial)
- Trial credit on `bootstrap_user` already in schema

---

## Avatar/voice track (neobanx — don't block Bio-Age rollout)

1. Add `CARTESIA_API_KEY`, `HEYGEN_*` to VM `api/.env`
2. Wire voice/avatar toggles in `web/` + POCK surcharge in `/chat`
3. Replace `BROKAvatar.tsx` with HeyGen WebRTC when avatar on
4. Default `LLM_PROVIDER=groq` on VM

---

## Explicitly NOT done / don't assume

- [ ] Bio-Age E2E POCK test confirmed this session
- [ ] `purchaseConfig.ts` bumped to $0.20/POCK retail
- [ ] Cartesia/HeyGen wired into `api/main.py`
- [ ] Kiron retrieval wired into web chat
- [ ] `XAI_API_KEY` still placeholder in `neobanx-brok-mvp/api/.env` for Grok demo
- [ ] x402 crypto checkout (marked "Coming soon" in UI)

---

## One-line mission

**Ship Bio-Age on Vercel + API on Docker/Fly with live Supabase $POCK wallet, Stripe top-up at premium POCK prices (~$0.20/POCK), and verified `debit_for_calc` on every calculation — using `bio-age-tool` repo and shared Supabase `avfuuzloxgqqkrdxkqzf`.**
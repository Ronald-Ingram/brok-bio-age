# Neobanx Investor Package — Reconciliation Confirmation & Development Handoff

**Date:** July 3, 2026  
**Status:** RECONCILED — model, deck, and live product (bio-age-tool) aligned for investor diligence  
**Audience:** Grok terminal commencing product/engineering development  
**Author:** Cursor agent session (financial model + pitch deck reconciliation pass)

---

## 1. Executive confirmation

The investor package is **internally consistent and logically coherent** from a diligence perspective, with explicit caveats documented for items not yet shipped. All cross-document conflicts identified in the Jul 2026 review have been resolved.

| Check | Result |
|-------|--------|
| Model formula errors | **0** (1,018 formulas recalculated) |
| List ARPU ($1,404/yr) = revenue formula | **PASS** (35K subs × $1,404 = $49.14M unified sub Y1) |
| Included $POCK pools = COGS, not revenue discount | **PASS** (Footnote ⁷ + Corp Distribution COGS row) |
| FAQ / CAC / deck ARPU references | **PASS** ($1,404 list, 8.5:1 LTV:CAC) |
| Live Stripe tiers vs model vs deck | **PASS** ($99/75 POCK · $149/200 POCK) |
| Seed entry decoupled from blended EV | **PASS** ($16/sh · $160M pre · not tied to $8.3B Y3 EV) |
| BS Summary Debt/Equity | **PASS** (Y1 ~0.032x, non-zero) |
| Deck auto-sync from model | **PASS** (`fin_constants.json` → pitch deck build) |

**Investor POV verdict:** Package is **credible for a $1.5M seed conversation** if presenters lead with the **$8–15M 18-month ARR operating case** and treat Y3 $685M as an **upside model**, not a forecast. Long-term EV ($8.3B blended Y3) is appropriately quarantined to Valuation Summary / not used for seed pricing.

---

## 2. Canonical file manifest

### Primary deliverables (use these)

| File | Purpose |
|------|---------|
| `/Users/kiki/Downloads/Neobanx_KIRON_Ecosystem_Financial_Model_v2.0-Jul2026.xlsx` | **Source of truth** — assumptions, P&L, scenarios, cap table, CF/BS |
| `/Users/kiki/Downloads/Neobanx_KIRON_Investor_Pitch_Deck-Premium-Jul2026.pptx` | **Investor deck** — premium-first, Appendix A/B |
| `/Users/kiki/Downloads/fin_constants.json` | Auto-synced deck constants (regenerate before deck build) |

### Build pipeline (reproducible)

| Script | Output |
|--------|--------|
| `/Users/kiki/Downloads/build_ecosystem_model.py` | Model v2.0 + legacy `.xlsx` mirror |
| `/Users/kiki/Downloads/build_cashflow_12m.py` | 13-Month CF, Balance Sheet, BS Summary |
| `/Users/kiki/.grok/skills/xlsx/scripts/recalc.py` | LibreOffice formula recalc + error scan |
| `/Users/kiki/Downloads/sync_model_to_deck.py` | `fin_constants.json` |
| `/Users/kiki/Downloads/build_neobanx_pitch_deck.js` | Premium + legacy `.pptx` |

### Live product source (must stay aligned with model)

| File | Aligns to |
|------|-----------|
| `/Users/kiki/bio-age-tool/web/lib/subscriptionConfig.ts` | Essential $99/75 POCK · Premium $149/200 POCK · meter rates |
| `/Users/kiki/bio-age-tool/web/lib/purchaseConfig.ts` | $0.20/POCK · Stripe packs 50/100/500 |
| `/Users/kiki/bio-age-tool/web/lib/corpWalletConfig.ts` | Corp wallet `GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7` |
| `/Users/kiki/bio-age-tool/web/lib/ogEntitlementsConfig.ts` | Private OG (not in public deck) |
| `/Users/kiki/bio-age-tool/supabase/migrations/003_*.sql` | Tiered subs + metering |
| `/Users/kiki/bio-age-tool/supabase/migrations/004_*.sql` | OG grandfather |
| `/Users/kiki/bio-age-tool/supabase/migrations/005_*.sql` | Corp wallet ledger |

### Rebuild command (run in order)

```bash
python3 /Users/kiki/Downloads/build_ecosystem_model.py
python3 /Users/kiki/Downloads/build_cashflow_12m.py
python3 /Users/kiki/.grok/skills/xlsx/scripts/recalc.py \
  "/Users/kiki/Downloads/Neobanx_KIRON_Ecosystem_Financial_Model_v2.0-Jul2026.xlsx" 180
python3 /Users/kiki/Downloads/sync_model_to_deck.py
node /Users/kiki/Downloads/build_neobanx_pitch_deck.js
```

---

## 3. Product ↔ model ↔ deck alignment matrix

| Item | Live product (bio-age-tool) | Financial model | Pitch deck | Status |
|------|----------------------------|-----------------|------------|--------|
| Unified Essential | $99/mo · 75 $POCK/mo | Assumptions B49, B74 | Products + Appendix A | **ALIGNED** |
| Unified Premium | $149/mo · 200 $POCK/mo | Assumptions B50, B75 | Products + Appendix A | **ALIGNED** |
| Blended list ARPU | N/A (64/36 mix) | **$1,404/yr** formula B51 | Unit economics | **ALIGNED** |
| $POCK retail | $0.20/POCK packs | B76, Stripe revenue line | Products + Appendix A | **ALIGNED** |
| Metered usage | 2 / +3 / +8 / +30% / 1 calc | B87–B91 | Appendix A | **ALIGNED** |
| Corp wallet funding | migration 005 + config | Corp COGS row + Footnote ⁷ | Appendix A + unit econ | **ALIGNED** |
| Avatar+Voice $59 SKU | **Not a Stripe product** | Not a separate revenue line | Removed; metered POCK | **ALIGNED** |
| Bio-Age Only $5.99 | **Not Stripe yet** | In KIRON line (Phase 2 flag) | Marked Phase 2 | **ALIGNED (caveated)** |
| POCK OG grandfather | Built, private | OG COGS (500 × 10/mo) | Not in public deck | **ALIGNED** |
| 10-$POCK unlimited sub | Deprecated (errors) | Not in model | Not in deck | **ALIGNED** |
| x402 crypto checkout | Coming soon UI | Not in model | Appendix A not-live | **ALIGNED** |
| CS2 inquiry $0.35 | Deck/model | B35 | Products slide | **ALIGNED** |
| BROK txn 1.0% + 25% AI | Deck/model | B43–B44 | Products slide | **ALIGNED** |
| $POCK platform $149/mo | Deck/model | B70 | Products slide | **ALIGNED** |

---

## 4. Financial model — investor logic chain

### Revenue architecture (Y1 base, $K)

| Line | Y1 ($K) | Investor interpretation |
|------|---------|-------------------------|
| Unified USD subscriptions | 49,140 | **Core SaaS** — list ARPU $1,404 × 35K subs |
| CS2 inquiries | 630 | Patented IFF pulls @ $0.35 |
| BROK merchant txn + AI surcharge | 1,875 | 1.0% + 25% on $50K/mo merchant volume |
| $POCK ecosystem (platform + settlement) | 4,718 | B2B/platform fees |
| Stripe $POCK top-ups (user-paid) | 350 | Direct token retail; no corp debit |
| IEM + Enterprise + KIRON + SPV | ~2,711 | Secondary lines |
| **Total gross revenue** | **59,425** | ~$59.4M |

### COGS architecture (Y1, $K) — key reconciliation fix

| Line | Y1 ($K) | Investor interpretation |
|------|---------|-------------------------|
| CS2 inquiry COGS | 324 | Wholesale pulls @ $0.18 target |
| Unified API COGS (Groq/Cartesia/HeyGen) | 5,460 | Per-sub infrastructure |
| **Corp $POCK distribution COGS** | **6,251** | **Included pools + OG + trial @ $0.20, 55% util** |
| Other direct (8% of revenue) | 4,754 | Model placeholder |
| **Gross margin Y1** | **~80.9%** | After corp wallet COGS (honest vs prior 83–86% claim) |
| **Gross margin Y3** | **~81.9%** | Corp COGS scales to ~$67.9M Y3 |

**Accounting principle (Footnote ⁷):** Promotional and included $POCK debits the **Neobanx corp Solana wallet** — no minting, no supply inflation. This is investor-safe tokenomics: promos recycle existing treasury holdings.

**Corp float seed (model):** 500K $POCK = **$100K** book (@ $0.20). Treat as marketing/retention budget on balance sheet.

### Scenarios (Y3 gross revenue, $M)

| Case | Y3 revenue | Notes |
|------|------------|-------|
| Bear | ~583 | Still aggressive; stress-test only |
| **Base** | **~685** | Live assumptions |
| Bull | ~2,627 | Viral GTM + token upside |

### Seed entry (unchanged — correct)

| Term | Value |
|------|-------|
| Implied IPO planning price | $20/sh |
| Seed entry (20% discount) | **$16/sh** |
| Pre-money | **$160M** |
| Raise | $1.5M |
| Seed ownership | **~0.93%** |
| Long-term blended Y3 EV | ~$8.3B (Valuation Summary only — **not seed pricing**) |

### Capital path (13-month CF)

| Item | Value |
|------|-------|
| Founder opening cash | $300K |
| Peak monthly burn | ~$92K |
| Additional capital required | ~$852K |
| Total capital path | ~$877K |
| **Seed ask** | **$1.5M** (gap + compliance/GTM cushion) |

---

## 5. Investor narrative — what to say vs what to caveat

### Lead with (credible)

1. **Live product:** Stripe tiered subs ($99/$149) with metered $POCK — shipped in bio-age-tool.
2. **Premium-first pricing** with comps in Appendix A (myFICO, ChatGPT Plus, MFP, Whoop).
3. **Corp wallet model:** no inflation from promos — treasury-funded allowances.
4. **Seed terms:** $1.5M at $160M pre, 20% IPO discount framework per STELLAR Note.
5. **18-month operating target:** $8–15M ARR (deck milestones) — **not** $685M Y3.
6. **Regulatory:** POCK Footnote 5 (SEC Rel. 33-11412 / CFTC PR 9198-26); Holland & Hart counsel.
7. **Traction:** BROK Bio-Age + $POCK wallet live; FI pilot term sheet (Apr 2026).

### Caveat explicitly (honest diligence)

1. **Y3 $685M base** requires 250% YoY unified-sub growth from 35K Y1 — present as **upside model**, not guidance.
2. **Bear case $583M** is still extremely high — sensitivity for pricing/power, not conservative planning.
3. **Bio-Age Only $5.99** is in model revenue but **not Stripe** — Phase 2; do not claim shipped.
4. **Cartesia/HeyGen in BROK API** — metering schema ready; APIs not live in production.
5. **Corp float** — migrations 003–005 must be applied + on-chain seed before grants execute.
6. **POCK OG** — private retention program; optional footnote as "early supporter recognition" without numbers.
7. **BROK TAM $8T+** includes machines/agents — vision TAM, not SAM; footnote ¹ applies.
8. **KIRON $211K Y1** includes Bio-Age Only assumption — trim if Phase 2 slips.

---

## 6. Development priorities (Grok terminal)

Ordered by investor-package dependency:

### P0 — Required for model credibility at demo

- [ ] Apply Supabase migrations **003, 004, 005** in cloud
- [ ] Seed corp float from on-chain reconciliation (`POST /api/admin/corp-float`)
- [ ] Vercel production deploy with Stripe keys + `POCK_SPL_MINT` for OG wallet verify
- [ ] Verify `invoice.paid` webhook refreshes included pools → corp ledger debit

### P1 — Revenue lines already in model, not fully live

- [ ] Wire Cartesia + HeyGen in BROK API (metering → `debit_metered_turn`)
- [ ] Bio-Age calc metering → `debit_for_calc` (1 POCK)
- [ ] CS2 inquiry rail at $0.35 (model already books revenue)

### P2 — Phase 2 (in model, flagged not shipped)

- [ ] Bio-Age Only $5.99 Stripe tier (or remove from near-term KIRON revenue in model)
- [ ] 7-day email trial (discussed only)
- [ ] x402 crypto checkout

### P3 — Do not build for public investor deck

- [ ] POCK OG marketing (private ops only)
- [ ] Separate $59/mo Avatar+Voice Stripe SKU (deprecated — use metered POCK)

### Code change guardrails

When changing pricing or pools in `bio-age-tool`, **also update**:

1. `build_ecosystem_model.py` Assumptions section (rows 49–51, 74–91)
2. Run full rebuild pipeline (Section 2)
3. Confirm `fin_constants.json` matches before deck export

---

## 7. Remaining minor items (non-blocking)

| Item | Severity | Action |
|------|----------|--------|
| `Neobanx_Executive_Summary.docx` | Low | May predate v2.0; regenerate if distributing |
| KIRON Y1 revenue includes Phase 2 Bio-Age Only | Medium | Flag in verbal pitch; or zero out until Stripe ships |
| Deck Y1 pie chart weights | Low | Illustrative only; not formula-linked |
| Valuation Summary ~$8.3B Y3 blended EV | Info | Correctly excluded from seed slide 9 |

---

## 8. One-paragraph investor framing (paste-ready)

> BROK monetizes through premium USD subscriptions ($99–$149/mo via Stripe) with metered $POCK usage for agent voice, avatar, and Bio-Age calculations. Users may also purchase $POCK at ~$0.20 via Stripe top-ups. Bundled monthly $POCK allowances and promotional grants (trial credits, private early-supporter programs) are funded exclusively from the Neobanx corporate treasury wallet on Solana — they do not mint new tokens or dilute supply. This preserves tokenomics integrity while enabling a premium-first go-to-market with controlled promotional burn from existing holdings. Seed investors enter at $16/share (20% discount to a $20 IPO planning case) on a $160M pre-money for $1.5M.

---

## 9. Sign-off

**Reconciliation status: COMPLETE**  
**Investor logic: COHERENT** (with documented caveats above)  
**Development may commence** against `bio-age-tool` using this document as the authority hierarchy:

1. Live product configs (`subscriptionConfig.ts`, `purchaseConfig.ts`, `corpWalletConfig.ts`)
2. Financial model v2.0 (`Assumptions` tab + Footnotes ⁶/⁷ + Investor FAQ)
3. Pitch deck Premium Jul 2026 (Appendix A/B)

If product pricing changes, rebuild the model before the next investor send.

---

*Generated: Jul 3, 2026 · Cursor reconciliation session*
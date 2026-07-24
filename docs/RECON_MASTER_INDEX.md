---
doc_type: index
tags:
  - recon
  - index
  - multi-entity
  - accounting
  - founder
  - convert-note
  - stripe
  - on-chain
  - tags
entities:
  - neobanx
  - personal
  - brok
  - pock
rails:
  - on-chain
  - stripe
  - reserved
  - bank
  - brokerage
status: living
updated: 2026-07-23
---

# RECON MASTER INDEX — start here

**Purpose:** Single map of every memo, folder, rail, and tool path for multi-entity recon (personal · Neobanx · $POCK/BROK · grants · founder convert notes).  
**When to open this:** Any session that says “recon,” “founder advances,” “due to me,” “bank stock,” “Streamflow claim,” “Stripe settlement,” or “QuickBooks vs BROK.”  
**Owner:** Founder + ops agents. Update this file when a new memo or folder is added.

**Last inventory pass:** 2026-07-23  
**Tag vocabulary:** [`TAG_VOCABULARY.md`](./TAG_VOCABULARY.md) — controlled keywords in YAML frontmatter on each doc.

---

## How agents should find things

| Mechanism | What it covers | Limits |
|-----------|----------------|--------|
| **This file** | Canonical list of recon artifacts | Only as current as last edit |
| **Tags (frontmatter)** | `tags:` / `entities:` / `rails:` on each memo | Only files that follow `TAG_VOCABULARY.md` |
| **Disk search** | `rg '^- convert-note' docs` or `rg '^tags:' -A 12 docs` | Misses unsaved chat-only notes |
| **Session memory** | Prior Grok sessions indexed under workspace | Compactions lose detail; prefer files |
| **Supabase** | Live ledgers (`brok_users`, `pock_ledger`, `stripe_payments`, buybacks, etc.) | Needs service role / admin |
| **Solana RPC / Solscan** | `GDbcx…` on-chain truth | Not in git |

**Rule:** Prefer **files on disk** over chat memory. New recon memo → **(1)** YAML tags **(2)** row in this index **(3)** new keyword? add to vocabulary.

**Kickoff phrase for a future session:**  
> “Start multi-entity recon — open `bio-age-tool/docs/RECON_MASTER_INDEX.md` and follow Phase 0.”

**Tag search phrase:**  
> “Find docs tagged `convert-note` / `streamflow` / `bank-stock` under bio-age-tool/docs”

---

## Keyword → docs (reverse index)

| Keyword / tag | Primary docs |
|---------------|--------------|
| `recon` · `index` | **This file**, `TAG_VOCABULARY.md` |
| `due-to-founder` · `convert-note` · `founder` | `accounting-policy/FOUNDER_FUNDING_CLASSIFICATION_AND_RECON_PREP.md` |
| `bank-stock` · `personal-capital-loss` · `two-track` | same founder funding prep |
| `vesting-unlock` · `streamflow` · `corp-wallet` | `accounting-policy/STREAMFLOW_VESTING_CLAIM_MEMO_2026-07-23.md` |
| `grant` · `capital-contribution` · `reimbursement` | founder funding prep (options C–E) |
| `stripe` · `prepaid` | `STRIPE_SETTLEMENT_RECON_2026-07-11.md`, Tony memos, admin dashboard |
| `tony` · `vendor` · `scholarship` | `accounting-policy/TONY_POCK_TRANSACTION_MEMO_*`, `TONY_VALUE_*`, `VENDOR_PAYMENT_*` |
| `buyback` · `on-chain` · `reserved-ledger` | `POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md`, buyback policy code |
| `dual-rail` · `accounting` · `cpa` | post-launch accounting system + founder prep |
| `trial` · `corp-float` | `INCIDENT_TRIAL_FARM_KILL_2026-07-22.md`, corp-float API |
| `custody-release` · design | `$POCK_credit_reverse.md` |
| `tags` · `vocabulary` | `TAG_VOCABULARY.md` |

---

## 1. Primary repo (product + ops memos)

**Root:** `/Users/kiki/bio-age-tool`

### Policy & recon (read first)

| Doc | Path | Role |
|-----|------|------|
| **THIS INDEX** | `docs/RECON_MASTER_INDEX.md` | Map of everything |
| Founder funding options + recon prep | `docs/accounting-policy/FOUNDER_FUNDING_CLASSIFICATION_AND_RECON_PREP.md` | Options A–F, convert preference, bank-stock two-track, checklist |
| Post-launch accounting system | `docs/POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md` | Dual rails, founder advances rule, phased GL |
| Accounting-policy library README | `docs/accounting-policy/README.md` | Folder TOC + Canon paths |
| Streamflow vesting claim memo | `docs/accounting-policy/STREAMFLOW_VESTING_CLAIM_MEMO_2026-07-23.md` | +9,000,500 $POCK unlock; usually not capital |
| Tony master transaction memo | `docs/accounting-policy/TONY_POCK_TRANSACTION_MEMO_2026-07-20.md` | Vendor / prepaid / scholarships package |
| Tony value-exchange framing | `docs/TONY_VALUE_EXCHANGE_ACCOUNTING_2026-07-20.md` | Policy narrative |
| Vendor payment Tony | `docs/VENDOR_PAYMENT_TONY_2026-07-20.md` | Payment ops |
| Stripe settlement recon sample | `docs/STRIPE_SETTLEMENT_RECON_2026-07-11.md` | Prior recon pattern |
| Stripe recon CSV | `docs/stripe_pock_reconciliation_2026-07-11.csv` | Data sample |
| $POCK credit reverse (on-chain→Genius) | `docs/$POCK_credit_reverse.md` | Future rail design |
| Investor recon handoff | `docs/Grok_Investor_Reconciliation_Handoff_Jul2026.md` | Model / product alignment |
| Post-launch backlog | `docs/POST_LAUNCH_FOLLOWUP_BACKLOG.md` | Parked work |
| Trial farm incident | `docs/INCIDENT_TRIAL_FARM_KILL_2026-07-22.md` | Abuse / float context |
| Email bounce incident | `docs/INCIDENT_SUPABASE_EMAIL_BOUNCES_2026-07-22.md` | Auth noise |

### Code / live systems (recon sources of truth)

| System | Path / location | What recon uses it for |
|--------|-----------------|------------------------|
| Admin dashboard treasury | `web/app/api/admin/dashboard/route.ts`, `web/app/admin/page.tsx` | Stripe totals, reserved, float, **on-chain corp** |
| Corp wallet config | `web/lib/corpWalletConfig.ts` | `GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7` |
| Corp float seed API | `web/app/api/admin/corp-float/route.ts`, `scripts/seed_corp_float.py` | Trial float vs on-chain |
| Buyback policy | `web/lib/treasuryBuybackPolicy.ts` | 20% gross service revenue |
| Supabase migrations | `supabase/migrations/001_*.sql` … `025_*.sql` | Schema of ledgers |
| Stripe credit path | `web/lib/stripePockCredit.ts`, webhooks under `web/app/api/stripe/` | Prepaid issuance |

### Corp wallet (on-chain)

| Item | Value |
|------|--------|
| Address | `GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7` |
| $POCK mint | `76r29NpnRW8PAxpnSnVBFcZPUcukgvno1Kkiysg8pump` |
| Example claim tx | `4jwFSXtLGT3dh9JLog7UTBrpiCoWgo7mjtAYjrGEzMbPvF1MEzYAoWCC8udLLWGsBCYx22zCEqtj3DUvUYtqvzCP` (2026-07-23 Streamflow withdraw +9,000,500) |

---

## 2. Sibling / related trees

| Tree | Path | Recon relevance |
|------|------|-----------------|
| BROK MVP / CM-mod | `/Users/kiki/neobanx-brok-mvp` | Product handoff; not primary GL |
| Handoff | `neobanx-brok-mvp/docs/HANDOFF-Jul2026.md` | Cross-repo context |
| CRM launch workspace | `/Users/kiki/crm-brok-launch` | Invites/press — **not** financial recon |
| Website | `/Users/kiki/neobanx-website` (if present) | Public copy only |

---

## 3. Kiron Canon (Desktop) — may duplicate bio-age-tool docs

**Root:** `/Users/kiki/Desktop/Kiron Canon/`

| Subfolder / file | Notes |
|------------------|--------|
| `Accounting_Policy/` | Mirror / formal Canon copies |
| `Legal_Regulatory/` | Counsel-facing |
| Files also seen at Canon root | e.g. `POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md`, Tony memo, SEC PDF, `$POCK_credit_reverse.md` |

**Recon rule:** Treat **`bio-age-tool/docs/`** as the **working ops set**; Canon may lag. If both exist, **diff before editing** and prefer updating bio-age-tool then re-copy to Canon if needed.

**Cloud Canon:** Supabase `core_knowledge` (accounting / securities tags) — search via product/admin, not only disk.

---

## 4. Grok agent memory (cross-session)

| Location | Use |
|----------|-----|
| `/Users/kiki/.grok/memory/neobanx-brok-mvp-e6d145c5/` | Workspace session digests |
| `/Users/kiki/.grok/memory/MEMORY.md` | Global notes (if any) |
| `/Users/kiki/.grok/memory/ACTIVE_WORK.md` | Multi-terminal active work |
| Agent `memory_search` | Semantic search over prior sessions |

**Honest limit:** Memory helps **recall that a memo exists** and key numbers; it is **not** a substitute for this index or the source `.md` files. After long gaps, **re-read this index first.**

---

## 5. Classification cheat sheet (do not invent new labels ad hoc)

From `FOUNDER_FUNDING_CLASSIFICATION_AND_RECON_PREP.md`:

| Code | Name | Typical use |
|------|------|-------------|
| A | Due to founder | Catch-up personal funding |
| B | Convertible note | Target end-state (enterprise) |
| C | Capital contribution | Rare / true gifts |
| D | Reimbursement | Receipt-level after corp has cash |
| E | Grant | Third-party grants only |
| F | Vesting unlock | Streamflow → corp (usually) |

**Personal bank stock G/L:** Track **P** (personal 1099-B) — never net into Neobanx P&L as the stock loss itself.

---

## 6. Recon phases (checklist pointer)

Full checklist lives in founder funding prep doc. Short version:

0. Open **this index** + entity map  
1. Personal brokerage (bank stock) + personal bank outflows  
2. Neobanx bank / Stripe / cards  
3. On-chain `GDbcx…` + Genius reserved (dual rail)  
4. Sum Due to founder → paper convert notes  
5. Period pack; QB stays until 2+ clean periods  

---

## 7. Gaps / not yet centralized

| Gap | Action when recon starts |
|-----|---------------------------|
| Personal bank/brokerage exports | Drop CSVs under a new folder e.g. `docs/recon/imports/YYYY-MM/` (create on first recon day) |
| Signed convert note PDFs | `docs/recon/legal/` once counsel drafts |
| QuickBooks export | `docs/recon/qb/` |
| Full founder advances register (DB/UI) | Still backlog in post-launch accounting system |
| Canon vs bio-age-tool drift | Diff Accounting_Policy on recon kickoff |

**Proposed folder when recon week starts** (create then, not before):

```
bio-age-tool/docs/recon/
  README.md          → points back to RECON_MASTER_INDEX.md
  imports/           → bank, brokerage, Stripe CSV drops
  working/           → scratch ledgers, open items
  legal/             → notes, board consents (sensitive — gitignore if needed)
  period-packs/      → closed period PDFs/CSVs
```

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-07-23 | Initial master index after Streamflow claim + founder funding memos; capability note for agents |
| 2026-07-23 | **Tags:** `TAG_VOCABULARY.md` + YAML frontmatter on core recon memos; keyword → docs reverse index |

---

*If you only bookmark one path for recon week: this file.*

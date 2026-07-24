---
doc_type: policy
tags:
  - recon
  - accounting
  - dual-rail
  - founder
  - due-to-founder
  - convert-note
  - reserved-ledger
  - on-chain
  - stripe
  - buyback
  - genius-wallet
  - cpa
  - multi-entity
  - backlog
entities:
  - neobanx
  - personal
  - brok
  - pock
rails:
  - on-chain
  - stripe
  - reserved
  - qb
status: parked
updated: 2026-07-23
---

# Post-launch: proprietary crypto-centric accounting system

**Status:** Parked for attention **after** BROK public launch / press cycle.  
**Created:** 2026-07-20  
**Context:** Founder has heavy recon across personal vs corp, multi-entity expenses, and personal-funded treasury buybacks. Intent: eventually cancel QuickBooks and ship a Neobanx-native GL for ZPEs and global agentic banking.

---

## North star

Not “another QuickBooks for SMBs.”

**The books for prepaid digital utility + multi-entity ZPEs + agentic banking:**  
reserved ledgers, on-chain treasury, policy-aware agents, CPA-grade export.

---

## What already exists (do not rebuild)

| Layer | Location |
|--------|----------|
| Customer reserved $POCK | `brok_users`, `pock_ledger` |
| Stripe events | `stripe_payments`, webhooks |
| Family envelopes | `genius_sub_wallets`, `genius_sub_wallet_ledger` |
| 20% buybacks | `treasury_buyback_*`, Jupiter USDC→$POCK |
| Ops memos | `docs/accounting-policy/`, Tony transaction memos |
| SEC educational framing PDF | Canon + `docs/accounting-policy/` |
| Prior Stripe recon samples | `docs/STRIPE_SETTLEMENT_RECON_*.md`, CSVs |

---

## Gaps for a full system

- Double-entry **journal** (every event → DR/CR across entities)
- Multi-entity (personal / Neobanx / Kiron / funds)
- Bank + Stripe payout + Solana **reconciliation workspace**
- **Due-to / due-from** (founder-funded corp buybacks)
- Period lock, audit log, CPA export
- Agent-readable policy (“prepaid revenue vs marketing?”)

---

## Phased plan

### Phase A — Stabilize (now / launch week) — **do not cancel QuickBooks**

- Use QB as **cash/tax shell** only; BROK as **crypto/prepaid source of truth**
- Entity map: personal · Neobanx Software · other corps · Solana corp wallet · Genius codes
- Recon queues: Stripe payouts; personal→corp advances; vendor packages; buyback status; bank expenses
- Weekly period pack until software exists

### Phase B — Recon cockpit (first build)

Admin modules:

1. Entity + wallet registry  
2. Founder advances / intercompany due-to  
3. Stripe settlement board  
4. Treasury board (20% accrued / executed / failed / SOL buffer)  
5. Exception queue  
6. Period close pack (PDF/CSV + memos)

### Phase C — Proprietary GL (“ZPE books”)

1. Dual rails: reserved + on-chain, linked  
2. Event-sourced double entry  
3. Policy engine (Canon + buyback + prepaid rules)  
4. Agentic proposals; human/CPA approve  
5. Multi-entity native  
6. **Cancel QB only after** 2+ clean periods match bank + Stripe + Solana and CPA can export trial balance  

---

## Founder advances rule (until GL exists)

When personal funds pay corp buybacks or expenses:

- Prefer **Due to founder** (liability) + treasury asset on Neobanx, **or**  
- Documented **capital contribution**  
- **Target end-state (founder preference, 2026-07):** roll catch-up advances into **convertible notes payable to founder** (enterprise path = notes, not equity sale). See `docs/accounting-policy/FOUNDER_FUNDING_CLASSIFICATION_AND_RECON_PREP.md`.

Never leave only as “paid from personal phone wallet.”

**Do not** net personal capital losses (e.g. bank stock sales that funded the runway) into Neobanx P&L — keep **personal brokerage** and **Neobanx funding register** as two tracks.

---

## Implementation backlog (when resumed)

| Priority | Slice |
|----------|--------|
| 1 | Founder advances register (table + admin UI) |
| 2 | Stripe payout recon view |
| 3 | Entity chart + journal stub (top-up / vendor / buyback / sub-wallet fund) |
| 4 | Period close pack |
| 5 | QB cancel checklist |

---

## Related docs

- **`docs/RECON_MASTER_INDEX.md`** — single map of all recon memos, folders, rails
- `docs/accounting-policy/FOUNDER_FUNDING_CLASSIFICATION_AND_RECON_PREP.md`
- `docs/accounting-policy/TONY_POCK_TRANSACTION_MEMO_2026-07-20.md`
- `docs/TONY_VALUE_EXCHANGE_ACCOUNTING_2026-07-20.md`
- `docs/VENDOR_PAYMENT_TONY_2026-07-20.md`
- `web/lib/treasuryBuybackPolicy.ts` (20% policy)

---

*Parked deliberately so launch / press / community can take priority. Resume after launch window.*

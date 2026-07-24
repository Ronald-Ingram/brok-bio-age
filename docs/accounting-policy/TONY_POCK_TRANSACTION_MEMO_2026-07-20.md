---
doc_type: memo
tags:
  - recon
  - accounting
  - tony
  - vendor
  - scholarship
  - prepaid
  - stripe
  - reserved-ledger
  - pock
  - genius-wallet
  - buyback
  - cpa
entities:
  - neobanx
  - vendor
rails:
  - stripe
  - reserved
  - on-chain
status: living
updated: 2026-07-20
---

# Master transaction memo — Tony (landscaping / marketing / scholarships)

**Entity:** Neobanx Software, Inc.  
**Date of package:** 2026-07-20 (UTC ledger times)  
**Prepared for:** Ops, CPA, counsel  
**Status:** Ledger-backed ops record — **not** formal financial statements or legal opinion.

---

## Parties & accounts

| Role | Identifier | Notes |
|------|------------|--------|
| Customer / vendor | **Tony** | Genius Wallet **BROK-BD66A7B6** |
| User id | `bd66a7b6-7465-4dae-83a0-4698febc4250` | Parent Genius Wallet |
| Neobanx operator personal | `63a83de5-b09a-40c8-8ef9-497f63e918bd` | Sent first vendor slices; later reimbursed |
| Corp treasury (on-chain) | `GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7` | USDC buybacks + SOL for fees |
| Price basis (vendor $5,500) | **$0.00226 / $POCK** | Product Dexscreener quote at time of vendor net |
| Policy buyback | **20%** of gross service revenue | `POCK_BUYBACK_PCT` / model B71 |

**Parent Genius balance after family allocations (ledger):** **2,349,852 $POCK** reserved  
(Updated `2026-07-20T21:01:12Z` after Jordyn 44k allocation.)

---

## 1. Customer prepaid purchases (Stripe → Tony Genius)

| When (UTC) | Cash | amount_cents | $POCK credited | stripe_session_id (prefix) | Classification |
|------------|-----:|-------------:|---------------:|----------------------------|----------------|
| 2026-07-18T02:09:40Z | ~$100 | 9,999 | 47,956 | `cs_live_a1i9c…` | Customer prepaid top-up |
| 2026-07-18T02:14:02Z | ~$400 | 40,000 | 191,846 | `cs_live_a1agR…` | Customer prepaid top-up |
| 2026-07-20T20:27:09Z | ~$10 | 999 | 4,424 | `cs_live_a1PvL…` | Customer prepaid top-up |
| 2026-07-20T19:54:25Z | **$4,500** | **450,000** | **1,992,914** | `cs_live_a1nfGYE…` | Customer prepaid top-up |

**Books (simplified):**  
DR Stripe cash / receivable · CR Deferred prepaid service liability (or CPA equivalent).  
**20% buyback accrual** on eligible gross (e.g. $4,500 → **$900**).

**Cash vs ledger:** Genius $POCK may credit before bank payout. When Stripe settles cash, clear receivable; **do not re-issue $POCK**.

---

## 2. Vendor / marketing package (~$5,500 in $POCK to Tony)

Intent: Neobanx pays Tony in $POCK for **marketing / value-exchange promotion** of $POCK with landscapers (Tony as first accepting landscaping services for $POCK).

| When (UTC) | $POCK | Path | Note / id |
|------------|------:|------|-----------|
| 2026-07-20T20:45:28Z | **50,000** | Personal Send → instant credit | invite-9c4ca006… · Send for Tony |
| 2026-07-20T20:46:00Z | **16,000** | Personal Send → instant credit | invite-28ad2b88… · Send for Tony |
| 2026-07-20T20:54:04Z | **2,367,628** | Admin vendor credit | `vendor-tony-BROK-BD66A7B6-1784580844328` · net ~$5,350.84 of $5,500 |
| **Vendor total** | **2,433,628** | | ≈ **$5,500** @ $0.00226 |

**Books:** Marketing / contractor expense (in-kind). **Not** customer revenue.  
**Ops:** Operator personal Sends **66,000** later reimbursed to personal Genius wallet (ops reimburse + demo buffer — separate session).

---

## 3. Family sub-wallets — scholarships (Jacob & Jordyn)

Tony created **parent-controlled** Genius sub-wallets and funded them from his parent balance (not separate login accounts).

### Sub-wallet registry

| Nickname | Sub-wallet id | Created (UTC) | Balance after funding |
|----------|---------------|---------------|----------------------:|
| **Jacob** | `68202ef1-c7a7-4de2-8a30-9fba72c7cfb8` | 2026-07-20T20:57:43Z | **44,100** $POCK |
| **Jordyn** | `b7f30339-4c71-4460-bad5-8564860f321c` | 2026-07-20T20:58:52Z | **44,100** $POCK |

### Sub-wallet ledger (fund_in)

| Child | When (UTC) | Amount | Balance after | Note |
|-------|------------|-------:|--------------:|------|
| Jacob | 2026-07-20T20:58:11Z | **100** | 100 | Funded from parent Genius Wallet |
| Jacob | 2026-07-20T21:00:58Z | **44,000** | **44,100** | Funded from parent Genius Wallet |
| Jordyn | 2026-07-20T20:59:05Z | **100** | 100 | Funded from parent Genius Wallet |
| Jordyn | 2026-07-20T21:01:12Z | **44,000** | **44,100** | Funded from parent Genius Wallet |

**Per child total funded:** **44,100 $POCK** (100 + 44,000).  
**User intent:** ≈ **$100 scholarship each** at ~$0.00226 → ~44,248 $POCK; actual transfer **44,100** each (within rounding/ops).

### Parent Genius ledger (transfer_out)

| When (UTC) | Amount | Note | Parent balance_after |
|------------|-------:|------|---------------------:|
| 2026-07-20T20:58:11Z | −100 | Allocated to sub-wallet · Jacob | 2,437,952 |
| 2026-07-20T20:59:05Z | −100 | Allocated to sub-wallet · Jordyn | 2,437,852 |
| 2026-07-20T21:00:58Z | −44,000 | Allocated to sub-wallet · Jacob | 2,393,852 |
| 2026-07-20T21:01:12Z | −44,000 | Allocated to sub-wallet · Jordyn | **2,349,852** |

**Classification:** Intra-family **allowance / scholarship envelopes** under Tony’s custody. Parent retains control (fund/reclaim). Not separate Neobanx customers unless later spun out.

**Books (Tony household / optional Neobanx note):**  
- If Neobanx funded scholarships: promo expense.  
- If Tony funded from his own prepaid balance: **internal reallocation only** (no new Neobanx P&amp;L) — **this matches ledger** (parent `transfer_out` / sub `fund_in`).

---

## 4. Treasury buyback (20% of $4,500 top-up)

| Field | Value |
|-------|--------|
| Gross | $4,500 (450,000 cents) |
| Buyback reserve | **$900** (90,000 cents) |
| Status | **executed** (after SOL fee top-up) |
| When | 2026-07-20T22:15:51Z |
| Input asset | **USDC** (primary) |
| $POCK received (UI) | **~390,684.58** |
| Solana tx | `3FixQRQWtBT5D18urp76SEtBeYQFf3T7JUpxQdJxsMHqK1KF8PJ1TPrx2PfaiogrfCsHWXXiAbbqTDRotDacqwxb` |

**Note:** Swap spends **USDC**; corp wallet also needs **native SOL for gas/rent** (≥~0.05 SOL recommended).

---

## 5. Operator personal wallet restore (for demos)

| Field | Value |
|-------|--------|
| User | `63a83de5-…` |
| Credited | **266,000** $POCK (66,000 reimburse + 200,000 demo buffer) |
| Session | `ops-reimburse-demo-…` |
| Balance after | **~266,218** $POCK |

---

## 6. Value-exchange program (narrative for file)

- **Tony:** Customer of prepaid $POCK **and** vendor accepting $POCK for landscaping; promoter of landscaper value-exchange.  
- **Jacob / Jordyn:** College kids; parent-funded sub-wallet “scholarships” (~$100 each in $POCK).  
- **Neobanx:** Platform / prepaid utility issuer; marketing spend in $POCK; 20% revenue buyback policy.  
- **Framing:** Prepaid software/services utility (store-credit analogy); optional secondary market; not bank deposit; not investment contract pitch.

---

## 7. Related files

| File | Purpose |
|------|---------|
| `docs/VENDOR_PAYMENT_TONY_2026-07-20.md` | Vendor credit detail |
| `docs/TONY_VALUE_EXCHANGE_ACCOUNTING_2026-07-20.md` | Policy + framing memo |
| `docs/accounting-policy/crypto-assets-securitieslaws-bblocks.pdf` | SEC OASB educational PDF |
| Desktop `Kiron Canon/Accounting_Policy/` | Same PDF for Canon library |

---

## 8. Checklist for CPA close

- [ ] Match Stripe payouts for $100 / $400 / $10 / $4,500 to `cs_live_*` sessions  
- [ ] Expense marketing 2,433,628 $POCK vendor package at FMV policy  
- [ ] Confirm scholarships are **Tony-funded reallocations** (sub-wallets) vs Neobanx grants  
- [ ] Record executed $900 USDC→$POCK buyback treasury lot  
- [ ] 1099 / barter / landscaping income guidance for Tony (his CPA)  

---

*Sources: production Supabase `brok_users`, `pock_ledger`, `genius_sub_wallets`, `genius_sub_wallet_ledger`, `stripe_payments`, `treasury_buyback_batches` as of 2026-07-20.*

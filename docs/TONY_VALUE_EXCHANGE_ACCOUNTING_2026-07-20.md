---
doc_type: memo
tags:
  - recon
  - accounting
  - tony
  - vendor
  - prepaid
  - pock
  - genius-wallet
  - counsel
  - cpa
entities:
  - neobanx
  - vendor
rails:
  - reserved
  - stripe
status: living
updated: 2026-07-20
---

# Tony / landscaping value-exchange — accounting memo (ops, not formal legal opinion)

**Date:** 2026-07-20  
**Entity:** Neobanx Software, Inc.  
**Counterparty (customer / vendor):** Tony · Genius Wallet **BROK-BD66A7B6** · `bd66a7b6-7465-4dae-83a0-4698febc4250`

> Not legal, tax, or investment advice. Confirm classifications with CPA and counsel.  
> $POCK is framed in product as **prepaid utility / digital tool access**, not a bank deposit, not FDIC-insured.

---

## 1. Is the 20% buyback correct?

**Yes — in product policy and code.**

| Source | Rule |
|--------|------|
| `web/lib/treasuryBuybackPolicy.ts` | `POCK_BUYBACK_PCT = 0.2` |
| Disclosure | **20% of Neobanx Software gross service revenue** reserved for **treasury $POCK buybacks** (model B71) |
| Scope | Stripe **top-ups**, **subscriptions**, IEM, Inneagram, other Neobanx services (when accrued) |

**What 20% is *not*:**  
- Not 20% of *all* cash in the company bank forever.  
- Not an automatic “buy $SPOCK with every dollar on every day” promise to customers.  
- **Operational policy:** on **gross service revenue** (e.g. Stripe prepaid top-ups), accrue 20% for **on-chain treasury buybacks** (USDC → $POCK via Jupiter into **corp wallet**).

**Today’s $4,500 Stripe top-up (Tony):**  
- Gross: **$4,500** → buyback accrual target **$900** (20%).  
- System **attempted** buyback batches for that accrual; recent batches show **`failed`** (Solana fee / route simulation — e.g. insufficient SOL for ATA rent).  
- **Action:** fund corp wallet with enough **SOL for fees**, retry treasury buyback in Admin → until status **`executed`**.

**Cash “landing” vs Genius balance:**  
- Tony’s **$POCK already credited** on successful webhook (`cs_live_…` → 1,992,914 $POCK for $4,500).  
- **Bank/Stripe payout** to Neobanx can lag (payout schedule). Accounting:  
  - **DR** Stripe receivable / cash in transit  
  - **CR** Unearned revenue / deferred prepaid service liability (or similar) when tokens issued  
  - When cash hits bank: clear receivable  

---

## 2. Reconstruct Tony-related flows (ops view)

Market quote used for vendor net: **~$0.00226/POCK** (Dexscreener / product price API).  
Retail anchor in model remains **~$0.20** for some materials — **do not mix** without labeling which price basis.

### A. Customer prepaid purchases (Tony → Neobanx cash via Stripe)

| When | Cash (cents) | $POCK issued | Session (prefix) |
|------|-------------:|-------------:|------------------|
| ~Jul 18 | $100 (9999) | 47,956 | `cs_live_…` |
| ~Jul 18 | $400 (40000) | 191,846 | `cs_live_…` |
| ~Jul 20 | ~$10 (999) | 4,424 | `cs_live_…` |
| ~Jul 20 | **$4,500** (450000) | **1,992,914** | `cs_live_a1nfGYE…` |

**Books (simplified):**  
- Cash / Stripe receivable ↑  
- Deferred prepaid digital services liability ↑ (obligation to honor utility)  
- Accrue **20% buyback reserve** on eligible gross  

### B. Vendor / marketing pay (Neobanx → Tony in $POCK)

| Component | $POCK | Notes |
|-----------|------:|-------|
| Personal Send (you) | 50,000 + 16,000 = **66,000** | Instant credit; later reimbursed ops |
| Admin vendor top-up | **2,367,628** | Session `vendor-tony-BROK-BD66A7B6-…` · ~$5,350.84 of $5,500 net package |
| **Vendor package total** | **~2,433,628** | ≈ **$5,500** at $0.00226 |

**Books (simplified):**  
- Marketing / contractor expense (or prepaid marketing asset if multi-period)  
- Liability settlement in-kind (digital prepaid units), or reduction of inventory of service credits if you track that way  
- **Not** customer revenue  

### C. Scholarships (kids Jacob & Jordyn) — $100 each

| Intent | ≈ $POCK @ $0.00226 | Classification |
|--------|-------------------:|----------------|
| Jacob $100 | ~44,248 | Promotional / scholarship / community grant |
| Jordyn $100 | ~44,248 | Same |

**If not yet paid on-ledger:** create Genius sub-wallets or separate accounts and credit with note  
`Scholarship · Jacob/Jordyn · landscaping family value-exchange program · not investment advice`.

**Books:** Marketing / community / education expense (confirm with CPA; 1099 if cash later).

### D. Landscaping services (Tony accepts $POCK)

| Role | Framing |
|------|---------|
| Tony | Vendor of real-world services |
| Neobanx / users | Pay with prepaid digital units or on-chain $POCK |
| Tax | Service income to Tony when he “sells” landscaping for $POCK — he needs CPA on FMV at receipt; Neobanx expense at FMV of services received |

---

## 3. Suggested chart of accounts (practical)

| # | Bucket | Examples |
|---|--------|----------|
| 1 | **Stripe cash / receivable** | $4,500, $400, $100 when paid out |
| 2 | **Deferred prepaid revenue** | Customer top-ups until used or policy recognizes |
| 3 | **Marketing / vendor expense** | $5,500 $POCK package to Tony |
| 4 | **Promotional grants** | Scholarships, trial credits (from corp float / treasury policy) |
| 5 | **Treasury buyback reserve** | 20% of gross service revenue |
| 6 | **Corp Solana treasury** | USDC + $POCK held; buyback executions |
| 7 | **Intercompany / founder ops** | Reimburse personal wallet for corp vendor Sends |

Keep a **reconciliation spreadsheet**: Stripe payout ID ↔ `stripe_session_id` ↔ user BROK code ↔ $POCK issued ↔ buyback accrual status.

---

## 4. Restore demo / personal balance (executed ops)

| Item | Value |
|------|--------|
| Wallet | `63a83de5-…` (your main Genius) |
| Reimburse Tony personal Sends | **66,000** $POCK |
| Demo / ops buffer | **200,000** $POCK |
| **Total credited** | **266,000** $POCK |
| Note | Ops reimburse + demo buffer — **not** customer Stripe top-up |

Refresh Genius Wallet on that account to see balance.

---

## 5. Legal / regulatory **framing** (plain language — counsel to confirm)

### Stronger analogies (use carefully)

| Analogy | Why it helps | Limits |
|---------|--------------|--------|
| **Store gift card / prepaid service credit** (“Walmart-style store dollars for a tech services platform”) | Prepaid access to **defined services** (IEM, Bio-Age, Inneagram, canvas, chat metering, Genius Wallet utility) | Gift cards are regulated; still not a bank deposit |
| **Closed-loop or hybrid prepaid digital good** | Spend for Neobanx services; optional secondary market | Secondary market ≠ investment contract pitch |
| **Software SaaS + prepaid units** | USD sub + metered $POCK | Keep roadmap vs live clear |

### Language to prefer

- Prepaid **access to software/services** and **utility digital asset** for metering  
- **Not** a bank deposit; **not** FDIC-insured; **value can go up or down**  
- Secondary market (Phantom, Solflare, Jupiter): **optional liquidity**, not a promise of profit  
- Finite supply / demand: OK as **product/tokenomics description**; **avoid** “you will profit / guaranteed appreciation”  

### Language to avoid (especially press / landscapers)

- “Investment,” “returns,” “security,” “shares of Neobanx”  
- “SEC/CFTC approved”  
- Guaranteed buybacks or price floors for customers  
- Calling Stripe top-ups “buying equity”  

### How to say the Walmart line (cleaned)

> “Neobanx is building a platform for advanced tech services — decision tools, Bio-Age, personality assessment, AI banking interface, and more. $POCK works like **prepaid store credit** for that platform: you load value to use services. It’s also a **digital asset** that can trade on open Solana markets. That’s **utility and market price**, not a bank account and not a promise of investment returns.”

### Landscaper program

- **Barter / value exchange:** services ↔ prepaid digital units or on-chain tokens  
- Document: rate card, FMV of labor, amount of $POCK, date, invoice  
- Separate **scholarship** gifts to kids from **vendor pay** to Tony  

---

## 6. Checklist when the $4,500 “lands” in bank

1. Match Stripe payout → session `cs_live_a1nfGYE…` → 1,992,914 $POCK already on Tony.  
2. Confirm **20% = $900** buyback accrual row exists; **retry execution** after SOL top-up on corp wallet.  
3. Do **not** double-credit Tony’s Genius balance.  
4. Journal cash receipt vs deferred revenue / COGS / marketing as CPA directs.  
5. Scholarships Jacob/Jordyn: pay if still outstanding; ledger notes.  

---

## 7. Open ops items

- [ ] Corp wallet: enough **SOL** for buyback txs; re-run failed **$900** (and any other) buyback batches  
- [ ] Scholarships Jacob & Jordyn $100 each (if not already on-ledger)  
- [ ] Landscaping rate card / acceptance of $POCK in writing  
- [ ] CPA: 1099 / barter / prepaid revenue recognition  
- [ ] Counsel: marketing + landscaper program copy review pre-press  

---

*Ops memo only. Numbers from production Supabase ledger / policy code as of 2026-07-20.*
EOF
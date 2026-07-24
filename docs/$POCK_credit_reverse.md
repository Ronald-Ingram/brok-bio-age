---
doc_type: design
tags:
  - recon
  - pock
  - on-chain
  - reserved-ledger
  - genius-wallet
  - custody-release
  - corp-wallet
  - backlog
entities:
  - neobanx
  - brok
  - pock
rails:
  - on-chain
  - reserved
status: parked
updated: 2026-07-20
---

# $POCK credit reverse (on-chain → Genius Wallet)

**Filename intent:** `$POCK credit reverse` — post-launch feature  
**Status:** Design note for **after launch**; not scheduled for launch-day build  
**Also indexed in:** `POST_LAUNCH_FOLLOWUP_BACKLOG.md`  
**Created:** 2026-07-20  

---

## Problem

Newbies often **prefer Genius Wallet** to Phantom / Solflare for daily use (account code, family subs, Stripe, BROK chat), but they may already hold **$POCK on-chain**. Today they can:

- Buy reserved $POCK (card / gift / send)  
- **Release** reserved → Phantom/Solflare (treasury out)  

They **cannot** easily:

- **Deposit** on-chain $POCK → Genius reserved balance  

---

## Product decision (scope)

| In scope | Out of scope (for now) |
|----------|-------------------------|
| **$POCK only** (SPL mint) | Other crypto (SOL, USDC, random tokens) |
| Solana wallets: Phantom, Solflare, Backpack, etc. | Multi-chain |
| 1:1 credit to Genius reserved ledger | Haircuts / FX on deposit |
| Reverse of existing treasury ↔ ledger rail | Full exchange / multi-asset custody |

---

## Mental model: reverse the current flow

| | **Current (live): release** | **Credit reverse: deposit** |
|--|----------------------------|-----------------------------|
| **On-chain** | Corp treasury **sends** SPL $POCK → user wallet | User wallet **sends** SPL $POCK → **corp treasury** |
| **Supabase** | **Debit** `pock_balance` (custody release) | **Credit** `pock_balance` (deposit) |
| **Books** | Inventory ↓ · liability ↓ | Inventory ↑ · liability ↑ |

Same hybrid rail, **opposite sign**:

**On-chain $POCK in/out of corp treasury ↔ reserved Genius balance on Supabase.**

---

## Why this is “just reverse” (and mostly is)

Release today:

1. User requests amount + destination  
2. Ledger **debits** reserved  
3. Treasury **signs** SPL transfer out  
4. Confirm on-chain  

Deposit:

1. User sends $POCK **to** treasury (from Phantom/Solflare)  
2. Observe / verify the transfer  
3. Ledger **credits** reserved **1:1**  
4. Treasury holds SPL matching customer liability  

---

## Implementation differences (not conceptual blockers)

| Topic | Detail |
|-------|--------|
| **Who signs** | Release: corp signs. Deposit: **user** signs; we **detect/verify** |
| **Attribution** | Must map tx → Genius user. **MVP:** only credit if `from` = **linked** Solana wallet |
| **Confirmations** | Wait N Solana confirmations before credit |
| **Idempotency** | One signature → one ledger credit (no double credit) |
| **Wrong asset** | Reject non-`$POCK` mint; support queue later |

---

## Recommended MVP shape

1. User **links** Solana address (existing custody connect pattern).  
2. Genius UI: **“Deposit $POCK”** — treasury address + mint + suggested amount.  
3. User sends **only** $POCK from that linked wallet.  
4. Job/watcher: transfer **to** treasury, correct mint, **from** linked address → credit Supabase.  
5. Ledger kind e.g. `on_chain_deposit` · note with signature + amount.  
6. Admin recon: unmatched deposits, wrong mint, under/over pay.  

**Avoid first:** shared address + memo-only (high support load).

**Later:** Solana Pay / deep-link “Pay with Phantom.”

---

## Compliance / framing (product language)

- Prepaid **utility** / service access credit for Neobanx stack — not a bank deposit.  
- Not FDIC-insured; value can fluctuate.  
- $POCK-only custodial loop reduces “general crypto exchange” scope.  
- Terms: deposits may be irreversible; confirmations required.  
- Counsel review before marketing as “deposit from any wallet.”  

See also: `docs/accounting-policy/crypto-assets-securitieslaws-bblocks.pdf` (SEC OASB educational; staff views only).

---

## Scale note (Spanner / quantum resilience)

Upgrading Supabase → Spanner (atomic clocks, multi-region) strengthens **ledger durability** at scale. It does **not** replace:

- On-chain observation  
- Attribution rules  
- Treasury key security  

Ship reverse credit on current stack; harden DB when volume demands.

---

## Success metrics

- Deposit success rate (linked wallet, correct mint)  
- Time to credit after confirmations  
- Support tickets (wrong mint / unattributed)  
- % of Genius users who both deposit and release (full hybrid loop)  

---

## Dependencies / related backlog

- Stable **corp treasury** ops (SOL for fees + USDC for buybacks already live)  
- **Recon / accounting** so deposits journal cleanly  
- **Mobile app** (deposit UX is much better native)  
- **Merchant solutions** (merchants may deposit earned $POCK into Genius)  

---

*Resume after launch. Do not expand into multi-asset custody without a separate design.*

---
doc_type: memo
tags:
  - recon
  - accounting
  - vesting-unlock
  - streamflow
  - on-chain
  - corp-wallet
  - pock
  - founder
  - cpa
entities:
  - neobanx
rails:
  - on-chain
status: living
updated: 2026-07-23
---

# Transaction memo — Streamflow vested $POCK claim → corp treasury

**Entity:** Neobanx Software, Inc. (corp Solana treasury)  
**Date of claim (UTC):** 2026-07-23T01:36:57Z  
**Prepared for:** Ops, CPA, counsel  
**Status:** Ops record from on-chain evidence — **not** formal financial statements or tax advice.

---

## Economic event (what happened)

| Field | Value |
|--------|--------|
| Action | Streamflow **Withdraw** — unlocked tokens from SPL vesting stream → recipient |
| Program | `strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m` (Streamflow) |
| Amount | **9,000,500 $POCK** |
| Mint | `76r29NpnRW8PAxpnSnVBFcZPUcukgvno1Kkiysg8pump` |
| Recipient (corp treasury) | `GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7` |
| Pre → post corp $POCK | **9,864,821.03** → **18,865,321.03** |
| Signature | `4jwFSXtLGT3dh9JLog7UTBrpiCoWgo7mjtAYjrGEzMbPvF1MEzYAoWCC8udLLWGsBCYx22zCEqtj3DUvUYtqvzCP` |
| Explorer | https://solscan.io/tx/4jwFSXtLGT3dh9JLog7UTBrpiCoWgo7mjtAYjrGEzMbPvF1MEzYAoWCC8udLLWGsBCYx22zCEqtj3DUvUYtqvzCP |

**Not involved:** Stripe cash, Genius reserved ledger, corp trial float (`corp_pock_wallet`).

---

## Classification guidance (recommended)

### Default: **not** a fresh capital injection

If the Streamflow schedule is **Neobanx / founder-allocation vesting into the corporate treasury wallet** (company was already the economic beneficiary; tokens were locked for the entity or for founder equity that vests *into* ops treasury under an existing plan):

| Treatment | Why |
|-----------|-----|
| **Reclassification within equity / treasury**, not new cash contribution | Tokens already belonged economically to the cap table / treasury plan; claim only **unlocks custody** (escrow → liquid treasury) |
| **No revenue** | No customer performance; not a sale |
| **No Stripe / prepaid liability movement** | Dual-rail books: reserved ledger unchanged |
| Optional memo: “Vested treasury unlock” | Same equity bucket; increase **liquid digital asset**, decrease **restricted / unvested digital asset** (or off-balance disclosure if unvested was never booked) |

**Simplified books (if both restricted + unrestricted were on the books):**

```
DR  Digital assets — $POCK treasury (unrestricted / liquid)     9,000,500 units
CR  Digital assets — $POCK restricted (Streamflow / vesting)    9,000,500 units
```

**If unvested was never booked (common for early startups):**  
Document as **vesting unlock / treasury receipt** with FMV footnote for disclosure; do **not** double-count equity as a new cash contribution.

### When it *would* be capital contribution / founder advance

Only if substance is: **tokens were founder-personal property** (personal vesting stream, personal beneficiary) and founder **voluntarily transferred** them to the corp wallet as an asset gift/contribution:

| Path | Entry style |
|------|-------------|
| **Capital contribution** | DR Digital assets · CR Additional paid-in capital (or equity contribution) at agreed policy FMV |
| **Due to founder** (if temporary / expected repay) | DR Digital assets · CR Due to founder — prefer when personal funds/tokens fund corp ops without formal equity docs |

Your internal rule (`POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md`): personal-funded corp treasury items should be **Due to founder** *or* documented **capital contribution** — never “invisible personal phone wallet.” That rule fits **founder-owned → corp** transfers, not **company vesting stream → company treasury** unlocks.

### Practical recommendation for *this* claim

Given recipient is **`GDbcx…` corp treasury** and the path is **Streamflow withdraw to that wallet** (not a personal Phantom send):

1. **Primary label:** **Vested treasury unlock / restricted → liquid treasury**  
2. **Do not** book as customer revenue, Stripe top-up, or trial float seed  
3. **Do not** auto-label as founder capital injection **unless** counsel/cap table says the stream beneficiary was *you personally* and the corp receipt is a contribution  
4. Attach Solscan link + amount + date to the period pack  
5. FMV at claim (optional footnote for FMV policies / tax): e.g. market ~$0.00425 → ~**$38,250** notional (confirm quote at claim time with CPA) — **disclosure only** unless entity already marks crypto to market

**Confirm with CPA once:** who is the **legal beneficiary** on the Streamflow contract (entity vs founder). That single fact decides “unlock” vs “capital contribution.”

---

## Dual-rail checklist (Neobanx ops)

| Rail | Change from this claim? |
|------|-------------------------|
| Stripe USD / issued reserved $POCK | No |
| User reserved ledger | No |
| Corp float (trials) Supabase | No (unless you later seed float from on-chain recon) |
| On-chain corp treasury | **Yes — +9,000,500 $POCK** |
| Genius Wallet admin “on-chain corp treasury” tile | Reflects live RPC after deploy |

---

## Related

- `docs/POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md` — founder advances rule  
- `docs/accounting-policy/TONY_POCK_TRANSACTION_MEMO_2026-07-20.md` — memo format  
- Admin: Genius Wallet treasury · on-chain corp line  

---

*Ops memo only. Tax/equity treatment must match the vesting agreement and CPA guidance.*

---
doc_type: memo
tags:
  - recon
  - tony
  - vendor
  - pock
  - reserved-ledger
  - genius-wallet
entities:
  - neobanx
  - vendor
rails:
  - reserved
status: living
updated: 2026-07-20
---

# Vendor payment — Tony (BROK-BD66A7B6) · 2026-07-20

## Intent
Pay Tony a total of **~$5,500 USD** in reserved Genius Wallet $POCK, net of personal Send already completed.

## Quote
| Field | Value |
|-------|--------|
| Source | Dexscreener (product `/api/pock/price`) |
| usdPerPock | **$0.00226** |
| Target total USD | **$5,500.00** |
| Target total $POCK | **2,433,628** |

## Already sent (personal wallet `63a83de5…`)
| Amount | When (UTC) | Path |
|--------|------------|------|
| 50,000 $POCK | 2026-07-20T20:45:28Z | Send / invite instant credit |
| 16,000 $POCK | 2026-07-20T20:46:00Z | Send / invite instant credit |
| **Subtotal** | | **66,000 $POCK ≈ $149.16** |

## Admin vendor credit (this entry)
| Field | Value |
|-------|--------|
| Kind | Vendor payment (admin credit) |
| Recipient | Tony · **BROK-BD66A7B6** · `bd66a7b6-7465-4dae-83a0-4698febc4250` |
| Additional $POCK | **2,367,628** |
| Additional USD | **$5,350.84** |
| Idempotency / session id | `vendor-tony-BROK-BD66A7B6-1784580844328` |
| amount_cents | 535084 |
| Tony balance after | **2,438,052** $POCK |
| Ledger kind | `stripe_credit` (via `credit_pock_from_stripe`) |
| Note | Vendor payment · Tony · BROK-BD66A7B6 · net $5350.84 of $5500 total (already sent 66000 $POCK ≈ $149.16 @ $0.00226/POCK dexscreener) · +2367628 $POCK |

## Check
`66,000 + 2,367,628 = 2,433,628` $POCK × $0.00226 ≈ **$5,500**.

## How Tony sees it
Genius Wallet signed in as **BROK-BD66A7B6** — reserved balance (not on-chain unless he releases).
EOF
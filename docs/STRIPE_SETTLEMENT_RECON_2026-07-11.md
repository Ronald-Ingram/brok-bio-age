---
doc_type: recon-sample
tags:
  - recon
  - stripe
  - prepaid
  - reserved-ledger
  - genius-wallet
  - pock
  - accounting
entities:
  - neobanx
rails:
  - stripe
  - reserved
status: living
updated: 2026-07-11
---

# Stripe ↔ Genius Wallet settlement recon — 2026-07-11

Live pull from Supabase `avfuuzloxgqqkrdxkqzf` + Stripe live API.

## BROK users

| Metric | Value |
|--------|-------|
| **Current `brok_users`** | **189** |
| This morning (user report) | 161 |
| Delta | **+28** |
| Signups Jul 11 (UTC) | 23 |
| Signups Jul 10 | 84 |
| Signups Jul 9 | 70 |

## Two different "settlement" clocks

### A) Purchase → Genius Wallet ($POCK appearance)

Webhook path: Stripe `checkout.session.completed` → `credit_pock_from_stripe` → `stripe_payments` + `pock_ledger` (`stripe_credit`, **reserved custody**).

| Stat (12 card top-ups) | Seconds |
|------------------------|---------|
| Min | **13 s** |
| Median | **~76 s** |
| Mean | **~144 s (~2.4 min)** |
| Max | **724 s (~12 min)** outlier |

Outliers:
- **12.1 min** — Jul 9 $9.99 session
- **6.5 min** — Jul 10 $9.99 session

Likely causes: late `payment_status=paid`, webhook retry, or success-page `sync-checkout` catching what webhook missed.

**App ledger vs `stripe_payments`:** identical timestamps (same RPC write) — no extra DB lag after credit RPC runs.

### B) Purchase → Stripe balance available → bank payout

| Stat | Value |
|------|-------|
| Charge → `available_on` | **~72–93 hours (~3–4 days)** |
| Recent charges available | Jul 13–15 |
| Last bank payout | **$13.56** on **2026-07-08** |
| Stripe balance now | **available −$0.47**, **pending ~$391.73** |

Standard Stripe rolling settlement. **POCK hits user wallets long before cash is withdrawable to your bank.**

## Volume (card top-ups in `stripe_payments`)

- **12** paid card top-ups
- **~$295.93** gross card top-up USD
- **~106,464 $POCK** credited (variable pack pricing)
- **4** invite/gift rows also in `stripe_payments` (not card)
- **7** subscription checkout events in `stripe_subscription_events`

## Files

- CSV: `stripe_pock_reconciliation_2026-07-11.csv`
- In-app: `TransactionHistorySection` + `POST /api/pock/reconcile`

## Production chat / Groq (urgent)

`https://brok.neobanx.com/api/brok/status`:
- `chatReady: true`, provider **`groq_fallback`**
- Primary: **llama-3.3-70b-versatile**
- Fast fallback only: **llama-3.1-8b-instant** on **TPD 429** (same Groq account)
- **No** automatic failover to xAI / Vertex / Ollama on TPD block
- `brokApi: false`

Recommended chain: Groq 70B → Groq 8B → xAI Grok → OpenAI-compatible peer → Ollama VM.

## Trading arena

Still running (Streamlit :8502, overnight loop, H toxic paper).
Latest: **D +88.6%** paper; A ~flat; C −0.2% / 43 trades.

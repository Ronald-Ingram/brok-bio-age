---
doc_type: incident
tags:
  - recon
  - trial
  - corp-float
  - pock
  - reserved-ledger
  - custody-release
  - genius-wallet
entities:
  - neobanx
  - brok
rails:
  - reserved
  - on-chain
status: living
updated: 2026-07-22
---

# Incident: trial / device farm + emergency kill (2026-07-22)

## Summary

Admin user count jumped **~283 → 2k+** in hours. Not a UI glitch.

- **Vector:** new `deviceId` → `/api/pock/auth` mints `bioage-*@users.brok.app` → `bootstrap_user` trial **+100 $POCK** → gift/send to sink **`1cdaee38-…`**
- **Sink Solana:** `HfY3H13LL2RSeP11Q3EWwdEdPEgt2ZokmVbwK89oSL9e`

## Kill implemented

### Database (`024_emergency_farm_kill.sql`)

| Control | Effect |
|---------|--------|
| `brok_kill_switches.trial_mint=true` | No new Welcome trial credits |
| `brok_kill_switches.p2p_transfers=true` | `spend_pock` rejects `transfer_out` / `gift_sent` |
| `brok_users.account_frozen_*` on sink | No credits, no spends, no custody release |
| `credit_pock_*` | Frozen users cannot receive invite/stripe credits |

### App (`web/lib/emergencyKill.ts`)

| Env | Default |
|-----|---------|
| `BROK_EMERGENCY_KILL` | **ON** if unset; set `0` to disarm master |
| `BROK_KILL_TRIAL_MINT` | follows master |
| `BROK_KILL_P2P_TRANSFERS` | follows master |
| `BROK_KILL_NEW_DEVICE_AUTH` | follows master — blocks **new** device auth mint |
| `BROK_FROZEN_USER_IDS` | extra UUIDs comma-separated |

Hard-frozen: `1cdaee38-4f20-4688-be70-0cc250c3cf88`

Routes wired: `pock/auth`, create-invite, claim/auto-claim gift, request-release, `creditPockFromStripe`, bootstrap still safe via SQL.

## After deploy

1. Confirm SQL applied on Supabase (migration or one-shot).
2. Deploy web with kill lib (defaults ON).
3. Watch `brok_users` create rate and sink balance.
4. Later: purge farm rows; set `BROK_EMERGENCY_KILL=0` only when ready; re-enable trial with rate limits.

## Disarm (careful)

```bash
# Vercel
BROK_EMERGENCY_KILL=0

# SQL
update brok_kill_switches set enabled=false where key in ('trial_mint','p2p_transfers','new_device_auth');
-- unfreeze only after investigation
-- update brok_users set account_frozen_at=null where id='1cdaee38-...';
```

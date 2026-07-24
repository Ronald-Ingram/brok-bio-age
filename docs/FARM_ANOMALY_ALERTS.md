# Farm / anomaly alerts

## Primary: Vercel cron (production)

| | |
|--|--|
| **Path** | `GET /api/cron/farm-alert` |
| **Schedule** | **daily 15:00 UTC** on Hobby (`0 15 * * *`); upgrade Pro for `*/15` |
| **Code** | `web/lib/farmAnomalyAlert.ts` + `web/app/api/cron/farm-alert/route.ts` |
| **Runs when** | Always-on with the site (Mac can be off) |

### Vercel env (production)

| Var | Required | Notes |
|-----|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | yes | already on project |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | already |
| `TELEGRAM_BOT_TOKEN` | yes for TG | same as BROK Telegram bot |
| `BROK_ALERT_TELEGRAM_CHAT_ID` | optional | default `6211143757` |
| `BROK_GMAIL_*` | for email | same as product mail |
| `BROK_ALERT_EMAIL` | optional | default `info@neobanx.com` |
| `CRON_SECRET` | recommended | Bearer auth for manual + cron |

Manual trigger:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://brok.neobanx.com/api/cron/farm-alert?force=1"
```

**Hobby plan note:** Vercel Hobby only allows **daily** crons. Pro allows `*/15`. If deploy rejects the schedule, change to `0 * * * *` (hourly) in `web/vercel.json`.

## Backup: Mac cron (optional)

```bash
*/10 * * * * /Users/kiki/bio-age-tool/scripts/run_farm_anomaly_alert.sh >> /Users/kiki/bio-age-tool/data/logs/farm_alert.log 2>&1
```

## Thresholds (env)

- `BROK_ALERT_USERS_1H=40`
- `BROK_ALERT_TRIALS_1H=25`
- `BROK_ALERT_XFER_1H=25`
- `BROK_ALERT_RELEASE_1H=10`
- `BROK_ALERT_ZERO_TRIAL_1H=20`
- `BROK_ALERT_COOLDOWN_SEC=1800`

# Incident: Supabase transactional email bounce warning

**Date:** 2026-07-22  
**Project:** `avfuuzloxgqqkrdxkqzf`  
**Alert:** High rate of bounced **Supabase** transactional emails; risk of temporary send restriction.

---

## Executive answer

**Gift / day-0 / day-5 “follow-up notes” are almost certainly NOT the cause.**

Those go through **Gmail API** (`info@neobanx.com` via `web/lib/brokEmail.ts` → `sendBrokEmail`), **not** Supabase’s mailer. Live data also shows **almost no gift-outreach contact emails sent** (no `contact_email` rows with successful day0/day5 email status).

**Actual bounce source:** Supabase **Auth** emails to **non-deliverable addresses**.

---

## Evidence (queried Auth + app tables 2026-07-22)

### Auth users (527 total)

| Domain | Count | Notes |
|--------|------:|--------|
| `@users.brok.app` | 525 | Device synthetic accounts (`bioage-{hash}@…`) from `/api/pock/auth` |
| `@tempmail.dev` | 2 | Disposable; **unconfirmed**; created today |

- `users.brok.app` **MX = null** (`0 .`) → **any** mail to that domain **bounces 100%**.
- Device create path uses `email_confirm: true` (no confirm mail on create) — good.
- **Password recovery** was still sent to synthetic addresses:

| Metric | Count |
|--------|------:|
| `confirmation_sent_at` set | **2** (both `@tempmail.dev`, today) |
| `recovery_sent_at` set | **7** (all `@users.brok.app`, Jul 10–22) |
| `invited_at` | 0 |
| `email_change_sent_at` | 0 |

Each of those Auth sends to invalid/disposable inboxes is a bounce (or spam sink) on Supabase’s shared mail infrastructure.

### Gift outreach (Gmail, not Supabase)

| Field | Observation |
|-------|-------------|
| `gift_outreach` day0/day5 | Mostly `historical_no_contact` / `in_app_only` |
| Rows with `contact_email` | **0** in sample |
| `pock_invites.recipient_email` | **0** rows with email |

Cron: `vercel.json` → daily `/api/cron/gift-outreach?mode=all&email=1` still uses Gmail for ops report + day5 **only when** `BROK_GMAIL_*` configured and contact email present.

---

## Root causes

1. **Synthetic auth emails** (`@users.brok.app`) with no mailbox → recovery (and any future confirm/invite) always bounce.
2. **Someone/something triggered password recovery** on at least 7 synthetic users (not an in-app “forgot password” flow in current web code — likely public Supabase Auth recovery endpoint, dashboard, or external client using the project anon/service keys).
3. **Two disposable signups** (`pock_user_*@tempmail.dev`) with `brok_device_id` in metadata and `confirmation_sent_at` set → confirm emails fired and bounced. Pattern is **not** in current `pock/auth` route (which uses `@users.brok.app`); investigate other clients, old deploys, or direct Auth API abuse.
4. Supabase free/shared transactional mail has **low tolerance** for bounce rate; volume need not be huge.

---

## Immediate actions (do today)

### A. Supabase Dashboard (project `avfuuzloxgqqkrdxkqzf`)

1. **Authentication → Providers → Email**
   - If you only use device/password minting (no real email login): **disable Confirm email** if still on.
   - Prefer **disable email signup** if public email registration is not needed.
2. **Authentication → Rate limits**
   - Tighten email rate limits (confirm / recovery / magic link).
3. **Authentication → Users**
   - Delete or ban: `pock_user_*@tempmail.dev` (2 unconfirmed disposable).
4. **Project Settings → Auth → SMTP**
   - For any *real* Auth mail later: **custom SMTP** (Resend / Postmark / SES) on a domain you control with SPF/DKIM/DMARC — not Supabase shared mail.
5. **Logs**
   - Auth logs: filter recovery / signup around recovery timestamps above.

### B. Stop further bounces to synthetic mail

- Do **not** call `resetPasswordForEmail` / recovery for `@users.brok.app`.
- Do **not** use `inviteUserByEmail` for synthetic users.
- Keep `createUser({ email_confirm: true })` for device accounts (already true in `web/app/api/pock/auth/route.ts`).
- Optional hard fix later: move device identity off email entirely (anonymous auth / custom JWT) so Auth never has a routable-looking email.

### C. Gift follow-ups (separate system)

- Safe to leave Gmail outreach on if `BROK_GMAIL_*` is correct.
- Before scale: require validated recipient email; block disposable domains; never fall back to synthetic auth email as contact.

---

## What is *not* broken by this alert

| Path | Provider | Status |
|------|----------|--------|
| Gift day0 / day5 | Gmail API | Not Supabase transactional |
| Admin BROK inbox send | Gmail API | Same |
| Daily ops report cron | Gmail API | Same |
| Device session mint (`generateLink` + verify) | Auth API, no send | OK if not recovery |

---

## Follow-ups (P1)

1. Find source of `pock_user_*@tempmail.dev` + `confirmation_sent_at` (other app, test harness, or API abuse).
2. Find source of 7× `recovery_sent_at` on `bioage-*@users.brok.app` (Auth log / API key leak / automated probe).
3. Decide product auth model: keep synthetic emails vs anonymous.
4. If July 24 invites need email: use **Gmail/Resend**, never Supabase Auth mailer for marketing.

---

## Quick reply to Supabase (optional)

You can reply that you’ve identified Auth recovery/confirm to non-mailbox synthetic/disposable addresses, disabled unnecessary Auth email paths, cleaned test users, and will use custom SMTP for any real Auth mail.

---

*Investigation from codebase + live Auth Admin API + gift_outreach tables. No production config was changed in this pass.*

---

## Deep re-query (2026-07-22 evening)

### Why “only 2 tempmail” can still trigger the alert

Supabase cares about **bounce rate**, not absolute volume.

| Outbound Auth email events found on all 537 users | Count | Destination | Deliverable? |
|--------------------------------------------------|------:|-------------|--------------|
| `confirmation_sent_at` | **2** | `@tempmail.dev` | No (disposable) |
| `recovery_sent_at` | **7** | `@users.brok.app` | **No** (null MX) |
| invite / email_change / reauth | **0** | — | — |
| **Total known Auth mails** | **9** | | **~100% bounce if all failed** |

If the project sends little legitimate Auth mail, **9/9 failures = high bounce rate** → warning. The two tempmail rows are not “the only issue”; they are half of **confirm** noise. **All 7 recoveries to synthetic mail are equal or worse.**

Public Auth settings (anon-readable `/auth/v1/settings`):

| Setting | Value | Risk |
|---------|--------|------|
| `disable_signup` | **false** | Public email signup open |
| `mailer_autoconfirm` | **false** | Confirm email **required** → signup sends mail |
| `external.email` | **true** | Email provider on |
| `external.anonymous_users` | false | — |

Device `createUser({ email_confirm: true })` still auto-confirms synthetic users (no confirm mail on create). Public `signUp` / recovery to bad addresses still mail.

### Gift outreach re-check

Still **0** `contact_email` rows; day0/day5 not sending Gmail at scale. Not Supabase mailer.

### Other Supabase hygiene (not bounce, but risk)

| Signal | Value | Notes |
|--------|------:|--------|
| `auth.users` | 537 | Growing ~20–50/day (device visits) |
| `brok_users` | 305 | Wallet profiles |
| Auth without `brok_users` | **232** | Ghost device auth (never finished onboarding) |
| `brok_users` without auth | 0 | Good |
| `pock_ledger` | 1813 | OK |
| REST / Auth health | 200 | Project up |
| Storage buckets | empty | OK for current product |

### Failover note

See ops discussion in session / `docs/` — need dual-path for Auth session mint, ledger, and chat so Supabase outage or mail lockout does not hard-kill sales.

# Post-launch follow-up backlog

**Status:** Parked until after launch / press / demo window.  
**Created:** 2026-07-20  
**Related:** `POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md`, accounting-policy memos, Genius Wallet hybrid custody

---

## Priority order (founder intent)

| Priority | Initiative | Notes |
|----------|------------|--------|
| **P0 — highest / fast track** | **Mobile app** | Capacitor / native shell for brok.neobanx.com; highest priority for user experience |
| P1 | **Genius Wallet sends** | Upgrade instant credit path, reliability, UX (BROK codes, optional phone, clear “credited” vs claim link) |
| P1 | **$POCK credit reverse (deposit)** | On-chain $POCK → Genius reserved ledger (see dedicated section below) |
| P2 | **Reconciliations / accounting system** | Recon cockpit → double-entry GL → eventually replace QuickBooks (`POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md`) |
| P2 | **Merchant solutions** | Landscaper / merchant beta expansion; accept $POCK for services; invoicing / rate cards |
| P3 | **CRM** | Community, merchants, investors, outreach; integrate with gift follow-up / daily reports |

---

## Initiative summaries

### 1. Mobile app (P0)

- Fast-track iOS/Android shell (e.g. Capacitor) around production web  
- Focus: Genius Wallet, chat, family sub-wallets, deposit/send when ready  
- Push / deep links for gifts and claim flows later  

### 2. Genius Wallet sends (P1)

- Instant credit via `BROK-XXXXXXXX` (resolve codes reliably)  
- Phone **optional**; no blocked Review  
- One-tap send; clear success when already credited (de-emphasize claim link)  
- Test + large-amount safety; multi-device / Switch account clarity  

### 3. $POCK credit reverse — deposit (P1)

See full design: **`$POCK_credit_reverse.md`** (this folder).

- Reverse of custody release: Phantom/Solflare/etc. → corp treasury + credit Supabase  
- $POCK only; 1:1 reserved credit  
- Driven by newbies who prefer Genius over pure self-custody wallets  

### 4. Reconciliations / accounting system (P2)

- Founder advances (personal funded corp buybacks)  
- Stripe settlement board  
- Treasury 20% buyback recon  
- Event-sourced double entry; multi-entity; CPA export  
- Cancel QuickBooks only after clean periods  

### 5. Merchant solutions (P2)

- Merchant beta → program (landscaping first)  
- Accept $POCK for services; Genius UX for merchants  
- Invoicing, FMV notes, optional public directory later  

### 6. CRM (P3)

- Contacts: merchants, gift recipients, investors, press  
- Tie to gift outreach / day-0 / day-5 / daily reports  
- Pipeline for community and sales without fragmenting tools  

---

## Suggested post-launch week order

1. Mobile app spike (installable Genius + chat)  
2. Deposit reverse ($POCK in) + polish sends  
3. Merchant playbook + 2–3 more merchants  
4. Recon cockpit (Stripe + founder due-to + buybacks)  
5. CRM light (merchants + outreach)  

---

*Do not expand scope during launch day. Resume from this file.*

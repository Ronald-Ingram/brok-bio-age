# Community post draft — Welcome $POCK use-or-lose (2026-07-23)

**Status:** Ready to post (policy live in product FAQ + DB)  
**Tone:** clear, fair, founder voice  

---

## Suggested post

**Subject / title:** Welcome $POCK — use it or it returns to the treasury

Friends of BROK / Neobanx —

We give a small **Welcome** amount of **$POCK** so real people can try Genius Wallet and BROK without friction. That grant is funded from **Neobanx corporate treasury** — not by minting new supply.

**Today we’re formalizing a simple rule:**

1. **If you already have unused Welcome $POCK sitting idle**  
   → **10 days from today (through August 2, 2026, Pacific)** to actually try BROK (chat, Bio-Age, etc.).  
   → After that, **unused free Welcome balance returns to the Neobanx treasury.**

2. **For all new Welcome credits from now on**  
   → **30 days use-or-lose** from the day you receive them.  
   → Same idea: free trial is for trying the product, not parking empty wallets.

3. **What “used” means**  
   → You engaged the product (e.g. a calculation, metered chat/voice, or you loaded paid $POCK / subscribed).  
   → **Paid balances are not clawed back** by this policy.

4. **Program status**  
   → Welcome free credits are a **limited-time offer** and may be changed or ended **without notice**.

We also cleaned a burst of **bot-style empty trial wallets** this morning (frozen; trial returned to treasury). Real humans trying BROK are welcome. Automated farm accounts are not.

If you’ve been meaning to try BROK: **open the app, run a Bio-Age calc or chat this week.** Light the fire.

— Ronald / Neobanx  
brok.neobanx.com  

---

## Ops notes (internal)

| Action | Result |
|--------|--------|
| Morning farm (~78) | Frozen + 7,800 $POCK returned to corp float |
| Kill switches | **Left OFF** — trial mint still available for legit users |
| New trials | `trial_expires_at = now() + 30 days` in `bootstrap_user` |
| Existing idle pure trials | `trial_expires_at` ≈ end of **2026-08-02 Pacific** |
| Cron | `/api/cron/trial-expiry` daily (Vercel) |
| FAQ | `faq_welcome_trial_use_or_lose` + limited-time item in `brokFaqCanon.ts` |

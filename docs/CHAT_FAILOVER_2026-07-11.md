# BROK chat multi-provider failover — 2026-07-11

## Problem

Production chat runs as `groq_fallback` (Groq Llama 70B). When **tokens-per-day (TPD)** or RPM limits hit, users were hard-blocked with 429. The only prior cascade was **same-account** Groq 8B — useless once the whole Groq project is TPD-exhausted.

## Solution

New module: `web/lib/brokChatFailover.ts`, wired from `web/app/api/brok/chat/route.ts`.

### Chain (skips unconfigured backends)

1. **Groq primary** (`GROQ_MODEL`, default `llama-3.3-70b-versatile`)
2. **Groq fast** (`GROQ_FAST_MODEL`, default `llama-3.1-8b-instant`) on 429 / 5xx
3. **xAI Grok** (`XAI_API_KEY`, `XAI_MODEL=grok-3`)
4. **Custom OpenAI-compat** (`CHAT_FAILOVER_BASE_URL` + `CHAT_FAILOVER_API_KEY` + `CHAT_FAILOVER_MODEL`)
5. **Together / Fireworks / Cerebras / OpenAI** (if respective keys set)
6. **Ollama** only if `OLLAMA_BASE_URL` is set (not localhost on Vercel)

On success via backup: response includes `used_backup: true` and a product-safe `capacity_note`. Provider field is `brok_backup` (UI still shows **BROK Intelligence**).

### Status endpoint

`GET /api/brok/status` now includes:

```json
"chatFailover": {
  "backups": ["xai", "..."],
  "chain": ["groq:…", "groq:fast", "xai:grok-3"],
  "backupCount": 1
}
```

## Production deploy checklist

Vercel (`neobanx-zpe/web`) currently has **GROQ_API_KEY** only — **no backup key yet**.

Add at least one backup (recommended first):

```bash
cd /Users/kiki/bio-age-tool/web
vercel env add XAI_API_KEY production
# paste xAI key
vercel env add XAI_MODEL production
# value: grok-3
```

Or a cheap peer:

```bash
vercel env add CHAT_FAILOVER_BASE_URL production   # e.g. https://api.together.xyz/v1
vercel env add CHAT_FAILOVER_API_KEY production
vercel env add CHAT_FAILOVER_MODEL production
```

Then redeploy:

```bash
vercel --prod
```

## Files touched

| File | Change |
|------|--------|
| `web/lib/brokChatFailover.ts` | **New** — chain + OpenAI-compat clients |
| `web/lib/brokChatGroq.ts` | Any 429/5xx → fast model; softer user copy |
| `web/app/api/brok/chat/route.ts` | Uses `chatWithFailover` |
| `web/app/api/brok/status/route.ts` | Exposes `chatFailover` |
| `web/lib/brokProductLabels.ts` | Labels for `brok_backup` |
| `web/lib/modelRouterConfig.ts` | Grok role = fallback after Groq |
| `web/.env.local.example` | Documents failover env vars |

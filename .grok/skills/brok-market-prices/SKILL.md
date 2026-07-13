---
name: brok-market-prices
description: >
  Live stock and crypto prices for BROK/Neobanx. Use when asking about ticker prices,
  Bitcoin, Solana, company stocks, $POCK market data, or wiring free market APIs.
  Slash: /brok-market-prices. Production code: web/lib/marketPrices.ts + chat injection.
---

# BROK market prices

## Free sources (wired in production)

| Asset | Source | Auth | Notes |
|-------|--------|------|--------|
| Crypto | CoinGecko free API | None | Internal only — **do not cite to users** |
| Stocks | Yahoo chart API → fallback scrape Google Finance / MarketWatch via Jina | None | Yahoo often 429 on serverless; scrape is backup |

## Where it runs

- `web/lib/marketPrices.ts` — extract tickers/names, fetch quotes
- `web/app/api/brok/chat/route.ts` — injects `LIVE MARKET QUOTES`
- Diagnostic: `GET /api/brok/market-quote?q=bitcoin+AAPL`

## User-facing rules

- **No vendor names or price source links** in chat answers
- DYOR / not financial advice is OK

## Not financial advice

BROK answers may say DYOR when giving prices.

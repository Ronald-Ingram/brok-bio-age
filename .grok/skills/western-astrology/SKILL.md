---
name: western-astrology
description: Western tropical sun-sign chart and horoscope helpers for BROK
---

# Western astrology (BROK)

## When to use
User asks about horoscope, zodiac, sun sign, natal chart, rising, birth chart, or shares DOB for astrology.

## Production code
- `web/lib/westernAstrology.ts` — sun sign from date, sign KB, basic chart prompt block
- Injected in `web/app/api/brok/chat/route.ts` via `buildAstrologyKnowledgeBlock`
- Birth data stored in `brok_user_facts` (`date_of_birth`, `birth_time`, `birth_place`, `sun_sign`)

## Capabilities
- Tropical **sun sign** from calendar date
- Sign traits / shadow / growth knowledge base
- Basic chart narrative (sun only; rising/moon notes explain limits)

## Limits
- Not a full ephemeris natal chart (no exact Moon/Rising degrees without library)
- Entertainment / reflective framing — not medical, legal, or financial advice

## User flow
1. Prefer stored DOB from user facts
2. Else ask for birth date (optional time + place)
3. Deliver sun-sign reading + one practical next step in BROK voice

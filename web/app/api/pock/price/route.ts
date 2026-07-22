import {
  fetchPockMarketQuote,
  POCK_PRICE_SERVER_CACHE_MS,
} from "@/lib/pockPrice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Edge/CDN hint — short; in-memory cache below is the real throttle. */
export const revalidate = 10;

let cached: {
  quote: Awaited<ReturnType<typeof fetchPockMarketQuote>>;
  at: number;
} | null = null;

export async function GET() {
  const now = Date.now();
  const ttl = POCK_PRICE_SERVER_CACHE_MS;
  if (cached && now - cached.at < ttl) {
    const ageMs = now - cached.at;
    return NextResponse.json({
      ...cached.quote,
      delayed: true,
      cached: true,
      cacheAgeMs: ageMs,
      nextRefreshInSec: Math.max(0, Math.ceil((ttl - ageMs) / 1000)),
    });
  }

  const quote = await fetchPockMarketQuote();
  cached = { quote, at: now };

  return NextResponse.json({
    ...quote,
    cached: false,
    cacheAgeMs: 0,
    nextRefreshInSec: Math.ceil(ttl / 1000),
  });
}
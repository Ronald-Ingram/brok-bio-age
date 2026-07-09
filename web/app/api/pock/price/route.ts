import { fetchPockMarketQuote } from "@/lib/pockPrice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 900;

let cached: { quote: Awaited<ReturnType<typeof fetchPockMarketQuote>>; at: number } | null =
  null;

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.at < 900_000) {
    return NextResponse.json({
      ...cached.quote,
      cached: true,
      nextRefreshInSec: Math.max(0, Math.floor((900_000 - (now - cached.at)) / 1000)),
    });
  }

  const quote = await fetchPockMarketQuote();
  cached = { quote, at: now };

  return NextResponse.json({
    ...quote,
    cached: false,
    nextRefreshInSec: 900,
  });
}
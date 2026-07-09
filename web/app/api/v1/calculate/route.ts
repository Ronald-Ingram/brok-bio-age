import { NextResponse } from "next/server";

export const runtime = "nodejs";

function bioageApiBase(): string | null {
  const url =
    process.env.BIOAGE_API_URL?.trim() ??
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url || url.includes("localhost")) return null;
  return url.replace(/\/$/, "");
}

export async function POST(req: Request) {
  const base = bioageApiBase();
  if (!base) {
    return NextResponse.json(
      {
        detail:
          "Bio-Age API not configured. Deploy the FastAPI service and set BIOAGE_API_URL on Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.text();
    const res = await fetch(`${base}/api/v1/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "proxy_failed";
    return NextResponse.json({ detail: msg }, { status: 502 });
  }
}
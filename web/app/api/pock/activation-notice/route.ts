import {
  dismissActivationNotice,
  getPendingActivationNotice,
  saveOnboardingFeedback,
  type FeedbackSource,
} from "@/lib/giftOutreach";
import { getServiceSupabase, getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const accessToken = auth?.startsWith("Bearer ")
      ? auth.slice(7)
      : new URL(req.url).searchParams.get("accessToken");
    if (!accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    const userClient = getUserSupabase(accessToken);
    const { data: authData, error } = await userClient.auth.getUser();
    if (error || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const notice = await getPendingActivationNotice(
      getServiceSupabase(),
      authData.user.id
    );
    return NextResponse.json(notice);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      action?: "dismiss" | "feedback";
      kind?: "day0" | "day5";
      easeScore?: number;
      questions?: string;
      suggestions?: string;
      whyNotEngaged?: string;
      source?: FeedbackSource;
    };

    const auth = req.headers.get("authorization");
    const accessToken =
      (auth?.startsWith("Bearer ") ? auth.slice(7) : null) ||
      body.accessToken?.trim();
    if (!accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const userClient = getUserSupabase(accessToken);
    const { data: authData, error } = await userClient.auth.getUser();
    if (error || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = authData.user.id;
    const supabase = getServiceSupabase();

    if (body.action === "dismiss") {
      await dismissActivationNotice(supabase, userId, body.kind ?? "day0");
      return NextResponse.json({ ok: true });
    }

    // default: feedback
    const source: FeedbackSource =
      body.source ??
      (body.kind === "day5" ? "day5" : "in_app");
    const saved = await saveOnboardingFeedback(supabase, {
      userId,
      source,
      easeScore: body.easeScore,
      questions: body.questions,
      suggestions: body.suggestions,
      whyNotEngaged: body.whyNotEngaged,
    });
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}

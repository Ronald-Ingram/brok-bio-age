import { ApiAuthError, requireAuthenticatedUser } from "@/lib/apiAuth";
import {
  getActiveThreadForUser,
  startNewThread,
} from "@/lib/brokChatThreads";
import { loadUserFacts } from "@/lib/brokUserFacts";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id");
  const userIdParam = url.searchParams.get("user_id");

  try {
    const userId = await requireAuthenticatedUser(req, userIdParam);
    const thread = await getActiveThreadForUser(userId, threadId);
    const facts = await loadUserFacts(userId);

    if (!thread) {
      return NextResponse.json({ thread_id: null, messages: [], facts });
    }

    return NextResponse.json({ ...thread, facts });
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json(
        { error: e.code, hint: e.message },
        { status: e.status }
      );
    }
    throw e;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    user_id?: string;
    page_pathname?: string;
  };

  try {
    const userId = await requireAuthenticatedUser(req, body.user_id);
    const threadId = await startNewThread(userId, {
      pagePathname: body.page_pathname,
    });
    return NextResponse.json({ thread_id: threadId });
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return NextResponse.json(
        { error: e.code, hint: e.message },
        { status: e.status }
      );
    }
    throw e;
  }
}
/**
 * BROK inbox — info@neobanx.com via Gmail API (OAuth refresh token).
 *
 * Setup (Google Workspace or Gmail):
 * 1. Google Cloud Console → APIs → enable Gmail API
 * 2. OAuth client (Desktop or Web) → authorize info@neobanx.com
 * 3. Scopes: https://www.googleapis.com/auth/gmail.modify (read + send)
 * 4. Store refresh token in BROK_GMAIL_REFRESH_TOKEN (server only)
 *
 * Alternative: forward info@neobanx.com → a Gmail account BROK controls.
 */

const GMAIL_CLIENT_ID = process.env.BROK_GMAIL_CLIENT_ID?.trim();
const GMAIL_CLIENT_SECRET = process.env.BROK_GMAIL_CLIENT_SECRET?.trim();
const GMAIL_REFRESH_TOKEN = process.env.BROK_GMAIL_REFRESH_TOKEN?.trim();
export const BROK_INBOX_EMAIL =
  process.env.BROK_INBOX_EMAIL?.trim() ?? "info@neobanx.com";

export function brokEmailConfigured(): boolean {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
}

async function gmailAccessToken(): Promise<string> {
  if (!brokEmailConfigured()) throw new Error("brok_email_not_configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID!,
      client_secret: GMAIL_CLIENT_SECRET!,
      refresh_token: GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`gmail_token_failed: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("gmail_no_access_token");
  return data.access_token;
}

export interface BrokInboxMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export async function listBrokInbox(maxResults = 10): Promise<BrokInboxMessage[]> {
  const token = await gmailAccessToken();
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error("gmail_list_failed");

  const list = (await listRes.json()) as {
    messages?: { id: string; threadId: string }[];
  };
  if (!list.messages?.length) return [];

  const out: BrokInboxMessage[] = [];
  for (const m of list.messages.slice(0, maxResults)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as {
      id: string;
      threadId: string;
      snippet?: string;
      internalDate?: string;
      payload?: { headers?: { name: string; value: string }[] };
    };
    const headers = msg.payload?.headers ?? [];
    const get = (n: string) => headers.find((h) => h.name === n)?.value ?? "";
    out.push({
      id: msg.id,
      threadId: msg.threadId,
      from: get("From"),
      subject: get("Subject"),
      snippet: msg.snippet ?? "",
      date: get("Date") || msg.internalDate || "",
    });
  }
  return out;
}

export async function sendBrokEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const token = await gmailAccessToken();
  const raw = [
    `From: BROK <${BROK_INBOX_EMAIL}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.body,
  ].join("\r\n");

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    }
  );
  if (!res.ok) throw new Error(`gmail_send_failed: ${(await res.text()).slice(0, 200)}`);
}
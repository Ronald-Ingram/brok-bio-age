/**
 * Page awareness for BROK chat — what the user sees on brok.neobanx.com.
 * Combines route-specific canon with a live DOM text snapshot (client only).
 */

import { NORTH_STAR, BROK_IN_EVERY_POCKET, LAUNCH_DATE_LABEL } from "./siteCopy";
import { GENIUS_WALLET_TITLE, GENIUS_TOKEN_SYMBOL } from "./geniusWalletCopy";
import { PRELAUNCH_LABEL } from "./prelaunchPricing";

export interface BrokPageContextPayload {
  pathname: string;
  page_title: string;
  page_summary: string;
  visible_text?: string;
}

const ROUTE_CATALOG: Record<string, { title: string; summary: string }> = {
  "/": {
    title: "BROK Home",
    summary: `Landing: ${NORTH_STAR} ${BROK_IN_EVERY_POCKET} Capabilities now vs coming soon; FTEP KPI; use cases; About BROK & Ronald Ingram. Pricing: Essential ~~$29~~ $9/mo, Pro ~~$79~~ $49/mo (${PRELAUNCH_LABEL}). CTAs: Genius Wallet, Chat, Bio-Age, Inneagram. ${LAUNCH_DATE_LABEL}.`,
  },
  "/genius-wallet": {
    title: "Genius Wallet",
    summary: `Human-controlled wallet for Genius Token (${GENIUS_TOKEN_SYMBOL}). Hybrid custody: reserved (no Solana wallet needed) or self-custodial after linking Solana. Gift $POCK, buy with card, reserved balance for in-app spend. BROK autonomous wallet coming later.`,
  },
  "/bio-age": {
    title: "Bio-Age Calculator",
    summary:
      "Levine PhenoAge + BROK-adjusted biological age. Upload labs or enter biomarkers. Free tier: 1 report. Subscribers get saved history and trends. Uses $POCK per calculation.",
  },
  "/inneagram": {
    title: "Ingram Inneagram",
    summary:
      "Nine Gates self-discovery — Ingram archetypes on Tree of Life. Quick assessment: dominant type, wings, repressed edge, Riso-Hudson cross-reference. Distinct from IEM deal scorecard.",
  },
  "/chat": {
    title: "BROK Chat",
    summary:
      "Text chat with BROK — voice and live avatar optional. BROK can see this page context. Ask about anything visible on the current BROK screen.",
  },
  "/avatar": {
    title: "BROK Live Avatar",
    summary:
      "BROK with live lip-sync avatar and voice. Static image when idle. Metered only while speaking. Same intelligence as Chat.",
  },
  "/subscribe": {
    title: "BROK Subscriptions",
    summary: `Essential $9/mo and Pro $49/mo (${PRELAUNCH_LABEL}). Voice/avatar metered while active; static mode free.`,
  },
  "/buy-pock": {
    title: "Buy $POCK",
    summary: "Stripe top-up for $POCK credits. Credits land as reserved custody in Genius Wallet until on-chain release.",
  },
  "/claim": {
    title: "Claim $POCK Gift",
    summary:
      "Claim gifted $POCK with one private link (auto-credit in Genius Wallet) or transferred $POCK with link + password. Simple registration, no KYC.",
  },
  "/trust": {
    title: "Trust · Security & Compliance",
    summary:
      "Security FAQ + expandable Q&A: keep enough $POCK for calcs/metering; reserved balances are on-chain $POCK (USD display fluctuates with market); not a bank; family sub-wallets; SEC/CFTC digital-asset treatment; $POCK Stars cold custody; VBZ vision.",
  },
};

export function getRoutePageContext(pathname: string): {
  title: string;
  summary: string;
} {
  const path = pathname.split("?")[0] || "/";
  if (ROUTE_CATALOG[path]) return ROUTE_CATALOG[path];
  const base = path.split("/").filter(Boolean)[0];
  if (base && ROUTE_CATALOG[`/${base}`]) return ROUTE_CATALOG[`/${base}`];
  return {
    title: `BROK — ${path}`,
    summary: "BROK web app page. Answer from visible screen text when provided.",
  };
}

const PAGE_AWARENESS_RE =
  /\b(this page|on screen|on-screen|what (?:do )?you see|visible|pricing|price|subscribe|subscription|balance|wallet|custody|button|form|result|report|download|pdf|top[- ]?up|buy pock|genius wallet|how much|what does (?:it|this) cost)\b/i;

export function needsPageContext(message: string, pathname?: string): boolean {
  if (PAGE_AWARENESS_RE.test(message)) return true;
  const path = pathname?.split("?")[0] ?? "/";
  if (path !== "/chat" && path !== "/avatar" && message.length < 120) return true;
  return false;
}

/** Client-side: extract readable text from the current page (no scripts/styles). */
export function captureVisiblePageText(maxChars = 3000): string {
  if (typeof document === "undefined") return "";

  const root =
    document.querySelector("main") ??
    document.querySelector('[role="main"]') ??
    document.body;

  const clone = root.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, style, noscript, svg, [aria-hidden='true']")
    .forEach((el) => el.remove());

  const text = (clone.innerText ?? "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

export function buildPageContextPayload(pathname: string): BrokPageContextPayload {
  const { title, summary } = getRoutePageContext(pathname);
  const visible = captureVisiblePageText();
  return {
    pathname,
    page_title: title,
    page_summary: summary,
    visible_text: visible || undefined,
  };
}

export function formatSiteCatalogForPrompt(): string {
  const entries = Object.entries(ROUTE_CATALOG)
    .map(([path, { title, summary }]) => `• ${path} — ${title}: ${summary}`)
    .join("\n");
  return `BROK SITE MAP (all pages on brok.neobanx.com):\n${entries}`;
}

export function formatPageContextForPrompt(
  ctx: BrokPageContextPayload,
  opts?: { compact?: boolean; maxVisibleChars?: number }
): string {
  const compact = opts?.compact ?? false;
  const maxVisible = opts?.maxVisibleChars ?? 3000;
  const visible = ctx.visible_text?.trim();
  const visibleTrimmed =
    visible && visible.length > maxVisible
      ? `${visible.slice(0, maxVisible)}…`
      : visible;

  if (compact) {
    return [
      "CURRENT BROK PAGE:",
      `Route: ${ctx.pathname}`,
      `Page: ${ctx.page_title}`,
      `Summary: ${ctx.page_summary}`,
    ].join("\n");
  }

  const lines = [
    "CURRENT BROK WEB PAGE (what the user sees on screen right now):",
    `Route: ${ctx.pathname}`,
    `Page: ${ctx.page_title}`,
    `Summary: ${ctx.page_summary}`,
  ];
  if (visibleTrimmed) {
    lines.push("", "Visible on-screen text (live snapshot):", visibleTrimmed);
  }
  lines.push(
    "",
    "When the user asks about 'this page', 'what you see', 'on screen', pricing shown, buttons, or UI — answer from the live snapshot. Do not invent on-screen numbers or labels not in the snapshot."
  );
  return lines.join("\n");
}
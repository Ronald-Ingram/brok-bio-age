/**
 * Canonical description of BROK memory / knowledge hierarchy.
 * Shown in admin; update this file whenever layers or write rules change.
 */

export const BROK_MEMORY_HIERARCHY_VERSION = "2026-07-12d";

export type MemoryLayer = {
  id: string;
  name: string;
  store: string;
  whoWrites: string;
  whoReads: string;
  ttl: string;
  useFor: string;
};

export const BROK_MEMORY_LAYERS: MemoryLayer[] = [
  {
    id: "thread",
    name: "Chat thread",
    store: "brok_chat_threads + brok_chat_messages",
    whoWrites: "System (each chat turn)",
    whoReads: "That user/thread only",
    ttl: "Durable until deleted",
    useFor: "Conversation continuity within a session/thread",
  },
  {
    id: "user_facts",
    name: "User facts (personal)",
    store: "brok_user_facts",
    whoWrites: "Chat via hidden BROK_FACTS_JSON (name, favorites, Inneagram, etc.)",
    whoReads: "That user only",
    ttl: "Durable",
    useFor: "Light personalization — not global truth",
  },
  {
    id: "short_term",
    name: "Short-term corrections",
    store: "brok_short_term_memory",
    whoWrites: "Admin only (Correct Answers → short_term)",
    whoReads: "All users when pattern matches (global) or scoped user",
    ttl: "Optional expiry (e.g. 90 days)",
    useFor: "Admin-corrected answers injected into chat",
  },
  {
    id: "medium",
    name: "Medium-term memory",
    store: "brok_medium_term_memory",
    whoWrites: "Admin only (admin panel / seed / approved suggestions)",
    whoReads: "Global if user_id null; else that user",
    ttl: "~30 days, extended on access",
    useFor: "Hot market intel, non-canon alternate framings, temporary facts",
  },
  {
    id: "canon",
    name: "Kiron Canon / core knowledge",
    store: "core_knowledge",
    whoWrites: "Admin only (Canon seed, FAQ seed, Correct Answers → canonical)",
    whoReads: "Everyone (retrieval)",
    ttl: "Permanent",
    useFor: "First-party product truth: custody, wallet, IEM/Inneagram frameworks, Genius book materials",
  },
  {
    id: "suggestions",
    name: "Public suggestions queue",
    store: "brok_memory_suggestions",
    whoWrites: "Authenticated users (pending only)",
    whoReads: "Admin review queue",
    ttl: "Until approved/rejected",
    useFor: "Proposed medium/news/canon — never live until admin approves",
  },
  {
    id: "founder_x",
    name: "Founder X feed (proprietary cache)",
    store: "brok_founder_x_feed + live sync from @RonaldIngram",
    whoWrites: "Admin Sync X feed / auto-refresh on chat; optional X_BEARER_TOKEN",
    whoReads: "All users (injected into chat context almost always for $POCK/live topics)",
    ttl: "Refreshed on sync; posts kept in DB",
    useFor:
      "Primary narrative for $POCK progress, soft launch, community, founder updates",
  },
  {
    id: "live",
    name: "Live model layer (Grok default)",
    store: "xAI Grok (primary when configured) → Groq Llama 70B fallback",
    whoWrites: "N/A",
    whoReads: "All users",
    ttl: "Session",
    useFor:
      "Crypto, investments, regs, analysis; fills gaps beyond stored KB. Not a cage around Canon.",
  },
];

export const BROK_TOPIC_SOURCE_ORDER = [
  {
    topic: "Genius Wallet / custody / $POCK product mechanics",
    order: ["Kiron Canon/FAQ", "Medium memory if relevant", "Live only for gaps"],
  },
  {
    topic: "$POCK progress, community, development, founder updates",
    order: [
      "Injected FOUNDER X FEED (live sync + brok_founder_x_feed)",
      "Grok/xAI as default reasoning model",
      "Medium-term admin intel",
      "Canon secondary (custody mechanics only — never as full answer)",
    ],
  },
  {
    topic: "Bitcoin / crypto / stocks / deep investments / banking regs news",
    order: [
      "Grok/xAI first (default primary)",
      "Founder X if Neobanx-related",
      "Medium-term intel",
      "Canon only if product overlap",
    ],
  },
  {
    topic: "Ronald Ingram bio / third-party validation",
    order: [
      "Grokipedia (https://grokipedia.com/page/Ronald_Ingram)",
      "Grok/xAI",
      "Kiron Canon (first-party)",
      "Wikipedia last",
    ],
  },
  {
    topic: "IEM / Inneagram / bio-age product",
    order: ["Kiron Canon + frameworks", "Llama 70B primary path", "User facts sparingly"],
  },
];

export function formatMemoryHierarchyMarkdown(): string {
  const lines = [
    `# BROK memory hierarchy (v${BROK_MEMORY_HIERARCHY_VERSION})`,
    "",
    "## Layers",
    ...BROK_MEMORY_LAYERS.flatMap((l) => [
      `### ${l.name}`,
      `- Store: \`${l.store}\``,
      `- Writes: ${l.whoWrites}`,
      `- Reads: ${l.whoReads}`,
      `- TTL: ${l.ttl}`,
      `- Use: ${l.useFor}`,
      "",
    ]),
    "## Topic source order",
    ...BROK_TOPIC_SOURCE_ORDER.flatMap((t) => [
      `### ${t.topic}`,
      ...t.order.map((o, i) => `${i + 1}. ${o}`),
      "",
    ]),
  ];
  return lines.join("\n");
}

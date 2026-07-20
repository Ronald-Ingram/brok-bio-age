/**
 * Time awareness for BROK chat — inject current clock without claiming to control devices.
 * Safe: read-only context; no side effects.
 */

const ZONES: { id: string; label: string }[] = [
  { id: "UTC", label: "UTC" },
  { id: "America/Los_Angeles", label: "US Pacific" },
  { id: "America/Denver", label: "US Mountain" },
  { id: "America/Chicago", label: "US Central" },
  { id: "America/New_York", label: "US Eastern" },
  { id: "Europe/London", label: "UK" },
  { id: "Europe/Paris", label: "Central Europe" },
  { id: "Asia/Tokyo", label: "Japan" },
  { id: "Australia/Sydney", label: "Sydney" },
];

function formatInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** Always inject — small, high-value for “what time is it?” and date-aware answers. */
export function buildBrokTimeContextBlock(now = new Date()): string {
  const iso = now.toISOString();
  const lines = ZONES.map(
    (z) => `- ${z.label} (${z.id}): ${formatInZone(now, z.id)}`
  );
  return [
    "CURRENT TIME (authoritative for this request — use when asked the time/date or for “today/this week” framing):",
    `ISO UTC: ${iso}`,
    "Local equivalents:",
    ...lines,
    "If the user names a city/timezone, convert from this clock. Do not invent market-open times without this context. You do not control the user's phone clock.",
  ].join("\n");
}

export function wantsTimeAwareness(message: string): boolean {
  return /\b(what\s+time|current\s+time|what'?s\s+the\s+time|time\s+is\s+it|date\s+today|what\s+day|today'?s\s+date|what\s+date|timezone|time\s+zone|clock)\b/i.test(
    message
  );
}

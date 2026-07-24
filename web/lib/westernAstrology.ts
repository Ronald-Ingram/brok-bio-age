/**
 * Western (tropical) astrology helpers for BROK.
 * Basic sun-sign chart + sign knowledge — entertainment / reflective framing, not destiny or medical advice.
 */

export type ZodiacSignId =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type ZodiacSign = {
  id: ZodiacSignId;
  name: string;
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  modality: "cardinal" | "fixed" | "mutable";
  ruler: string;
  /** Inclusive start M-D through inclusive end M-D (handles Capricorn wrap). */
  keywords: string[];
  traits: string;
  shadow: string;
  growth: string;
  /** Short seasonal / archetypal note for horoscope tone. */
  seasonNote: string;
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: "aries",
    name: "Aries",
    symbol: "♈",
    element: "fire",
    modality: "cardinal",
    ruler: "Mars",
    keywords: ["initiative", "courage", "spark", "independence"],
    traits: "Direct, pioneering, competitive, quick to start.",
    shadow: "Impatience, conflict for its own sake, unfinished arcs.",
    growth: "Channel heat into disciplined first moves; finish what you start.",
    seasonNote: "Spring ignition — new cycles, visible leadership.",
  },
  {
    id: "taurus",
    name: "Taurus",
    symbol: "♉",
    element: "earth",
    modality: "fixed",
    ruler: "Venus",
    keywords: ["stability", "sensuality", "value", "patience"],
    traits: "Steady, loyal, practical, pleasure-aware.",
    shadow: "Stubbornness, over-attachment, resistance to change.",
    growth: "Build value systems that flex without losing roots.",
    seasonNote: "Earth solidifies — resources, body, craft.",
  },
  {
    id: "gemini",
    name: "Gemini",
    symbol: "♊",
    element: "air",
    modality: "mutable",
    ruler: "Mercury",
    keywords: ["curiosity", "dialogue", "adaptability", "ideas"],
    traits: "Curious, witty, dual-minded, connective.",
    shadow: "Scattered attention, superficiality, nervous restlessness.",
    growth: "Depth in one channel while keeping the network alive.",
    seasonNote: "Air moves information — learn, teach, link people.",
  },
  {
    id: "cancer",
    name: "Cancer",
    symbol: "♋",
    element: "water",
    modality: "cardinal",
    ruler: "Moon",
    keywords: ["care", "home", "memory", "protection"],
    traits: "Nurturing, intuitive, protective, memory-rich.",
    shadow: "Mood walls, clinging, indirect conflict.",
    growth: "Protect without trapping; lead from emotional clarity.",
    seasonNote: "Tides of belonging — family, body, sanctuary.",
  },
  {
    id: "leo",
    name: "Leo",
    symbol: "♌",
    element: "fire",
    modality: "fixed",
    ruler: "Sun",
    keywords: ["creative will", "heart", "visibility", "generosity"],
    traits: "Warm, dramatic, loyal, center-stage creative.",
    shadow: "Ego over-identification, need for constant applause.",
    growth: "Shine so others can shine; lead with heart not performance.",
    seasonNote: "Solar peak — expression, courage, celebration.",
  },
  {
    id: "virgo",
    name: "Virgo",
    symbol: "♍",
    element: "earth",
    modality: "mutable",
    ruler: "Mercury",
    keywords: ["craft", "discernment", "service", "refinement"],
    traits: "Analytical, helpful, precise, systems-minded.",
    shadow: "Over-criticism, anxiety loops, perfection paralysis.",
    growth: "Use standards as tools, not weapons against self.",
    seasonNote: "Harvest craft — improve systems and health habits.",
  },
  {
    id: "libra",
    name: "Libra",
    symbol: "♎",
    element: "air",
    modality: "cardinal",
    ruler: "Venus",
    keywords: ["balance", "partnership", "aesthetics", "fairness"],
    traits: "Diplomatic, relational, beauty-oriented, justice-seeking.",
    shadow: "Indecision, people-pleasing, avoidance of hard calls.",
    growth: "Choose clearly; harmony includes honest tension.",
    seasonNote: "Equinox balance — contracts, art, alliance.",
  },
  {
    id: "scorpio",
    name: "Scorpio",
    symbol: "♏",
    element: "water",
    modality: "fixed",
    ruler: "Pluto (modern) / Mars (traditional)",
    keywords: ["depth", "power", "truth", "transformation"],
    traits: "Intense, strategic, loyal, regenerative.",
    shadow: "Control, suspicion, all-or-nothing bonding.",
    growth: "Share power; transform without destroying trust.",
    seasonNote: "Descent and rebirth — shadow work, shared resources.",
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    symbol: "♐",
    element: "fire",
    modality: "mutable",
    ruler: "Jupiter",
    keywords: ["meaning", "exploration", "truth-seeking", "expansion"],
    traits: "Optimistic, philosophical, adventurous, blunt.",
    shadow: "Overpromise, dogmatic freedom, restless escape.",
    growth: "Commit to a path of meaning that still leaves room to roam.",
    seasonNote: "Horizon expands — study, travel, big-picture bets.",
  },
  {
    id: "capricorn",
    name: "Capricorn",
    symbol: "♑",
    element: "earth",
    modality: "cardinal",
    ruler: "Saturn",
    keywords: ["structure", "ambition", "mastery", "responsibility"],
    traits: "Disciplined, strategic, status-aware, long-game.",
    shadow: "Cold control, work-as-identity, scarcity of joy.",
    growth: "Build empires that include rest and relationship.",
    seasonNote: "Winter architecture — institutions, timelines, legacy.",
  },
  {
    id: "aquarius",
    name: "Aquarius",
    symbol: "♒",
    element: "air",
    modality: "fixed",
    ruler: "Uranus (modern) / Saturn (traditional)",
    keywords: ["innovation", "networks", "ideals", "future"],
    traits: "Original, humanitarian, detached-clear, systems futurist.",
    shadow: "Emotional distance, contrarian for sport, cold ideals.",
    growth: "Bring the future to people without abandoning them.",
    seasonNote: "Collective circuits — tech, community, reform.",
  },
  {
    id: "pisces",
    name: "Pisces",
    symbol: "♓",
    element: "water",
    modality: "mutable",
    ruler: "Neptune (modern) / Jupiter (traditional)",
    keywords: ["empathy", "imagination", "spirit", "dissolution"],
    traits: "Compassionate, artistic, permeable, visionary.",
    shadow: "Escapism, boundary loss, martyrdom.",
    growth: "Dream with containers; serve without dissolving self.",
    seasonNote: "Oceanic close of the year — art, faith, integration.",
  },
];

/** Tropical sun sign from calendar date (month 1–12, day 1–31). */
export function tropicalSunSignFromDate(
  month: number,
  day: number
): ZodiacSign | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Ranges inclusive; Capricorn wraps year-end.
  const ranges: { id: ZodiacSignId; start: [number, number]; end: [number, number] }[] = [
    { id: "capricorn", start: [12, 22], end: [1, 19] },
    { id: "aquarius", start: [1, 20], end: [2, 18] },
    { id: "pisces", start: [2, 19], end: [3, 20] },
    { id: "aries", start: [3, 21], end: [4, 19] },
    { id: "taurus", start: [4, 20], end: [5, 20] },
    { id: "gemini", start: [5, 21], end: [6, 20] },
    { id: "cancer", start: [6, 21], end: [7, 22] },
    { id: "leo", start: [7, 23], end: [8, 22] },
    { id: "virgo", start: [8, 23], end: [9, 22] },
    { id: "libra", start: [9, 23], end: [10, 22] },
    { id: "scorpio", start: [10, 23], end: [11, 21] },
    { id: "sagittarius", start: [11, 22], end: [12, 21] },
  ];

  const md = month * 100 + day;
  for (const r of ranges) {
    const s = r.start[0] * 100 + r.start[1];
    const e = r.end[0] * 100 + r.end[1];
    if (r.id === "capricorn") {
      if (md >= s || md <= e) {
        return ZODIAC_SIGNS.find((z) => z.id === r.id) ?? null;
      }
    } else if (md >= s && md <= e) {
      return ZODIAC_SIGNS.find((z) => z.id === r.id) ?? null;
    }
  }
  return null;
}

export function parseBirthDate(
  isoOrLoose: string
): { year?: number; month: number; day: number } | null {
  const s = isoOrLoose.trim();
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
    };
  }
  // MM/DD/YYYY or M/D/YY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const year = Number(m[3]!.length === 2 ? `19${m[3]}` : m[3]);
    return { year, month: Number(m[1]), day: Number(m[2]) };
  }
  // Month name Day, Year
  m = s.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i
  );
  if (m) {
    const months: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };
    const mon = months[m[1]!.slice(0, 3).toLowerCase()];
    if (mon) {
      return {
        year: m[3] ? Number(m[3]) : undefined,
        month: mon,
        day: Number(m[2]),
      };
    }
  }
  return null;
}

export function resolveSignFromUserFacts(opts: {
  sun_sign?: string;
  date_of_birth?: string;
}): ZodiacSign | null {
  if (opts.sun_sign?.trim()) {
    const key = opts.sun_sign.trim().toLowerCase();
    const hit = ZODIAC_SIGNS.find(
      (z) => z.id === key || z.name.toLowerCase() === key
    );
    if (hit) return hit;
  }
  if (opts.date_of_birth) {
    const d = parseBirthDate(opts.date_of_birth);
    if (d) return tropicalSunSignFromDate(d.month, d.day);
  }
  return null;
}

export type BasicChartResult = {
  sun: ZodiacSign;
  birth: { year?: number; month: number; day: number };
  birth_time?: string;
  birth_place?: string;
  rising_note: string;
  moon_note: string;
  disclaimer: string;
};

export function buildBasicWesternChart(opts: {
  date_of_birth: string;
  birth_time?: string;
  birth_place?: string;
  sun_sign?: string;
}): BasicChartResult | null {
  const parsed = opts.date_of_birth
    ? parseBirthDate(opts.date_of_birth)
    : null;
  const sun =
    resolveSignFromUserFacts({
      sun_sign: opts.sun_sign,
      date_of_birth: opts.date_of_birth,
    }) ?? (parsed ? tropicalSunSignFromDate(parsed.month, parsed.day) : null);
  if (!sun || !parsed) return null;

  const hasTime = Boolean(opts.birth_time?.trim());
  const hasPlace = Boolean(opts.birth_place?.trim());

  return {
    sun,
    birth: parsed,
    birth_time: opts.birth_time?.trim() || undefined,
    birth_place: opts.birth_place?.trim() || undefined,
    rising_note: hasTime && hasPlace
      ? "Rising (Ascendant) needs a full ephemeris + geocode for exact degrees. With time and place shared, BROK can speak in house/rising themes qualitatively; exact ASC not computed in this lightweight chart."
      : "Rising sign not computed — needs birth time and place. Sun sign chart only.",
    moon_note:
      "Moon sign moves ~every 2.5 days and needs ephemeris data for exact placement. Not computed here; ask if user wants a full pro chart referral.",
    disclaimer:
      "Western tropical sun-sign chart for reflection and conversation — not fate, medical, legal, or financial advice.",
  };
}

export function formatBasicChartForPrompt(chart: BasicChartResult): string {
  const { sun, birth } = chart;
  const dateStr = [
    birth.year ?? "????",
    String(birth.month).padStart(2, "0"),
    String(birth.day).padStart(2, "0"),
  ].join("-");
  return `WESTERN ASTROLOGY — BASIC SUN CHART (computed):
• Sun sign: ${sun.symbol} ${sun.name} (${sun.element} / ${sun.modality}) · traditional/modern ruler notes: ${sun.ruler}
• Birth date used: ${dateStr}${chart.birth_time ? ` · time: ${chart.birth_time}` : ""}${chart.birth_place ? ` · place: ${chart.birth_place}` : ""}
• Keywords: ${sun.keywords.join(", ")}
• Traits: ${sun.traits}
• Shadow: ${sun.shadow}
• Growth: ${sun.growth}
• Season tone: ${sun.seasonNote}
• ${chart.rising_note}
• ${chart.moon_note}
• ${chart.disclaimer}

HOROSCOPE STYLE: Speak as BROK — direct, high-signal, sovereign. One clear sun-sign reading + practical next step. Offer deeper Canon/Inneagram/bio-age pairing if relevant. Never claim absolute prediction.`;
}

export function formatSignKnowledgeBaseForPrompt(): string {
  const lines = ZODIAC_SIGNS.map(
    (z) =>
      `• ${z.symbol} ${z.name} (${z.element}/${z.modality}, ${z.ruler}): ${z.traits} Keywords: ${z.keywords.join(", ")}. Growth: ${z.growth}`
  );
  return `WESTERN ASTROLOGY SIGN KB (tropical):
${lines.join("\n")}
Use for horoscope / sun-sign questions. Pair with user birth data when available.`;
}

export function wantsAstrology(message: string): boolean {
  return /\b(astrology|astrological|horoscope|zodiac|natal\s*chart|birth\s*chart|sun\s*sign|rising\s*sign|moon\s*sign|star\s*sign|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i.test(
    message
  );
}

/** Inject chart + KB when user asks astrology OR we have DOB for light personalization on related topics. */
export function buildAstrologyKnowledgeBlock(opts: {
  message: string;
  date_of_birth?: string;
  birth_time?: string;
  birth_place?: string;
  sun_sign?: string;
}): string | null {
  const ask = wantsAstrology(opts.message);
  const hasBirth = Boolean(opts.date_of_birth || opts.sun_sign);
  if (!ask && !hasBirth) return null;

  const parts: string[] = [];
  if (ask) parts.push(formatSignKnowledgeBaseForPrompt());

  if (opts.date_of_birth || opts.sun_sign) {
    const chart = buildBasicWesternChart({
      date_of_birth: opts.date_of_birth ?? "",
      birth_time: opts.birth_time,
      birth_place: opts.birth_place,
      sun_sign: opts.sun_sign,
    });
    if (chart) parts.push(formatBasicChartForPrompt(chart));
    else if (opts.sun_sign) {
      const sign = resolveSignFromUserFacts({ sun_sign: opts.sun_sign });
      if (sign) {
        parts.push(
          `USER SUN SIGN (stated): ${sign.symbol} ${sign.name}\n${sign.traits}\nGrowth: ${sign.growth}`
        );
      }
    }
  } else if (ask) {
    parts.push(
      "No birth date or sun sign on file. If they want a chart, ask date of birth (and optionally time + place for rising notes)."
    );
  }

  return parts.length ? parts.join("\n\n") : null;
}

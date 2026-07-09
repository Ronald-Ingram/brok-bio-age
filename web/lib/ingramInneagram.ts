/**
 * Ingram Enneagram (Inneagram) — distinct from Riso-Hudson.
 * Canonical sources: Ingram Enneagram Summary (7.22); Ingram canon from Genius by Ronald Ingram (Kiron Canon).
 */

export type IngramTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type RisoHudsonTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface IngramTypeInfo {
  id: IngramTypeId;
  name: string;
  sephirah: string;
  planet: string;
  risoHudsonId: RisoHudsonTypeId;
  risoHudsonName: string;
  strengths: string;
  challenges: string;
  path: string;
}

/** Tree of Life + Riso-Hudson row — Summary 7.22 correspondence table */
export const INGRAM_TYPES: Record<IngramTypeId, IngramTypeInfo> = {
  1: {
    id: 1,
    name: "Seer",
    sephirah: "Yesod",
    planet: "Moon / Foundation",
    risoHudsonId: 9,
    risoHudsonName: "Peacemaker",
    strengths: "Imagination, instinct, intuition, mediation, research",
    challenges: "Manipulative, dishonest, laziness, delusion, addiction",
    path: "Ground intuition in reality for prophetic clarity",
  },
  2: {
    id: 2,
    name: "Epicure",
    sephirah: "Netzach",
    planet: "Venus / Victory",
    risoHudsonId: 7,
    risoHudsonName: "Enthusiast",
    strengths: "Entertaining, creative, passionate, eloquent, taste and elegance",
    challenges: "Lust, addiction, boredom, superficiality, insecurity",
    path: "Channel desires into meaningful pursuits",
  },
  3: {
    id: 3,
    name: "Achiever",
    sephirah: "Chokmah",
    planet: "Wisdom / Fixed Stars",
    risoHudsonId: 3,
    risoHudsonName: "Achiever",
    strengths: "Self-reliance, discipline, leadership, pragmatism, common sense",
    challenges: "Blind faith, pride, materialism, impatience, conformity",
    path: "Align achievements with inner truth",
  },
  4: {
    id: 4,
    name: "Physician",
    sephirah: "Hod",
    planet: "Mercury / Splendour",
    risoHudsonId: 4,
    risoHudsonName: "Individualist",
    strengths: "Healing intellect, agility, memory, resourceful innovation, teaching",
    challenges: "Impatience, moodiness, deceit, nervousness, short attention span",
    path: "Integrate mind with heart for compassionate wisdom",
  },
  5: {
    id: 5,
    name: "Warrior",
    sephirah: "Geburah",
    planet: "Mars / Severity",
    risoHudsonId: 8,
    risoHudsonName: "Challenger",
    strengths: "Motivation, practicality, honour, courage, disciplined will",
    challenges: "Rigidity, lack of empathy, aggression, pride, hostility",
    path: "Temper strength with mercy",
  },
  6: {
    id: 6,
    name: "Governor",
    sephirah: "Binah",
    planet: "Saturn / Understanding",
    risoHudsonId: 6,
    risoHudsonName: "Loyalist",
    strengths: "Endurance, consistency, loyalty, diligence, practical memory",
    challenges: "Critical, judgmental, control issues, rigidity, over-caution",
    path: "Trust inner guidance; evolve from control to wise governance",
  },
  7: {
    id: 7,
    name: "Benefactor",
    sephirah: "Chesed",
    planet: "Jupiter / Mercy",
    risoHudsonId: 2,
    risoHudsonName: "Helper",
    strengths: "Generosity, diplomacy, humour, charismatic leadership, networking",
    challenges: "Over-indulgence, inflated importance, exaggeration, over-commitment",
    path: "Balance giving with self-care",
  },
  8: {
    id: 8,
    name: "Visionary",
    sephirah: "Tiphareth",
    planet: "Sun / Beauty",
    risoHudsonId: 1,
    risoHudsonName: "Reformer",
    strengths: "Organization, vision, integrity, logic, refined art, dynamic energy",
    challenges: "Self-sacrifice, dissatisfaction, attachment, judgmental pride",
    path: "Embody centered presence for radiant leadership",
  },
  9: {
    id: 9,
    name: "Alchemist",
    sephirah: "Kether",
    planet: "Crown / First Cause",
    risoHudsonId: 5,
    risoHudsonName: "Investigator",
    strengths: "Wisdom, tolerance, invention, overview, mediation, self-control",
    challenges: "Indecision, procrastination, detachment, cynicism, distraction",
    path: "Embrace unity to alchemize opposites into gold",
  },
};

export function formatIngramWithRiso(id: IngramTypeId): string {
  const t = INGRAM_TYPES[id];
  return `${t.name} (Ingram ${t.id}) · Riso-Hudson ${t.risoHudsonId} ${t.risoHudsonName}`;
}

export interface InneagramQuickQuestion {
  id: number;
  prompt: string;
  dimension: "attractions" | "motivations" | "weaknesses" | "revulsions" | "strengths" | "approach" | "keywords" | "worldview";
  options: { key: string; label: string; typeId: IngramTypeId }[];
}

/**
 * Quick assessment — 8 questions mapped per option from Summary 7.22
 * correspondence tables (ATTRACTIONS, WEAKNESSES, REVULSIONS, STRENGTHS, KEYWORDS).
 */
export const QUICK_QUESTIONS: InneagramQuickQuestion[] = [
  {
    id: 1,
    prompt: "Which activity or concept holds the strongest attraction for you?",
    dimension: "attractions",
    options: [
      { key: "A", label: "Building something durable and practical — skill and craftsmanship", typeId: 5 },
      { key: "B", label: "Lively conversation, new technology, travel, and adventure", typeId: 4 },
      { key: "C", label: "Peace, social harmony, and logical idealistic visions", typeId: 8 },
      { key: "D", label: "Parties, glamour, luxury, and entertainment", typeId: 2 },
      { key: "E", label: "Achieving goals, tangible results, and recognition for efficiency", typeId: 3 },
      { key: "F", label: "Contemplation, research, art, and being near water", typeId: 1 },
      { key: "G", label: "Philanthropy, spiritual discussion, and generous recognition", typeId: 7 },
      { key: "H", label: "Philosophy, the occult, personal development, and truth", typeId: 9 },
      { key: "I", label: "Tradition, history, stability through established laws", typeId: 6 },
    ],
  },
  {
    id: 2,
    prompt: "At your core, you are primarily motivated by a desire for:",
    dimension: "motivations",
    options: [
      { key: "A", label: "Accomplishment and total life success", typeId: 3 },
      { key: "B", label: "Grand gestures and using wealth to fund giving", typeId: 7 },
      { key: "C", label: "Integrity, purity, and a well-organized life", typeId: 8 },
      { key: "D", label: "Uncovering mysteries — science and religion", typeId: 9 },
      { key: "E", label: "Beauty, music, art, and romance", typeId: 2 },
      { key: "F", label: "Mental stimulation through new ideas and innovation", typeId: 4 },
      { key: "G", label: "Building with strength and vigor", typeId: 5 },
      { key: "H", label: "Inner peace and spirituality", typeId: 1 },
      { key: "I", label: "Upholding tradition, formality, and historical cycles", typeId: 6 },
    ],
  },
  {
    id: 3,
    prompt: "Which weaknesses do you most often struggle with?",
    dimension: "weaknesses",
    options: [
      { key: "A", label: "Critical, judgmental, stubborn, control issues", typeId: 6 },
      { key: "B", label: "Manipulative, lazy, dishonest, or delusional", typeId: 1 },
      { key: "C", label: "Over-confidence, impatience, superficiality, materialism", typeId: 3 },
      { key: "D", label: "Indecision, procrastination, cynical detachment", typeId: 9 },
      { key: "E", label: "Inflated importance, exaggeration, over-commitment", typeId: 7 },
      { key: "F", label: "Lack of empathy, pride, rigidity, hostility", typeId: 5 },
      { key: "G", label: "Dissatisfaction, lust for results, stubborn pride", typeId: 8 },
      { key: "H", label: "Superficiality, fear of boredom, addiction", typeId: 2 },
      { key: "I", label: "Moody, nervous, argumentative, short attention span", typeId: 4 },
    ],
  },
  {
    id: 4,
    prompt: "You feel the strongest revulsion or aversion toward:",
    dimension: "revulsions",
    options: [
      { key: "A", label: "Weakness, indulgence, and inefficiency", typeId: 3 },
      { key: "B", label: "Conflict, violence, attachment, and small talk", typeId: 9 },
      { key: "C", label: "Poverty, criticism, boredom, and confinement", typeId: 2 },
      { key: "D", label: "Dishonesty, waste, and decadence", typeId: 5 },
      { key: "E", label: "Restriction, obligation, monotony, and authority", typeId: 4 },
      { key: "F", label: "Stress, pain, war, and physical labour", typeId: 1 },
      { key: "G", label: "Gambling, risk, rebellion, and innovation", typeId: 6 },
      { key: "H", label: "Abandonment, insults, and loneliness", typeId: 7 },
      { key: "I", label: "Dissonant art, filth, superficiality, and decay", typeId: 8 },
    ],
  },
  {
    id: 5,
    prompt: "Which set of personal strengths best describes you?",
    dimension: "strengths",
    options: [
      { key: "A", label: "Imagination, instinct, intuition, mediation", typeId: 1 },
      { key: "B", label: "Organization, originality, vision, integrity", typeId: 8 },
      { key: "C", label: "Consistency, reliability, loyalty, diligence", typeId: 6 },
      { key: "D", label: "Wisdom, tolerance, invention, big-picture thinking", typeId: 9 },
      { key: "E", label: "Entertaining, multi-talented, creative, passionate", typeId: 2 },
      { key: "F", label: "Energetic, pragmatic, courageous, disciplined leadership", typeId: 3 },
      { key: "G", label: "Motivation, practicality, honor, zealous will", typeId: 5 },
      { key: "H", label: "Adaptability, memory, intellectual curiosity, eloquence", typeId: 4 },
      { key: "I", label: "Generosity, diplomacy, humor, charismatic leadership", typeId: 7 },
    ],
  },
  {
    id: 6,
    prompt: "When approaching a problem, you most rely on:",
    dimension: "approach",
    options: [
      { key: "A", label: "Logic, philosophy, and a clear ideal outcome", typeId: 8 },
      { key: "B", label: "Practicality, endurance, and craftsmanship", typeId: 5 },
      { key: "C", label: "Systematic history analysis and established procedures", typeId: 6 },
      { key: "D", label: "Diplomatic generosity that networks people", typeId: 7 },
      { key: "E", label: "Gut instinct and intuitive sense", typeId: 1 },
      { key: "F", label: "Efficient pursuit of a clear tangible goal", typeId: 3 },
      { key: "G", label: "Innovative, resourceful, adaptable intellect", typeId: 4 },
      { key: "H", label: "Passion, creative talents, charm", typeId: 2 },
      { key: "I", label: "Detached overview, unconventional shortcuts, truth", typeId: 9 },
    ],
  },
  {
    id: 7,
    prompt: "People would most likely describe you as:",
    dimension: "keywords",
    options: [
      { key: "A", label: "Comely", typeId: 2 },
      { key: "B", label: "Observer", typeId: 9 },
      { key: "C", label: "Brooding", typeId: 6 },
      { key: "D", label: "Instinct", typeId: 1 },
      { key: "E", label: "Integration", typeId: 8 },
      { key: "F", label: "Expansive", typeId: 7 },
      { key: "G", label: "Warrior", typeId: 5 },
      { key: "H", label: "Compulsive", typeId: 3 },
      { key: "I", label: "Dexterity", typeId: 4 },
    ],
  },
  {
    id: 8,
    prompt: "Which concept is most essential to your worldview?",
    dimension: "worldview",
    options: [
      { key: "A", label: "Achieving total success and recognition", typeId: 3 },
      { key: "B", label: "Exploring mystery through science, philosophy, and the occult", typeId: 9 },
      { key: "C", label: "Enjoying beauty, art, and romance", typeId: 2 },
      { key: "D", label: "Upholding traditions, stability, and security", typeId: 6 },
      { key: "E", label: "Grand gestures, generosity, and helping others", typeId: 7 },
      { key: "F", label: "Building strength and honoring duty", typeId: 5 },
      { key: "G", label: "Maintaining integrity, purity, and social harmony", typeId: 8 },
      { key: "H", label: "Inner peace and deeper spirituality", typeId: 1 },
      { key: "I", label: "Thrill of new ideas, innovation, and mental stimulation", typeId: 4 },
    ],
  },
];

export interface InneagramScoreResult {
  version: "quick_v1";
  typeCounts: Record<IngramTypeId, number>;
  dominant: IngramTypeId;
  second: IngramTypeId | null;
  third: IngramTypeId | null;
  repressed: IngramTypeId | null;
  answers: Record<number, string>;
  completedAt: string;
}

export function scoreQuickInneagram(
  answers: Record<number, string>
): InneagramScoreResult {
  const typeCounts = Object.fromEntries(
    ([1, 2, 3, 4, 5, 6, 7, 8, 9] as IngramTypeId[]).map((id) => [id, 0])
  ) as Record<IngramTypeId, number>;

  for (const q of QUICK_QUESTIONS) {
    const key = answers[q.id];
    if (!key) continue;
    const opt = q.options.find((o) => o.key === key);
    if (opt) typeCounts[opt.typeId] += 1;
  }

  const ranked = (Object.entries(typeCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id: Number(id) as IngramTypeId, count }));

  const nonZero = ranked.filter((r) => r.count > 0);
  const dominant = nonZero[0]?.id ?? 1;
  const second = nonZero[1]?.id ?? null;
  const third = nonZero[2]?.id ?? null;
  const repressed = ranked[ranked.length - 1]?.count === 0
    ? ranked[ranked.length - 1].id
    : ranked[ranked.length - 1]?.id ?? null;

  return {
    version: "quick_v1",
    typeCounts,
    dominant,
    second,
    third,
    repressed,
    answers,
    completedAt: new Date().toISOString(),
  };
}
import type { InneagramScoreResult } from "./ingramInneagram";

const STORAGE_KEY = "brok_ingram_inneagram_v1";

export interface StoredInneagramResult extends InneagramScoreResult {
  id: string;
  savedAt: string;
  remote?: boolean;
}

export function loadInneagramHistory(): StoredInneagramResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredInneagramResult[];
  } catch {
    return [];
  }
}

export function saveInneagramLocal(result: InneagramScoreResult): StoredInneagramResult {
  const entry: StoredInneagramResult = {
    ...result,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  const prev = loadInneagramHistory();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...prev].slice(0, 20)));
  return entry;
}
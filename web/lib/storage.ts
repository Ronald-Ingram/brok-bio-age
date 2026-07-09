import type { CalculateRequest, CalculateResponse } from "./types";

const STORAGE_KEY = "brok_bioage_history_v1";
const MAX_ENTRIES = 24;

export interface BioAgeHistoryEntry {
  id: string;
  saved_at: string;
  test_date: string;
  request: CalculateRequest;
  response: CalculateResponse;
}

export function loadHistory(): BioAgeHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BioAgeHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(
  request: CalculateRequest,
  response: CalculateResponse
): BioAgeHistoryEntry[] {
  const testDate =
    request.biomarkers.test_date ??
    new Date().toISOString().slice(0, 10);

  const entry: BioAgeHistoryEntry = {
    id: crypto.randomUUID(),
    saved_at: new Date().toISOString(),
    test_date: testDate,
    request,
    response,
  };

  const existing = loadHistory().filter((e) => e.test_date !== testDate);
  const updated = [entry, ...existing]
    .sort((a, b) => b.test_date.localeCompare(a.test_date))
    .slice(0, MAX_ENTRIES);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function priorFromHistory(
  history: BioAgeHistoryEntry[],
  currentTestDate?: string
) {
  return allPriorsFromHistory(history, currentTestDate).slice(0, 1);
}

/** All prior tests before current date — powers pace history and multi-point trends */
export function allPriorsFromHistory(
  history: BioAgeHistoryEntry[],
  currentTestDate?: string
) {
  return [...history]
    .filter((e) => !currentTestDate || e.test_date < currentTestDate)
    .sort((a, b) => a.test_date.localeCompare(b.test_date))
    .map((e) => ({
      test_date: e.test_date,
      chronological_age: e.request.biomarkers.chronological_age,
      pheno_age_standard: e.response.standard.pheno_age,
      pheno_age_brok: e.response.brok.pheno_age,
    }));
}

export function removeHistoryEntry(testDate: string): BioAgeHistoryEntry[] {
  const updated = loadHistory().filter((e) => e.test_date !== testDate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
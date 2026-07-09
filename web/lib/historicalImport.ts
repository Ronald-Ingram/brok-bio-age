import { calculateBioAge } from "./api";
import type { FieldProvenance } from "./fieldDefaults";
import type { FormBiomarkerInput, FormContextFlags } from "./formTypes";
import { mergeParsedIntoForm } from "./parseMerge";
import {
  allPriorsFromHistory,
  saveHistoryEntry,
  type BioAgeHistoryEntry,
} from "./storage";
import type {
  BiomarkerInput,
  CalculateRequest,
  ContextFlags,
  HistoricalSnapshot,
  ModelConfig,
  ParsedBiomarker,
} from "./types";

export function snapshotToBiomarkerInput(
  snap: HistoricalSnapshot
): BiomarkerInput {
  const map = Object.fromEntries(
    snap.biomarkers.map((b) => [b.field, b.value])
  ) as Record<string, number>;

  return {
    albumin_g_dl: map.albumin_g_dl,
    creatinine_mg_dl: map.creatinine_mg_dl,
    glucose_mg_dl: map.glucose_mg_dl,
    crp_mg_l: map.crp_mg_l,
    lymphocyte_pct: map.lymphocyte_pct,
    mcv_fl: map.mcv_fl,
    rdw_pct: map.rdw_pct,
    alp_u_l: map.alp_u_l,
    wbc_10e3: map.wbc_10e3,
    chronological_age: snap.chronological_age,
    test_date: snap.test_date,
  };
}

export function snapshotTestosterone(
  snap: HistoricalSnapshot
): number | undefined {
  const t = snap.biomarkers.find((b) => b.field === "testosterone_ng_dl");
  return t?.value;
}

export function buildRequestFromSnapshot(
  snap: HistoricalSnapshot,
  config: ModelConfig,
  context: ContextFlags,
  history: BioAgeHistoryEntry[]
): CalculateRequest {
  const biomarkers = snapshotToBiomarkerInput(snap);
  const testosterone = snapshotTestosterone(snap);
  const prior_tests = allPriorsFromHistory(history, snap.test_date);

  return {
    biomarkers,
    context: {
      ...context,
      testosterone_ng_dl: testosterone ?? context.testosterone_ng_dl,
      testosterone_source:
        testosterone != null && context.testosterone_source === "unknown"
          ? "endogenous"
          : context.testosterone_source,
    },
    config,
    prior_tests,
  };
}

export async function importHistoricalSnapshots(options: {
  snapshots: HistoricalSnapshot[];
  config: ModelConfig;
  context: ContextFlags;
  history: BioAgeHistoryEntry[];
  debitCalc: () => Promise<unknown>;
}): Promise<{
  history: BioAgeHistoryEntry[];
  imported: number;
  latest: HistoricalSnapshot;
}> {
  const sorted = [...options.snapshots].sort((a, b) =>
    a.test_date.localeCompare(b.test_date)
  );
  if (!sorted.length) {
    throw new Error("No historical snapshots to import");
  }

  let history = [...options.history];

  for (const snap of sorted) {
    const request = buildRequestFromSnapshot(
      snap,
      options.config,
      options.context,
      history
    );
    await options.debitCalc();
    const response = await calculateBioAge(request);
    history = saveHistoryEntry(request, response);
  }

  return {
    history,
    imported: sorted.length,
    latest: sorted[sorted.length - 1],
  };
}

export function parsedBiomarkersToProvenance(
  biomarkers: ParsedBiomarker[]
): Record<string, "pdf"> {
  return Object.fromEntries(biomarkers.map((b) => [b.field, "pdf" as const]));
}

export function applySnapshotToForm(
  snap: HistoricalSnapshot,
  biomarkers: FormBiomarkerInput,
  context: FormContextFlags
): {
  biomarkers: FormBiomarkerInput;
  context: FormContextFlags;
  provenance: FieldProvenance;
} {
  const fields = new Set([
    ...snap.biomarkers.map((b) => b.field),
    "test_date",
  ]);
  const merged = mergeParsedIntoForm(
    biomarkers,
    context,
    snap.biomarkers,
    fields,
    { test_date: snap.test_date }
  );
  if (
    snap.biomarkers.some((b) => b.field === "testosterone_ng_dl") &&
    merged.context.testosterone_source === "unknown"
  ) {
    merged.context.testosterone_source = "endogenous";
  }
  return merged;
}
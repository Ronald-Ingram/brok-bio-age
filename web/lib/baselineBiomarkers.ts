import { POPULATION_AVERAGES } from "./fieldDefaults";
import type { BiomarkerInput, ModelConfig } from "./types";

export type DeviationDirection = "lower_better" | "higher_better" | "neutral";
export type DeviationSignal = "positive" | "negative" | "neutral";

export interface BiomarkerCompareRow {
  key: string;
  label: string;
  unit: string;
  subject: number;
  baseline: number;
  pctOfBaseline: number;
  deviationPct: number;
  direction: DeviationDirection;
  signal: DeviationSignal;
  deviationLabel: string;
}

/** Levine PhenoAge-oriented interpretation of above/below population average. */
const BIOMARKER_DIRECTION: Record<string, DeviationDirection> = {
  albumin_g_dl: "higher_better",
  creatinine_mg_dl: "lower_better",
  glucose_mg_dl: "lower_better",
  hba1c_pct: "lower_better",
  crp_mg_l: "lower_better",
  lymphocyte_pct: "higher_better",
  mcv_fl: "neutral",
  rdw_pct: "lower_better",
  alp_u_l: "lower_better",
  wbc_10e3: "lower_better",
};

const NEUTRAL_THRESHOLD_PCT = 4;

function deviationMeta(
  subject: number,
  baseline: number,
  direction: DeviationDirection
): Pick<BiomarkerCompareRow, "deviationPct" | "signal" | "deviationLabel"> {
  const deviationPct =
    baseline !== 0 ? ((subject - baseline) / baseline) * 100 : 0;

  if (Math.abs(deviationPct) < NEUTRAL_THRESHOLD_PCT) {
    return {
      deviationPct,
      signal: "neutral",
      deviationLabel: "Near population average",
    };
  }

  const magnitude = Math.abs(deviationPct).toFixed(0);
  const above = deviationPct > 0;

  if (direction === "neutral") {
    return {
      deviationPct,
      signal: "neutral",
      deviationLabel: above
        ? `${magnitude}% above avg — context-dependent`
        : `${magnitude}% below avg — context-dependent`,
    };
  }

  if (direction === "lower_better") {
    if (!above) {
      return {
        deviationPct,
        signal: "positive",
        deviationLabel: `${magnitude}% below avg — generally favorable`,
      };
    }
    return {
      deviationPct,
      signal: "negative",
      deviationLabel: `${magnitude}% above avg — generally unfavorable`,
    };
  }

  // higher_better
  if (above) {
    return {
      deviationPct,
      signal: "positive",
      deviationLabel: `${magnitude}% above avg — generally favorable`,
    };
  }
  return {
    deviationPct,
    signal: "negative",
    deviationLabel: `${magnitude}% below avg — generally unfavorable`,
  };
}

const PHENO_BIOMARKERS: { key: keyof typeof POPULATION_AVERAGES; label: string; unit: string }[] =
  [
    { key: "albumin_g_dl", label: "Albumin", unit: "g/dL" },
    { key: "creatinine_mg_dl", label: "Creatinine", unit: "mg/dL" },
    { key: "glucose_mg_dl", label: "Glucose", unit: "mg/dL" },
    { key: "hba1c_pct", label: "HbA1c", unit: "%" },
    { key: "crp_mg_l", label: "CRP", unit: "mg/L" },
    { key: "lymphocyte_pct", label: "Lymphocyte %", unit: "%" },
    { key: "mcv_fl", label: "MCV", unit: "fL" },
    { key: "rdw_pct", label: "RDW", unit: "%" },
    { key: "alp_u_l", label: "ALP", unit: "U/L" },
    { key: "wbc_10e3", label: "WBC", unit: "10³/µL" },
  ];

/**
 * Fixed US-adult placeholder labs at the subject's chronological age.
 * Used for side-by-side charts and the "Reference labs" Levine bar — not
 * age-stratified NHANES means, so Levine at these values may differ from
 * calendar age.
 */
export function buildBaselineBiomarkers(
  subject: BiomarkerInput,
  config: ModelConfig
): BiomarkerInput {
  const useHba1c =
    config.use_hba1c_over_glucose ||
    (subject.hba1c_pct != null && subject.glucose_mg_dl == null);

  const baseline: BiomarkerInput = {
    albumin_g_dl: POPULATION_AVERAGES.albumin_g_dl,
    creatinine_mg_dl: POPULATION_AVERAGES.creatinine_mg_dl,
    crp_mg_l: POPULATION_AVERAGES.crp_mg_l,
    lymphocyte_pct: POPULATION_AVERAGES.lymphocyte_pct,
    mcv_fl: POPULATION_AVERAGES.mcv_fl,
    rdw_pct: POPULATION_AVERAGES.rdw_pct,
    alp_u_l: POPULATION_AVERAGES.alp_u_l,
    wbc_10e3: POPULATION_AVERAGES.wbc_10e3,
    chronological_age: subject.chronological_age,
  };

  if (useHba1c) {
    baseline.hba1c_pct = POPULATION_AVERAGES.hba1c_pct;
  } else {
    baseline.glucose_mg_dl = POPULATION_AVERAGES.glucose_mg_dl;
  }

  return baseline;
}

export function biomarkerCompareRows(
  subject: BiomarkerInput,
  config: ModelConfig
): BiomarkerCompareRow[] {
  const baseline = buildBaselineBiomarkers(subject, config);
  const useHba1c =
    config.use_hba1c_over_glucose ||
    (subject.hba1c_pct != null && subject.glucose_mg_dl == null);

  const rows: BiomarkerCompareRow[] = [];

  for (const { key, label, unit } of PHENO_BIOMARKERS) {
    if (key === "glucose_mg_dl" && useHba1c) continue;
    if (key === "hba1c_pct" && !useHba1c) continue;

    const subjVal =
      key === "glucose_mg_dl"
        ? subject.glucose_mg_dl
        : key === "hba1c_pct"
          ? subject.hba1c_pct
          : subject[key as keyof BiomarkerInput];

    const baseVal =
      key === "glucose_mg_dl"
        ? baseline.glucose_mg_dl
        : key === "hba1c_pct"
          ? baseline.hba1c_pct
          : baseline[key as keyof BiomarkerInput];

    if (
      subjVal == null ||
      baseVal == null ||
      typeof subjVal !== "number" ||
      typeof baseVal !== "number"
    ) {
      continue;
    }

    const pct = baseVal !== 0 ? (subjVal / baseVal) * 100 : 100;
    const direction = BIOMARKER_DIRECTION[key] ?? "neutral";
    const meta = deviationMeta(subjVal, baseVal, direction);

    rows.push({
      key,
      label,
      unit,
      subject: subjVal,
      baseline: baseVal,
      pctOfBaseline: pct,
      direction,
      ...meta,
    });
  }

  return rows;
}
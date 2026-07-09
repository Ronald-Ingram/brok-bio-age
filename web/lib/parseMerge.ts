import type { FieldProvenance } from "./fieldDefaults";
import type { FormBiomarkerInput, FormContextFlags } from "./formTypes";
import type { ParsedBiomarker, Sex } from "./types";

export function mergeParsedIntoForm(
  biomarkers: FormBiomarkerInput,
  context: FormContextFlags,
  parsed: ParsedBiomarker[],
  selectedFields: Set<string>,
  meta?: { sex?: Sex; test_date?: string }
): {
  biomarkers: FormBiomarkerInput;
  context: FormContextFlags;
  provenance: FieldProvenance;
} {
  const nextBio = { ...biomarkers };
  const nextCtx = { ...context };
  const provenance: FieldProvenance = {};

  if (meta?.sex && selectedFields.has("sex")) {
    nextCtx.sex = meta.sex;
    provenance.sex = "pdf";
  }
  if (meta?.test_date && selectedFields.has("test_date")) {
    nextBio.test_date = meta.test_date;
    provenance.test_date = "pdf";
  }

  for (const item of parsed) {
    if (!selectedFields.has(item.field)) continue;
    provenance[item.field] = "pdf";

    switch (item.field) {
      case "albumin_g_dl":
        nextBio.albumin_g_dl = item.value;
        break;
      case "creatinine_mg_dl":
        nextBio.creatinine_mg_dl = item.value;
        break;
      case "glucose_mg_dl":
        nextBio.glucose_mg_dl = item.value;
        break;
      case "hba1c_pct":
        nextBio.hba1c_pct = item.value;
        break;
      case "crp_mg_l":
        nextBio.crp_mg_l = item.value;
        break;
      case "lymphocyte_pct":
        nextBio.lymphocyte_pct = item.value;
        break;
      case "mcv_fl":
        nextBio.mcv_fl = item.value;
        break;
      case "rdw_pct":
        nextBio.rdw_pct = item.value;
        break;
      case "alp_u_l":
        nextBio.alp_u_l = item.value;
        break;
      case "wbc_10e3":
        nextBio.wbc_10e3 = item.value;
        break;
      case "chronological_age":
        nextBio.chronological_age = item.value;
        break;
      case "testosterone_ng_dl":
        nextCtx.testosterone_ng_dl = item.value;
        break;
      case "egfr":
        nextCtx.egfr = item.value;
        break;
      case "dexa_lean_mass_kg":
        nextCtx.dexa_lean_mass_kg = item.value;
        break;
      case "dexa_fat_mass_kg":
        nextCtx.dexa_fat_mass_kg = item.value;
        break;
      case "dexa_bone_t_score":
        nextCtx.dexa_bone_t_score = item.value;
        break;
      case "prior_lean_mass_kg":
        nextCtx.prior_lean_mass_kg = item.value;
        break;
      case "body_fat_pct":
        nextCtx.body_fat_pct = item.value;
        break;
      default:
        break;
    }
  }

  return { biomarkers: nextBio, context: nextCtx, provenance };
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.9)
    return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (confidence >= 0.75)
    return "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return "text-orange-400 border-orange-400/30 bg-orange-400/10";
}

export const FIELD_LABELS: Record<string, string> = {
  albumin_g_dl: "Albumin",
  creatinine_mg_dl: "Creatinine",
  glucose_mg_dl: "Glucose",
  hba1c_pct: "HbA1c",
  crp_mg_l: "CRP",
  lymphocyte_pct: "Lymphocyte %",
  mcv_fl: "MCV",
  rdw_pct: "RDW",
  alp_u_l: "ALP",
  wbc_10e3: "WBC",
  testosterone_ng_dl: "Testosterone",
  egfr: "eGFR",
  chronological_age: "Age",
  test_date: "Test date",
  sex: "Sex",
  dexa_lean_mass_kg: "DEXA lean mass",
  dexa_fat_mass_kg: "DEXA fat mass",
  dexa_bone_t_score: "Bone T-score",
  prior_lean_mass_kg: "Prior lean mass",
  body_fat_pct: "Body fat %",
};
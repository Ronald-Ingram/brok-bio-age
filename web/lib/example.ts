import type { FieldProvenance } from "./fieldDefaults";
import type { FormBiomarkerInput, FormContextFlags } from "./formTypes";
import type { BiomarkerInput, ContextFlags, ModelConfig } from "./types";

export const EXAMPLE_20260630: {
  biomarkers: BiomarkerInput;
  context: ContextFlags;
  config: ModelConfig;
} = {
  biomarkers: {
    albumin_g_dl: 4.4,
    creatinine_mg_dl: 0.93,
    glucose_mg_dl: 95,
    crp_mg_l: 1.55,
    lymphocyte_pct: 28,
    mcv_fl: 94,
    rdw_pct: 12.8,
    alp_u_l: 160,
    wbc_10e3: 5.5,
    chronological_age: 57,
    test_date: "2026-06-30",
  },
  context: {
    creatine_supplementation: true,
    testosterone_ng_dl: 1239,
    testosterone_source: "endogenous",
    sex: "male",
  },
  config: {
    age_mode: "scaled",
    age_alpha: 0.95,
    age_beta: 0.5,
    use_hba1c_over_glucose: true,
  },
};

export function exampleToForm(): {
  biomarkers: FormBiomarkerInput;
  context: FormContextFlags;
  provenance: FieldProvenance;
} {
  const b = EXAMPLE_20260630.biomarkers;
  const c = EXAMPLE_20260630.context;
  const provenance: FieldProvenance = {};
  const keys = [
    "albumin_g_dl",
    "creatinine_mg_dl",
    "glucose_mg_dl",
    "crp_mg_l",
    "lymphocyte_pct",
    "mcv_fl",
    "rdw_pct",
    "alp_u_l",
    "wbc_10e3",
    "chronological_age",
  ] as const;
  keys.forEach((k) => {
    provenance[k] = "manual";
  });
  if (c.testosterone_ng_dl) provenance.testosterone_ng_dl = "manual";
  if (c.sex) provenance.sex = "manual";

  return {
    biomarkers: {
      albumin_g_dl: b.albumin_g_dl,
      creatinine_mg_dl: b.creatinine_mg_dl,
      glucose_mg_dl: b.glucose_mg_dl ?? "",
      hba1c_pct: b.hba1c_pct ?? "",
      crp_mg_l: b.crp_mg_l,
      lymphocyte_pct: b.lymphocyte_pct,
      mcv_fl: b.mcv_fl,
      rdw_pct: b.rdw_pct,
      alp_u_l: b.alp_u_l,
      wbc_10e3: b.wbc_10e3,
      chronological_age: b.chronological_age,
      test_date: b.test_date,
    },
    context: {
      creatine_supplementation: c.creatine_supplementation,
      testosterone_ng_dl: c.testosterone_ng_dl ?? "",
      testosterone_source: c.testosterone_source ?? "unknown",
      exogenous_testosterone_recent: c.exogenous_testosterone_recent ?? false,
      sex: c.sex ?? "",
      egfr: c.egfr ?? "",
      dexa_lean_mass_kg: c.dexa_lean_mass_kg ?? "",
      dexa_fat_mass_kg: c.dexa_fat_mass_kg ?? "",
      dexa_bone_t_score: c.dexa_bone_t_score ?? "",
      prior_lean_mass_kg: c.prior_lean_mass_kg ?? "",
      body_fat_pct: c.body_fat_pct ?? "",
    },
    provenance,
  };
}
import type { BiomarkerInput, ContextFlags } from "./types";
import type { FormBiomarkerInput, FormContextFlags } from "./formTypes";

function req(
  value: number | "" | undefined,
  label: string
): number {
  if (value === "" || value === undefined || Number.isNaN(value)) {
    throw new Error(`Enter ${label} (or load from PDF / example).`);
  }
  return value;
}

export function toBiomarkerPayload(form: FormBiomarkerInput): BiomarkerInput {
  const glucose =
    form.glucose_mg_dl === "" ? undefined : form.glucose_mg_dl;
  const hba1c = form.hba1c_pct === "" ? undefined : form.hba1c_pct;
  if (glucose == null && hba1c == null) {
    throw new Error("Enter fasting glucose or HbA1c.");
  }

  return {
    albumin_g_dl: req(form.albumin_g_dl, "albumin"),
    creatinine_mg_dl: req(form.creatinine_mg_dl, "creatinine"),
    glucose_mg_dl: glucose,
    hba1c_pct: hba1c,
    crp_mg_l: req(form.crp_mg_l, "CRP"),
    lymphocyte_pct: req(form.lymphocyte_pct, "lymphocyte %"),
    mcv_fl: req(form.mcv_fl, "MCV"),
    rdw_pct: req(form.rdw_pct, "RDW"),
    alp_u_l: req(form.alp_u_l, "ALP"),
    wbc_10e3: req(form.wbc_10e3, "WBC"),
    chronological_age: req(form.chronological_age, "chronological age"),
    test_date: form.test_date || undefined,
  };
}

export function toContextPayload(form: FormContextFlags): ContextFlags {
  return {
    creatine_supplementation: form.creatine_supplementation,
    testosterone_ng_dl:
      form.testosterone_ng_dl === "" ? undefined : form.testosterone_ng_dl,
    testosterone_source: form.testosterone_source,
    exogenous_testosterone_recent: form.exogenous_testosterone_recent,
    sex: form.sex || undefined,
    egfr: form.egfr === "" ? undefined : form.egfr,
    dexa_lean_mass_kg:
      form.dexa_lean_mass_kg === "" ? undefined : form.dexa_lean_mass_kg,
    dexa_fat_mass_kg:
      form.dexa_fat_mass_kg === "" ? undefined : form.dexa_fat_mass_kg,
    dexa_bone_t_score:
      form.dexa_bone_t_score === "" ? undefined : form.dexa_bone_t_score,
    prior_lean_mass_kg:
      form.prior_lean_mass_kg === "" ? undefined : form.prior_lean_mass_kg,
    body_fat_pct: form.body_fat_pct === "" ? undefined : form.body_fat_pct,
  };
}
import type { Sex, TestosteroneSource } from "./types";

export type FormBiomarkerInput = {
  albumin_g_dl: number | "";
  creatinine_mg_dl: number | "";
  glucose_mg_dl: number | "";
  hba1c_pct: number | "";
  crp_mg_l: number | "";
  lymphocyte_pct: number | "";
  mcv_fl: number | "";
  rdw_pct: number | "";
  alp_u_l: number | "";
  wbc_10e3: number | "";
  chronological_age: number | "";
  test_date?: string;
};

export type FormContextFlags = {
  creatine_supplementation: boolean;
  testosterone_ng_dl: number | "";
  testosterone_source: TestosteroneSource;
  exogenous_testosterone_recent: boolean;
  sex: Sex | "";
  egfr: number | "";
  dexa_lean_mass_kg: number | "";
  dexa_fat_mass_kg: number | "";
  dexa_bone_t_score: number | "";
  prior_lean_mass_kg: number | "";
  body_fat_pct: number | "";
};

export const EMPTY_BIOMARKERS: FormBiomarkerInput = {
  albumin_g_dl: "",
  creatinine_mg_dl: "",
  glucose_mg_dl: "",
  hba1c_pct: "",
  crp_mg_l: "",
  lymphocyte_pct: "",
  mcv_fl: "",
  rdw_pct: "",
  alp_u_l: "",
  wbc_10e3: "",
  chronological_age: "",
};

export const EMPTY_CONTEXT: FormContextFlags = {
  creatine_supplementation: false,
  testosterone_ng_dl: "",
  testosterone_source: "unknown",
  exogenous_testosterone_recent: false,
  sex: "",
  egfr: "",
  dexa_lean_mass_kg: "",
  dexa_fat_mass_kg: "",
  dexa_bone_t_score: "",
  prior_lean_mass_kg: "",
  body_fat_pct: "",
};
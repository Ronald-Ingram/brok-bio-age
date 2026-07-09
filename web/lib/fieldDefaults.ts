/** Fixed reference placeholders (US adults, Levine-relevant ranges). Not age-stratified. */
export const POPULATION_AVERAGES = {
  albumin_g_dl: 4.4,
  creatinine_mg_dl: 0.93,
  glucose_mg_dl: 95,
  hba1c_pct: 5.4,
  crp_mg_l: 1.5,
  lymphocyte_pct: 28,
  mcv_fl: 92,
  rdw_pct: 13.0,
  alp_u_l: 70,
  wbc_10e3: 5.5,
  chronological_age: 55,
  testosterone_ng_dl: 500,
  egfr: 90,
  dexa_lean_mass_kg: 60,
  prior_lean_mass_kg: 58,
  dexa_bone_t_score: -0.5,
  body_fat_pct: 22,
} as const;

export type FieldKey = keyof typeof POPULATION_AVERAGES;

export type FieldSource = "unset" | "manual" | "pdf";

export type FieldProvenance = Partial<Record<string, FieldSource>>;
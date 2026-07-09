export type AgeMode =
  | "standard"
  | "scaled"
  | "anchor_offset"
  | "offset"
  | "custom";

export interface BiomarkerInput {
  albumin_g_dl: number;
  creatinine_mg_dl: number;
  glucose_mg_dl?: number;
  hba1c_pct?: number;
  crp_mg_l: number;
  lymphocyte_pct: number;
  mcv_fl: number;
  rdw_pct: number;
  alp_u_l: number;
  wbc_10e3: number;
  chronological_age: number;
  test_date?: string;
}

export type Sex = "male" | "female";
export type TestosteroneSource = "endogenous" | "exogenous" | "unknown";

export interface ContextFlags {
  creatine_supplementation: boolean;
  testosterone_ng_dl?: number;
  testosterone_source?: TestosteroneSource;
  exogenous_testosterone_recent?: boolean;
  sex?: Sex;
  egfr?: number;
  dexa_lean_mass_kg?: number;
  dexa_fat_mass_kg?: number;
  dexa_bone_t_score?: number;
  prior_lean_mass_kg?: number;
  body_fat_pct?: number;
}

export interface ModelConfig {
  age_mode: AgeMode;
  age_alpha: number;
  age_beta: number;
  age_override?: number;
  prior_brok_pheno_age?: number;
  use_hba1c_over_glucose: boolean;
}

export interface PriorTest {
  test_date: string;
  chronological_age: number;
  pheno_age_standard: number;
  pheno_age_brok?: number;
}

export interface CalculateRequest {
  biomarkers: BiomarkerInput;
  context: ContextFlags;
  config: ModelConfig;
  prior_tests: PriorTest[];
}

export interface PhenoAgeResult {
  lincomb: number;
  mortality_risk: number;
  pheno_age: number;
  delta_vs_chronological: number;
}

export interface AdjustmentAudit {
  field: string;
  standard_value: number;
  brok_value: number;
  reason: string;
}

export interface PaceMetrics {
  prior_test_date?: string;
  chrono_elapsed_years?: number;
  pheno_elapsed_standard?: number;
  pheno_elapsed_brok?: number;
  pace_ratio_standard?: number;
  pace_ratio_brok?: number;
  deceleration_years_standard?: number;
  deceleration_years_brok?: number;
}

export interface SensitivityImpact {
  biomarker: string;
  perturbation: string;
  delta_pheno_years_standard: number;
}

export interface ParsedBiomarker {
  field: string;
  value: number;
  unit: string;
  confidence: number;
  source_line?: string;
}

export interface HistoricalSnapshot {
  test_date: string;
  chronological_age: number;
  biomarkers: ParsedBiomarker[];
  pheno_age_standard?: number;
  source_header?: string;
}

export interface ParsePdfResponse {
  biomarkers: ParsedBiomarker[];
  raw_text_preview: string;
  parse_method: string;
  report_type: string;
  sex?: Sex;
  test_date?: string;
  warnings: string[];
  mean_confidence: number;
  fields_found: string[];
  fields_missing: string[];
  historical_snapshots?: HistoricalSnapshot[];
  snapshot_count?: number;
}

export interface CalculateResponse {
  standard: PhenoAgeResult;
  brok: PhenoAgeResult;
  delta_brok_vs_standard: number;
  adjustments: AdjustmentAudit[];
  sensitivity: SensitivityImpact[];
  pace: PaceMetrics | null;
  pace_history: PaceMetrics[];
  interpretation: string;
  disclaimers: string[];
  model_version: string;
}
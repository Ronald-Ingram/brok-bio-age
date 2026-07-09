/** Key biomarkers for historical trend charts — reusable across BROK products */

export interface BiomarkerTrendKey {
  id: string;
  label: string;
  unit: string;
  color: string;
  /** Field on CalculateRequest.biomarkers */
  field: keyof import("./types").BiomarkerInput;
}

export const TREND_BIOMARKERS: BiomarkerTrendKey[] = [
  { id: "albumin", label: "Albumin", unit: "g/dL", color: "#a78bfa", field: "albumin_g_dl" },
  { id: "creatinine", label: "Creatinine", unit: "mg/dL", color: "#f472b6", field: "creatinine_mg_dl" },
  { id: "glucose", label: "Glucose", unit: "mg/dL", color: "#fb923c", field: "glucose_mg_dl" },
  { id: "hba1c", label: "HbA1c", unit: "%", color: "#fbbf24", field: "hba1c_pct" },
  { id: "crp", label: "CRP", unit: "mg/L", color: "#f87171", field: "crp_mg_l" },
  { id: "lymphocyte", label: "Lymphocyte %", unit: "%", color: "#4ade80", field: "lymphocyte_pct" },
  { id: "mcv", label: "MCV", unit: "fL", color: "#38bdf8", field: "mcv_fl" },
  { id: "rdw", label: "RDW", unit: "%", color: "#00f9ff", field: "rdw_pct" },
  { id: "alp", label: "ALP", unit: "U/L", color: "#c084fc", field: "alp_u_l" },
  { id: "wbc", label: "WBC", unit: "10³/µL", color: "#94a3b8", field: "wbc_10e3" },
];

export const DEFAULT_TREND_SELECTION = ["rdw", "crp", "glucose", "albumin"];
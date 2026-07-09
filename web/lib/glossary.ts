export interface GlossaryEntry {
  term: string;
  full: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  PhenoAge: {
    term: "PhenoAge",
    full: "Phenotypic Age",
    definition:
      "Levine et al. biological age estimate from nine blood biomarkers plus chronological age.",
  },
  BROK: {
    term: "BROK",
    full: "BROK-adjusted PhenoAge",
    definition:
      "Transparent adjustments for biohackers: age scaling, creatinine context, HbA1c preference, DEXA/T signals.",
  },
  RDW: {
    term: "RDW",
    full: "Red Cell Distribution Width",
    definition:
      "Variation in red blood cell size (%). Highest Levine weight; small changes move pheno age sharply.",
  },
  MCV: {
    term: "MCV",
    full: "Mean Corpuscular Volume",
    definition: "Average red blood cell volume in femtoliters (fL).",
  },
  ALP: {
    term: "ALP",
    full: "Alkaline Phosphatase",
    definition: "Enzyme linked to liver/bone turnover (U/L).",
  },
  CRP: {
    term: "CRP",
    full: "C-Reactive Protein",
    definition: "Inflammation marker (mg/L). hs-CRP preferred for cardio risk.",
  },
  HbA1c: {
    term: "HbA1c",
    full: "Hemoglobin A1c",
    definition:
      "3-month average glucose exposure (%). BROK can derive glucose via ADA eAG formula.",
  },
  WBC: {
    term: "WBC",
    full: "White Blood Cell count",
    definition: "Immune cell concentration (10³/µL).",
  },
  Lymphocytes: {
    term: "Lymphocytes",
    full: "Lymphocyte percentage",
    definition:
      "A type of white blood cell (B cells, T cells, NK cells) shown as % of total WBC on a CBC differential. Levine PhenoAge weights lymphocyte % inversely — higher % is generally associated with lower biological age in the model.",
  },
  DEXA: {
    term: "DEXA",
    full: "Dual-Energy X-ray Absorptiometry",
    definition:
      "Gold-standard body composition and bone density scan (lean mass, fat, T-score).",
  },
  "T-score": {
    term: "T-score",
    full: "Bone T-score",
    definition:
      "Bone density vs young-adult reference. ≥ −1.0 is normal; higher is better for fracture risk.",
  },
  BMC: {
    term: "BMC",
    full: "Bone Mineral Content",
    definition: "Total bone mineral mass from DEXA (often in lbs or g).",
  },
  eGFR: {
    term: "eGFR",
    full: "estimated Glomerular Filtration Rate",
    definition:
      "Kidney filtration estimate (mL/min). ≥ 90 supports normal creatinine interpretation.",
  },
  eAG: {
    term: "eAG",
    full: "estimated Average Glucose",
    definition: "HbA1c converted to mg/dL: 28.7 × HbA1c − 46.7 (ADA).",
  },
  TRT: {
    term: "TRT",
    full: "Testosterone Replacement Therapy",
    definition:
      "Exogenous testosterone. BROK applies a 6-month recency penalty heuristic when flagged.",
  },
  VAT: {
    term: "VAT",
    full: "Visceral Adipose Tissue",
    definition: "Deep abdominal fat linked to metabolic risk; reported on DexaFit CoreScan.",
  },
  ChronologicalAge: {
    term: "Calendar age",
    full: "Chronological age",
    definition:
      "Years since birth. Shown for context; Levine and BROK scores are computed from labs plus this age input.",
  },
  ReferenceLabs: {
    term: "Reference labs",
    full: "Levine @ reference biomarkers",
    definition:
      "Standard Levine PhenoAge if your nine lab inputs were swapped for fixed US-adult placeholder values while keeping your calendar age. Useful benchmark — not the bio-age of an average person at your age.",
  },
  StandardLevine: {
    term: "Standard Levine",
    full: "Standard Levine PhenoAge",
    definition:
      "Published Levine et al. formula using your actual biomarkers and chronological age. Mortality-risk estimate with no BROK adjustments.",
  },
};
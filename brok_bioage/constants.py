"""Levine PhenoAge coefficients (Johnny Adams spreadsheet v20220225 / UseThisNextX)."""

from typing import Final

WEIGHTS: Final[dict[str, float]] = {
    "albumin": -0.0336,
    "creatinine": 0.0095,
    "glucose": 0.1953,
    "crp": 0.0954,
    "lymphocyte_pct": -0.012,
    "mcv": 0.0268,
    "rdw": 0.3306,
    "alp": 0.0019,
    "wbc": 0.0554,
    "age": 0.0804,
}

B0: Final[float] = -19.9067
G: Final[float] = 0.0076927
T_MONTHS: Final[int] = 120

ALBUMIN_G_DL_TO_G_L: Final[float] = 10.0
CREATININE_MG_DL_TO_UMOL_L: Final[float] = 88.4
GLUCOSE_MG_DL_TO_MMOL_L: Final[float] = 0.0555
CRP_MG_L_TO_LN_MG_DL: Final[float] = 0.1

PHENO_AGE_INTERCEPT: Final[float] = 141.50225
PHENO_AGE_LN_COEF: Final[float] = -0.00553
PHENO_AGE_DIVISOR: Final[float] = 0.09165

PHENO_AGE_TOLERANCE_YEARS: Final[float] = 0.1

# BROK adjustment defaults
DEFAULT_AGE_ALPHA: Final[float] = 0.95
DEFAULT_AGE_BETA: Final[float] = 0.5
CREATININE_DISCOUNT_CAP: Final[float] = 0.50

# ADA eAG (Nathan et al., Diabetes Care 2008)
HBA1C_EAG_SLOPE: Final[float] = 28.7
HBA1C_EAG_INTERCEPT: Final[float] = 46.7
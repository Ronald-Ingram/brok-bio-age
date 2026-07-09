"""Unit conversions for Levine PhenoAge inputs."""

import math
from dataclasses import dataclass

from brok_bioage.constants import (
    ALBUMIN_G_DL_TO_G_L,
    CREATININE_MG_DL_TO_UMOL_L,
    CRP_MG_L_TO_LN_MG_DL,
    GLUCOSE_MG_DL_TO_MMOL_L,
)


@dataclass(frozen=True)
class BiomarkerInputs:
    """US conventional lab units."""

    albumin_g_dl: float
    creatinine_mg_dl: float
    glucose_mg_dl: float
    crp_mg_l: float
    lymphocyte_pct: float
    mcv_fl: float
    rdw_pct: float
    alp_u_l: float
    wbc_10e3: float
    chronological_age: float


@dataclass(frozen=True)
class ConvertedInputs:
    """Levine model units (spreadsheet cInput row)."""

    albumin_g_l: float
    creatinine_umol_l: float
    glucose_mmol_l: float
    crp_ln_mg_dl: float
    lymphocyte_pct: float
    mcv_fl: float
    rdw_pct: float
    alp_u_l: float
    wbc_10e3: float
    age_years: float


def convert_biomarkers(inputs: BiomarkerInputs) -> ConvertedInputs:
    return ConvertedInputs(
        albumin_g_l=inputs.albumin_g_dl * ALBUMIN_G_DL_TO_G_L,
        creatinine_umol_l=inputs.creatinine_mg_dl * CREATININE_MG_DL_TO_UMOL_L,
        glucose_mmol_l=inputs.glucose_mg_dl * GLUCOSE_MG_DL_TO_MMOL_L,
        crp_ln_mg_dl=math.log(inputs.crp_mg_l * CRP_MG_L_TO_LN_MG_DL),
        lymphocyte_pct=inputs.lymphocyte_pct,
        mcv_fl=inputs.mcv_fl,
        rdw_pct=inputs.rdw_pct,
        alp_u_l=inputs.alp_u_l,
        wbc_10e3=inputs.wbc_10e3,
        age_years=inputs.chronological_age,
    )
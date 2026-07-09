"""Standard Levine PhenoAge calculator."""

import math
from dataclasses import dataclass

from brok_bioage.constants import (
    B0,
    G,
    PHENO_AGE_DIVISOR,
    PHENO_AGE_INTERCEPT,
    PHENO_AGE_LN_COEF,
    T_MONTHS,
    WEIGHTS,
)
from brok_bioage.units import BiomarkerInputs, ConvertedInputs, convert_biomarkers


@dataclass(frozen=True)
class TermBreakdown:
    biomarker: str
    c_input: float
    weight: float
    term: float


@dataclass(frozen=True)
class LevineResult:
    lincomb: float
    mortality_risk: float
    pheno_age: float
    delta_vs_chronological: float
    terms: tuple[TermBreakdown, ...]
    converted: ConvertedInputs


def _mortality_risk(lincomb: float) -> float:
    xm = math.exp(lincomb)
    risk = 1.0 - math.exp(-xm * (math.exp(G * T_MONTHS) - 1.0) / G)
    return min(max(risk, 1e-9), 1.0 - 1e-9)


def _pheno_age_from_mortality(mortality_risk: float) -> float:
    inner = 1.0 - mortality_risk
    return PHENO_AGE_INTERCEPT + math.log(PHENO_AGE_LN_COEF * math.log(inner)) / PHENO_AGE_DIVISOR


def compute_terms(converted: ConvertedInputs) -> tuple[TermBreakdown, ...]:
    mapping = {
        "albumin": converted.albumin_g_l,
        "creatinine": converted.creatinine_umol_l,
        "glucose": converted.glucose_mmol_l,
        "crp": converted.crp_ln_mg_dl,
        "lymphocyte_pct": converted.lymphocyte_pct,
        "mcv": converted.mcv_fl,
        "rdw": converted.rdw_pct,
        "alp": converted.alp_u_l,
        "wbc": converted.wbc_10e3,
        "age": converted.age_years,
    }
    return tuple(
        TermBreakdown(
            biomarker=name,
            c_input=value,
            weight=WEIGHTS[name],
            term=WEIGHTS[name] * value,
        )
        for name, value in mapping.items()
    )


def compute_lincomb(terms: tuple[TermBreakdown, ...]) -> float:
    return B0 + sum(t.term for t in terms)


def result_from_lincomb(
    lincomb: float,
    chronological_age: float,
    terms: tuple[TermBreakdown, ...],
    converted: ConvertedInputs,
) -> LevineResult:
    mortality_risk = _mortality_risk(lincomb)
    pheno_age = _pheno_age_from_mortality(mortality_risk)
    return LevineResult(
        lincomb=lincomb,
        mortality_risk=mortality_risk,
        pheno_age=pheno_age,
        delta_vs_chronological=pheno_age - chronological_age,
        terms=terms,
        converted=converted,
    )


def compute_levine(inputs: BiomarkerInputs) -> LevineResult:
    converted = convert_biomarkers(inputs)
    terms = compute_terms(converted)
    lincomb = compute_lincomb(terms)
    return result_from_lincomb(
        lincomb, inputs.chronological_age, terms, converted
    )
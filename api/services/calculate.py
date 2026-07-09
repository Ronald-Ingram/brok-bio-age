"""Orchestrates Levine + BROK calculation for API requests."""

from __future__ import annotations

from api.models.biomarkers import (
    AdjustmentAudit,
    CalculateRequest,
    CalculateResponse,
    PaceMetrics as ApiPaceMetrics,
    PhenoAgeResult,
    SensitivityImpact,
)
from api.services.interpret import build_interpretation
from api.services.sensitivity import compute_sensitivity
from brok_bioage.brok import compute_brok, hba1c_to_glucose_mg_dl
from brok_bioage.units import BiomarkerInputs
from brok_bioage.models import (
    AgeMode as DomainAgeMode,
    BrokBiomarkerInputs,
    ContextFlags as DomainContextFlags,
    ModelConfig as DomainModelConfig,
    PriorTest as DomainPriorTest,
    Sex as DomainSex,
    TestosteroneSource as DomainTestosteroneSource,
)
from brok_bioage.pace import compute_pace_from_priors

MODEL_VERSION = "brok-phenoage-0.1.0"

_AGE_MODE_MAP = {
    "standard": DomainAgeMode.STANDARD,
    "scaled": DomainAgeMode.SCALED,
    "anchor_offset": DomainAgeMode.ANCHOR_OFFSET,
    "offset": DomainAgeMode.OFFSET,
    "custom": DomainAgeMode.CUSTOM,
}


def _to_domain_biomarkers(req: CalculateRequest) -> BrokBiomarkerInputs:
    b = req.biomarkers
    return BrokBiomarkerInputs(
        albumin_g_dl=b.albumin_g_dl,
        creatinine_mg_dl=b.creatinine_mg_dl,
        glucose_mg_dl=b.glucose_mg_dl,
        hba1c_pct=b.hba1c_pct,
        crp_mg_l=b.crp_mg_l,
        lymphocyte_pct=b.lymphocyte_pct,
        mcv_fl=b.mcv_fl,
        rdw_pct=b.rdw_pct,
        alp_u_l=b.alp_u_l,
        wbc_10e3=b.wbc_10e3,
        chronological_age=b.chronological_age,
        test_date=b.test_date,
    )


def _to_domain_context(req: CalculateRequest) -> DomainContextFlags:
    c = req.context
    sex = DomainSex(c.sex.value) if c.sex is not None else None
    t_source = DomainTestosteroneSource(c.testosterone_source.value)
    return DomainContextFlags(
        creatine_supplementation=c.creatine_supplementation,
        testosterone_ng_dl=c.testosterone_ng_dl,
        testosterone_source=t_source,
        exogenous_testosterone_recent=c.exogenous_testosterone_recent,
        sex=sex,
        egfr=c.egfr,
        dexa_lean_mass_kg=c.dexa_lean_mass_kg,
        dexa_fat_mass_kg=c.dexa_fat_mass_kg,
        dexa_bone_t_score=c.dexa_bone_t_score,
        prior_lean_mass_kg=c.prior_lean_mass_kg,
        body_fat_pct=c.body_fat_pct,
    )


def _to_domain_config(req: CalculateRequest) -> DomainModelConfig:
    cfg = req.config
    return DomainModelConfig(
        age_mode=_AGE_MODE_MAP[cfg.age_mode.value],
        age_alpha=cfg.age_alpha,
        age_beta=cfg.age_beta,
        age_override=cfg.age_override,
        prior_brok_pheno_age=cfg.prior_brok_pheno_age,
        use_hba1c_over_glucose=cfg.use_hba1c_over_glucose,
    )


def _to_domain_priors(req: CalculateRequest) -> list[DomainPriorTest]:
    return [
        DomainPriorTest(
            test_date=p.test_date,
            chronological_age=p.chronological_age,
            pheno_age_standard=p.pheno_age_standard,
            pheno_age_brok=p.pheno_age_brok,
        )
        for p in req.prior_tests
    ]


def _pace_to_api(pace) -> ApiPaceMetrics:
    return ApiPaceMetrics(
        prior_test_date=pace.prior_test_date,
        chrono_elapsed_years=pace.chrono_elapsed_years,
        pheno_elapsed_standard=pace.pheno_elapsed_standard,
        pheno_elapsed_brok=pace.pheno_elapsed_brok,
        pace_ratio_standard=pace.pace_ratio_standard,
        pace_ratio_brok=pace.pace_ratio_brok,
        deceleration_years_standard=pace.deceleration_years_standard,
        deceleration_years_brok=pace.deceleration_years_brok,
    )


def run_calculate(req: CalculateRequest) -> CalculateResponse:
    domain_inputs = _to_domain_biomarkers(req)
    domain_context = _to_domain_context(req)
    domain_config = _to_domain_config(req)
    domain_priors = _to_domain_priors(req)

    result = compute_brok(
        domain_inputs,
        domain_context,
        domain_config,
        domain_priors,
    )

    pace_primary = None
    pace_history: list[ApiPaceMetrics] = []
    if req.biomarkers.test_date and domain_priors:
        primary, history = compute_pace_from_priors(
            req.biomarkers.test_date,
            req.biomarkers.chronological_age,
            result.standard_pheno_age,
            result.brok_pheno_age,
            domain_priors,
        )
        if primary:
            pace_primary = _pace_to_api(primary)
        pace_history = [_pace_to_api(p) for p in history]

    adjustments = [
        AdjustmentAudit(
            field=a.field,
            standard_value=a.standard_value,
            brok_value=a.brok_value,
            reason=a.reason,
        )
        for a in result.adjustments
    ]

    creatinine_reasons = next(
        (a.reason for a in result.adjustments if a.field == "creatinine"),
        "",
    )

    interpretation, disclaimers = build_interpretation(
        req.biomarkers,
        req.context,
        result.brok_pheno_age,
        result.delta_brok_vs_standard,
        result.creatinine_discount,
        creatinine_reasons,
        result.glucose_source,
        pace_primary,
    )

    glucose_for_levine = req.biomarkers.glucose_mg_dl
    if glucose_for_levine is None and req.biomarkers.hba1c_pct is not None:
        glucose_for_levine = hba1c_to_glucose_mg_dl(req.biomarkers.hba1c_pct)
    sensitivity: list[SensitivityImpact] = []
    if glucose_for_levine is not None:
        levine_inputs = BiomarkerInputs(
            albumin_g_dl=req.biomarkers.albumin_g_dl,
            creatinine_mg_dl=req.biomarkers.creatinine_mg_dl,
            glucose_mg_dl=glucose_for_levine,
            crp_mg_l=req.biomarkers.crp_mg_l,
            lymphocyte_pct=req.biomarkers.lymphocyte_pct,
            mcv_fl=req.biomarkers.mcv_fl,
            rdw_pct=req.biomarkers.rdw_pct,
            alp_u_l=req.biomarkers.alp_u_l,
            wbc_10e3=req.biomarkers.wbc_10e3,
            chronological_age=req.biomarkers.chronological_age,
        )
        sensitivity = [
            SensitivityImpact(**item) for item in compute_sensitivity(levine_inputs)
        ]

    return CalculateResponse(
        standard=PhenoAgeResult(
            lincomb=result.lincomb_standard,
            mortality_risk=result.mortality_risk_standard,
            pheno_age=round(result.standard_pheno_age, 2),
            delta_vs_chronological=round(
                result.standard_pheno_age - req.biomarkers.chronological_age, 2
            ),
        ),
        brok=PhenoAgeResult(
            lincomb=result.lincomb_brok,
            mortality_risk=result.mortality_risk_brok,
            pheno_age=round(result.brok_pheno_age, 2),
            delta_vs_chronological=round(result.delta_brok_vs_chronological, 2),
        ),
        delta_brok_vs_standard=round(result.delta_brok_vs_standard, 2),
        adjustments=adjustments,
        sensitivity=sensitivity,
        pace=pace_primary,
        pace_history=pace_history,
        interpretation=interpretation,
        disclaimers=disclaimers,
        model_version=MODEL_VERSION,
    )
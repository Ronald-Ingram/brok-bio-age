"""BROK-adjusted PhenoAge calculator."""

from __future__ import annotations

from dataclasses import dataclass

from brok_bioage.constants import (
    CREATININE_DISCOUNT_CAP,
    GLUCOSE_MG_DL_TO_MMOL_L,
    HBA1C_EAG_INTERCEPT,
    HBA1C_EAG_SLOPE,
    WEIGHTS,
)
from brok_bioage.levine import TermBreakdown, compute_levine, result_from_lincomb
from brok_bioage.models import (
    EXOGENOUS_T_RECENT_MONTHS,
    MALE_T_ABOVE_AVERAGE_NG_DL,
    AdjustmentAudit,
    AgeMode,
    BrokBiomarkerInputs,
    BrokTermBreakdown,
    ContextFlags,
    ModelConfig,
    PriorTest,
    Sex,
    TestosteroneSource,
)
from brok_bioage.units import BiomarkerInputs


@dataclass(frozen=True)
class BrokResult:
    standard_pheno_age: float
    brok_pheno_age: float
    delta_brok_vs_standard: float
    delta_brok_vs_chronological: float
    lincomb_standard: float
    lincomb_brok: float
    mortality_risk_standard: float
    mortality_risk_brok: float
    terms: tuple[BrokTermBreakdown, ...]
    adjustments: tuple[AdjustmentAudit, ...]
    creatinine_discount: float
    glucose_source: str
    effective_age: float
    effective_age_note: str


def _term_map(terms: tuple[TermBreakdown, ...]) -> dict[str, TermBreakdown]:
    return {t.biomarker: t for t in terms}


def hba1c_to_glucose_mg_dl(hba1c_pct: float) -> float:
    return HBA1C_EAG_SLOPE * hba1c_pct - HBA1C_EAG_INTERCEPT


def resolve_glucose_mg_dl(
    inputs: BrokBiomarkerInputs,
    config: ModelConfig,
) -> tuple[float, str]:
    if inputs.glucose_mg_dl is not None and (
        inputs.hba1c_pct is None or not config.use_hba1c_over_glucose
    ):
        return inputs.glucose_mg_dl, "fasting_glucose"
    if inputs.hba1c_pct is not None:
        eag = hba1c_to_glucose_mg_dl(inputs.hba1c_pct)
        return eag, f"hba1c_eag({inputs.hba1c_pct:.1f}%)"
    if inputs.glucose_mg_dl is not None:
        return inputs.glucose_mg_dl, "fasting_glucose"
    raise ValueError("Either glucose_mg_dl or hba1c_pct is required")


def resolve_prior_brok(prior_tests: list[PriorTest]) -> float | None:
    if not prior_tests:
        return None
    latest = max(prior_tests, key=lambda p: p.test_date)
    return latest.pheno_age_brok


def resolve_prior_standard(prior_tests: list[PriorTest]) -> float | None:
    if not prior_tests:
        return None
    latest = max(prior_tests, key=lambda p: p.test_date)
    return latest.pheno_age_standard


def effective_age(
    config: ModelConfig,
    chrono: float,
    prior_tests: list[PriorTest],
) -> tuple[float, str]:
    mode = config.age_mode
    if mode == AgeMode.STANDARD:
        return chrono, "standard chronological age"
    if mode == AgeMode.SCALED:
        return config.age_alpha * chrono, f"scaled age α={config.age_alpha}"
    if mode == AgeMode.ANCHOR_OFFSET:
        prior_std = resolve_prior_standard(prior_tests)
        if prior_std is None:
            eff = config.age_alpha * chrono
            return eff, f"anchor_offset fallback: no prior → scaled α={config.age_alpha}"
        eff = chrono - config.age_beta * (chrono - prior_std)
        return eff, f"anchor_offset β={config.age_beta}, prior_standard={prior_std:.1f}"
    if mode == AgeMode.OFFSET:
        prior_brok = config.prior_brok_pheno_age or resolve_prior_brok(prior_tests)
        if prior_brok is None:
            return chrono, "offset fallback: no prior_brok → chronological age"
        return prior_brok, f"offset from prior BROK={prior_brok:.1f}"
    if mode == AgeMode.CUSTOM:
        override = config.age_override if config.age_override is not None else chrono
        return override, "custom age_override"
    return chrono, "unknown mode fallback"


def creatinine_discount(ctx: ContextFlags) -> tuple[float, list[str]]:
    d = 0.0
    reasons: list[str] = []
    if ctx.creatine_supplementation:
        d += 0.40
        reasons.append("creatine supplementation")
    if (
        ctx.testosterone_ng_dl is not None
        and ctx.testosterone_ng_dl >= 800
        and ctx.testosterone_source != TestosteroneSource.EXOGENOUS
        and not ctx.exogenous_testosterone_recent
    ):
        d += 0.20
        reasons.append(f"endogenous testosterone {ctx.testosterone_ng_dl:.0f} ng/dL")
    if (
        ctx.dexa_lean_mass_kg is not None
        and ctx.prior_lean_mass_kg is not None
        and ctx.prior_lean_mass_kg > 0
    ):
        lean_gain = (ctx.dexa_lean_mass_kg - ctx.prior_lean_mass_kg) / ctx.prior_lean_mass_kg
        if lean_gain >= 0.02:
            d += 0.15
            reasons.append(f"DEXA lean mass gain {lean_gain:.1%}")
    if ctx.egfr is not None and ctx.egfr >= 90:
        d += 0.30
        reasons.append(f"eGFR {ctx.egfr:.0f} normal")
    if ctx.egfr is not None and ctx.egfr < 60:
        return min(0.20, d), reasons
    return min(CREATININE_DISCOUNT_CAP, d), reasons


def body_composition_lincomb_delta(ctx: ContextFlags) -> tuple[float, list[str]]:
    """Lincomb adjustment from DEXA + testosterone context (negative = younger pheno age)."""
    delta = 0.0
    reasons: list[str] = []

    if (
        ctx.exogenous_testosterone_recent
        or ctx.testosterone_source == TestosteroneSource.EXOGENOUS
    ):
        delta += 0.65
        reasons.append(
            f"exogenous testosterone within {EXOGENOUS_T_RECENT_MONTHS} months "
            "(heuristic longevity penalty; Endocrine Society 3–6 mo TRT monitoring window)"
        )
        return delta, reasons

    if ctx.sex != Sex.MALE:
        return delta, reasons

    t = ctx.testosterone_ng_dl
    if t is None or t < MALE_T_ABOVE_AVERAGE_NG_DL:
        return delta, reasons

    signals = 0
    signal_notes: list[str] = []

    if ctx.dexa_bone_t_score is not None and ctx.dexa_bone_t_score >= -0.5:
        signals += 1
        signal_notes.append(f"bone T-score {ctx.dexa_bone_t_score:+.1f}")

    if ctx.dexa_lean_mass_kg is not None and ctx.dexa_lean_mass_kg >= 55:
        signals += 1
        signal_notes.append(f"lean mass {ctx.dexa_lean_mass_kg:.1f} kg")

    if ctx.body_fat_pct is not None and ctx.body_fat_pct <= 25:
        signals += 1
        signal_notes.append(f"body fat {ctx.body_fat_pct:.1f}%")

    lean_gain = False
    if (
        ctx.dexa_lean_mass_kg is not None
        and ctx.prior_lean_mass_kg is not None
        and ctx.prior_lean_mass_kg > 0
    ):
        gain = (ctx.dexa_lean_mass_kg - ctx.prior_lean_mass_kg) / ctx.prior_lean_mass_kg
        if gain >= 0.02:
            lean_gain = True
            signal_notes.append(f"lean gain {gain:.1%}")

    if signals >= 2 or (signals >= 1 and lean_gain):
        credit = min(0.45, 0.15 * signals + (0.10 if lean_gain else 0))
        delta -= credit
        reasons.append(
            f"endogenous T {t:.0f} ng/dL + DEXA healthspan signals: "
            + ", ".join(signal_notes)
        )

    return delta, reasons


def _brok_result_from_standard(standard, chronological_age: float) -> BrokResult:
    terms = tuple(
        BrokTermBreakdown(
            biomarker=t.biomarker,
            c_input=t.c_input,
            weight=t.weight,
            term_standard=t.term,
            term_brok=t.term,
            adjustment_note=None,
        )
        for t in standard.terms
    )
    return BrokResult(
        standard_pheno_age=standard.pheno_age,
        brok_pheno_age=standard.pheno_age,
        delta_brok_vs_standard=0.0,
        delta_brok_vs_chronological=standard.pheno_age - chronological_age,
        lincomb_standard=standard.lincomb,
        lincomb_brok=standard.lincomb,
        mortality_risk_standard=standard.mortality_risk,
        mortality_risk_brok=standard.mortality_risk,
        terms=terms,
        adjustments=(),
        creatinine_discount=0.0,
        glucose_source="fasting_glucose",
        effective_age=chronological_age,
        effective_age_note="standard chronological age",
    )


def compute_brok(
    inputs: BrokBiomarkerInputs,
    context: ContextFlags | None = None,
    config: ModelConfig | None = None,
    prior_tests: list[PriorTest] | None = None,
) -> BrokResult:
    context = context or ContextFlags()
    config = config or ModelConfig()
    prior_tests = prior_tests or []

    fasting_glucose = inputs.glucose_mg_dl
    if fasting_glucose is None and inputs.hba1c_pct is not None:
        fasting_glucose = hba1c_to_glucose_mg_dl(inputs.hba1c_pct)
    if fasting_glucose is None:
        raise ValueError("Either glucose_mg_dl or hba1c_pct is required")

    standard = compute_levine(inputs.to_levine_inputs(fasting_glucose))
    term_by_name = _term_map(standard.terms)
    adjustments: list[AdjustmentAudit] = []

    discount, disc_reasons = creatinine_discount(context)
    brok_glucose_mg_dl, glucose_source = resolve_glucose_mg_dl(inputs, config)
    glucose_only_change = (
        config.age_mode == AgeMode.STANDARD
        and discount == 0
        and abs(brok_glucose_mg_dl - fasting_glucose) < 0.01
    )
    if glucose_only_change:
        return _brok_result_from_standard(standard, inputs.chronological_age)

    eff_age, age_note = effective_age(config, inputs.chronological_age, prior_tests)
    age_term_std = term_by_name["age"].term
    age_term_brok = WEIGHTS["age"] * eff_age
    if age_term_brok != age_term_std:
        adjustments.append(
            AdjustmentAudit(
                field="age",
                standard_value=inputs.chronological_age,
                brok_value=eff_age,
                reason=age_note,
            )
        )

    glucose_mmol_brok = brok_glucose_mg_dl * GLUCOSE_MG_DL_TO_MMOL_L
    glucose_term_std = term_by_name["glucose"].term
    glucose_term_brok = WEIGHTS["glucose"] * glucose_mmol_brok
    if glucose_term_brok != glucose_term_std:
        adjustments.append(
            AdjustmentAudit(
                field="glucose",
                standard_value=term_by_name["glucose"].c_input / GLUCOSE_MG_DL_TO_MMOL_L,
                brok_value=brok_glucose_mg_dl,
                reason=f"glucose term from {glucose_source}",
            )
        )

    creat_term_std = term_by_name["creatinine"].term
    creat_term_brok = creat_term_std * (1.0 - discount)
    if discount > 0:
        adjustments.append(
            AdjustmentAudit(
                field="creatinine",
                standard_value=creat_term_std,
                brok_value=creat_term_brok,
                reason="; ".join(disc_reasons) + f" (discount {discount:.0%})",
            )
        )

    lincomb_brok = (
        standard.lincomb
        - age_term_std
        - glucose_term_std
        - creat_term_std
        + age_term_brok
        + glucose_term_brok
        + creat_term_brok
    )

    brok_terms_list: list[BrokTermBreakdown] = []
    for t in standard.terms:
        term_brok = t.term
        note = None
        if t.biomarker == "age":
            term_brok = age_term_brok
            note = age_note if term_brok != t.term else None
        elif t.biomarker == "glucose":
            term_brok = glucose_term_brok
            note = glucose_source if term_brok != t.term else None
        elif t.biomarker == "creatinine":
            term_brok = creat_term_brok
            note = f"discount {discount:.0%}" if discount > 0 else None
        brok_terms_list.append(
            BrokTermBreakdown(
                biomarker=t.biomarker,
                c_input=t.c_input,
                weight=t.weight,
                term_standard=t.term,
                term_brok=term_brok,
                adjustment_note=note,
            )
        )

    body_delta, body_reasons = body_composition_lincomb_delta(context)
    if body_delta != 0:
        lincomb_brok += body_delta
        adjustments.append(
            AdjustmentAudit(
                field="body_composition",
                standard_value=0.0,
                brok_value=body_delta,
                reason="; ".join(body_reasons),
            )
        )

    brok_levine = result_from_lincomb(
        lincomb_brok,
        inputs.chronological_age,
        standard.terms,
        standard.converted,
    )

    return BrokResult(
        standard_pheno_age=standard.pheno_age,
        brok_pheno_age=brok_levine.pheno_age,
        delta_brok_vs_standard=brok_levine.pheno_age - standard.pheno_age,
        delta_brok_vs_chronological=brok_levine.pheno_age - inputs.chronological_age,
        lincomb_standard=standard.lincomb,
        lincomb_brok=lincomb_brok,
        mortality_risk_standard=standard.mortality_risk,
        mortality_risk_brok=brok_levine.mortality_risk,
        terms=tuple(brok_terms_list),
        adjustments=tuple(adjustments),
        creatinine_discount=discount,
        glucose_source=glucose_source,
        effective_age=eff_age,
        effective_age_note=age_note,
    )
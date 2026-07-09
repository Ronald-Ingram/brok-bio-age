"""Rule-based biohacker interpretation for calculate responses."""

from __future__ import annotations

from api.models.biomarkers import BiomarkerInput, ContextFlags, PaceMetrics
from brok_bioage.brok import hba1c_to_glucose_mg_dl

DISCLAIMER = (
    "For research and self-tracking only. Not medical advice. "
    "BROK adjustments are heuristic and not clinically validated. "
    "Consult a physician for health decisions."
)


def build_interpretation(
    biomarkers: BiomarkerInput,
    context: ContextFlags,
    brok_pheno_age: float,
    delta_brok_vs_standard: float,
    creatinine_discount: float,
    creatinine_discount_reasons: str,
    glucose_source: str,
    pace: PaceMetrics | None,
) -> tuple[str, list[str]]:
    sentences: list[str] = []
    chrono = biomarkers.chronological_age

    if brok_pheno_age < chrono - 5:
        sentences.append(
            f"Your BROK PhenoAge is {brok_pheno_age:.1f}, notably below chronological "
            f"age {chrono:.0f} — biomarkers suggest decelerated aging trajectory."
        )
    elif brok_pheno_age > chrono + 3:
        sentences.append(
            f"BROK PhenoAge {brok_pheno_age:.1f} exceeds chronological age — review RDW, "
            "glucose/HbA1c, and inflammation markers."
        )

    if creatinine_discount > 0:
        sentences.append(
            f"Creatinine penalty reduced by {creatinine_discount:.0%} due to: "
            f"{creatinine_discount_reasons}."
        )

    if biomarkers.rdw_pct > 13.0:
        sentences.append(
            f"RDW {biomarkers.rdw_pct:.1f}% is elevated — highest Levine weight (0.3306); "
            "small changes move pheno age ~1.8 yr per 0.5%."
        )

    if context.creatine_supplementation and biomarkers.creatinine_mg_dl > 0.9:
        sentences.append(
            f"Elevated creatinine ({biomarkers.creatinine_mg_dl:.2f}) with creatine "
            "supplementation flagged — likely muscle loading, not kidney "
            "(especially if eGFR normal)."
        )

    if context.exogenous_testosterone_recent or (
        context.testosterone_source and context.testosterone_source.value == "exogenous"
    ):
        sentences.append(
            "Exogenous testosterone flagged within the 6-month TRT monitoring window — "
            "BROK applies a longevity-risk heuristic penalty."
        )
    elif context.testosterone_ng_dl is not None and context.testosterone_ng_dl >= 800:
        sentences.append(
            f"Endogenous testosterone {context.testosterone_ng_dl:.0f} ng/dL — anabolic context; "
            "supports creatinine discount when not on TRT."
        )

    if context.sex and context.sex.value == "male":
        dexa_bits: list[str] = []
        if context.dexa_bone_t_score is not None:
            dexa_bits.append(f"T-score {context.dexa_bone_t_score:+.1f}")
        if context.dexa_lean_mass_kg is not None:
            dexa_bits.append(f"lean {context.dexa_lean_mass_kg:.1f} kg")
        if context.body_fat_pct is not None:
            dexa_bits.append(f"body fat {context.body_fat_pct:.1f}%")
        if dexa_bits:
            sentences.append(
                f"DEXA signals ({', '.join(dexa_bits)}) inform body-composition adjustment "
                "when endogenous T is above average."
            )

    if (
        pace is not None
        and pace.pace_ratio_brok is not None
        and pace.pace_ratio_brok < 1.0
        and pace.prior_test_date is not None
    ):
        sentences.append(
            f"Pace ratio {pace.pace_ratio_brok:.2f} — biological aging slower than calendar "
            f"time since {pace.prior_test_date.isoformat()}."
        )

    if pace is not None and (pace.deceleration_years_brok or 0) > 0:
        sentences.append(
            f"Deceleration: ~{pace.deceleration_years_brok:.1f} calendar years 'gained' vs "
            "biological drift since last test."
        )

    if glucose_source.startswith("hba1c") and biomarkers.hba1c_pct is not None:
        eag = hba1c_to_glucose_mg_dl(biomarkers.hba1c_pct)
        sentences.append(
            f"Glucose term derived from HbA1c {biomarkers.hba1c_pct:.1f}% "
            f"(eAG {eag:.0f} mg/dL) — lower noise than single fasting glucose."
        )

    if delta_brok_vs_standard < -3:
        sentences.append(
            f"BROK adjustment reduced pheno age by {abs(delta_brok_vs_standard):.1f} yr vs "
            "standard Levine — see adjustments audit."
        )

    interpretation = " ".join(sentences) if sentences else (
        f"BROK PhenoAge {brok_pheno_age:.1f} vs standard Levine "
        f"{brok_pheno_age - delta_brok_vs_standard:.1f} (chrono {chrono:.0f})."
    )

    return interpretation, [DISCLAIMER]
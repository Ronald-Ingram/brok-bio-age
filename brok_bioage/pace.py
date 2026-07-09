"""Pace-of-aging and deceleration metrics."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from brok_bioage.models import PriorTest


@dataclass(frozen=True)
class PaceMetrics:
    prior_test_date: date | None
    chrono_elapsed_years: float | None
    pheno_elapsed_standard: float | None
    pheno_elapsed_brok: float | None
    pace_ratio_standard: float | None
    pace_ratio_brok: float | None
    deceleration_years_standard: float | None
    deceleration_years_brok: float | None


def _years_between(later: date, earlier: date) -> float:
    return (later - earlier).days / 365.25


def compute_pace(
    current_date: date,
    current_chrono: float,
    current_pheno_standard: float,
    current_pheno_brok: float,
    prior: PriorTest,
) -> PaceMetrics:
    calendar_elapsed = _years_between(current_date, prior.test_date)
    if calendar_elapsed <= 0:
        return PaceMetrics(
            prior_test_date=prior.test_date,
            chrono_elapsed_years=None,
            pheno_elapsed_standard=None,
            pheno_elapsed_brok=None,
            pace_ratio_standard=None,
            pace_ratio_brok=None,
            deceleration_years_standard=None,
            deceleration_years_brok=None,
        )

    pheno_std = current_pheno_standard - prior.pheno_age_standard
    prior_brok = (
        prior.pheno_age_brok
        if prior.pheno_age_brok is not None
        else prior.pheno_age_standard
    )
    pheno_brok = current_pheno_brok - prior_brok

    pace_std = pheno_std / calendar_elapsed
    pace_brok = pheno_brok / calendar_elapsed

    return PaceMetrics(
        prior_test_date=prior.test_date,
        chrono_elapsed_years=round(calendar_elapsed, 2),
        pheno_elapsed_standard=round(pheno_std, 2),
        pheno_elapsed_brok=round(pheno_brok, 2),
        pace_ratio_standard=round(pace_std, 2),
        pace_ratio_brok=round(pace_brok, 2),
        deceleration_years_standard=round(calendar_elapsed - pheno_std, 2),
        deceleration_years_brok=round(calendar_elapsed - pheno_brok, 2),
    )


def compute_pace_from_priors(
    current_date: date,
    current_chrono: float,
    current_pheno_standard: float,
    current_pheno_brok: float,
    prior_tests: list[PriorTest],
) -> tuple[PaceMetrics | None, list[PaceMetrics]]:
    if not prior_tests:
        return None, []

    sorted_priors = sorted(prior_tests, key=lambda p: p.test_date)
    history = [
        compute_pace(
            current_date,
            current_chrono,
            current_pheno_standard,
            current_pheno_brok,
            prior,
        )
        for prior in sorted_priors
    ]
    latest = max(prior_tests, key=lambda p: p.test_date)
    primary = compute_pace(
        current_date,
        current_chrono,
        current_pheno_standard,
        current_pheno_brok,
        latest,
    )
    return primary, history
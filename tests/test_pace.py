"""Tests for pace-of-aging metrics."""

import json
from datetime import date
from pathlib import Path

import pytest

from brok_bioage.brok import compute_brok
from brok_bioage.models import BrokBiomarkerInputs, ContextFlags, ModelConfig, PriorTest
from brok_bioage.pace import compute_pace, compute_pace_from_priors

FIXTURES = Path(__file__).parent / "fixtures" / "brok_expected.json"


def _pace_case() -> dict:
    cases = json.loads(FIXTURES.read_text())["cases"]
    return next(c for c in cases if c["id"] == "pace_20251124_to_20260630")


def test_pace_20251124_to_20260630():
    case = _pace_case()
    cfg = ModelConfig(age_alpha=case["config"]["age_alpha"])

    prior_result = compute_brok(
        BrokBiomarkerInputs(**case["prior"]["inputs"]),
        ContextFlags(**case["prior"]["context"]),
        cfg,
    )
    current_result = compute_brok(
        BrokBiomarkerInputs(**case["current"]["inputs"]),
        ContextFlags(**case["current"]["context"]),
        cfg,
    )

    pace = compute_pace(
        date.fromisoformat(case["current"]["test_date"]),
        case["current"]["chronological_age"],
        current_result.standard_pheno_age,
        current_result.brok_pheno_age,
        PriorTest(
            test_date=date.fromisoformat(case["prior"]["test_date"]),
            chronological_age=case["prior"]["chronological_age"],
            pheno_age_standard=prior_result.standard_pheno_age,
            pheno_age_brok=prior_result.brok_pheno_age,
        ),
    )

    exp = case["expected"]
    assert abs(prior_result.brok_pheno_age - exp["prior_brok_pheno_age"]) <= 0.15
    assert abs(current_result.brok_pheno_age - exp["current_brok_pheno_age"]) <= 0.15
    assert pace.chrono_elapsed_years == pytest.approx(exp["chrono_elapsed_years"], abs=0.05)
    assert pace.pheno_elapsed_standard == pytest.approx(exp["pheno_elapsed_standard"], abs=0.1)
    assert pace.pheno_elapsed_brok == pytest.approx(exp["pheno_elapsed_brok"], abs=0.1)
    assert pace.pace_ratio_standard == pytest.approx(exp["pace_ratio_standard"], abs=0.1)
    assert pace.pace_ratio_brok == pytest.approx(exp["pace_ratio_brok"], abs=0.1)
    assert pace.deceleration_years_standard == pytest.approx(
        exp["deceleration_years_standard"], abs=0.1
    )
    assert pace.deceleration_years_brok == pytest.approx(
        exp["deceleration_years_brok"], abs=0.1
    )


def test_pace_from_priors_returns_history():
    case = _pace_case()
    cfg = ModelConfig()
    prior = PriorTest(
        test_date=date.fromisoformat(case["prior"]["test_date"]),
        chronological_age=57,
        pheno_age_standard=52.28,
        pheno_age_brok=45.98,
    )
    primary, history = compute_pace_from_priors(
        date(2026, 6, 30),
        57,
        53.57,
        46.81,
        [prior],
    )
    assert primary is not None
    assert len(history) == 1
    assert history[0].prior_test_date == prior.test_date
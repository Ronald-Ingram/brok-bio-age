"""Golden tests: Levine PhenoAge vs reference spreadsheet."""

import json
from pathlib import Path

import pytest

from brok_bioage.constants import PHENO_AGE_TOLERANCE_YEARS
from brok_bioage.levine import compute_levine
from brok_bioage.units import BiomarkerInputs

FIXTURES = Path(__file__).parent / "fixtures" / "reference_cases.json"


@pytest.fixture(scope="module")
def reference_data() -> dict:
    assert FIXTURES.exists(), (
        f"Missing {FIXTURES}. Run: python scripts/export_reference_fixtures.py"
    )
    return json.loads(FIXTURES.read_text())


def _inputs(case: dict) -> BiomarkerInputs:
    return BiomarkerInputs(**case["inputs"])


def _all_cases() -> list[dict]:
    return json.loads(FIXTURES.read_text())["cases"]


@pytest.mark.parametrize("case", _all_cases(), ids=lambda c: c["sheet"])
def test_pheno_age_matches_spreadsheet(case: dict):
    if "pheno_age" not in case.get("expected", {}):
        pytest.skip("no pheno_age expected value")

    result = compute_levine(_inputs(case))
    expected = case["expected"]["pheno_age"]
    assert abs(result.pheno_age - expected) <= PHENO_AGE_TOLERANCE_YEARS, (
        f"{case['sheet']}: got {result.pheno_age:.4f}, expected {expected:.4f}"
    )


def test_20260630_chrono57_baseline(reference_data):
    case = next(c for c in reference_data["cases"] if c["sheet"] == "20260630(RI)_chrono57")
    result = compute_levine(_inputs(case))
    assert abs(result.pheno_age - 53.57) <= PHENO_AGE_TOLERANCE_YEARS


@pytest.mark.parametrize(
    "sheet,expected_delta",
    [
        ("sensitivity_creatinine_1_13", 1.83),
        ("sensitivity_rdw_13_3", 1.80),
        ("sensitivity_glucose_105", 1.18),
    ],
)
def test_sensitivity_deltas(reference_data, sheet: str, expected_delta: float):
    case = next(c for c in reference_data["cases"] if c["sheet"] == sheet)
    delta = case["expected"]["delta_vs_baseline"]
    assert abs(delta - expected_delta) <= 0.05


def test_use_this_next_x_sample(reference_data):
    case = next(c for c in reference_data["cases"] if c["sheet"] == "UseThisNextX")
    result = compute_levine(_inputs(case))
    assert abs(result.pheno_age - case["expected"]["pheno_age"]) <= PHENO_AGE_TOLERANCE_YEARS


def test_mortality_risk_bounded(reference_data):
    for case in reference_data["cases"]:
        if "pheno_age" not in case.get("expected", {}):
            continue
        result = compute_levine(_inputs(case))
        assert 0.0 < result.mortality_risk < 1.0
        lincomb = -19.9067 + sum(t.term for t in result.terms)
        assert result.lincomb == pytest.approx(lincomb, rel=1e-6)
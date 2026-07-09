"""Tests for BROK-adjusted PhenoAge."""

import json
from pathlib import Path

import pytest

from brok_bioage.brok import compute_brok, creatinine_discount, hba1c_to_glucose_mg_dl
from brok_bioage.constants import CREATININE_DISCOUNT_CAP
from brok_bioage.models import (
    AgeMode,
    BrokBiomarkerInputs,
    ContextFlags,
    ModelConfig,
)

FIXTURES = Path(__file__).parent / "fixtures" / "brok_expected.json"
TOLERANCE = 0.15


def _load_cases() -> list[dict]:
    return json.loads(FIXTURES.read_text())["cases"]


def _brok_inputs(raw: dict) -> BrokBiomarkerInputs:
    return BrokBiomarkerInputs(**raw)


def _context(raw: dict) -> ContextFlags:
    return ContextFlags(**raw) if raw else ContextFlags()


def _config(raw: dict) -> ModelConfig:
    mode = AgeMode(raw.get("age_mode", "scaled"))
    return ModelConfig(
        age_mode=mode,
        age_alpha=raw.get("age_alpha", 0.95),
        age_beta=raw.get("age_beta", 0.5),
        age_override=raw.get("age_override"),
        prior_brok_pheno_age=raw.get("prior_brok_pheno_age"),
        use_hba1c_over_glucose=raw.get("use_hba1c_over_glucose", True),
    )


@pytest.mark.parametrize("case", [c for c in _load_cases() if "inputs" in c], ids=lambda c: c["id"])
def test_brok_golden_cases(case: dict):
    result = compute_brok(
        _brok_inputs(case["inputs"]),
        _context(case.get("context", {})),
        _config(case.get("config", {})),
    )
    expected = case["expected"]

    if "standard_pheno_age" in expected:
        assert abs(result.standard_pheno_age - expected["standard_pheno_age"]) <= TOLERANCE
    if "brok_pheno_age" in expected:
        assert abs(result.brok_pheno_age - expected["brok_pheno_age"]) <= TOLERANCE
    if "creatinine_discount" in expected:
        assert result.creatinine_discount == pytest.approx(expected["creatinine_discount"], abs=0.01)
    if "delta_brok_vs_standard" in expected:
        assert result.delta_brok_vs_standard == pytest.approx(
            expected["delta_brok_vs_standard"], abs=TOLERANCE
        )
    if "glucose_source" in expected:
        assert expected["glucose_source"] in result.glucose_source


def test_creatinine_discount_capped_for_creatine_and_t():
    discount, reasons = creatinine_discount(
        ContextFlags(creatine_supplementation=True, testosterone_ng_dl=1239)
    )
    assert discount == CREATININE_DISCOUNT_CAP
    assert len(reasons) == 2


def test_creatinine_discount_kidney_guardrail():
    discount, _ = creatinine_discount(
        ContextFlags(
            creatine_supplementation=True,
            testosterone_ng_dl=1500,
            egfr=45,
        )
    )
    assert discount <= 0.20


def test_hba1c_eag_formula():
    assert hba1c_to_glucose_mg_dl(5.0) == pytest.approx(96.8, abs=0.1)


def test_adjustments_audit_populated():
    result = compute_brok(
        _brok_inputs(_load_cases()[0]["inputs"]),
        _context(_load_cases()[0]["context"]),
        _config(_load_cases()[0]["config"]),
    )
    assert len(result.adjustments) >= 2
    fields = {a.field for a in result.adjustments}
    assert "age" in fields
    assert "creatinine" in fields
"""
API contract tests: POST /api/v1/calculate vs brok_expected.json golden fixtures.

Validates HTTP response shape and numeric parity with the domain-layer golden file.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app

FIXTURES = Path(__file__).parent / "fixtures" / "brok_expected.json"
client = TestClient(app)

REQUIRED_TOP_LEVEL_KEYS = {
    "standard",
    "brok",
    "delta_brok_vs_standard",
    "adjustments",
    "sensitivity",
    "pace",
    "pace_history",
    "interpretation",
    "disclaimers",
    "model_version",
}

REQUIRED_PHENO_KEYS = {"lincomb", "mortality_risk", "pheno_age", "delta_vs_chronological"}


def _load_fixture() -> dict:
    return json.loads(FIXTURES.read_text())


def _tolerance() -> float:
    return _load_fixture().get("tolerance_years", 0.15)


def _calc_cases() -> list[dict]:
    return [c for c in _load_fixture()["cases"] if "inputs" in c]


def _build_payload(case: dict) -> dict:
    return {
        "biomarkers": case["inputs"],
        "context": case.get("context", {}),
        "config": case.get("config", {}),
    }


def _assert_response_contract(body: dict) -> None:
    assert REQUIRED_TOP_LEVEL_KEYS <= body.keys()
    assert REQUIRED_PHENO_KEYS <= body["standard"].keys()
    assert REQUIRED_PHENO_KEYS <= body["brok"].keys()
    assert isinstance(body["adjustments"], list)
    assert isinstance(body["sensitivity"], list)
    assert isinstance(body["disclaimers"], list)
    assert body["model_version"] == "brok-phenoage-0.1.0"


def _creatinine_discount_from_adjustments(adjustments: list[dict]) -> float | None:
    for adj in adjustments:
        if adj["field"] == "creatinine":
            match = re.search(r"discount (\d+)%", adj["reason"])
            if match:
                return int(match.group(1)) / 100.0
    return 0.0 if not any(a["field"] == "creatinine" for a in adjustments) else None


def _glucose_source_from_adjustments(adjustments: list[dict]) -> str | None:
    for adj in adjustments:
        if adj["field"] == "glucose":
            prefix = "glucose term from "
            if adj["reason"].startswith(prefix):
                return adj["reason"][len(prefix) :]
    return None


@pytest.mark.parametrize("case", _calc_cases(), ids=lambda c: c["id"])
def test_calculate_contract_matches_brok_expected(case: dict):
    res = client.post("/api/v1/calculate", json=_build_payload(case))
    assert res.status_code == 200
    body = res.json()
    _assert_response_contract(body)

    tol = _tolerance()
    expected = case["expected"]

    if "standard_pheno_age" in expected:
        assert body["standard"]["pheno_age"] == pytest.approx(
            expected["standard_pheno_age"], abs=tol
        )
    if "brok_pheno_age" in expected:
        assert body["brok"]["pheno_age"] == pytest.approx(
            expected["brok_pheno_age"], abs=tol
        )
    if "delta_brok_vs_standard" in expected:
        assert body["delta_brok_vs_standard"] == pytest.approx(
            expected["delta_brok_vs_standard"], abs=tol
        )
    if "creatinine_discount" in expected:
        discount = _creatinine_discount_from_adjustments(body["adjustments"])
        assert discount == pytest.approx(expected["creatinine_discount"], abs=0.01)
    if "glucose_source" in expected:
        source = _glucose_source_from_adjustments(body["adjustments"])
        assert source is not None
        assert expected["glucose_source"] in source


def test_pace_contract_matches_brok_expected():
    cases = _load_fixture()["cases"]
    case = next(c for c in cases if c["id"] == "pace_20251124_to_20260630")
    tol = _tolerance()

    prior = case["prior"]
    current = case["current"]
    exp = case["expected"]
    payload = {
        "biomarkers": {
            **current["inputs"],
            "test_date": current["test_date"],
        },
        "context": current.get("context", {}),
        "config": case.get("config", {}),
        "prior_tests": [
            {
                "test_date": prior["test_date"],
                "chronological_age": prior["chronological_age"],
                "pheno_age_standard": 52.28,
                "pheno_age_brok": exp["prior_brok_pheno_age"],
            }
        ],
    }

    res = client.post("/api/v1/calculate", json=payload)
    assert res.status_code == 200
    body = res.json()
    _assert_response_contract(body)

    assert body["pace"] is not None
    pace = body["pace"]

    assert body["brok"]["pheno_age"] == pytest.approx(
        exp["current_brok_pheno_age"], abs=tol
    )
    assert pace["chrono_elapsed_years"] == pytest.approx(
        exp["chrono_elapsed_years"], abs=0.05
    )
    assert pace["pheno_elapsed_standard"] == pytest.approx(
        exp["pheno_elapsed_standard"], abs=0.1
    )
    assert pace["pheno_elapsed_brok"] == pytest.approx(
        exp["pheno_elapsed_brok"], abs=0.1
    )
    assert pace["pace_ratio_standard"] == pytest.approx(
        exp["pace_ratio_standard"], abs=0.1
    )
    assert pace["pace_ratio_brok"] == pytest.approx(
        exp["pace_ratio_brok"], abs=0.1
    )
    assert pace["deceleration_years_standard"] == pytest.approx(
        exp["deceleration_years_standard"], abs=0.1
    )
    assert pace["deceleration_years_brok"] == pytest.approx(
        exp["deceleration_years_brok"], abs=0.1
    )
    assert len(body["pace_history"]) == 1


def test_health_contract():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "model_version" in body
    assert body["levine_verified"] is True
    assert body["metrics_enabled"] is False
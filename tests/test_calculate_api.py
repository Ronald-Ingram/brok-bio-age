"""Integration tests for POST /api/v1/calculate."""

from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

BASE_PAYLOAD = {
    "biomarkers": {
        "albumin_g_dl": 4.4,
        "creatinine_mg_dl": 0.93,
        "glucose_mg_dl": 95.0,
        "crp_mg_l": 1.55,
        "lymphocyte_pct": 28.0,
        "mcv_fl": 94.0,
        "rdw_pct": 12.8,
        "alp_u_l": 160.0,
        "wbc_10e3": 5.5,
        "chronological_age": 57.0,
    },
    "context": {
        "creatine_supplementation": True,
        "testosterone_ng_dl": 1239,
    },
    "config": {
        "age_mode": "scaled",
        "age_alpha": 0.95,
    },
}


def test_calculate_20260630_default():
    res = client.post("/api/v1/calculate", json=BASE_PAYLOAD)
    assert res.status_code == 200
    body = res.json()

    assert body["standard"]["pheno_age"] == pytest.approx(53.57, abs=0.15)
    assert body["brok"]["pheno_age"] == pytest.approx(46.81, abs=0.15)
    assert body["delta_brok_vs_standard"] == pytest.approx(-6.76, abs=0.2)
    assert len(body["adjustments"]) >= 2
    assert len(body["sensitivity"]) >= 4
    creat = next(s for s in body["sensitivity"] if s["biomarker"] == "creatinine")
    assert creat["delta_pheno_years_standard"] == pytest.approx(1.83, abs=0.15)
    assert body["disclaimers"]
    assert "BROK PhenoAge" in body["interpretation"] or "Creatinine" in body["interpretation"]


def test_calculate_standard_mode_matches_levine():
    payload = {
        **BASE_PAYLOAD,
        "context": {},
        "config": {"age_mode": "standard"},
    }
    res = client.post("/api/v1/calculate", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["standard"]["pheno_age"] == body["brok"]["pheno_age"]
    assert body["delta_brok_vs_standard"] == 0.0


def test_calculate_with_pace():
    payload = {
        **BASE_PAYLOAD,
        "biomarkers": {
            **BASE_PAYLOAD["biomarkers"],
            "test_date": "2026-06-30",
        },
        "prior_tests": [
            {
                "test_date": "2025-11-24",
                "chronological_age": 57.0,
                "pheno_age_standard": 52.28,
                "pheno_age_brok": 45.98,
            }
        ],
    }
    res = client.post("/api/v1/calculate", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["pace"] is not None
    assert body["pace"]["chrono_elapsed_years"] == pytest.approx(0.6, abs=0.05)
    assert body["pace"]["pace_ratio_standard"] == pytest.approx(2.15, abs=0.15)


def test_calculate_validation_missing_glucose():
    payload = {
        "biomarkers": {
            **{k: v for k, v in BASE_PAYLOAD["biomarkers"].items() if k != "glucose_mg_dl"},
        },
    }
    res = client.post("/api/v1/calculate", json=payload)
    assert res.status_code == 422


def test_calculate_hba1c_only():
    payload = {
        "biomarkers": {
            **{k: v for k, v in BASE_PAYLOAD["biomarkers"].items() if k != "glucose_mg_dl"},
            "hba1c_pct": 5.0,
        },
        "context": BASE_PAYLOAD["context"],
        "config": BASE_PAYLOAD["config"],
    }
    res = client.post("/api/v1/calculate", json=payload)
    assert res.status_code == 200
    assert res.json()["brok"]["pheno_age"] == pytest.approx(47.02, abs=0.15)
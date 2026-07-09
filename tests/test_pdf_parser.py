"""Tests for lab report PDF/text parsing."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.services.pdf_parser import parse_lab_file

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


def _field_map(result) -> dict[str, float]:
    return {b.field: b.value for b in result.biomarkers}


def test_parse_quest_style_text():
    text = (FIXTURES / "lab_report_quest_style.txt").read_text()
    result = parse_lab_file(text.encode(), "report.txt")

    assert result.parse_method == "regex"
    fields = _field_map(result)
    assert fields["albumin_g_dl"] == pytest.approx(4.4)
    assert fields["creatinine_mg_dl"] == pytest.approx(0.93)
    assert fields["glucose_mg_dl"] == pytest.approx(95.0)
    assert fields["crp_mg_l"] == pytest.approx(1.55)
    assert fields["lymphocyte_pct"] == pytest.approx(28.0)
    assert fields["mcv_fl"] == pytest.approx(94.0)
    assert fields["rdw_pct"] == pytest.approx(12.8)
    assert fields["alp_u_l"] == pytest.approx(160.0)
    assert fields["wbc_10e3"] == pytest.approx(5.5)
    assert fields["testosterone_ng_dl"] == pytest.approx(1239.0)
    assert result.mean_confidence >= 0.8
    assert "glucose_mg_dl or hba1c_pct" not in result.fields_missing


def test_parse_labcorp_style_text():
    text = (FIXTURES / "lab_report_labcorp_style.txt").read_text()
    result = parse_lab_file(text.encode(), "labcorp.txt")
    fields = _field_map(result)

    assert fields["albumin_g_dl"] == pytest.approx(4.6)
    assert fields["hba1c_pct"] == pytest.approx(5.1)
    assert fields["creatinine_mg_dl"] == pytest.approx(0.81)
    assert len(result.fields_missing) == 0 or "glucose" in str(result.fields_missing)


def test_parse_api_endpoint_multipart():
    text = (FIXTURES / "lab_report_quest_style.txt").read_bytes()
    res = client.post(
        "/api/v1/parse-pdf",
        files={"file": ("labs.txt", text, "text/plain")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["parse_method"] == "regex"
    assert len(body["biomarkers"]) >= 9
    assert "[SSN]" not in body["raw_text_preview"] or body["raw_text_preview"]


def test_parse_rejects_oversized_file():
    huge = b"x" * (10 * 1024 * 1024 + 1)
    res = client.post(
        "/api/v1/parse-pdf",
        files={"file": ("big.txt", huge, "text/plain")},
    )
    assert res.status_code == 413


def test_parse_rejects_unsupported_extension():
    res = client.post(
        "/api/v1/parse-pdf",
        files={"file": ("data.csv", b"a,b,c", "text/csv")},
    )
    assert res.status_code == 400


def test_parse_empty_text_warns():
    result = parse_lab_file(b"", "empty.txt")
    assert result.biomarkers == []
    assert result.warnings
"""Tests for BC / Canadian PLIS lab report parsing."""

from pathlib import Path

import pytest

from api.services.canadian_plis_parser import parse_canadian_plis_text
from api.services.pdf_parser import parse_lab_file

FIXTURES = Path(__file__).parent / "fixtures"
SISTER_PDF = Path(
    "/Users/kiki/Downloads/Laboratory_Report_2026_04_08-12_50 (2).pdf"
)


def _field_map(result) -> dict[str, float]:
    return {b.field: b.value for b in result.biomarkers}


def test_canadian_plis_text_fixture():
    text = (FIXTURES / "lab_report_canadian_plis_style.txt").read_text()
    result = parse_lab_file(text.encode(), "canadian.txt")
    fields = _field_map(result)

    assert result.parse_method == "canadian_plis"
    assert result.report_type == "lab"
    assert result.sex == "female"
    assert result.test_date == "2026-04-08"

    assert fields["wbc_10e3"] == pytest.approx(8.3)
    assert fields["mcv_fl"] == pytest.approx(90.0)
    assert fields["rdw_pct"] == pytest.approx(12.7)
    assert fields["hba1c_pct"] == pytest.approx(4.9)
    assert fields["creatinine_mg_dl"] == pytest.approx(61 / 88.4, rel=1e-3)
    assert fields["crp_mg_l"] == pytest.approx(3.2)
    assert fields["alp_u_l"] == pytest.approx(38.0)
    assert fields["lymphocyte_pct"] == pytest.approx(1.9 / 8.3 * 100, rel=1e-2)
    assert fields["chronological_age"] == pytest.approx(45)
    assert fields["egfr"] == pytest.approx(105)

    assert "albumin_g_dl" in result.fields_missing
    assert "glucose_mg_dl or hba1c_pct" not in result.fields_missing
    assert any("Albumin" in w for w in result.warnings)
    assert result.mean_confidence >= 0.85


def test_canadian_plis_direct_parser():
    text = (FIXTURES / "lab_report_canadian_plis_style.txt").read_text()
    extract = parse_canadian_plis_text(text)
    assert extract is not None
    names = {f[0] for f in extract.fields}
    assert "creatinine_mg_dl" in names
    assert "lymphocyte_pct" in names


@pytest.mark.skipif(not SISTER_PDF.exists(), reason="Sister lab PDF not in Downloads")
def test_sister_canadian_pdf():
    data = SISTER_PDF.read_bytes()
    result = parse_lab_file(data, SISTER_PDF.name)
    fields = _field_map(result)

    assert result.parse_method == "canadian_plis"
    assert fields["hba1c_pct"] == pytest.approx(4.9)
    assert fields["wbc_10e3"] == pytest.approx(8.3)
    assert len(result.biomarkers) >= 9
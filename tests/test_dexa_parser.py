"""Tests for DEXA PDF parsing (DexaFit format)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.services.dexa_parser import parse_dexa_text
from api.services.pdf_parser import parse_lab_file

DEXA_PDF = Path("/Users/kiki/Downloads/RIngramDXA2_Dex.pdf")

client = TestClient(app)


@pytest.mark.skipif(not DEXA_PDF.exists(), reason="User DEXA PDF not in Downloads")
def test_ringram_dexa_pdf_extracts_body_composition():
    data = DEXA_PDF.read_bytes()
    result = parse_lab_file(data, DEXA_PDF.name)

    assert result.report_type == "dexa"
    assert result.sex == "male"
    assert result.test_date == "2026-05-08"
    fields = {b.field: b.value for b in result.biomarkers}

    assert fields["chronological_age"] == pytest.approx(58.2, abs=0.1)
    assert fields["body_fat_pct"] == pytest.approx(22.0, abs=0.1)
    assert fields["dexa_lean_mass_kg"] == pytest.approx(61.46, abs=0.2)
    assert fields["dexa_fat_mass_kg"] == pytest.approx(18.05, abs=0.2)
    assert fields["dexa_bone_t_score"] == pytest.approx(-0.4, abs=0.05)
    assert fields["prior_lean_mass_kg"] == pytest.approx(58.87, abs=0.2)
    assert "albumin_g_dl" in result.fields_missing or "glucose" in str(
        result.fields_missing
    )


def test_dexa_text_fixture():
    sample = """
    Gender: Male
    Age: 58.2 Height: 70.0 in.
    Measure Date: 05/08/2026
    05/08/2026 22.0% 181.0 lbs 39.8 lbs 135.5 lbs 5.8 lbs 1.27 lbs
    01/08/2026 23.2% 176.3 lbs 41.0 lbs 129.8 lbs 5.5 lbs 1.25 lbs
    Total Body Bone Density
    Total 1.158 -0.4 -0.4
    """
    extract = parse_dexa_text(sample)
    assert extract is not None
    assert extract.sex == "male"
    assert extract.lean_mass_lbs == pytest.approx(135.5)
    assert extract.bone_t_score == pytest.approx(-0.4)
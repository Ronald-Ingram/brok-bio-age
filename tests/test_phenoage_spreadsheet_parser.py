"""Tests for Levine PhenoAge multi-tab spreadsheet PDF parsing."""

from pathlib import Path

import pytest

from api.services.pdf_parser import parse_lab_file
from api.services.phenoage_spreadsheet_parser import parse_phenoage_spreadsheet_text

FIXTURE = Path(__file__).parent / "fixtures" / "phenoage_spreadsheet_snippet.txt"
USER_PDF = Path(
    "/Users/kiki/Downloads/Biologogical Age Tests 3ba41-dnamphenoage_gen-4 2026075.pdf"
)


def test_phenoage_spreadsheet_snippet():
    text = FIXTURE.read_text()
    snaps = parse_phenoage_spreadsheet_text(text)
    assert len(snaps) >= 2
    dates = [s.test_date.isoformat() for s in snaps]
    assert "2025-10-15" in dates
    assert "2026-06-24" in dates
    latest = snaps[-1]
    assert latest.glucose_mg_dl == pytest.approx(95)
    assert latest.chronological_age == pytest.approx(58)


@pytest.mark.skipif(not USER_PDF.exists(), reason="PhenoAge PDF not in Downloads")
def test_ingram_phenoage_pdf_multi_year():
    data = USER_PDF.read_bytes()
    result = parse_lab_file(data, USER_PDF.name)

    assert result.parse_method == "phenoage_spreadsheet"
    assert result.snapshot_count == 10
    assert result.test_date == "2026-06-24"
    assert len(result.historical_snapshots) == 10
    dates = [s.test_date for s in result.historical_snapshots]
    assert dates[0] == "2023-08-01"
    assert dates[-1] == "2026-06-24"

    latest = {b.field: b.value for b in result.biomarkers}
    assert latest["albumin_g_dl"] == pytest.approx(4.4)
    assert latest["glucose_mg_dl"] == pytest.approx(95)
    assert latest["chronological_age"] == pytest.approx(58)
    assert latest["testosterone_ng_dl"] == pytest.approx(1239)
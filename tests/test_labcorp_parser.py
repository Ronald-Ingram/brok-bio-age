"""Tests for LabCorp Enterprise Report parsing."""

from pathlib import Path

import pytest

from api.services.labcorp_parser import parse_labcorp_text
from api.services.pdf_parser import parse_lab_file

LABCORP_PDF = Path("/Users/kiki/Downloads/lab_report_4031897429.pdf")
LABCORP_ICLOUD = Path(
    "/Users/kiki/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260624_Ingram_labcorp_bloodwork.pdf"
)


def _resolve_labcorp_pdf() -> Path | None:
    if LABCORP_ICLOUD.exists():
        return LABCORP_ICLOUD
    if LABCORP_PDF.exists():
        return LABCORP_PDF
    return None


@pytest.mark.skipif(_resolve_labcorp_pdf() is None, reason="LabCorp PDF not found")
def test_ingram_labcorp_bloodwork_pdf():
    path = _resolve_labcorp_pdf()
    data = path.read_bytes()
    result = parse_lab_file(data, path.name)

    assert result.report_type == "lab"
    assert result.parse_method == "labcorp"
    assert result.sex == "male"
    assert result.test_date == "2026-06-18"
    fields = {b.field: b.value for b in result.biomarkers}

    assert fields["albumin_g_dl"] == pytest.approx(4.4)
    assert fields["creatinine_mg_dl"] == pytest.approx(0.93)
    assert fields["glucose_mg_dl"] == pytest.approx(95)
    assert fields["crp_mg_l"] == pytest.approx(1.55)
    assert fields["lymphocyte_pct"] == pytest.approx(28)
    assert fields["mcv_fl"] == pytest.approx(94)
    assert fields["rdw_pct"] == pytest.approx(12.8)
    assert fields["alp_u_l"] == pytest.approx(160)
    assert fields["wbc_10e3"] == pytest.approx(5.5)
    assert fields["hba1c_pct"] == pytest.approx(4.5)
    assert fields["testosterone_ng_dl"] == pytest.approx(1239)
    assert fields["chronological_age"] == pytest.approx(58)
    assert fields["egfr"] == pytest.approx(95)
    assert result.mean_confidence >= 0.9


def test_labcorp_text_snippet():
    sample = """
    Laboratory Corporation of America
    Date Collected: 06/18/2026
    Sex: Male
    Age: 58
    Albumin 01 4.4 4.6 12/30/2025 g/dL 3.8-4.9
    Creatinine 01 0.93 0.81 12/30/2025 mg/dL 0.76-1.27
    Glucose 01 95 91 12/30/2025 mg/dL 70-99
    WBC 01 5.5 5.7 12/30/2025 x10E3/uL 3.4-10.8
    Lymphs 01 28 24 12/30/2025 % Not Estab.
    MCV 01 94 97 12/30/2025 fL 79-97
    RDW 01 12.8 13.0 12/30/2025 % 11.6-15.4
    Alkaline Phosphatase 01 160 High 123 12/30/2025 IU/L 47-123
    Hemoglobin A1c 01 4.5 Low 4.3 12/30/2025 % 4.8-5.6
    C-Reactive Protein, Cardiac 01 1.55 1.78 12/30/2025 mg/L 0.00-3.00
    Testosterone 01 1239 High >1500 12/30/2025 ng/dL 264-916
    eGFR 95 103 12/30/2025 mL/min/1.73 >59
    """
    extract = parse_labcorp_text(sample)
    assert extract is not None
    fields = {f[0]: f[1] for f in extract.fields}
    assert fields["wbc_10e3"] == pytest.approx(5.5)
    assert fields["albumin_g_dl"] == pytest.approx(4.4)
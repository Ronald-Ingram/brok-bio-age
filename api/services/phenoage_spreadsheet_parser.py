"""Levine PhenoAge spreadsheet PDF export (multi-page historical tabs)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

MARKER = "spreadsheet to calculate Mortality Score and Phenotypic Age"

INPUT_RE = re.compile(
    r"Input\s+"
    r"([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+"
    r"([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)",
    re.IGNORECASE,
)

TESTOSTERONE_RE = re.compile(
    r"Testosterone:\s*([\d.]+)\+?",
    re.IGNORECASE,
)

PHENO_AGE_RE = re.compile(
    r"Results\s+[-\d.]+\s+[\d.]+\s+([\d.]+)",
    re.IGNORECASE,
)

SECTION_HEADER_RE = re.compile(
    r"(?m)^(?:"
    r"(\d{8})\(RI\)"  # 20260624(RI)
    r"|"
    r"(\d{1,2})\.(\d{4})\(RI\)"  # 10.2023(RI)
    r")",
)


@dataclass
class PhenoAgeSnapshot:
    test_date: date
    albumin_g_dl: float
    creatinine_mg_dl: float
    glucose_mg_dl: float
    crp_mg_l: float
    lymphocyte_pct: float
    mcv_fl: float
    rdw_pct: float
    alp_u_l: float
    wbc_10e3: float
    chronological_age: float
    testosterone_ng_dl: float | None = None
    pheno_age_standard: float | None = None
    source_header: str = ""


def is_phenoage_spreadsheet_report(text: str) -> bool:
    return MARKER.lower() in text.lower()


def _parse_section_date(header: str) -> date | None:
    header = header.strip()
    m8 = re.match(r"^(\d{8})\(RI\)", header)
    if m8:
        raw = m8.group(1)
        try:
            return date(int(raw[0:4]), int(raw[4:6]), int(raw[6:8]))
        except ValueError:
            return None

    m_my = re.match(r"^(\d{1,2})\.(\d{4})\(RI\)", header)
    if m_my:
        month, year = int(m_my.group(1)), int(m_my.group(2))
        try:
            return date(year, month, 1)
        except ValueError:
            return None
    return None


def _split_sections(text: str) -> list[tuple[str, str]]:
    """Return (header_line, section_body) for each dated tab."""
    normalized = text.replace("\r\n", "\n")
    matches = list(SECTION_HEADER_RE.finditer(normalized))
    if not matches:
        return []

    sections: list[tuple[str, str]] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(normalized)
        header_line = normalized[start : normalized.find("\n", start)]
        body = normalized[start:end]
        sections.append((header_line.strip(), body))
    return sections


def parse_phenoage_spreadsheet_text(text: str) -> list[PhenoAgeSnapshot]:
    if not is_phenoage_spreadsheet_report(text):
        return []

    snapshots: list[PhenoAgeSnapshot] = []
    seen_dates: set[str] = set()

    for header, body in _split_sections(text):
        header_base = re.sub(r"\s+\(\d+\)\s*$", "", header.strip())
        test_date = _parse_section_date(header_base)
        if test_date is None:
            continue

        input_match = INPUT_RE.search(body)
        if not input_match:
            continue

        iso = test_date.isoformat()
        if iso in seen_dates:
            continue
        seen_dates.add(iso)

        vals = [float(input_match.group(i)) for i in range(1, 11)]
        t_match = TESTOSTERONE_RE.search(body)
        testosterone = float(t_match.group(1)) if t_match else None
        p_match = PHENO_AGE_RE.search(body)
        pheno_age = float(p_match.group(1)) if p_match else None

        snapshots.append(
            PhenoAgeSnapshot(
                test_date=test_date,
                albumin_g_dl=vals[0],
                creatinine_mg_dl=vals[1],
                glucose_mg_dl=vals[2],
                crp_mg_l=vals[3],
                lymphocyte_pct=vals[4],
                mcv_fl=vals[5],
                rdw_pct=vals[6],
                alp_u_l=vals[7],
                wbc_10e3=vals[8],
                chronological_age=vals[9],
                testosterone_ng_dl=testosterone,
                pheno_age_standard=pheno_age,
                source_header=header_base,
            )
        )

    snapshots.sort(key=lambda s: s.test_date)
    return snapshots


def snapshots_to_api_fields(
    snapshots: list[PhenoAgeSnapshot],
) -> list[dict]:
    """Serialize snapshots for ParsePdfResponse.historical_snapshots."""
    out: list[dict] = []
    units = {
        "albumin_g_dl": "g/dL",
        "creatinine_mg_dl": "mg/dL",
        "glucose_mg_dl": "mg/dL",
        "crp_mg_l": "mg/L",
        "lymphocyte_pct": "%",
        "mcv_fl": "fL",
        "rdw_pct": "%",
        "alp_u_l": "U/L",
        "wbc_10e3": "10^3/uL",
        "chronological_age": "years",
        "testosterone_ng_dl": "ng/dL",
    }
    for snap in snapshots:
        biomarkers = [
            {"field": "albumin_g_dl", "value": snap.albumin_g_dl, "unit": units["albumin_g_dl"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "creatinine_mg_dl", "value": snap.creatinine_mg_dl, "unit": units["creatinine_mg_dl"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "glucose_mg_dl", "value": snap.glucose_mg_dl, "unit": units["glucose_mg_dl"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "crp_mg_l", "value": snap.crp_mg_l, "unit": units["crp_mg_l"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "lymphocyte_pct", "value": snap.lymphocyte_pct, "unit": units["lymphocyte_pct"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "mcv_fl", "value": snap.mcv_fl, "unit": units["mcv_fl"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "rdw_pct", "value": snap.rdw_pct, "unit": units["rdw_pct"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "alp_u_l", "value": snap.alp_u_l, "unit": units["alp_u_l"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
            {"field": "wbc_10e3", "value": snap.wbc_10e3, "unit": units["wbc_10e3"], "confidence": 0.98, "source_line": f"Input row {snap.source_header}"},
        ]
        if snap.testosterone_ng_dl is not None:
            biomarkers.append({
                "field": "testosterone_ng_dl",
                "value": snap.testosterone_ng_dl,
                "unit": units["testosterone_ng_dl"],
                "confidence": 0.95,
                "source_line": f"Testosterone {snap.source_header}",
            })
        out.append({
            "test_date": snap.test_date.isoformat(),
            "chronological_age": snap.chronological_age,
            "biomarkers": biomarkers,
            "pheno_age_standard": snap.pheno_age_standard,
            "source_header": snap.source_header,
        })
    return out
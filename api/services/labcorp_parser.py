"""LabCorp Enterprise Report PDF/text extraction."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

# (field, unit, confidence, patterns) — patterns capture CURRENT result after lab code 01/02
LABCORP_FIELD_PATTERNS: list[tuple[str, str, float, list[str]]] = [
    (
        "albumin_g_dl",
        "g/dL",
        0.96,
        [r"(?i)Albumin\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "creatinine_mg_dl",
        "mg/dL",
        0.96,
        [r"(?i)Creatinine\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "glucose_mg_dl",
        "mg/dL",
        0.94,
        [
            r"(?i)Glucose\s+\d{2}\s+([\d.]+)\s+(?:High|Low\s+)?[\d.<>]+",
            r"(?i)Glucose\s+\d{2}\s+([\d.]+)\s+\d{2}/\d{2}/\d{4}\s+mg/dL",
        ],
    ),
    (
        "hba1c_pct",
        "%",
        0.95,
        [r"(?i)Hemoglobin A1c\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "crp_mg_l",
        "mg/L",
        0.95,
        [r"(?i)C-Reactive Protein, Cardiac\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "lymphocyte_pct",
        "%",
        0.93,
        [r"(?i)Lymphs\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "mcv_fl",
        "fL",
        0.95,
        [r"(?i)MCV\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "rdw_pct",
        "%",
        0.95,
        [r"(?i)RDW\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "alp_u_l",
        "U/L",
        0.94,
        [r"(?i)Alkaline Phosphatase\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "wbc_10e3",
        "10^3/uL",
        0.94,
        [r"(?i)WBC\s+\d{2}\s+([\d.]+)\s+[\d.]+"],
    ),
    (
        "testosterone_ng_dl",
        "ng/dL",
        0.93,
        [r"(?i)Testosterone\s+\d{2}\s+([\d.]+)"],
    ),
    (
        "egfr",
        "mL/min/1.73",
        0.90,
        [r"(?i)eGFR\s+([\d.]+)\s+[\d.]+"],
    ),
]


@dataclass
class LabCorpExtract:
    sex: str | None
    chronological_age: float | None
    test_date: date | None
    fields: list[tuple[str, float, str, float, str]]  # field, value, unit, conf, source_line
    warnings: list[str]


def is_labcorp_report(text: str) -> bool:
    lower = text.lower()
    return (
        "laboratory corporation of america" in lower
        or "labcorp" in lower
        or "enterprise report version" in lower
    )


def _parse_us_date_slash(raw: str) -> date | None:
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", raw.strip())
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _line_for_match(text: str, match: re.Match[str]) -> str:
    start = text.rfind("\n", 0, match.start()) + 1
    end = text.find("\n", match.end())
    if end == -1:
        end = len(text)
    return text[start:end].strip()[:120]


def parse_labcorp_text(text: str) -> LabCorpExtract | None:
    if not is_labcorp_report(text):
        return None

    normalized = text.replace("\r\n", "\n")
    warnings: list[str] = []
    fields: list[tuple[str, float, str, float, str]] = []

    sex_match = re.search(r"(?i)\bSex:\s*(Male|Female)", normalized)
    sex = sex_match.group(1).lower() if sex_match else None

    age_match = re.search(r"(?i)\bAge:\s*(\d{1,3})\b", normalized)
    chronological_age = float(age_match.group(1)) if age_match else None

    collected = re.search(
        r"(?i)Date Collected:\s*(\d{2}/\d{2}/\d{4})",
        normalized,
    )
    test_date = _parse_us_date_slash(collected.group(1)) if collected else None

    for field, unit, confidence, patterns in LABCORP_FIELD_PATTERNS:
        for pattern in patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            try:
                value = float(match.group(1))
            except ValueError:
                continue
            fields.append(
                (
                    field,
                    value,
                    unit,
                    confidence,
                    _line_for_match(normalized, match),
                )
            )
            break

    if not fields:
        return None

    if sex is None:
        warnings.append("Could not detect sex from LabCorp header")

    return LabCorpExtract(
        sex=sex,
        chronological_age=chronological_age,
        test_date=test_date,
        fields=fields,
        warnings=warnings,
    )
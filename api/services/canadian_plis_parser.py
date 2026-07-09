"""BC / Canadian PLIS (Provincial Laboratory Information System) lab reports."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from brok_bioage.constants import CREATININE_MG_DL_TO_UMOL_L

# Canadian SI → US conventional (PhenoAge form units)
_GLUCOSE_MMOL_TO_MG_DL = 18.0182
_ALBUMIN_G_L_TO_G_DL = 0.1

# (field, output_unit, confidence, patterns) — patterns capture result after HH:MM timestamp
PLIS_FIELD_PATTERNS: list[tuple[str, str, float, list[str]]] = [
    (
        "wbc_10e3",
        "10^9/L",
        0.94,
        [r"(?i)\bWBC\s+[\d.<>-]+\s+10\*9/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"],
    ),
    (
        "mcv_fl",
        "fL",
        0.95,
        [r"(?i)\bMCV\s+[\d.<>-]+\s+fL\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"],
    ),
    (
        "rdw_pct",
        "%",
        0.95,
        [r"(?i)\bRDW\s+[<>\d.\-]+\s+%\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"],
    ),
    (
        "hba1c_pct",
        "%",
        0.95,
        [
            r"(?i)Hemoglobin A1C[^\n]*\s+[\d.<>-]+\s+%\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
    (
        "creatinine_umol_l",
        "umol/L",
        0.94,
        [
            r"(?i)\bCreatinine\s+[\d.<>-]+\s+umol/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
    (
        "crp_mg_l",
        "mg/L",
        0.93,
        [
            r"(?i)C Reactive Protein[^\n]*\n[<>\d.\-]+\s+mg/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)",
            r"(?i)C-Reactive Protein[^\n]*\n[<>\d.\-]+\s+mg/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)",
        ],
    ),
    (
        "alp_u_l",
        "U/L",
        0.93,
        [
            r"(?i)Alkaline Phosphatase\s+[\d.<>-]+\s+U/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
    (
        "lymphocytes_abs",
        "10^9/L",
        0.90,
        [
            r"(?i)\bLymphocytes\s+[\d.<>-]+\s+10\*9/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
    (
        "albumin_g_l",
        "g/L",
        0.92,
        [
            r"(?i)\bAlbumin\s+[\d.<>-]+\s+g/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
    (
        "glucose_mmol_l",
        "mmol/L",
        0.90,
        [
            r"(?i)\bGlucose\s+[\d.<>-]+\s+mmol/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)",
            r"(?i)\bRandom Glucose\s+[\d.<>-]+\s+mmol/L\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)",
        ],
    ),
    (
        "egfr",
        "mL/min/1.73",
        0.88,
        [
            r"(?i)Glomerular Filtration Rate[^\n]*\n[<>]?\d+\s+mL/min\s+\d{2}/\w{3}/\d{4}\s+\d{2}:\d{2}([\d.]+)"
        ],
    ),
]


@dataclass
class CanadianPlisExtract:
    sex: str | None
    chronological_age: float | None
    test_date: date | None
    fields: list[tuple[str, float, str, float, str]]
    warnings: list[str]


def is_canadian_plis_report(text: str) -> bool:
    lower = text.lower()
    if "health gateway" in lower or "plis report" in lower:
        return True
    markers = (
        "collected:",
        "gender:",
        "10*9/l",
        "umol/l",
        "mmol/l",
        "phn:",
    )
    return sum(1 for m in markers if m in lower) >= 4


def _parse_plis_date(raw: str) -> date | None:
    raw = raw.strip()
    for fmt in ("%d/%b/%Y", "%d/%B/%Y"):
        try:
            from datetime import datetime

            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _line_for_match(text: str, match: re.Match[str]) -> str:
    start = text.rfind("\n", 0, match.start()) + 1
    end = text.find("\n", match.end())
    if end == -1:
        end = len(text)
    return text[start:end].strip()[:120]


def _to_us_fields(
    raw: dict[str, tuple[float, str, float, str]],
    warnings: list[str],
) -> list[tuple[str, float, str, float, str]]:
    """Map Canadian SI extractions to US form units."""
    out: list[tuple[str, float, str, float, str]] = []

    if "creatinine_umol_l" in raw:
        val, unit, conf, line = raw["creatinine_umol_l"]
        out.append(
            (
                "creatinine_mg_dl",
                val / CREATININE_MG_DL_TO_UMOL_L,
                "mg/dL",
                conf,
                f"{line} (converted from {val} umol/L)",
            )
        )

    if "albumin_g_l" in raw:
        val, unit, conf, line = raw["albumin_g_l"]
        out.append(
            (
                "albumin_g_dl",
                val * _ALBUMIN_G_L_TO_G_DL,
                "g/dL",
                conf,
                f"{line} (converted from {val} g/L)",
            )
        )

    if "glucose_mmol_l" in raw:
        val, unit, conf, line = raw["glucose_mmol_l"]
        out.append(
            (
                "glucose_mg_dl",
                val * _GLUCOSE_MMOL_TO_MG_DL,
                "mg/dL",
                conf,
                f"{line} (converted from {val} mmol/L)",
            )
        )

    passthrough = {
        "wbc_10e3": "wbc_10e3",
        "mcv_fl": "mcv_fl",
        "rdw_pct": "rdw_pct",
        "hba1c_pct": "hba1c_pct",
        "crp_mg_l": "crp_mg_l",
        "alp_u_l": "alp_u_l",
        "egfr": "egfr",
    }
    for src, dst in passthrough.items():
        if src in raw:
            val, unit, conf, line = raw[src]
            out.append((dst, val, unit, conf, line))

    wbc = raw.get("wbc_10e3")
    lymph = raw.get("lymphocytes_abs")
    if wbc and lymph:
        wbc_val = wbc[0]
        lymph_val = lymph[0]
        if wbc_val > 0:
            pct = lymph_val / wbc_val * 100.0
            out.append(
                (
                    "lymphocyte_pct",
                    round(pct, 2),
                    "%",
                    min(wbc[2], lymph[2]) * 0.95,
                    f"Lymphocytes {lymph_val} / WBC {wbc_val} × 100",
                )
            )
    elif lymph and not wbc:
        warnings.append(
            "Lymphocyte absolute count found but WBC missing — enter lymphocyte % manually"
        )

    return out


def parse_canadian_plis_text(text: str) -> CanadianPlisExtract | None:
    if not is_canadian_plis_report(text):
        return None

    normalized = text.replace("\r\n", "\n")
    warnings: list[str] = []
    raw: dict[str, tuple[float, str, float, str]] = {}

    gender_match = re.search(r"(?i)\bGender:\s*(Male|Female)", normalized)
    sex = gender_match.group(1).lower() if gender_match else None

    age_match = re.search(r"(?i)\bAge:\s*(\d{1,3})\s*y", normalized)
    chronological_age = float(age_match.group(1)) if age_match else None

    collected = re.search(
        r"(?i)\bCollected:\s*(\d{2}/\w{3}/\d{4})",
        normalized,
    )
    test_date = _parse_plis_date(collected.group(1)) if collected else None

    for field, unit, confidence, patterns in PLIS_FIELD_PATTERNS:
        for pattern in patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            raw_val = match.group(1).lstrip("< ").strip()
            try:
                value = float(raw_val)
            except ValueError:
                continue
            raw[field] = (
                value,
                unit,
                confidence,
                _line_for_match(normalized, match),
            )
            break

    fields = _to_us_fields(raw, warnings)

    if chronological_age is not None:
        fields.append(
            (
                "chronological_age",
                chronological_age,
                "years",
                0.96,
                f"Age: {chronological_age}",
            )
        )

    if not fields:
        return None

    if sex is None:
        warnings.append("Could not detect sex from Canadian lab header")

    if "albumin_g_dl" not in {f[0] for f in fields}:
        warnings.append(
            "Albumin not on this Canadian panel — enter manually or use population placeholder"
        )

    if "glucose_mg_dl" not in {f[0] for f in fields} and "hba1c_pct" not in {
        f[0] for f in fields
    }:
        warnings.append("No glucose or HbA1c found — add HbA1c or fasting glucose manually")

    return CanadianPlisExtract(
        sex=sex,
        chronological_age=chronological_age,
        test_date=test_date,
        fields=fields,
        warnings=warnings,
    )
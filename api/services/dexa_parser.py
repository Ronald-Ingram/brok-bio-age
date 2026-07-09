"""DexaFit / general DEXA body-composition report extraction."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

LBS_TO_KG = 0.45359237


@dataclass
class DexaExtract:
    sex: str | None  # male | female
    chronological_age: float | None
    test_date: date | None
    body_fat_pct: float | None
    lean_mass_lbs: float | None
    fat_mass_lbs: float | None
    bone_t_score: float | None
    prior_lean_mass_lbs: float | None
    prior_test_date: date | None
    warnings: list[str]


def _parse_us_date(raw: str) -> date | None:
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", raw.strip())
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _latest_composition_rows(text: str) -> list[tuple[date, float, float, float, float]]:
    """Parse summary rows: date, body fat %, total mass, fat lbs, lean lbs."""
    rows: list[tuple[date, float, float, float, float]] = []
    pattern = re.compile(
        r"(\d{2}/\d{2}/\d{4})\s+"
        r"([\d.]+)%\s+"
        r"([\d.]+)\s+lbs\s+"
        r"([\d.]+)\s+lbs\s+"
        r"([\d.]+)\s+lbs",
        re.MULTILINE,
    )
    for match in pattern.finditer(text):
        d = _parse_us_date(match.group(1))
        if d is None:
            continue
        rows.append(
            (
                d,
                float(match.group(2)),
                float(match.group(3)),
                float(match.group(4)),
                float(match.group(5)),
            )
        )
    rows.sort(key=lambda r: r[0], reverse=True)
    return rows


def _parse_bone_t_score(text: str) -> float | None:
    section = re.search(
        r"Total Body Bone Density(.*?)(?:Densitometry Trend|Body Composition History|DexaFit|$)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if not section:
        return None
    match = re.search(
        r"Total\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)",
        section.group(1),
        re.IGNORECASE,
    )
    if match:
        return float(match.group(1))
    return None


def parse_dexa_text(text: str) -> DexaExtract | None:
    """Return DexaExtract if text looks like a DEXA report, else None."""
    normalized = text.replace("\r\n", "\n")
    lower = normalized.lower()

    has_gender = bool(re.search(r"(?i)gender:\s*(male|female)", normalized))
    has_composition = bool(_latest_composition_rows(normalized))
    dexa_markers = (
        "dexafit" in lower
        or "body composition" in lower
        or "lean tissue" in lower
        or "bone mineral" in lower
        or "t-score" in lower
        or (has_gender and has_composition)
    )
    if not dexa_markers:
        return None

    warnings: list[str] = []

    sex_match = re.search(r"(?i)gender:\s*(male|female)", normalized)
    sex = sex_match.group(1).lower() if sex_match else None
    if sex is None:
        warnings.append("Could not detect sex from report")

    age_match = re.search(
        r"(?i)\bAge:\s*([\d.]+)\s*(?:Height|Weight|in\.)",
        normalized,
    )
    chronological_age = float(age_match.group(1)) if age_match else None

    measure_date_match = re.search(
        r"(?i)measure(?:d)?\s+date:\s*(\d{2}/\d{2}/\d{4})",
        normalized,
    )
    test_date = (
        _parse_us_date(measure_date_match.group(1))
        if measure_date_match
        else None
    )

    rows = _latest_composition_rows(normalized)
    body_fat_pct = lean_lbs = fat_lbs = None
    prior_lean_lbs = None
    prior_test_date = None

    if rows:
        _, body_fat_pct, _total, fat_lbs, lean_lbs = rows[0]
        if test_date is None:
            test_date = rows[0][0]
        if len(rows) > 1:
            prior_test_date = rows[1][0]
            prior_lean_lbs = rows[1][4]
    else:
        warnings.append("Could not parse body composition summary table")

    bone_t_score = _parse_bone_t_score(normalized)
    if bone_t_score is None:
        warnings.append("Could not parse total bone T-score")

    if lean_lbs is None and fat_lbs is None and bone_t_score is None:
        return None

    return DexaExtract(
        sex=sex,
        chronological_age=chronological_age,
        test_date=test_date,
        body_fat_pct=body_fat_pct,
        lean_mass_lbs=lean_lbs,
        fat_mass_lbs=fat_lbs,
        bone_t_score=bone_t_score,
        prior_lean_mass_lbs=prior_lean_lbs,
        prior_test_date=prior_test_date,
        warnings=warnings,
    )


def dexa_to_parsed_fields(extract: DexaExtract) -> list[tuple[str, float, str, float, str]]:
    """Return tuples: field, value, unit, confidence, source_line."""
    out: list[tuple[str, float, str, float, str]] = []

    if extract.chronological_age is not None:
        out.append(
            (
                "chronological_age",
                extract.chronological_age,
                "years",
                0.95,
                f"Age: {extract.chronological_age}",
            )
        )
    if extract.body_fat_pct is not None:
        out.append(
            (
                "body_fat_pct",
                extract.body_fat_pct,
                "%",
                0.93,
                f"Total Body Fat {extract.body_fat_pct}%",
            )
        )
    if extract.lean_mass_lbs is not None:
        kg = round(extract.lean_mass_lbs * LBS_TO_KG, 2)
        out.append(
            (
                "dexa_lean_mass_kg",
                kg,
                "kg",
                0.94,
                f"Lean Tissue {extract.lean_mass_lbs} lbs",
            )
        )
    if extract.fat_mass_lbs is not None:
        kg = round(extract.fat_mass_lbs * LBS_TO_KG, 2)
        out.append(
            (
                "dexa_fat_mass_kg",
                kg,
                "kg",
                0.94,
                f"Fat Tissue {extract.fat_mass_lbs} lbs",
            )
        )
    if extract.bone_t_score is not None:
        out.append(
            (
                "dexa_bone_t_score",
                extract.bone_t_score,
                "T-score",
                0.92,
                f"Total BMD T-score {extract.bone_t_score}",
            )
        )
    if extract.prior_lean_mass_lbs is not None:
        kg = round(extract.prior_lean_mass_lbs * LBS_TO_KG, 2)
        out.append(
            (
                "prior_lean_mass_kg",
                kg,
                "kg",
                0.88,
                f"Prior lean {extract.prior_lean_mass_lbs} lbs",
            )
        )
    return out
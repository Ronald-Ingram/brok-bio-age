"""Regex-first lab report biomarker extraction."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Callable

from api.constants import GLUCOSE_OR_HBA1C, REQUIRED_PARSE_FIELDS
from api.llm_providers import extract_text_from_uploaded_file, redact_preview
from api.models.parse import HistoricalSnapshot, ParsedBiomarker, ParsePdfResponse
from api.services.canadian_plis_parser import parse_canadian_plis_text
from api.services.phenoage_spreadsheet_parser import (
    parse_phenoage_spreadsheet_text,
    snapshots_to_api_fields,
)
from api.services.dexa_parser import dexa_to_parsed_fields, parse_dexa_text
from api.services.labcorp_parser import parse_labcorp_text

# (field_name, unit, confidence, patterns)
FIELD_PATTERNS: list[tuple[str, str, float, list[str]]] = [
    (
        "albumin_g_dl",
        "g/dL",
        0.92,
        [
            r"(?i)albumin\s*[:\-]?\s*([\d.]+)\s*g/dL",
            r"(?i)albumin\s+([\d.]+)\s+g/dL",
        ],
    ),
    (
        "creatinine_mg_dl",
        "mg/dL",
        0.92,
        [
            r"(?i)creatinine\s*[:\-]?\s*([\d.]+)\s*mg/dL",
            r"(?i)creatinine\s+([\d.]+)\s+mg/dL",
        ],
    ),
    (
        "glucose_mg_dl",
        "mg/dL",
        0.88,
        [
            r"(?i)(?:glucose|glu)\s*[:\-]?\s*([\d.]+)\s*mg/dL",
            r"(?i)glucose\s+([\d.]+)\s+mg/dL",
        ],
    ),
    (
        "hba1c_pct",
        "%",
        0.90,
        [
            r"(?i)(?:hba1c|hemoglobin\s*a1c|a1c)\s*[:\-]?\s*([\d.]+)\s*%",
            r"(?i)hba1c\s+([\d.]+)\s*%",
        ],
    ),
    (
        "crp_mg_l",
        "mg/L",
        0.85,
        [
            r"(?i)(?:crp|c-reactive\s*protein(?:,?\s*\w+)?)\s*[:\-]?\s*([\d.]+)\s*mg/L",
            r"(?i)c-reactive\s*protein[^\d\n]*?([\d.]+)\s*mg/L",
            r"(?i)crp\s+([\d.]+)\s+mg/L",
        ],
    ),
    (
        "lymphocyte_pct",
        "%",
        0.80,
        [
            r"(?i)lymph(?:ocyte)?s?\s*(?:%|percent)?\s*[:\-]?\s*([\d.]+)\s*%",
            r"(?i)lymphocytes?\s+([\d.]+)\s*%",
            r"(?i)lymphs\s+([\d.]+)\s*%",
            r"(?i)lymphocyte\s+([\d.]+)\s*%",
        ],
    ),
    (
        "mcv_fl",
        "fL",
        0.88,
        [
            r"(?i)mcv\s*[:\-]?\s*([\d.]+)\s*fL",
            r"(?i)mean\s+cell\s+volume\s*[:\-]?\s*([\d.]+)\s*fL",
        ],
    ),
    (
        "rdw_pct",
        "%",
        0.88,
        [
            r"(?i)rdw\s*[:\-]?\s*([\d.]+)\s*%",
            r"(?i)red\s+cell\s+distribution\s+width\s*[:\-]?\s*([\d.]+)\s*%",
        ],
    ),
    (
        "alp_u_l",
        "U/L",
        0.85,
        [
            r"(?i)(?:alkaline\s+phosphatase|alp)\s*[:\-]?\s*([\d.]+)\s*(?:U/L|IU/L)",
            r"(?i)alp\s+([\d.]+)\s+U/L",
        ],
    ),
    (
        "wbc_10e3",
        "10^3/uL",
        0.85,
        [
            r"(?i)wbc\s+\d{2}\s+([\d.]+)\s+[\d.]+",
            r"(?i)wbc\s*[:\-]?\s*([\d.]+)\s*(?:x10|10\^3)",
            r"(?i)white\s+blood\s+cell(?:\s+count)?\s*[:\-]?\s*([\d.]+)",
        ],
    ),
    (
        "testosterone_ng_dl",
        "ng/dL",
        0.82,
        [
            r"(?i)testosterone\s*[:\-]?\s*([\d.]+)\s*ng/dL",
            r"(?i)testosterone,?\s+total\s*[:\-]?\s*([\d.]+)",
        ],
    ),
]


@dataclass
class _Match:
    field: str
    value: float
    unit: str
    confidence: float
    source_line: str


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _line_for_match(text: str, match: re.Match[str]) -> str:
    start = text.rfind("\n", 0, match.start()) + 1
    end = text.find("\n", match.end())
    if end == -1:
        end = len(text)
    return text[start:end].strip()[:120]


def _extract_regex(text: str) -> list[_Match]:
    normalized = _normalize_text(text)
    found: dict[str, _Match] = {}

    for field, unit, base_conf, patterns in FIELD_PATTERNS:
        for pattern in patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            try:
                value = float(match.group(1))
            except ValueError:
                continue
            if field not in found or base_conf > found[field].confidence:
                found[field] = _Match(
                    field=field,
                    value=value,
                    unit=unit,
                    confidence=base_conf,
                    source_line=_line_for_match(normalized, match),
                )
            break

    return list(found.values())


def _matches_to_response(
    matches: list[_Match],
    text: str,
    parse_method: str,
    warnings: list[str],
    *,
    report_type: str = "lab",
    sex: str | None = None,
    test_date: str | None = None,
    historical_snapshots: list[HistoricalSnapshot] | None = None,
) -> ParsePdfResponse:
    biomarkers = [
        ParsedBiomarker(
            field=m.field,
            value=m.value,
            unit=m.unit,
            confidence=m.confidence,
            source_line=m.source_line,
        )
        for m in matches
    ]
    fields_found = [m.field for m in matches]
    fields_missing = sorted(REQUIRED_PARSE_FIELDS - set(fields_found))
    if not (GLUCOSE_OR_HBA1C & set(fields_found)):
        fields_missing.append("glucose_mg_dl or hba1c_pct")

    confidences = [m.confidence for m in matches]
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0

    snaps = historical_snapshots or []
    return ParsePdfResponse(
        biomarkers=biomarkers,
        raw_text_preview=redact_preview(text),
        parse_method=parse_method,
        report_type=report_type,
        sex=sex,
        test_date=test_date,
        warnings=warnings,
        mean_confidence=round(mean_conf, 2),
        fields_found=fields_found,
        fields_missing=fields_missing,
        historical_snapshots=snaps,
        snapshot_count=len(snaps),
    )


def _phenoage_spreadsheet_response(text: str) -> ParsePdfResponse | None:
    snapshots = parse_phenoage_spreadsheet_text(text)
    if not snapshots:
        return None

    historical = [
        HistoricalSnapshot(**row) for row in snapshots_to_api_fields(snapshots)
    ]
    latest = snapshots[-1]
    matches = [
        _Match("albumin_g_dl", latest.albumin_g_dl, "g/dL", 0.98, latest.source_header),
        _Match("creatinine_mg_dl", latest.creatinine_mg_dl, "mg/dL", 0.98, latest.source_header),
        _Match("glucose_mg_dl", latest.glucose_mg_dl, "mg/dL", 0.98, latest.source_header),
        _Match("crp_mg_l", latest.crp_mg_l, "mg/L", 0.98, latest.source_header),
        _Match("lymphocyte_pct", latest.lymphocyte_pct, "%", 0.98, latest.source_header),
        _Match("mcv_fl", latest.mcv_fl, "fL", 0.98, latest.source_header),
        _Match("rdw_pct", latest.rdw_pct, "%", 0.98, latest.source_header),
        _Match("alp_u_l", latest.alp_u_l, "U/L", 0.98, latest.source_header),
        _Match("wbc_10e3", latest.wbc_10e3, "10^3/uL", 0.98, latest.source_header),
        _Match(
            "chronological_age",
            latest.chronological_age,
            "years",
            0.98,
            latest.source_header,
        ),
    ]
    if latest.testosterone_ng_dl is not None:
        matches.append(
            _Match(
                "testosterone_ng_dl",
                latest.testosterone_ng_dl,
                "ng/dL",
                0.95,
                latest.source_header,
            )
        )

    warnings = [
        f"Levine PhenoAge spreadsheet — {len(snapshots)} dated test(s) found",
    ]
    if len(snapshots) > 1:
        oldest = snapshots[0].test_date.isoformat()
        newest = latest.test_date.isoformat()
        warnings.append(
            f"Historical range {oldest} → {newest}. "
            "Import all to populate trend graphs; same dates overwrite prior entries."
        )

    return _matches_to_response(
        matches,
        text,
        "phenoage_spreadsheet",
        warnings,
        report_type="lab",
        test_date=latest.test_date.isoformat(),
        historical_snapshots=historical,
    )


def _llm_parse(text: str) -> list[_Match] | None:
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    model = os.getenv("XAI_MODEL", "grok-3")
    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")

    prompt = """Extract CBC/CMP biomarkers from this lab report text.
Return JSON only with US units (null if not found):
{
  "albumin_g_dl": float|null,
  "creatinine_mg_dl": float|null,
  "glucose_mg_dl": float|null,
  "hba1c_pct": float|null,
  "crp_mg_l": float|null,
  "lymphocyte_pct": float|null,
  "mcv_fl": float|null,
  "rdw_pct": float|null,
  "alp_u_l": float|null,
  "wbc_10e3": float|null,
  "testosterone_ng_dl": float|null
}"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": text[:8000]},
            ],
            temperature=0,
            max_tokens=500,
        )
        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
        data = json.loads(content)
    except Exception:
        return None

    units = {
        "albumin_g_dl": "g/dL",
        "creatinine_mg_dl": "mg/dL",
        "glucose_mg_dl": "mg/dL",
        "hba1c_pct": "%",
        "crp_mg_l": "mg/L",
        "lymphocyte_pct": "%",
        "mcv_fl": "fL",
        "rdw_pct": "%",
        "alp_u_l": "U/L",
        "wbc_10e3": "10^3/uL",
        "testosterone_ng_dl": "ng/dL",
    }
    matches: list[_Match] = []
    for field, unit in units.items():
        val = data.get(field)
        if val is not None:
            matches.append(
                _Match(
                    field=field,
                    value=float(val),
                    unit=unit,
                    confidence=0.75,
                    source_line="[LLM extraction]",
                )
            )
    return matches or None


def _needs_llm_fallback(matches: list[_Match]) -> bool:
    if not matches:
        return True
    fields = {m.field for m in matches}
    if REQUIRED_PARSE_FIELDS - fields:
        return True
    if not (GLUCOSE_OR_HBA1C & fields):
        return True
    confidences = [m.confidence for m in matches]
    return (sum(confidences) / len(confidences)) < 0.6


def parse_lab_file(file_bytes: bytes, filename: str) -> ParsePdfResponse:
    extracted = extract_text_from_uploaded_file(file_bytes, filename)
    text = extracted.get("text", "")
    warnings: list[str] = []

    if not text or text.startswith("["):
        warnings.append("Could not extract text from file")
        return ParsePdfResponse(
            biomarkers=[],
            raw_text_preview="",
            parse_method="regex",
            warnings=warnings,
            mean_confidence=0.0,
            fields_found=[],
            fields_missing=sorted(REQUIRED_PARSE_FIELDS) + ["glucose_mg_dl or hba1c_pct"],
        )

    phenoage_extract = _phenoage_spreadsheet_response(text)
    if phenoage_extract:
        return phenoage_extract

    dexa_extract = parse_dexa_text(text)
    labcorp_extract = parse_labcorp_text(text)
    canadian_extract = parse_canadian_plis_text(text)
    regex_matches = _extract_regex(text)
    llm_enabled = os.getenv("BIOAGE_ENABLE_LLM_PARSE", "false").lower() == "true"

    if labcorp_extract:
        labcorp_matches = [
            _Match(field=f, value=v, unit=u, confidence=c, source_line=s)
            for f, v, u, c, s in labcorp_extract.fields
        ]
        if labcorp_extract.chronological_age is not None:
            labcorp_matches.append(
                _Match(
                    field="chronological_age",
                    value=labcorp_extract.chronological_age,
                    unit="years",
                    confidence=0.96,
                    source_line=f"Age: {labcorp_extract.chronological_age}",
                )
            )
        lab_warnings = list(labcorp_extract.warnings)
        iso_date = (
            labcorp_extract.test_date.isoformat()
            if labcorp_extract.test_date
            else None
        )
        return _matches_to_response(
            labcorp_matches,
            text,
            "labcorp",
            lab_warnings,
            report_type="lab",
            sex=labcorp_extract.sex,
            test_date=iso_date,
        )

    if canadian_extract:
        canadian_matches = [
            _Match(field=f, value=v, unit=u, confidence=c, source_line=s)
            for f, v, u, c, s in canadian_extract.fields
        ]
        lab_warnings = list(canadian_extract.warnings)
        iso_date = (
            canadian_extract.test_date.isoformat()
            if canadian_extract.test_date
            else None
        )
        return _matches_to_response(
            canadian_matches,
            text,
            "canadian_plis",
            lab_warnings,
            report_type="lab",
            sex=canadian_extract.sex,
            test_date=iso_date,
        )

    if dexa_extract and not regex_matches:
        dexa_matches = [
            _Match(field=f, value=v, unit=u, confidence=c, source_line=s)
            for f, v, u, c, s in dexa_to_parsed_fields(dexa_extract)
        ]
        dexa_warnings = list(dexa_extract.warnings)
        dexa_warnings.append(
            "DEXA body-composition report — blood biomarkers not in this file; "
            "enter CBC/CMP labs separately or upload a blood lab PDF."
        )
        iso_date = (
            dexa_extract.test_date.isoformat() if dexa_extract.test_date else None
        )
        return _matches_to_response(
            dexa_matches,
            text,
            "dexa",
            dexa_warnings,
            report_type="dexa",
            sex=dexa_extract.sex,
            test_date=iso_date,
        )

    if dexa_extract and regex_matches:
        for f, v, u, c, s in dexa_to_parsed_fields(dexa_extract):
            if f not in {m.field for m in regex_matches}:
                regex_matches.append(
                    _Match(field=f, value=v, unit=u, confidence=c, source_line=s)
                )
        warnings.append("Combined lab + DEXA fields detected in upload")

    if llm_enabled and _needs_llm_fallback(regex_matches):
        llm_matches = _llm_parse(text)
        if llm_matches:
            merged = {m.field: m for m in regex_matches}
            for m in llm_matches:
                if m.field not in merged:
                    merged[m.field] = m
            warnings.append("LLM fallback supplemented missing/low-confidence fields")
            report_type = "hybrid" if dexa_extract else "lab"
            return _matches_to_response(
                list(merged.values()),
                text,
                "hybrid",
                warnings,
                report_type=report_type,
                sex=dexa_extract.sex if dexa_extract else None,
                test_date=(
                    dexa_extract.test_date.isoformat()
                    if dexa_extract and dexa_extract.test_date
                    else None
                ),
            )
        warnings.append("LLM fallback enabled but unavailable or failed")

    if not regex_matches:
        warnings.append("No biomarkers matched — try manual entry")

    report_type = "hybrid" if dexa_extract and regex_matches else "lab"
    if dexa_extract and not regex_matches:
        report_type = "dexa"
    return _matches_to_response(
        regex_matches,
        text,
        "regex",
        warnings,
        report_type=report_type,
        sex=dexa_extract.sex if dexa_extract else None,
        test_date=(
            dexa_extract.test_date.isoformat()
            if dexa_extract and dexa_extract.test_date
            else None
        ),
    )
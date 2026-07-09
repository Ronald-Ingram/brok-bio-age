"""Schemas for PDF/text lab report parsing."""

from typing import Optional

from pydantic import BaseModel, Field


class ParsedBiomarker(BaseModel):
    field: str
    value: float
    unit: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_line: Optional[str] = None


class HistoricalSnapshot(BaseModel):
    """One dated Input row from a multi-tab PhenoAge spreadsheet PDF."""

    test_date: str
    chronological_age: float
    biomarkers: list[ParsedBiomarker]
    pheno_age_standard: Optional[float] = None
    source_header: Optional[str] = None


class ParsePdfResponse(BaseModel):
    biomarkers: list[ParsedBiomarker]
    raw_text_preview: str
    parse_method: str  # regex | llm | hybrid | dexa
    report_type: str = "unknown"  # lab | dexa | hybrid | unknown
    sex: Optional[str] = None  # male | female
    test_date: Optional[str] = None  # ISO date when detected
    warnings: list[str] = []
    mean_confidence: float = 0.0
    fields_found: list[str] = []
    fields_missing: list[str] = []
    historical_snapshots: list[HistoricalSnapshot] = []
    snapshot_count: int = 0
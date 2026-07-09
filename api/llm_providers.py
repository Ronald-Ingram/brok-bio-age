"""File text extraction (adapted from neobanx-brok-mvp/api/llm_providers.py)."""

from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Any

from api.constants import MAX_PDF_TEXT_CHARS

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None  # type: ignore[misc, assignment]


def extract_text_from_uploaded_file(file_bytes: bytes, filename: str) -> dict[str, Any]:
    ext = Path(filename).suffix.lower()
    result: dict[str, Any] = {"filename": filename, "text": "", "is_image": False}

    if ext == ".pdf" and PdfReader is not None:
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            reader = PdfReader(tmp_path)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            os.unlink(tmp_path)
            result["text"] = text.strip()[:MAX_PDF_TEXT_CHARS]
            return result
        except Exception as exc:
            result["text"] = f"[PDF extraction error: {exc}]"
            return result

    if ext in {".txt", ".text"}:
        result["text"] = file_bytes.decode("utf-8", errors="ignore")[:MAX_PDF_TEXT_CHARS]
        return result

    try:
        result["text"] = file_bytes.decode("utf-8", errors="ignore")[:MAX_PDF_TEXT_CHARS]
    except Exception:
        result["text"] = "[Unsupported file type for local extraction]"
    return result


def redact_preview(text: str, limit: int = 500) -> str:
    preview = text[:limit]
    preview = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN]", preview)
    preview = re.sub(r"\b\d{9}\b", "[ID]", preview)
    return preview
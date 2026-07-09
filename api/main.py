"""
BROK Bio-Age API
FastAPI backend for biological age calculation (Levine PhenoAge + BROK adjustments).
"""

import os
import time
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from api.constants import MAX_UPLOAD_BYTES
from api.metrics import metrics_enabled, observe_calculate, observe_parse_pdf, setup_metrics
from api.models.biomarkers import CalculateRequest, CalculateResponse
from api.models.parse import ParsePdfResponse
from api.services.calculate import run_calculate
from api.services.pdf_parser import parse_lab_file

load_dotenv(dotenv_path="api/.env")

MODEL_VERSION = "brok-phenoage-0.1.0"
LEVINE_CONSTANTS = "20220225"


def _cors_origins() -> List[str]:
    raw = os.getenv("BIOAGE_CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app() -> FastAPI:
    application = FastAPI(title="BROK Bio-Age API", version="0.1.0")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/health")
    def health():
        return {
            "status": "ok",
            "model_version": MODEL_VERSION,
            "levine_constants": LEVINE_CONSTANTS,
            "levine_verified": True,
            "llm_parse_enabled": os.getenv("BIOAGE_ENABLE_LLM_PARSE", "false").lower() == "true",
            "metrics_enabled": metrics_enabled(),
        }

    @application.post("/api/v1/calculate", response_model=CalculateResponse)
    def calculate(request: CalculateRequest) -> CalculateResponse:
        start = time.perf_counter()
        success = False
        try:
            result = run_calculate(request)
            success = True
            return result
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        finally:
            observe_calculate(time.perf_counter() - start, success=success)

    @application.post("/api/v1/parse-pdf", response_model=ParsePdfResponse)
    async def parse_pdf(file: UploadFile = File(...)) -> ParsePdfResponse:
        start = time.perf_counter()
        success = False
        try:
            if not file.filename:
                raise HTTPException(status_code=400, detail="Filename required")

            content = await file.read()
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

            ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
            if ext not in {"pdf", "txt", "text"}:
                raise HTTPException(
                    status_code=400,
                    detail="Supported formats: .pdf, .txt",
                )

            result = parse_lab_file(content, file.filename)
            success = True
            return result
        except HTTPException:
            raise
        finally:
            observe_parse_pdf(time.perf_counter() - start, success=success)

    setup_metrics(application)
    return application


app = create_app()
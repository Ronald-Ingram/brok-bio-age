"""Optional Prometheus metrics (enabled via BIOAGE_METRICS_ENABLED=true)."""

from __future__ import annotations

import os
import time
from typing import Callable

from fastapi import FastAPI, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Histogram buckets tuned for <50ms calculate target and <2s PDF parse
_DURATION_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

HTTP_REQUESTS = Counter(
    "bioage_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

HTTP_DURATION = Histogram(
    "bioage_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=_DURATION_BUCKETS,
)

CALCULATE_DURATION = Histogram(
    "bioage_calculate_duration_seconds",
    "POST /api/v1/calculate handler latency in seconds",
    buckets=_DURATION_BUCKETS,
)

CALCULATE_REQUESTS = Counter(
    "bioage_calculate_requests_total",
    "Calculate requests by outcome",
    ["status"],
)

PARSE_PDF_DURATION = Histogram(
    "bioage_parse_pdf_duration_seconds",
    "POST /api/v1/parse-pdf handler latency in seconds",
    buckets=_DURATION_BUCKETS,
)

PARSE_PDF_REQUESTS = Counter(
    "bioage_parse_pdf_requests_total",
    "Parse-PDF requests by outcome",
    ["status"],
)


def metrics_enabled() -> bool:
    return os.getenv("BIOAGE_METRICS_ENABLED", "false").lower() == "true"


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None and getattr(route, "path", None):
        return route.path
    return request.url.path


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        if request.url.path == "/metrics":
            return await call_next(request)

        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            elapsed = time.perf_counter() - start
            endpoint = _route_template(request)
            HTTP_REQUESTS.labels(
                method=request.method,
                endpoint=endpoint,
                status=str(status_code),
            ).inc()
            HTTP_DURATION.labels(
                method=request.method,
                endpoint=endpoint,
            ).observe(elapsed)


def observe_calculate(duration_seconds: float, *, success: bool) -> None:
    if not metrics_enabled():
        return
    CALCULATE_DURATION.observe(duration_seconds)
    CALCULATE_REQUESTS.labels(status="success" if success else "error").inc()


def observe_parse_pdf(duration_seconds: float, *, success: bool) -> None:
    if not metrics_enabled():
        return
    PARSE_PDF_DURATION.observe(duration_seconds)
    PARSE_PDF_REQUESTS.labels(status="success" if success else "error").inc()


def setup_metrics(app: FastAPI) -> None:
    @app.get("/metrics", include_in_schema=metrics_enabled())
    def prometheus_metrics():
        if not metrics_enabled():
            return JSONResponse(status_code=404, content={"detail": "Metrics disabled"})
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    if metrics_enabled():
        app.add_middleware(PrometheusMiddleware)
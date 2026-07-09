"""Tests for optional Prometheus /metrics endpoint."""

import pytest
from fastapi.testclient import TestClient

from api.main import app, create_app
from tests.test_calculate_api import BASE_PAYLOAD


@pytest.fixture
def disabled_client():
    return TestClient(app)


def test_metrics_disabled_returns_404(disabled_client):
    res = disabled_client.get("/metrics")
    assert res.status_code == 404


def test_health_reports_metrics_disabled(disabled_client):
    res = disabled_client.get("/health")
    assert res.status_code == 200
    assert res.json()["metrics_enabled"] is False


def test_metrics_enabled_exposes_histograms(monkeypatch):
    monkeypatch.setenv("BIOAGE_METRICS_ENABLED", "true")
    client = TestClient(create_app())

    health = client.get("/health")
    assert health.json()["metrics_enabled"] is True

    calc = client.post("/api/v1/calculate", json=BASE_PAYLOAD)
    assert calc.status_code == 200

    parse = client.post(
        "/api/v1/parse-pdf",
        files={"file": ("lab.txt", b"GLUCOSE 95 mg/dL\n", "text/plain")},
    )
    assert parse.status_code == 200

    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert metrics.headers["content-type"].startswith("text/plain")
    body = metrics.text

    assert "bioage_http_request_duration_seconds_bucket" in body
    assert "bioage_calculate_duration_seconds_bucket" in body
    assert "bioage_parse_pdf_duration_seconds_bucket" in body
    assert "bioage_http_requests_total" in body
    assert "bioage_calculate_requests_total" in body
    assert '/api/v1/calculate' in body


def test_parse_pdf_error_increments_error_counter(monkeypatch):
    monkeypatch.setenv("BIOAGE_METRICS_ENABLED", "true")
    client = TestClient(create_app())

    res = client.post(
        "/api/v1/parse-pdf",
        files={"file": ("report.xyz", b"data", "application/octet-stream")},
    )
    assert res.status_code == 400

    metrics = client.get("/metrics").text
    assert 'bioage_parse_pdf_requests_total{status="error"}' in metrics
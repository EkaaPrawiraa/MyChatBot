"""Pytest configuration for the Axis Assistant agent tests."""

import pytest


@pytest.fixture(autouse=True)
def _set_test_env(monkeypatch):
    """Ensure test environment variables are set for every test."""
    monkeypatch.setenv("API_KEY", "test-secret")
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8080")

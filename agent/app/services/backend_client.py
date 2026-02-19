"""HTTP client for calling Go backend internal APIs."""

from __future__ import annotations

import httpx
from app.config import settings


class BackendClient:
    """Thin wrapper around httpx for Go backend tool-service calls."""

    def __init__(self) -> None:
        self._base = settings.backend_url.rstrip("/")
        self._headers = {"X-API-Key": settings.api_key}

    # ---------- helpers ----------

    def _url(self, path: str) -> str:
        return f"{self._base}{path}"

    async def _get(self, path: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(self._url(path), headers=self._headers, params=params)
            r.raise_for_status()
            return r.json()

    async def _post(self, path: str, json: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(self._url(path), headers=self._headers, json=json)
            r.raise_for_status()
            return r.json()

    # ---------- profile ----------

    async def get_profile(self) -> dict:
        return await self._get("/api/v1/internal/profile")

    # ---------- memory ----------

    async def get_short_term(self, session_id: str, limit: int = 20) -> dict:
        return await self._get(
            f"/api/v1/internal/memory/short-term/{session_id}",
            params={"limit": limit},
        )

    async def store_short_term(self, data: dict) -> dict:
        return await self._post("/api/v1/internal/memory/short-term", json=data)

    async def store_long_term(self, data: dict) -> dict:
        return await self._post("/api/v1/internal/memory/long-term", json=data)

    async def vector_search(self, query: str, limit: int = 5) -> dict:
        return await self._post(
            "/api/v1/internal/memory/search",
            json={"query": query, "limit": limit},
        )

    # ---------- activity ----------

    async def log_activity(self, data: dict) -> dict:
        return await self._post("/api/v1/internal/activity", json=data)

    # ---------- approval ----------

    async def create_approval(self, data: dict) -> dict:
        return await self._post("/api/v1/internal/approval", json=data)

    async def get_approval(self, approval_id: str) -> dict:
        return await self._get(f"/api/v1/internal/approval/{approval_id}")

    # ---------- reminder ----------

    async def create_reminder(self, data: dict) -> dict:
        return await self._post("/api/v1/internal/reminder", json=data)


# Singleton
backend = BackendClient()

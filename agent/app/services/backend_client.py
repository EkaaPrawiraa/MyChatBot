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

    async def _put(self, path: str, json: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.put(self._url(path), headers=self._headers, json=json)
            r.raise_for_status()
            return r.json()

    async def _delete(self, path: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.delete(self._url(path), headers=self._headers)
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

    # ---------- tools (gmail/calendar/whatsapp) ----------

    async def gmail_unread(self, max_results: int = 50) -> dict:
        return await self._get(
            "/api/v1/internal/tools/gmail/unread",
            params={"maxResults": max_results},
        )

    async def gmail_search(self, query: str, max_results: int = 10) -> dict:
        return await self._get(
            "/api/v1/internal/tools/gmail/search",
            params={"q": query, "maxResults": max_results},
        )

    async def gmail_categorized_unread(self, max_results: int = 10) -> dict:
        return await self._get(
            "/api/v1/internal/tools/gmail/categorized-unread",
            params={"maxResults": max_results},
        )

    async def gmail_send(self, to: str, subject: str = "", body: str = "") -> dict:
        return await self._post(
            "/api/v1/internal/tools/gmail/send",
            json={"to": to, "subject": subject, "body": body},
        )

    async def calendar_list(
        self,
        time_min: str | None = None,
        time_max: str | None = None,
        max_results: int = 20,
    ) -> dict:
        params: dict = {"maxResults": max_results}
        if time_min:
            params["timeMin"] = time_min
        if time_max:
            params["timeMax"] = time_max
        return await self._get("/api/v1/internal/tools/calendar/events", params=params)

    async def calendar_create(self, payload: dict) -> dict:
        return await self._post("/api/v1/internal/tools/calendar/events", json=payload)

    async def calendar_update(self, event_id: str, payload: dict) -> dict:
        return await self._put(
            f"/api/v1/internal/tools/calendar/events/{event_id}",
            json=payload,
        )

    async def calendar_delete(self, event_id: str) -> dict:
        return await self._delete(f"/api/v1/internal/tools/calendar/events/{event_id}")

    async def calendar_freebusy(self, time_min: str, time_max: str) -> dict:
        return await self._post(
            "/api/v1/internal/tools/calendar/freebusy",
            json={"timeMin": time_min, "timeMax": time_max},
        )

    async def whatsapp_send(self, to: str, message: str) -> dict:
        return await self._post(
            "/api/v1/internal/tools/whatsapp/send",
            json={"to": to, "message": message},
        )

    async def people_search(
        self,
        query: str,
        page_size: int = 10,
        page_token: str | None = None,
    ) -> dict:
        params: dict = {"q": query, "pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self._get("/api/v1/internal/tools/people/search", params=params)

    async def drive_search(
        self,
        query: str = "",
        page_size: int = 10,
        page_token: str | None = None,
    ) -> dict:
        params: dict = {"q": query, "pageSize": page_size}
        if page_token:
            params["pageToken"] = page_token
        return await self._get("/api/v1/internal/tools/drive/search", params=params)

    async def drive_export(
        self,
        file_id: str,
        mime_type: str = "text/plain",
        max_bytes: int = 20000,
    ) -> dict:
        params: dict = {
            "fileId": file_id,
            "mimeType": mime_type,
            "maxBytes": max_bytes,
        }
        return await self._get("/api/v1/internal/tools/drive/export", params=params)

    async def drive_create_text_file(
        self,
        name: str,
        content: str,
        mime_type: str = "text/plain",
        parent_id: str | None = None,
    ) -> dict:
        payload: dict = {
            "name": name,
            "content": content,
            "mime_type": mime_type,
        }
        if parent_id:
            payload["parent_id"] = parent_id
        return await self._post("/api/v1/internal/tools/drive/create-text", json=payload)

    async def drive_create_google_doc(
        self,
        name: str,
        content: str = "",
        parent_id: str | None = None,
    ) -> dict:
        payload: dict = {
            "name": name,
            "content": content,
        }
        if parent_id:
            payload["parent_id"] = parent_id
        return await self._post("/api/v1/internal/tools/drive/create-doc", json=payload)

    async def drive_create_google_sheet(
        self,
        name: str,
        csv: str = "",
        parent_id: str | None = None,
    ) -> dict:
        payload: dict = {
            "name": name,
            "csv": csv,
        }
        if parent_id:
            payload["parent_id"] = parent_id
        return await self._post("/api/v1/internal/tools/drive/create-sheet", json=payload)

    async def youtube_analytics(self, start_date: str, end_date: str) -> dict:
        return await self._get(
            "/api/v1/internal/tools/youtube/analytics",
            params={"startDate": start_date, "endDate": end_date},
        )


# Singleton
backend = BackendClient()

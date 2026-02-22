"""Tavily-based web search for the agent.

This is used by the agent-side `web.search` tool so the LLM can look things up
without relying on the Go backend's dashboard web-search endpoints.

We intentionally use Tavily only (no DuckDuckGo/Wikipedia fallbacks) to avoid
network/DNS blocks that frequently affect DuckDuckGo in some environments.

Return shape matches the existing tool contract:
{
    "query": str,
    "results": [{"title": str, "url": str, "snippet": str}],
    "source": str,
    "warnings": [str]
}
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

from app.config import settings

from pydantic import SecretStr

try:
    from langchain_tavily import TavilySearch
    from langchain_tavily._utilities import TavilySearchAPIWrapper
except Exception:  # noqa: BLE001
    TavilySearch = None  # type: ignore[assignment]
    TavilySearchAPIWrapper = None  # type: ignore[assignment]


def _is_http_url(raw: str) -> bool:
    if not raw:
        return False
    v = raw.strip().lower()
    return v.startswith("http://") or v.startswith("https://")


async def web_search_ddg(query: str, max_results: int = 5) -> dict[str, Any]:
    q = (query or "").strip()
    if not q:
        raise ValueError("query is required")

    if max_results <= 0:
        max_results = 5
    if max_results > 10:
        max_results = 10

    warnings: list[str] = []

    def add_warning(msg: str) -> None:
        m = (msg or "").strip()
        if m:
            warnings.append(m)

    results: list[dict[str, str]] = []
    seen: set[str] = set()

    # Read from process env first, then fallback to Settings (which reads agent/.env).
    tavily_api_key = (os.getenv("TAVILY_API_KEY") or settings.tavily_api_key or "").strip()

    if not tavily_api_key:
        return {
            "query": q,
            "results": [],
            "source": "none",
            "warnings": ["tavily is not configured (missing TAVILY_API_KEY)"],
        }

    if TavilySearch is None or TavilySearchAPIWrapper is None:
        return {
            "query": q,
            "results": [],
            "source": "none",
            "warnings": [
                "tavily tool is not available (missing dependency: langchain-tavily)"
            ],
        }

    try:
        api_wrapper = TavilySearchAPIWrapper(tavily_api_key=SecretStr(tavily_api_key))
        tool = TavilySearch(
            max_results=max_results,
            topic="general",
            api_wrapper=api_wrapper,
        )

        payload_any = await asyncio.to_thread(tool.invoke, {"query": q})
        payload: dict[str, Any] = payload_any if isinstance(payload_any, dict) else {}
        raw_results = payload.get("results")
        if isinstance(raw_results, list):
            for it in raw_results:
                if len(results) >= max_results:
                    break
                if not isinstance(it, dict):
                    continue

                link = str(it.get("url") or "").strip()
                if not _is_http_url(link) or link in seen:
                    continue
                seen.add(link)

                title = str(it.get("title") or "").strip() or link
                snippet = str(it.get("content") or "").strip()
                if len(snippet) > 240:
                    snippet = snippet[:240].strip()

                results.append({
                    "title": title,
                    "url": link,
                    "snippet": snippet,
                })

        out: dict[str, Any] = {
            "query": q,
            "results": results,
            "source": "tavily" if results else "none",
        }
        if warnings:
            out["warnings"] = warnings
        return out
    except Exception as exc:  # noqa: BLE001
        add_warning(f"tavily failed: {type(exc).__name__}: {exc}")

    out = {
        "query": q,
        "results": [],
        "source": "none",
    }
    if warnings:
        out["warnings"] = warnings
    return out

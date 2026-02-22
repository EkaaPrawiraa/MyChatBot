"""DuckDuckGo-based web search for the agent.

This is used by the agent-side `web.search` tool so the LLM can look things up
without relying on the Go backend's dashboard web-search endpoints.

Return shape matches the existing tool contract:
{
  "query": str,
  "results": [{"title": str, "url": str, "snippet": str}],
  "source": str,
  "warnings": [str]
}
"""

from __future__ import annotations

from typing import Any

import httpx


def _is_http_url(raw: str) -> bool:
    if not raw:
        return False
    v = raw.strip().lower()
    return v.startswith("http://") or v.startswith("https://")


def _split_title_snippet(text: str) -> tuple[str, str]:
    t = (text or "").strip()
    if not t:
        return "", ""

    parts = t.split(" - ", 1)
    if len(parts) == 2:
        title = parts[0].strip() or t
        snippet = parts[1].strip()
        return title, snippet

    return t, ""


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

    async with httpx.AsyncClient(timeout=10.0, headers={
        "User-Agent": "axis-assistant/1.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    }) as client:
        # ---- Provider 1: DuckDuckGo Instant Answer JSON ----
        try:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": q,
                    "format": "json",
                    "no_html": "1",
                    "no_redirect": "1",
                },
            )
            resp.raise_for_status()
            payload: dict[str, Any] = resp.json() if resp.content else {}

            def add_result(text: str, link: str) -> None:
                nonlocal results
                if len(results) >= max_results:
                    return
                link = (link or "").strip()
                if not _is_http_url(link):
                    return
                if link in seen:
                    return
                seen.add(link)

                title, snippet = _split_title_snippet(text)
                title = title.strip() or link
                snippet = (snippet or "").strip()

                results.append({
                    "title": title,
                    "url": link,
                    "snippet": snippet,
                })

            raw_results = payload.get("Results")
            if isinstance(raw_results, list):
                for it in raw_results:
                    if len(results) >= max_results:
                        break
                    if not isinstance(it, dict):
                        continue
                    add_result(str(it.get("Text") or ""), str(it.get("FirstURL") or ""))

            def walk_topics(v: Any) -> None:
                if len(results) >= max_results:
                    return
                if not isinstance(v, list):
                    return
                for it in v:
                    if len(results) >= max_results:
                        return
                    if not isinstance(it, dict):
                        continue
                    nested = it.get("Topics")
                    if nested is not None:
                        walk_topics(nested)
                        continue
                    add_result(str(it.get("Text") or ""), str(it.get("FirstURL") or ""))

            walk_topics(payload.get("RelatedTopics"))

            if results:
                out: dict[str, Any] = {
                    "query": q,
                    "results": results,
                    "source": "duckduckgo_api",
                }
                if warnings:
                    out["warnings"] = warnings
                return out
        except Exception as exc:  # noqa: BLE001
            # Include a short, actionable error message (DNS/TLS/timeout/etc.).
            add_warning(f"duckduckgo api failed: {type(exc).__name__}: {exc}")

        # ---- Provider 2: Wikipedia OpenSearch fallback ----
        try:
            resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "opensearch",
                    "search": q,
                    "limit": str(max_results),
                    "namespace": "0",
                    "format": "json",
                },
            )
            resp.raise_for_status()
            arr = resp.json()

            if isinstance(arr, list) and len(arr) >= 4:
                titles = arr[1] if isinstance(arr[1], list) else []
                descriptions = arr[2] if isinstance(arr[2], list) else []
                urls = arr[3] if isinstance(arr[3], list) else []

                for i in range(min(len(titles), len(urls))):
                    if len(results) >= max_results:
                        break
                    title = str(titles[i] or "").strip()
                    link = str(urls[i] or "").strip()
                    if not _is_http_url(link) or link in seen:
                        continue
                    seen.add(link)

                    snippet = ""
                    if i < len(descriptions):
                        snippet = str(descriptions[i] or "").strip()
                    if len(snippet) > 240:
                        snippet = snippet[:240].strip()

                    results.append({
                        "title": title or link,
                        "url": link,
                        "snippet": snippet,
                    })

            out = {
                "query": q,
                "results": results,
                "source": "wikipedia_opensearch" if results else "none",
            }
            if warnings:
                out["warnings"] = warnings
            return out
        except Exception as exc:  # noqa: BLE001
            add_warning(f"wikipedia fallback failed: {type(exc).__name__}: {exc}")

    out = {
        "query": q,
        "results": [],
        "source": "none",
    }
    if warnings:
        out["warnings"] = warnings
    return out

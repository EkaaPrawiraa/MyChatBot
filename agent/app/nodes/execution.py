"""Node 6 — Execution.

Iterates over plan steps and calls the Go backend tool services.
Records results, retries once on transient failures.
"""

from __future__ import annotations

import time
import re

from app.errors import CODE_EXECUTION_FAILED
from app.models.state import AxisState
from app.services.backend_client import backend


_WHATSAPP_TO_PLACEHOLDERS = {
    "phone_number_from_search",
    "phone_from_search",
    "from_search",
    "from_people_search",
    "contact_phone",
    "phone_number",
    "phone",
}


def _looks_like_phone_number(value: str) -> bool:
    v = (value or "").strip()
    if not v:
        return False

    # Allow leading +, then digits/spaces/dashes/parentheses.
    if re.search(r"[A-Za-z]", v):
        return False

    digits = re.sub(r"\D", "", v)
    return len(digits) >= 8


def _normalize_phone_for_whatsapp(value: str) -> str:
    """Normalize phone numbers into a WhatsApp-friendly format.

    Heuristic:
    - Keep local Indonesian numbers like 08xxxxxxxxxx (digits only)
    - Convert +62xxxxxxxxxx into 0xxxxxxxxxx
    - Otherwise, return digits-only.
    """

    raw = (value or "").strip()
    if not raw:
        return ""

    raw_no_space = re.sub(r"\s+", "", raw)
    if raw_no_space.startswith("+62"):
        digits = re.sub(r"\D", "", raw_no_space)
        # digits starts with 62...
        if digits.startswith("62") and len(digits) > 2:
            return "0" + digits[2:]

    digits = re.sub(r"\D", "", raw)
    return digits


def _extract_first_phone_from_people_search_result(result: dict) -> str:
    results = result.get("results") if isinstance(result, dict) else None
    if not isinstance(results, list) or not results:
        return ""

    person = (results[0] or {}).get("person") if isinstance(results[0], dict) else None
    if not isinstance(person, dict):
        return ""

    phone_numbers = person.get("phoneNumbers")
    if not isinstance(phone_numbers, list) or not phone_numbers:
        return ""

    # Prefer canonicalForm when present, else value.
    first = phone_numbers[0] if isinstance(phone_numbers[0], dict) else {}
    canonical = first.get("canonicalForm")
    value = first.get("value")
    return str(canonical or value or "").strip()


def _resolve_whatsapp_to_from_prior_steps(plan: list, current_index: int) -> str:
    """Look backwards for a successful people.search and extract a phone number."""

    for i in range(current_index - 1, -1, -1):
        step = plan[i]
        if getattr(step, "tool", None) != "people.search":
            continue
        if getattr(step, "success", None) is not True:
            continue
        result = getattr(step, "result", None)
        if not isinstance(result, dict):
            continue
        phone = _extract_first_phone_from_people_search_result(result)
        if phone:
            return phone

    return ""


async def _execute_step(tool: str, input_data: dict) -> dict:
    """Dispatch a single tool call to the Go backend."""

    input_data = input_data or {}

    # Gmail
    if tool == "gmail.unread":
        max_results = int(input_data.get("maxResults") or input_data.get("max_results") or 50)
        resp = await backend.gmail_unread(max_results=max_results)
        return resp.get("data") or {}

    if tool == "gmail.search":
        query = str(input_data.get("query") or input_data.get("q") or "").strip()
        max_results = int(input_data.get("maxResults") or input_data.get("max_results") or 10)
        resp = await backend.gmail_search(query=query, max_results=max_results)
        return resp.get("data") or {}

    if tool == "gmail.categorized_unread":
        max_results = int(input_data.get("maxResults") or input_data.get("max_results") or 10)
        resp = await backend.gmail_categorized_unread(max_results=max_results)
        return resp.get("data") or {}

    if tool == "gmail.send":
        to = str(input_data.get("to") or "").strip()
        subject = str(input_data.get("subject") or "")
        body = str(input_data.get("body") or "")
        resp = await backend.gmail_send(to=to, subject=subject, body=body)
        return resp.get("data") or {}

    # Calendar
    if tool == "calendar.list":
        time_min = input_data.get("timeMin") or input_data.get("time_min")
        time_max = input_data.get("timeMax") or input_data.get("time_max")
        max_results = int(input_data.get("maxResults") or input_data.get("max_results") or 20)
        resp = await backend.calendar_list(time_min=time_min, time_max=time_max, max_results=max_results)
        return resp.get("data") or {}

    if tool == "calendar.create":
        resp = await backend.calendar_create(payload=input_data)
        return resp.get("data") or {}

    if tool == "calendar.update":
        event_id = str(input_data.get("event_id") or input_data.get("eventId") or "").strip()
        payload = dict(input_data)
        payload.pop("event_id", None)
        payload.pop("eventId", None)
        resp = await backend.calendar_update(event_id=event_id, payload=payload)
        return resp.get("data") or {}

    if tool == "calendar.delete":
        event_id = str(input_data.get("event_id") or input_data.get("eventId") or "").strip()
        resp = await backend.calendar_delete(event_id=event_id)
        return resp.get("data") or {}

    if tool == "calendar.availability":
        time_min = str(input_data.get("timeMin") or input_data.get("time_min") or "").strip()
        time_max = str(input_data.get("timeMax") or input_data.get("time_max") or "").strip()
        resp = await backend.calendar_freebusy(time_min=time_min, time_max=time_max)
        return resp.get("data") or {}

    # WhatsApp
    if tool == "whatsapp.send":
        to = str(input_data.get("to") or "").strip()
        message = str(input_data.get("message") or input_data.get("body") or "").strip()

        if not _looks_like_phone_number(to) or to.lower() in _WHATSAPP_TO_PLACEHOLDERS:
            raise ValueError(
                "whatsapp.send requires a phone number in input.to (resolved from people.search), "
                f"got: {to!r}"
            )

        resp = await backend.whatsapp_send(to=to, message=message)
        return resp.get("data") or {}

    # People (contacts)
    if tool == "people.search":
        query = str(input_data.get("query") or input_data.get("q") or "").strip()
        page_size = int(input_data.get("pageSize") or input_data.get("page_size") or 10)
        page_token = input_data.get("pageToken") or input_data.get("page_token")
        resp = await backend.people_search(query=query, page_size=page_size, page_token=page_token)
        return resp.get("data") or {}

    # Drive
    if tool == "drive.search":
        query = str(input_data.get("query") or input_data.get("q") or "").strip()
        page_size = int(input_data.get("pageSize") or input_data.get("page_size") or 10)
        page_token = input_data.get("pageToken") or input_data.get("page_token")
        resp = await backend.drive_search(query=query, page_size=page_size, page_token=page_token)
        return resp.get("data") or {}

    # YouTube
    if tool == "youtube.analytics":
        start_date = str(input_data.get("startDate") or input_data.get("start_date") or "").strip()
        end_date = str(input_data.get("endDate") or input_data.get("end_date") or "").strip()
        resp = await backend.youtube_analytics(start_date=start_date, end_date=end_date)
        return resp.get("data") or {}

    # Reminders
    if tool == "reminder.create":
        title = str(input_data.get("title") or "").strip()
        description = str(
            input_data.get("description")
            or input_data.get("details")
            or input_data.get("message")
            or ""
        ).strip()
        scheduled_at = (
            input_data.get("scheduled_at")
            or input_data.get("scheduledAt")
            or input_data.get("scheduled")
            or input_data.get("time")
            or input_data.get("when")
            or input_data.get("at")
        )

        if scheduled_at is None or str(scheduled_at).strip() == "":
            raise ValueError("reminder.create requires scheduled_at (RFC3339 datetime)")

        payload: dict = {
            "title": title,
            "description": description,
        }
        payload["scheduled_at"] = scheduled_at
        if input_data.get("sent_via") is not None:
            payload["sent_via"] = input_data.get("sent_via")

        resp = await backend.create_reminder(payload)
        return resp.get("data") or {}

    # Memory
    if tool == "memory.store":
        content = str(input_data.get("content") or input_data.get("text") or "").strip()
        category = str(input_data.get("category") or "").strip()
        source = str(input_data.get("source") or "").strip()

        if not content:
            raise ValueError("memory.store requires non-empty content")

        metadata: dict = {}
        if source:
            metadata["source"] = source

        resp = await backend.store_long_term({
            "content": content,
            "category": category,
            "metadata": metadata,
        })
        return resp.get("data") or {}

    raise ValueError(f"unknown tool: {tool}")


async def execution(state: AxisState) -> dict:
    """Execute each validated plan step sequentially."""

    if not state.plan:
        return {}

    results: list[dict] = []
    tools_used: list[str] = []
    start = time.time()

    for idx, step in enumerate(state.plan):
        if step.tool == "whatsapp.send":
            input_data = step.input or {}
            to_raw = str(input_data.get("to") or "").strip()

            needs_resolution = (
                (to_raw.lower() in _WHATSAPP_TO_PLACEHOLDERS)
                or (not _looks_like_phone_number(to_raw))
            )
            if needs_resolution:
                from_people = _resolve_whatsapp_to_from_prior_steps(state.plan, idx)
                if from_people:
                    input_data["to"] = _normalize_phone_for_whatsapp(from_people)
                    step.input = input_data

        try:
            result = await _execute_step(step.tool, step.input)
            step.result = result
            step.success = True
        except Exception as exc:
            # Retry once
            try:
                result = await _execute_step(step.tool, step.input)
                step.result = result
                step.success = True
            except Exception as retry_exc:
                step.success = False
                step.error = f"{CODE_EXECUTION_FAILED}: {retry_exc}"

        results.append(step.model_dump())
        tools_used.append(step.tool)

    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "execution_results": results,
        "tools_used": tools_used,
        "latency_ms": elapsed_ms,
    }

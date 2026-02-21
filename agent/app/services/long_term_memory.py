"""Long-term memory extraction + storage.

Goal:
- Interpret the latest exchange in context and persist only *durable* facts
  (preferences, personal info, ongoing projects) that help future chats.
- Run in the background so the user response isn't blocked.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.models.state import AxisState
from app.services.backend_client import backend
from app.services.background import run_background
from app.services.llm_factory import create_llm

_ALLOWED_CATEGORIES = {"preference", "personal", "project", "contact", "other", "user_note"}

_MEMORY_TRIGGERS = (
    "remember",
    "note that",
    "my name is",
    "call me",
    "i prefer",
    "i like",
    "i don't like",
    "i do not like",
    "my favorite",
    "my favourite",
    "i am allergic",
    "i'm allergic",
    "my timezone",
    "my time zone",
    "working hours",
    "i work",
)

_SYSTEM_PROMPT = """\
You extract durable long-term memories about the user.

Rules:
- Only include memories that will still matter later (preferences, personal details,
  long-running projects/commitments).
- Do NOT include transient details (one-off questions, temporary plans) unless the
  user explicitly asks you to remember them.
- Do NOT store secrets (passwords, API keys, access tokens) or highly sensitive data.
- Write each memory as a short, standalone sentence.

Output ONLY valid JSON:
{
  "memories": [
    {"content": "...", "category": "preference|personal|project|contact|other|user_note"}
  ]
}

If intent is MEMORY_WRITE, you MUST return at least 1 memory capturing what
the user asked to remember.
"""


def _should_extract(state: AxisState) -> bool:
    if not state.user_input:
        return False

    if state.intent == "MEMORY_WRITE":
        return True

    text = state.user_input.lower()
    if any(trigger in text for trigger in _MEMORY_TRIGGERS):
        return True

    return False


def enqueue_long_term_memory_write(state: AxisState) -> None:
    """Best-effort: interpret + store long-term memory in the background."""

    if not state.final_response:
        return

    if not _should_extract(state):
        return

    run_background(_extract_and_store(state))


async def _extract_and_store(state: AxisState) -> None:
    try:
        llm = create_llm(
            profile=state.owner_profile,
            temperature=0,
            max_tokens=350,
        )
    except Exception:
        return

    recent_lines: list[str] = []
    for mem in (state.short_term_memory or [])[-12:]:
        role = (mem or {}).get("role", "user")
        msg = (mem or {}).get("message", "")
        if msg:
            recent_lines.append(f"{role}: {msg}")

    long_term_lines: list[str] = []
    for mem in (state.long_term_memory or [])[:5]:
        content = (mem or {}).get("content", "")
        if content:
            long_term_lines.append(f"- {content}")

    user_content = "\n".join(
        [
            f"Intent: {state.intent}",
            f"Latest user message: {state.user_input}",
            f"Assistant reply: {state.final_response}",
            "Recent conversation:\n" + ("\n".join(recent_lines) if recent_lines else "(none)"),
            "Existing long-term memory (may overlap):\n"
            + ("\n".join(long_term_lines) if long_term_lines else "(none)"),
        ]
    )

    try:
        resp = await llm.ainvoke(
            [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]
        )
    except Exception:
        return

    try:
        data = json.loads((resp.content or "").strip())
    except Exception:
        return

    memories = data.get("memories", []) if isinstance(data, dict) else []
    if not isinstance(memories, list):
        return

    for item in memories[:3]:
        if not isinstance(item, dict):
            continue
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        category = str(item.get("category", "other")).strip() or "other"
        if category not in _ALLOWED_CATEGORIES:
            category = "other"

        payload: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "content": content,
            "category": category,
        }

        try:
            await backend.store_long_term(payload)
        except Exception:
            # Best-effort; don't retry here.
            continue

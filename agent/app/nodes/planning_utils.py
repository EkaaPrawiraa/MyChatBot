"""Shared helpers for planner nodes.

We split planning into domain-specific nodes (gmail/calendar/drive/etc)
so each LLM prompt stays small and reduces cross-tool hallucinations.
"""

from __future__ import annotations

from datetime import datetime
import json

from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_PLANNING_FAILED
from app.models.state import AxisState, PlanStep
from app.services.llm_factory import create_llm


def _to_bool(value: object, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("true", "1", "yes", "y", "on"):
            return True
        if v in ("false", "0", "no", "n", "off"):
            return False
    return default


def _skill_settings(owner_profile: dict) -> tuple[int, str]:
    ai_skill = str((owner_profile or {}).get("ai_skill") or "").strip().lower()

    if ai_skill == "quick":
        return (
            250,
            "AI skill: QUICK (high priority). Prefer the smallest possible plan. "
            "Avoid multi-step or heavy tool usage unless strictly necessary. "
            "If unsure, ask one clarifying question instead of planning many steps.",
        )

    if ai_skill == "deep":
        return (
            700,
            "AI skill: DEEP (high priority). Plan carefully and completely. "
            "Include additional read-only steps to verify assumptions when useful.",
        )

    return (
        500,
        "AI skill: BALANCED (high priority). Plan what's needed without overkill.",
    )


def _build_user_content(state: AxisState) -> str:
    profile_snippet = (
        json.dumps(state.owner_profile, default=str)[:400]
        if state.owner_profile
        else "{}"
    )

    recent_lines: list[str] = []
    for mem in (state.short_term_memory or [])[-6:]:
        role = (mem or {}).get("role", "user")
        msg = (mem or {}).get("message", "")
        if msg:
            recent_lines.append(f"{role}: {msg}")

    long_term_lines: list[str] = []
    for mem in (state.long_term_memory or [])[:5]:
        content = (mem or {}).get("content", "")
        category = (mem or {}).get("category", "")
        if content:
            long_term_lines.append(
                f"- ({category}) {content}" if category else f"- {content}"
            )

    return (
        f"Current time: {state.now_local or state.now_utc} {(('(' + state.tz_local + ')') if state.tz_local else '')}\n"
        + (
            f"Today (local): {state.today_local} ({state.weekday_local})\n"
            if (state.today_local and state.weekday_local)
            else (f"Today (local): {state.today_local}\n" if state.today_local else "")
        )
        + f"Intent: {state.intent}\n"
        + f"LATEST USER MESSAGE (answer/plan for this): {state.user_input}\n"
        + f"Profile: {profile_snippet}\n"
        + f"Recent conversation:\n{chr(10).join(recent_lines) if recent_lines else '(none)'}\n"
        + f"Relevant long-term memory:\n{chr(10).join(long_term_lines) if long_term_lines else '(none)'}\n"
    )


async def plan_with_prompt(state: AxisState, *, system_prompt: str) -> dict:
    """Run the LLM planner with a domain-specific system prompt."""

    if state.intent == "CHAT":
        return {"plan": [], "requires_approval": False}

    owner_profile = state.owner_profile or {}
    _max_tokens, skill_prompt = _skill_settings(owner_profile)

    # Small additional clamp for empty/very short messages.
    max_tokens = _max_tokens
    if not (state.user_input or "").strip():
        max_tokens = min(max_tokens, 150)

    llm = create_llm(
        profile=owner_profile,
        temperature=0,
        max_tokens=max_tokens,
    )

    user_content = _build_user_content(state)

    try:
        response = await llm.ainvoke(
            [
                SystemMessage(content=system_prompt + "\n\n" + skill_prompt),
                HumanMessage(content=user_content),
            ]
        )
    except Exception as exc:
        return {
            "plan": [],
            "requires_approval": False,
            "error": f"{CODE_PLANNING_FAILED}: LLM call failed — {exc}",
        }

    try:
        data = json.loads((response.content or "").strip())
        steps = [PlanStep(**s) for s in data.get("steps", [])]
        return {"plan": steps, "requires_approval": False}
    except (json.JSONDecodeError, Exception) as exc:
        return {
            "plan": [],
            "requires_approval": False,
            "error": f"{CODE_PLANNING_FAILED}: failed to parse LLM plan output — {exc}",
        }


def local_midnight_range(state: AxisState) -> tuple[str, str]:
    """Return a best-effort [start,end] local-day RFC3339 range."""

    try:
        now = (
            datetime.fromisoformat(state.now_local)
            if state.now_local
            else datetime.now().astimezone()
        )
    except Exception:
        now = datetime.now().astimezone()

    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(hour=23, minute=59, second=59, microsecond=0)
    return start.isoformat(), end.isoformat()

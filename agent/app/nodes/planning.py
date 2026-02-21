"""Node 4 — Planning.

Uses the LLM to generate a structured execution plan (list of tool steps)
for TASK_EXECUTION, AUTOMATION_SETUP, etc.  Does NOT execute — only plans.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import json
from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_PLANNING_FAILED
from app.models.state import AxisState, PlanStep
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are the planning brain of Axis Assistant, a personal operational AI agent.
Given the user's message, intent, profile, and context, generate a structured plan.

Available tools (call the Go backend):

Tool input schemas (use these keys):

# Gmail
- gmail.unread: {"max_results": int}
- gmail.search: {"query": str, "max_results": int}
- gmail.categorized_unread: {"max_results": int}
- gmail.send: {"to": str, "subject": str, "body": str}

# Calendar
- calendar.list: {"time_min": "RFC3339 datetime", "time_max": "RFC3339 datetime", "max_results": int}
- calendar.create: {"summary": str, "start": "RFC3339 datetime", "end": "RFC3339 datetime", "description": str, "location": str, "attendees": [{"email": str}], "create_meet": bool}
- calendar.update: {"event_id": str, "summary": str, "start": "RFC3339 datetime", "end": "RFC3339 datetime", "description": str, "location": str}
- calendar.delete: {"event_id": str}
- calendar.availability: {"time_min": "RFC3339 datetime", "time_max": "RFC3339 datetime"}

# Contacts (Google People)
- people.search: {"query": str, "page_size": int}

# Drive
- drive.search: {"query": str, "page_size": int}

# YouTube
- youtube.analytics: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}

# WhatsApp
- whatsapp.send: {"to": str, "message": str}

Guidance:
- If the user asks to WhatsApp someone by *name* (not a phone number), plan a people.search step first, then whatsapp.send using the best matching phone number.

# Reminders
- reminder.create: {"title": str, "description": str, "scheduled_at": "RFC3339 datetime", "sent_via": ""}
    - scheduled_at MUST be RFC3339 (e.g. 2026-02-20T15:04:05Z)

# Memory
- memory.store: {"content": str, "category": str, "source": str}
    - Use this when the intent is MEMORY_WRITE or the user explicitly asks to remember something.

Respond ONLY with valid JSON:
{
  "steps": [
    {"tool": "tool_name", "input": {"key": "value"}}
    ]
}

Approvals are disabled in this system. Do NOT ask for or require approvals.
If the intent is CHAT, return an empty steps array.
If the intent is QUERY_ONLY, you MAY return read-only tool steps when helpful (gmail.unread/search/categorized_unread, calendar.list/availability, people.search, drive.search, youtube.analytics).
If the intent is MEMORY_WRITE, you MUST return exactly one step using memory.store.
"""


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


def _compute_requires_approval(
    steps: list[PlanStep],
    *,
    whatsapp_requires_approval: bool,
    guardrail_status: str,
) -> bool:
    # Approvals are disabled; always execute immediately.
    return False


async def planning(state: AxisState) -> dict:
    """Generate an execution plan from the user's request."""

    # Skip planning for pure chat.
    if state.intent == "CHAT":
        return {"plan": [], "requires_approval": False}

    # Deterministic read-only plan for common calendar lookups.
    if state.intent == "QUERY_ONLY":
        msg_lower = (state.user_input or "").lower()
        if any(k in msg_lower for k in ("meeting", "calendar", "schedule", "event", "appointment")):
            try:
                now = datetime.fromisoformat(state.now_local) if state.now_local else datetime.now().astimezone()
            except Exception:
                now = datetime.now().astimezone()
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            return {
                "plan": [
                    PlanStep(
                        tool="calendar.list",
                        input={
                            "time_min": start.isoformat(),
                            "time_max": end.isoformat(),
                            "max_results": 20,
                        },
                    )
                ],
                "requires_approval": False,
            }

    owner_profile = state.owner_profile or {}
    ai_skill = str(owner_profile.get("ai_skill") or "").strip().lower()
    whatsapp_requires_approval = _to_bool(owner_profile.get("whatsapp_requires_approval"), True)

    max_tokens = 500
    skill_prompt = ""
    if ai_skill == "quick":
        max_tokens = 250
        skill_prompt = (
            "AI skill: QUICK (high priority). Prefer the smallest possible plan. "
            "Avoid multi-step or heavy tool usage unless strictly necessary. "
            "If unsure, ask one clarifying question instead of planning many steps."
        )
    elif ai_skill == "deep":
        max_tokens = 700
        skill_prompt = (
            "AI skill: DEEP (high priority). Plan carefully and completely. "
            "Include additional read-only steps to verify assumptions when useful."
        )
    else:
        skill_prompt = (
            "AI skill: BALANCED (high priority). Plan what's needed without overkill."
        )

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0,
        max_tokens=max_tokens,
    )

    profile_snippet = json.dumps(state.owner_profile, default=str)[:400] if state.owner_profile else "{}"

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
            long_term_lines.append(f"- ({category}) {content}" if category else f"- {content}")

    user_content = (
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

    try:
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT + "\n\n" + skill_prompt),
            HumanMessage(content=user_content),
        ])
    except Exception as exc:
        return {
            "plan": [],
            "requires_approval": False,
            "error": f"{CODE_PLANNING_FAILED}: LLM call failed — {exc}",
        }

    try:
        data = json.loads(response.content.strip())
        steps = [PlanStep(**s) for s in data.get("steps", [])]

        return {"plan": steps, "requires_approval": False}
    except (json.JSONDecodeError, Exception) as exc:
        return {
            "plan": [],
            "requires_approval": False,
            "error": f"{CODE_PLANNING_FAILED}: failed to parse LLM plan output — {exc}",
        }

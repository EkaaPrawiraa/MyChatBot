"""Planning — Calendar-focused.

Keeps the prompt limited to Calendar (+ People search + reminder) to reduce tool confusion.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from app.models.state import AxisState, PlanStep
from app.nodes.planning_utils import local_midnight_range, plan_with_prompt


_SYSTEM_PROMPT = """\
You are the Calendar planning brain of Axis Assistant.
Given the user's message, intent, profile, and context, generate a structured tool plan.

Available tools (call the Go backend):

# Calendar
- calendar.list: {"time_min": "RFC3339 datetime", "time_max": "RFC3339 datetime", "max_results": int}
- calendar.create: {"summary": str, "start": "RFC3339 datetime", "end": "RFC3339 datetime", "description": str, "location": str, "attendees": [{"email": str}], "create_meet": bool}
- calendar.update: {"event_id": str, "summary": str, "start": "RFC3339 datetime", "end": "RFC3339 datetime", "description": str, "location": str}
- calendar.delete: {"event_id": str}
- calendar.availability: {"time_min": "RFC3339 datetime", "time_max": "RFC3339 datetime"}

# Contacts (Google People)
- people.search: {"query": str, "page_size": int}

# Reminders
- reminder.create: {"title": str, "description": str, "scheduled_at": "RFC3339 datetime", "sent_via": ""}
    - If the user asks to send the reminder via WhatsApp at the scheduled time, set sent_via to: "whatsapp:<phone>" (no spaces).

Guidance:
- For QUERY_ONLY calendar questions, prefer calendar.list or calendar.availability.
- scheduled_at MUST be RFC3339.

Respond ONLY with valid JSON:
{
  "steps": [
    {"tool": "tool_name", "input": {"key": "value"}}
  ]
}

Approvals are disabled in this system. Do NOT ask for approvals.
If the intent is CHAT, return an empty steps array.
If the intent is MEMORY_WRITE, return exactly one step using memory.store (do not do anything else).
"""


async def planning_calendar(state: AxisState) -> dict:
    # Deterministic read-only plan for common calendar lookups.
    if state.intent == "QUERY_ONLY":
        msg_lower = (state.user_input or "").lower()
        if any(k in msg_lower for k in ("meeting", "calendar", "schedule", "event", "appointment")):
            time_min, time_max = local_midnight_range(state)
            return {
                "plan": [
                    PlanStep(
                        tool="calendar.list",
                        input={"time_min": time_min, "time_max": time_max, "max_results": 20},
                    )
                ],
                "requires_approval": False,
            }

    return await plan_with_prompt(state, system_prompt=_SYSTEM_PROMPT)

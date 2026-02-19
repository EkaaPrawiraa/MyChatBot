"""Node 4 — Planning.

Uses the LLM to generate a structured execution plan (list of tool steps)
for TASK_EXECUTION, AUTOMATION_SETUP, etc.  Does NOT execute — only plans.
"""

from __future__ import annotations

import json
from langchain.schema import HumanMessage, SystemMessage

from app.errors import CODE_PLANNING_FAILED
from app.models.state import AxisState, PlanStep
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are the planning brain of Axis Assistant, a personal operational AI agent.
Given the user's message, intent, profile, and context, generate a structured plan.

Available tools (call the Go backend):
- gmail.search — search emails
- gmail.send — send an email
- gmail.unread — get unread count
- calendar.list — list events
- calendar.create — create an event
- calendar.update — update an event
- calendar.availability — check availability
- reminder.create — create a reminder
- memory.store — store a long-term memory note
- profile.update — update owner profile

Respond ONLY with valid JSON:
{
  "steps": [
    {"tool": "tool_name", "input": {"key": "value"}}
  ],
  "requires_approval": true/false
}

Set requires_approval = true for emails being sent, events created, or any destructive action.
If the intent is CHAT or QUERY_ONLY, return an empty steps array.
"""


async def planning(state: AxisState) -> dict:
    """Generate an execution plan from the user's request."""

    # Skip planning for pure chat / query intents.
    if state.intent in ("CHAT", "QUERY_ONLY"):
        return {"plan": [], "requires_approval": False}

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0,
        max_tokens=500,
    )

    profile_snippet = json.dumps(state.owner_profile, default=str)[:400] if state.owner_profile else "{}"

    user_content = (
        f"Intent: {state.intent}\n"
        f"Message: {state.user_input}\n"
        f"Profile: {profile_snippet}\n"
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
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
        return {"plan": steps, "requires_approval": data.get("requires_approval", False)}
    except (json.JSONDecodeError, Exception) as exc:
        return {
            "plan": [],
            "requires_approval": False,
            "error": f"{CODE_PLANNING_FAILED}: failed to parse LLM plan output — {exc}",
        }

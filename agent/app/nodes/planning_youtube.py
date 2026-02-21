"""Planning — YouTube analytics-focused."""

from __future__ import annotations

from app.models.state import AxisState
from app.nodes.planning_utils import plan_with_prompt


_SYSTEM_PROMPT = """\
You are the YouTube analytics planning brain of Axis Assistant.
Given the user's message, intent, profile, and context, generate a structured tool plan.

Available tools (call the Go backend):

# YouTube
- youtube.analytics: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}

Guidance:
- For QUERY_ONLY, using youtube.analytics is allowed.

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


async def planning_youtube(state: AxisState) -> dict:
    return await plan_with_prompt(state, system_prompt=_SYSTEM_PROMPT)

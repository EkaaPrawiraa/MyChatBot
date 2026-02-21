"""Planning — Gmail-focused.

Keeps the prompt limited to Gmail (+ People search) to reduce tool confusion.
"""

from __future__ import annotations

from app.models.state import AxisState
from app.nodes.planning_utils import plan_with_prompt


_SYSTEM_PROMPT = """\
You are the Gmail planning brain of Axis Assistant.
Given the user's message, intent, profile, and context, generate a structured tool plan.

Available tools (call the Go backend):

# Gmail
- gmail.unread: {"max_results": int}
- gmail.search: {"query": str, "max_results": int}
- gmail.categorized_unread: {"max_results": int}
- gmail.send: {"to": str, "subject": str, "body": str}

# Contacts (Google People)
- people.search: {"query": str, "page_size": int}

Guidance:
- If the user asks you to email someone by *name* (not an email address), plan people.search first, then gmail.send.
- For QUERY_ONLY: prefer gmail.unread, gmail.search, or gmail.categorized_unread.

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


async def planning_gmail(state: AxisState) -> dict:
    return await plan_with_prompt(state, system_prompt=_SYSTEM_PROMPT)

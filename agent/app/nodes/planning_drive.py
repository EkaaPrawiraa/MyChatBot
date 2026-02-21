"""Planning — Drive/Docs/Sheets-focused."""

from __future__ import annotations

from app.models.state import AxisState
from app.nodes.planning_utils import plan_with_prompt


_SYSTEM_PROMPT = """\
You are the Google Drive planning brain of Axis Assistant.
Given the user's message, intent, profile, and context, generate a structured tool plan.

Available tools (call the Go backend):

# Drive
- drive.search: {"query": str, "page_size": int}
- drive.export: {"file_id": str, "mime_type": str, "max_bytes": int}
- drive.create_text_file: {"name": str, "content": str, "mime_type": str, "parent_id": str}
- drive.create_google_doc: {"name": str, "content": str, "parent_id": str}
- drive.create_google_sheet: {"name": str, "csv": str, "parent_id": str}

Guidance:
- If the user asks to summarize a Google Doc/Sheet, plan drive.search (to find file_id) then drive.export.
  - For Google Docs: mime_type should be "text/plain".
  - For Google Sheets: mime_type can be "text/csv".
  - Keep max_bytes modest (e.g. 20000-50000).
- If the user asks to create a new file:
  - For a plain text file, use drive.create_text_file.
  - For a native Google Doc, use drive.create_google_doc.
  - For a native Google Sheet, use drive.create_google_sheet.

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


async def planning_drive(state: AxisState) -> dict:
    return await plan_with_prompt(state, system_prompt=_SYSTEM_PROMPT)

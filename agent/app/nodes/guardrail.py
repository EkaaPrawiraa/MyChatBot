"""Node 3 — Safety & Guardrail Check.

Scans the user message and the generated plan for dangerous actions.
Outputs one of: SAFE, REQUIRE_APPROVAL, BLOCK.
"""

from __future__ import annotations

from langchain.schema import HumanMessage, SystemMessage

from app.errors import CODE_GUARDRAIL_BLOCKED, CODE_LLM_ERROR
from app.models.state import AxisState
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are a safety guardrail for the Axis Assistant, a personal AI agent.
Given the user's message, intent, and any proposed plan steps, evaluate safety.

Respond in this exact format (two lines):
STATUS: <SAFE|REQUIRE_APPROVAL|BLOCK>
REASON: <brief explanation>

Rules:
- BLOCK: If the request is clearly harmful, illegal, or nonsensical abuse.
- REQUIRE_APPROVAL: If the request involves destructive actions (mass delete, mass send),
  sensitive data exposure, financial transactions, or anything with irreversible side effects.
- SAFE: Normal requests with no safety concerns.
"""


async def guardrail(state: AxisState) -> dict:
    """Evaluate safety of the current request."""

    # Simple intents can skip the LLM check.
    if state.intent in ("CHAT", "QUERY_ONLY"):
        return {"guardrail_status": "SAFE", "guardrail_reason": "low-risk intent"}

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0,
        max_tokens=60,
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=f"Intent: {state.intent}\nMessage: {state.user_input}"),
        ])
    except Exception as exc:
        # If guardrail LLM fails, default to SAFE so the pipeline can continue.
        return {
            "guardrail_status": "SAFE",
            "guardrail_reason": "",
            "error": f"{CODE_LLM_ERROR}: guardrail LLM call failed — {exc}",
        }

    text = response.content.strip()
    status_line = ""
    reason_line = ""
    for line in text.splitlines():
        if line.upper().startswith("STATUS:"):
            status_line = line.split(":", 1)[1].strip().upper()
        elif line.upper().startswith("REASON:"):
            reason_line = line.split(":", 1)[1].strip()

    valid_statuses = {"SAFE", "REQUIRE_APPROVAL", "BLOCK"}
    return {
        "guardrail_status": status_line if status_line in valid_statuses else "SAFE",
        "guardrail_reason": reason_line,
    }

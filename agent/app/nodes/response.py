"""Node 8 — Response Formatting.

Generates the final natural-language response using the LLM, incorporating
execution results, context, and the owner's communication style.
"""

from __future__ import annotations

import json

from langchain.schema import HumanMessage, SystemMessage

from app.errors import CODE_LLM_ERROR
from app.models.state import AxisState
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are Axis, a personal operational AI assistant (like Jarvis).
Compose a concise, helpful reply for your owner.

Guidelines:
- Be professional yet personable.
- Summarise what was done if tools were executed.
- If an error occurred, explain it clearly.
- If approval is pending, inform the owner.
- Keep replies focused — no filler.
"""


async def response_node(state: AxisState) -> dict:
    """Generate the final natural-language response."""

    # If already errored early, wrap it nicely.
    if state.guardrail_status == "BLOCK":
        return {
            "final_response": f"I can't proceed with that request. Reason: {state.guardrail_reason}"
        }

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0.7,
        max_tokens=600,
    )

    context_parts: list[str] = [
        f"User message: {state.user_input}",
        f"Intent: {state.intent}",
    ]

    if state.execution_results:
        context_parts.append(
            f"Execution results: {json.dumps(state.execution_results, default=str)[:800]}"
        )

    if state.requires_approval:
        context_parts.append(
            f"Approval is pending (ID: {state.approval_id}). The plan has NOT been executed yet."
        )

    if state.error:
        context_parts.append(f"Error: {state.error}")

    comm_style = state.owner_profile.get("communication_style", "")
    if comm_style:
        context_parts.append(f"Owner prefers: {comm_style} communication style.")

    try:
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content="\n".join(context_parts)),
        ])
        return {"final_response": response.content.strip()}
    except Exception as exc:
        return {
            "final_response": "Sorry, I encountered an error generating a response.",
            "error": f"{CODE_LLM_ERROR}: response generation failed — {exc}",
        }

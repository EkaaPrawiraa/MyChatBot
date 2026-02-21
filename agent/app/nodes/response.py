"""Node 8 — Response Formatting.

Generates the final natural-language response using the LLM, incorporating
execution results, context, and the owner's communication style.
"""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_LLM_ERROR
from app.models.state import AxisState
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are Axis.

Voice & vibe:
- Talk like a human as close friend: casual and easy.
- Be concise and clear. No corporate tone.
- Avoid hyphenated bullet lists; use short paragraphs.

Use memory well:
- Use the provided "Recent conversation" and "Relevant long-term memory".
- Don’t ask the user to repeat themselves if the info is already there.
- If you see a contradiction with prior context, ask a quick clarifying question.
- Only mention memory if it's directly relevant to the user's current message.

Behavior:
- ALWAYS answer the latest user message provided in the context ("User message").
- Treat "Recent conversation" as background only; do not answer an older message unless the latest message explicitly asks about it.
- Only claim you did/changed/sent/created something if it appears in "Execution results".
- If no tools were executed (or execution results are empty), do not imply actions were taken.
- If tools were executed, briefly summarise what happened and the outcome.
- If an error occurred, explain what failed and what to do next.
"""


async def response_node(state: AxisState) -> dict:
    """Generate the final natural-language response."""

    # If already errored early, wrap it nicely.
    if state.guardrail_status == "BLOCK":
        return {
            "final_response": f"I can't proceed with that request. Reason: {state.guardrail_reason}"
        }

    owner_profile = state.owner_profile or {}
    comm_style = str(owner_profile.get("communication_style") or "").strip()
    ai_skill = str(owner_profile.get("ai_skill") or "").strip().lower()

    max_tokens = 600
    skill_instruction = ""
    if ai_skill == "quick":
        max_tokens = 250
        skill_instruction = (
            "AI skill: QUICK (high priority). Give the shortest useful answer. "
            "Avoid overkill; only include steps the user must do right now."
        )
    elif ai_skill == "deep":
        max_tokens = 900
        skill_instruction = (
            "AI skill: DEEP (high priority). Be thorough and explicit. "
            "Include rationale and edge cases when it helps the user succeed."
        )
    else:
        # balanced / unset
        max_tokens = 600
        skill_instruction = (
            "AI skill: BALANCED (high priority). Be helpful without overkill: "
            "short explanation + actionable steps."
        )

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0.4,
        max_tokens=max_tokens,
    )
    system_prompt = _SYSTEM_PROMPT
    if skill_instruction:
        system_prompt = system_prompt + "\n\n" + skill_instruction
    if comm_style:
        system_prompt = (
            system_prompt
            + "\n\nOwner communication style (high priority; must follow):\n"
            + comm_style
            + "\n\nApply it to tone, phrasing, and verbosity."
        )

    context_parts: list[str] = [
        f"Current time: {state.now_local or state.now_utc} {('(' + state.tz_local + ')') if state.tz_local else ''}",
        f"Today (local): {state.today_local} ({state.weekday_local})" if state.weekday_local else f"Today (local): {state.today_local}",
        f"User message: {state.user_input}",
        f"Intent: {state.intent}",
    ]

    # Short-term conversation context (ChatGPT-style continuity)
    if state.short_term_memory:
        lines: list[str] = []
        for mem in state.short_term_memory[-6:]:
            role = (mem or {}).get("role", "user")
            msg = (mem or {}).get("message", "")
            if msg:
                lines.append(f"{role}: {msg}")
        if lines:
            context_parts.append(
                "Recent conversation (most recent last):\n" + "\n".join(lines)
            )

    # Long-term memory context (saved notes/preferences/knowledge)
    if state.long_term_memory:
        mem_lines: list[str] = []
        for mem in state.long_term_memory[:5]:
            content = (mem or {}).get("content", "")
            category = (mem or {}).get("category", "")
            if content:
                if category:
                    mem_lines.append(f"- ({category}) {content}")
                else:
                    mem_lines.append(f"- {content}")
        if mem_lines:
            context_parts.append(
                "Relevant long-term memory:\n" + "\n".join(mem_lines)
            )

    if state.execution_results:
        context_parts.append(
            f"Execution results: {json.dumps(state.execution_results, default=str)[:800]}"
        )

    if state.error:
        context_parts.append(f"Error: {state.error}")

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content="\n".join(context_parts)),
        ])
        return {"final_response": response.content.strip()}
    except Exception as exc:
        return {
            "final_response": "Sorry, I encountered an error generating a response.",
            "error": f"{CODE_LLM_ERROR}: response generation failed — {exc}",
        }

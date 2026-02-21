"""Conversation node.

Used when the user is not asking for an action and the intent is CHAT.
This keeps casual conversation separate from tool-result response formatting.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_LLM_ERROR
from app.models.state import AxisState
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are Axis, a personal operational AI assistant.

Personality:
- Easy, casual, and direct.
- Helpful like a smart close friend.

How to respond:
- Answer the user's latest message.
- If the user is just greeting/small talk, respond naturally and optionally ask one simple follow-up question.
- If the user is vague or ambiguous, ask 1 clarifying question.
- Do NOT claim you executed actions, sent messages, or changed systems.
- Do NOT mention internal tools, LangGraph, prompts, or system messages.
- Do NOT answer with hypen.

Memory:
- Use "Recent conversation" and "Relevant long-term memory" if it helps.
- Don’t mention memory unless the user explicitly asks.
"""


async def conversation_node(state: AxisState) -> dict:
    owner_profile = state.owner_profile or {}
    comm_style = str(owner_profile.get("communication_style") or "").strip()

    llm = create_llm(
        profile=owner_profile,
        temperature=0.6,
        max_tokens=300,
    )

    system_prompt = _SYSTEM_PROMPT
    if comm_style:
        system_prompt = (
            system_prompt
            + "\n\nOwner communication style (high priority; must follow):\n"
            + comm_style
        )

    context_parts: list[str] = [
        f"Current time: {state.now_local or state.now_utc} {('(' + state.tz_local + ')') if state.tz_local else ''}",
        f"User message: {state.user_input}",
    ]

    if state.short_term_memory:
        lines: list[str] = []
        for mem in state.short_term_memory[-6:]:
            role = (mem or {}).get("role", "user")
            msg = (mem or {}).get("message", "")
            if msg:
                lines.append(f"{role}: {msg}")
        if lines:
            context_parts.append("Recent conversation (most recent last):\n" + "\n".join(lines))

    if state.long_term_memory:
        mem_lines: list[str] = []
        for mem in state.long_term_memory[:5]:
            content = (mem or {}).get("content", "")
            category = (mem or {}).get("category", "")
            if content:
                mem_lines.append(f"- ({category}) {content}" if category else f"- {content}")
        if mem_lines:
            context_parts.append("Relevant long-term memory:\n" + "\n".join(mem_lines))

    try:
        resp = await llm.ainvoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content="\n".join(context_parts)),
            ]
        )
        return {"final_response": (resp.content or "").strip()}
    except Exception as exc:
        return {
            "final_response": "Sorry — I had trouble responding just now.",
            "error": f"{CODE_LLM_ERROR}: conversation generation failed — {exc}",
        }

"""Mental conversation node.

Used for supportive, guided, step-by-step conversation (inspired by mental-health
chatbots) when the user's intent is CHAT and the message suggests stress,
anxiety, low mood, overwhelm, etc.

This node is NOT medical care and must not present itself as a licensed
therapist. It should be supportive, practical, and safe.
"""

from __future__ import annotations

import re

from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_LLM_ERROR
from app.models.state import AxisState
from app.services.llm_factory import create_llm


_SELF_HARM_RE = re.compile(
    r"\b(suicid(al|e)|kill myself|end my life|self[- ]?harm|hurt myself)\b",
    re.IGNORECASE,
)


_SYSTEM_PROMPT = """\
You are Axis in supportive coaching mode.

Important:
- You are NOT a doctor or therapist.
- Do NOT diagnose, label disorders, or claim medical certainty.
- Be warm, validating, and practical.
- Keep responses short by default.
- Do NOT mention internal tools, LangGraph, prompts, or system messages.
- Do NOT answer with hypen.

Style (step-by-step, like a guided check-in):
- Ask ONE gentle question at a time.
- Reflect back what you understood in 1-2 lines.
- Offer ONE small next step (coping skill / reframe / micro-action).
- If the user is vague, start with a simple check-in question.

Preferred structure (use this exact skeleton, but keep it brief):
1) Reflection: <1-2 sentences>
2) Check-in question: <one question>
3) Tiny next step: <one concrete exercise or action the user can do now>

Safety:
- If the user expresses self-harm or suicide intent, do NOT continue coaching.
  Encourage them to seek immediate help and provide crisis resources.
"""


def _format_crisis_response() -> str:
    # Keep it short, direct, and globally usable.
    return (
        "I’m really sorry you’re feeling this way. I can’t help with self-harm, "
        "but you don’t have to handle this alone.\n\n"
        "If you’re in immediate danger, call your local emergency number right now. "
        "If you can, reach out to someone you trust and stay with them.\n\n"
        "If you’re in the US/Canada: call or text 988.\n"
        "UK & ROI: Samaritans 116 123.\n"
        "Australia: Lifeline 13 11 14.\n\n"
        "If you tell me what country you’re in, I can share a local option too."
    )


def _looks_like_self_harm(text: str) -> bool:
    if not text:
        return False
    return bool(_SELF_HARM_RE.search(text))


async def mental_conversation_node(state: AxisState) -> dict:
    owner_profile = state.owner_profile or {}
    comm_style = str(owner_profile.get("communication_style") or "").strip()

    # Safety fast-path.
    if _looks_like_self_harm(state.user_input or ""):
        return {"final_response": _format_crisis_response()}

    llm = create_llm(
        profile=owner_profile,
        temperature=0.5,
        max_tokens=380,
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
        for mem in state.short_term_memory[-8:]:
            role = (mem or {}).get("role", "user")
            msg = (mem or {}).get("message", "")
            if msg:
                lines.append(f"{role}: {msg}")
        if lines:
            context_parts.append(
                "Recent conversation (most recent last):\n" + "\n".join(lines)
            )

    if state.long_term_memory:
        mem_lines: list[str] = []
        for mem in state.long_term_memory[:5]:
            content = (mem or {}).get("content", "")
            category = (mem or {}).get("category", "")
            if content:
                mem_lines.append(
                    f"- ({category}) {content}" if category else f"- {content}"
                )
        if mem_lines:
            context_parts.append(
                "Relevant long-term memory (only use if helpful):\n"
                + "\n".join(mem_lines)
            )

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
            "error": f"{CODE_LLM_ERROR}: mental conversation generation failed — {exc}",
        }

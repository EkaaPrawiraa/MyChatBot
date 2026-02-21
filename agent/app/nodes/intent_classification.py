"""Node 2 — Intent Classification.

Uses the LLM to classify the user's message into one of the predefined intents
that drive downstream routing.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from app.errors import CODE_INTENT_FAILED
from app.models.state import AxisState
from app.services.llm_factory import create_llm

_SYSTEM_PROMPT = """\
You are an intent classifier for the Axis Assistant, a personal operational AI agent.
Given the user's message and conversation context, classify the intent into EXACTLY one of:

- CHAT: Casual conversation, greetings, small talk.
- TASK_EXECUTION: The user wants you to DO something (send email, create event, etc.).
- QUERY_ONLY: The user wants information or a lookup (no side effects).
- DAILY_BRIEFING: The user asks for their daily summary / briefing.
- AUTOMATION_SETUP: The user wants to set up an automated rule or trigger.
- MEMORY_WRITE: The user explicitly wants to store a note or preference.
- SYSTEM_ACTION: Administrative actions (clear session, update profile, etc.).

Guidance:
- If the user asks to set a reminder ("remind me...", "set a reminder..."), classify as TASK_EXECUTION.
- If the user asks to schedule something on a calendar, classify as TASK_EXECUTION.

Respond with ONLY the intent label, nothing else.
"""


async def intent_classification(state: AxisState) -> dict:
    """Classify user intent via LLM and set state.intent."""

    msg_lower = (state.user_input or "").lower()

    # Fast-path heuristics for common operational commands.
    # This reduces LLM misclassification for tool-driven actions.
    if any(k in msg_lower for k in ("whatsapp", "wa ", " wa", "send whatsapp", "send wa")):
        return {"intent": "TASK_EXECUTION"}

    if (
        ("google doc" in msg_lower or "gdoc" in msg_lower or "google docs" in msg_lower)
        and any(k in msg_lower for k in ("create", "make", "write", "new", "generate"))
    ):
        return {"intent": "TASK_EXECUTION"}

    if (
        ("google sheet" in msg_lower or "gsheet" in msg_lower or "google sheets" in msg_lower)
        and any(k in msg_lower for k in ("create", "make", "new", "generate"))
    ):
        return {"intent": "TASK_EXECUTION"}

    if any(
        k in msg_lower
        for k in (
            "phone number",
            "contact number",
            "what's the number",
            "whats the number",
            "number of ",
            "get number",
            "find number",
        )
    ):
        return {"intent": "QUERY_ONLY"}

    if any(
        phrase in msg_lower
        for phrase in (
            "remember",
            "note this",
            "note down",
            "save this",
            "store this",
            "my name is",
            "i prefer",
        )
    ):
        return {"intent": "MEMORY_WRITE"}

    llm = create_llm(
        profile=state.owner_profile,
        temperature=0,
        max_tokens=20,
    )

    # Build a lightweight conversation snippet for context.
    context_lines: list[str] = []
    for mem in state.short_term_memory[-6:]:
        role = mem.get("role", "user")
        msg = mem.get("message", "")
        context_lines.append(f"{role}: {msg}")
    context_str = "\n".join(context_lines) if context_lines else "(no prior context)"

    user_content = (
        f"Current time: {state.now_local or state.now_utc} {('(' + state.tz_local + ')') if state.tz_local else ''}\n"
        + (f"Today (local): {state.today_local} ({state.weekday_local})\n" if state.today_local else "")
        +
        f"Conversation context:\n{context_str}\n\n"
        f"Latest message: {state.user_input}"
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=user_content),
        ])
    except Exception as exc:
        return {"intent": "CHAT", "error": f"{CODE_INTENT_FAILED}: {exc}"}

    label = response.content.strip().upper()

    valid = {
        "CHAT", "TASK_EXECUTION", "QUERY_ONLY", "DAILY_BRIEFING",
        "AUTOMATION_SETUP", "MEMORY_WRITE", "SYSTEM_ACTION",
    }
    return {"intent": label if label in valid else "CHAT"}

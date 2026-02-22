"""LangGraph graph definition for the Axis Assistant agent.

Implements the main execution graph:
  START → load_context → intent_classification → guardrail →
    planning_* → plan_validation → [approval check] → execution →
  response → memory_update → END
"""

from __future__ import annotations

from langgraph.graph import StateGraph, END

from app.models.state import AxisState
from app.nodes.load_context import load_context
from app.nodes.intent_classification import intent_classification
from app.nodes.guardrail import guardrail
from app.nodes.planning_main import planning_main
from app.nodes.planning_gmail import planning_gmail
from app.nodes.planning_calendar import planning_calendar
from app.nodes.planning_drive import planning_drive
from app.nodes.planning_whatsapp import planning_whatsapp
from app.nodes.planning_youtube import planning_youtube
from app.nodes.plan_validation import plan_validation
from app.nodes.execution import execution
from app.nodes.memory_update import memory_update
from app.nodes.response import response_node
from app.nodes.activity_log import activity_log
from app.nodes.conversation import conversation_node
from app.nodes.mental_conversation import mental_conversation_node



# ---------- conditional edges ----------

def _looks_like_mental_chat(state: AxisState) -> bool:
    msg = (state.user_input or "").lower()
    keywords = (
        "anxious",
        "anxiety",
        "panic",
        "panic attack",
        "stressed",
        "stress",
        "overwhelmed",
        "burnout",
        "sad",
        "depressed",
        "depression",
        "lonely",
        "grief",
        "overthinking",
        "ruminating",
        "rumination",
        "can't sleep",
        "cannot sleep",
        "insomnia",
        "therapy",
        "therapist",
        "mental health",
        "coping",
        "grounding",
        "mindfulness",
        "intrusive thoughts",
    )

    if any(k in msg for k in keywords):
        return True

    # If recent context shows the same theme, stay in this mode.
    for mem in (state.short_term_memory or [])[-6:]:
        if (mem or {}).get("role") != "user":
            continue
        prior = str((mem or {}).get("message") or "").lower()
        if any(k in prior for k in keywords):
            return True

    return False

def _after_guardrail(state: AxisState) -> str:
    """Route after guardrail check."""
    if state.guardrail_status == "BLOCK":
        return "response"

    # Pure chat: use the dedicated conversation node.
    if state.intent == "CHAT":
        return "mental_conversation" if _looks_like_mental_chat(state) else "conversation"

    msg = (state.user_input or "").lower()

    hits: list[str] = []
    if any(k in msg for k in ("gmail", "email", "inbox")):
        hits.append("planning_gmail")
    if any(k in msg for k in ("calendar", "meeting", "schedule", "event", "appointment")):
        hits.append("planning_calendar")
    if any(k in msg for k in ("drive", "google doc", "docs", "sheet", "sheets", "spreadsheet", "document", "file")):
        hits.append("planning_drive")
    if "whatsapp" in msg or "wa " in msg:
        hits.append("planning_whatsapp")
    if "youtube" in msg:
        hits.append("planning_youtube")

    # If multiple domains are requested, use the main planner to coordinate.
    if len(set(hits)) == 1:
        return hits[0]

    return "planning_main"


def _after_plan_validation(state: AxisState) -> str:
    """Route after plan validation.

    Approvals are disabled: execute immediately.
    """
    return "execution"


# ---------- build graph ----------

def build_graph() -> StateGraph:
    """Construct and return the compiled LangGraph."""

    graph = StateGraph(AxisState)

    # Add nodes
    graph.add_node("load_context", load_context)
    graph.add_node("intent_classification", intent_classification)
    graph.add_node("guardrail", guardrail)
    graph.add_node("planning_main", planning_main)
    graph.add_node("planning_gmail", planning_gmail)
    graph.add_node("planning_calendar", planning_calendar)
    graph.add_node("planning_drive", planning_drive)
    graph.add_node("planning_whatsapp", planning_whatsapp)
    graph.add_node("planning_youtube", planning_youtube)
    graph.add_node("plan_validation", plan_validation)
    graph.add_node("execution", execution)
    graph.add_node("activity_log", activity_log)
    graph.add_node("conversation", conversation_node)
    graph.add_node("mental_conversation", mental_conversation_node)
    graph.add_node("response", response_node)
    graph.add_node("memory_update", memory_update)

    # Linear edges
    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "intent_classification")
    graph.add_edge("intent_classification", "guardrail")

    # Conditional after guardrail
    graph.add_conditional_edges("guardrail", _after_guardrail, {
        "response": "response",
        "conversation": "conversation",
        "mental_conversation": "mental_conversation",
        "planning_main": "planning_main",
        "planning_gmail": "planning_gmail",
        "planning_calendar": "planning_calendar",
        "planning_drive": "planning_drive",
        "planning_whatsapp": "planning_whatsapp",
        "planning_youtube": "planning_youtube",
    })

    # Chat path: conversation → memory update → END
    graph.add_edge("conversation", "memory_update")
    graph.add_edge("mental_conversation", "memory_update")

    graph.add_edge("planning_main", "plan_validation")
    graph.add_edge("planning_gmail", "plan_validation")
    graph.add_edge("planning_calendar", "plan_validation")
    graph.add_edge("planning_drive", "plan_validation")
    graph.add_edge("planning_whatsapp", "plan_validation")
    graph.add_edge("planning_youtube", "plan_validation")

    # Conditional after plan validation
    graph.add_conditional_edges("plan_validation", _after_plan_validation, {
        "execution": "execution",
    })

    # Execution → activity log → response
    graph.add_edge("execution", "activity_log")

    graph.add_edge("activity_log", "response")

    # Response → memory update → END
    graph.add_edge("response", "memory_update")
    graph.add_edge("memory_update", END)

    return graph.compile()


# Pre-compiled graph singleton
agent_graph = build_graph()

"""LangGraph graph definition for the Axis Assistant agent.

Implements the main execution graph:
  START → load_context → intent_classification → guardrail →
  planning → plan_validation → [approval check] → execution →
  response → memory_update → END
"""

from __future__ import annotations

from langgraph.graph import StateGraph, END

from app.models.state import AxisState
from app.nodes.load_context import load_context
from app.nodes.intent_classification import intent_classification
from app.nodes.guardrail import guardrail
from app.nodes.planning import planning
from app.nodes.plan_validation import plan_validation
from app.nodes.execution import execution
from app.nodes.memory_update import memory_update
from app.nodes.response import response_node
from app.nodes.activity_log import activity_log



# ---------- conditional edges ----------

def _after_guardrail(state: AxisState) -> str:
    """Route after guardrail check."""
    if state.guardrail_status == "BLOCK":
        return "response"
    return "planning"


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
    graph.add_node("planning", planning)
    graph.add_node("plan_validation", plan_validation)
    graph.add_node("execution", execution)
    graph.add_node("activity_log", activity_log)
    graph.add_node("response", response_node)
    graph.add_node("memory_update", memory_update)

    # Linear edges
    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "intent_classification")
    graph.add_edge("intent_classification", "guardrail")

    # Conditional after guardrail
    graph.add_conditional_edges("guardrail", _after_guardrail, {
        "response": "response",
        "planning": "planning",
    })

    graph.add_edge("planning", "plan_validation")

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

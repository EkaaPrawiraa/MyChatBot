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
from app.services.backend_client import backend


# ---------- conditional edges ----------

def _after_guardrail(state: AxisState) -> str:
    """Route after guardrail check."""
    if state.guardrail_status == "BLOCK":
        return "response"
    return "planning"


def _after_plan_validation(state: AxisState) -> str:
    """Route after plan validation — skip execution if approval needed."""
    if state.requires_approval and state.guardrail_status == "REQUIRE_APPROVAL":
        return "approval"
    if state.requires_approval:
        return "approval"
    return "execution"


async def _human_approval_node(state: AxisState) -> dict:
    """Create an approval request in the backend and pause execution.

    The graph returns a response telling the owner that approval is pending.
    When the owner approves via the dashboard, a separate invocation will
    resume execution (Phase 2+).
    """
    import json
    import uuid

    approval_id = str(uuid.uuid4())
    try:
        await backend.create_approval({
            "id": approval_id,
            "session_id": state.session_id,
            "proposed_plan": json.dumps([s.model_dump() for s in state.plan]).encode(),
            "status": "pending",
        })
    except Exception:
        pass

    # Don't execute — jump straight to response.
    return {"approval_id": approval_id}


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
    graph.add_node("approval", _human_approval_node)
    graph.add_node("execution", execution)
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
        "approval": "approval",
        "execution": "execution",
    })

    # Approval → response (no execution yet)
    graph.add_edge("approval", "response")

    # Execution → response
    graph.add_edge("execution", "response")

    # Response → memory update → END
    graph.add_edge("response", "memory_update")
    graph.add_edge("memory_update", END)

    return graph.compile()


# Pre-compiled graph singleton
agent_graph = build_graph()

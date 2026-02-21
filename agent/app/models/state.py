"""LangGraph state definition for the Axis Assistant agent."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class PlanStep(BaseModel):
    """A single step in an execution plan."""
    tool: str
    input: dict[str, Any] = Field(default_factory=dict)
    result: Any | None = None
    success: bool | None = None
    error: str | None = None


class AxisState(BaseModel):
    """
    TypedDict-style state that flows through every LangGraph node.

    Single-user design — no user_id field.
    """

    # Input
    session_id: str = ""
    user_input: str = ""

    # Time context (populated at request entrypoint)
    # These are strings so they serialize cleanly through LangGraph.
    now_utc: str = ""          # ISO8601, e.g. 2026-02-21T12:34:56+00:00
    now_local: str = ""        # ISO8601 in server local tz
    today_local: str = ""      # YYYY-MM-DD
    weekday_local: str = ""    # e.g. Monday, Tuesday
    tz_local: str = ""         # e.g. WIB, PST, UTC

    # Context (populated by load_context)
    short_term_memory: list[dict[str, Any]] = Field(default_factory=list)
    long_term_memory: list[dict[str, Any]] = Field(default_factory=list)
    owner_profile: dict[str, Any] = Field(default_factory=dict)

    # Intent
    intent: Literal[
        "CHAT",
        "TASK_EXECUTION",
        "QUERY_ONLY",
        "DAILY_BRIEFING",
        "AUTOMATION_SETUP",
        "MEMORY_WRITE",
        "SYSTEM_ACTION",
        "",
    ] = ""

    # Guardrail
    guardrail_status: Literal["SAFE", "BLOCK", ""] = ""
    guardrail_reason: str = ""

    # Planning
    plan: list[PlanStep] = Field(default_factory=list)
    requires_approval: bool = False
    approval_id: str = ""

    # Execution
    execution_results: list[dict[str, Any]] = Field(default_factory=list)

    # Logging
    tools_used: list[str] = Field(default_factory=list)
    latency_ms: int = 0
    token_usage: int = 0

    # Response
    final_response: str = ""
    error: str = ""

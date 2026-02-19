"""Standardised error codes and response format for the Python agent.

The agent uses the same error-code grammar as the Go backend:

    <service>.<category>

This ensures that when errors bubble up from agent → backend → frontend,
the source is always identifiable from the code prefix.

Agent-specific codes
--------------------
  agent.llm_error          – LLM provider call failed
  agent.intent_failed      – intent classification failed
  agent.planning_failed    – plan generation failed
  agent.execution_failed   – tool execution failed
  agent.guardrail_blocked  – request blocked by safety check
  agent.validation_error   – bad input to the orchestrator
  agent.internal_error     – unexpected internal failure
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

# ---- Error codes ----

CODE_LLM_ERROR = "agent.llm_error"
CODE_INTENT_FAILED = "agent.intent_failed"
CODE_PLANNING_FAILED = "agent.planning_failed"
CODE_EXECUTION_FAILED = "agent.execution_failed"
CODE_GUARDRAIL_BLOCKED = "agent.guardrail_blocked"
CODE_VALIDATION = "agent.validation_error"
CODE_INTERNAL = "agent.internal_error"
CODE_UNAUTHORIZED = "agent.unauthorized"


# ---- Structured error ----

class AgentError(Exception):
    """Application error with a machine-readable code."""

    def __init__(self, code: str, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# ---- Standard response envelope (mirrors Go backend) ----

class ErrorBody(BaseModel):
    code: str
    message: str


class Meta(BaseModel):
    request_id: str = ""
    timestamp: str = ""


class Envelope(BaseModel):
    success: bool
    data: Any | None = None
    error: ErrorBody | None = None
    meta: Meta = Meta()

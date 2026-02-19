"""Node 6 — Execution.

Iterates over plan steps and calls the Go backend tool services.
Records results, retries once on transient failures.
"""

from __future__ import annotations

import json
import time

from app.errors import CODE_EXECUTION_FAILED
from app.models.state import AxisState
from app.services.backend_client import backend


# Maps tool name → (HTTP method helper, path template).
# For Phase 1 scaffold, most tools route to a placeholder on the backend.
# The backend will grow real service endpoints (Gmail, Calendar) in later phases.
_TOOL_ROUTES: dict[str, tuple[str, str]] = {
    # For now, all tool calls are POSTed to a generic internal endpoint.
    # Real implementations will map to specific Go service routes.
}


async def _execute_step(tool: str, input_data: dict) -> dict:
    """Dispatch a single tool call to the Go backend."""
    # Phase-1 fallback: echo the intent so the graph can progress.
    # In production, each tool will have a real backend endpoint.
    return {"tool": tool, "input": input_data, "result": "tool_not_implemented_yet"}


async def execution(state: AxisState) -> dict:
    """Execute each validated plan step sequentially."""

    if not state.plan:
        return {}

    results: list[dict] = []
    tools_used: list[str] = []
    start = time.time()

    for step in state.plan:
        try:
            result = await _execute_step(step.tool, step.input)
            step.result = result
            step.success = True
        except Exception as exc:
            # Retry once
            try:
                result = await _execute_step(step.tool, step.input)
                step.result = result
                step.success = True
            except Exception as retry_exc:
                step.success = False
                step.error = f"{CODE_EXECUTION_FAILED}: {retry_exc}"

        results.append(step.model_dump())
        tools_used.append(step.tool)

    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "execution_results": results,
        "tools_used": tools_used,
        "latency_ms": elapsed_ms,
    }

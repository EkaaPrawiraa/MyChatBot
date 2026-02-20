"""Node — Activity Log.

Persists an execution trace to the Go backend (internal API).
This powers the dashboard Activities page and helps debug tool execution.
"""

from __future__ import annotations

import uuid

from app.models.state import AxisState
from app.services.backend_client import backend


def _to_plain(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj


async def activity_log(state: AxisState) -> dict:
    plan = [_to_plain(s) for s in (state.plan or [])]

    execution_results = state.execution_results or []
    tools_used = state.tools_used or []

    success = not bool(state.error)

    payload = {
        "id": str(uuid.uuid4()),
        "session_id": state.session_id or "",
        "user_query": state.user_input or "",
        "intent": state.intent or "",
        "execution_plan": plan,
        "tools_used": tools_used,
        "execution_results": execution_results,
        "success": success,
        "error_message": state.error or "",
        "latency_ms": int(state.latency_ms or 0),
        "token_usage": int(state.token_usage or 0),
    }

    try:
        await backend.log_activity(payload)
    except Exception:
        # best-effort
        pass

    return {}

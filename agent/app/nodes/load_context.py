"""Node 1 — Load Context.

Retrieves short-term memory, long-term (vector) memory, and the owner profile
from the Go backend to enrich the state before intent classification.
"""

from __future__ import annotations

from app.models.state import AxisState
from app.services.backend_client import backend


async def load_context(state: AxisState) -> dict:
    """Populate context fields from Go backend services."""

    updates: dict = {}

    # Short-term memory (recent conversation in this session)
    if state.session_id:
        try:
            resp = await backend.get_short_term(state.session_id, limit=20)
            updates["short_term_memory"] = resp.get("data") or []
        except Exception:
            updates["short_term_memory"] = []

    # Long-term vector memory (semantically relevant past knowledge)
    if state.user_input:
        try:
            resp = await backend.vector_search(state.user_input, limit=5)
            updates["long_term_memory"] = resp.get("data") or []
        except Exception:
            updates["long_term_memory"] = []

    # Owner profile (preferences, work patterns, etc.)
    try:
        resp = await backend.get_profile()
        updates["owner_profile"] = resp.get("data") or {}
    except Exception:
        updates["owner_profile"] = {}

    return updates

"""Node 7 — Memory Update.

Stores the current exchange in short-term memory and, when appropriate,
writes a long-term embedding via the Go backend.
"""

from __future__ import annotations

import uuid

from app.models.state import AxisState
from app.services.backend_client import backend


async def memory_update(state: AxisState) -> dict:
    """Persist conversation turns and optionally store long-term knowledge."""

    # --- Short-term: store user message ---
    if state.session_id and state.user_input:
        try:
            await backend.store_short_term({
                "id": str(uuid.uuid4()),
                "session_id": state.session_id,
                "role": "user",
                "message": state.user_input,
            })
        except Exception:
            pass  # best-effort

    # --- Short-term: store assistant reply ---
    if state.session_id and state.final_response:
        try:
            await backend.store_short_term({
                "id": str(uuid.uuid4()),
                "session_id": state.session_id,
                "role": "assistant",
                "message": state.final_response,
            })
        except Exception:
            pass

    # --- Long-term: store if the intent was MEMORY_WRITE ---
    if state.intent == "MEMORY_WRITE" and state.user_input:
        try:
            await backend.store_long_term({
                "id": str(uuid.uuid4()),
                "content": state.user_input,
                "category": "user_note",
            })
        except Exception:
            pass

    return {}

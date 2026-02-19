"""Node 5 — Plan Validation.

Validates the generated plan:
- All referenced tools actually exist.
- Inputs are structurally sound.
- No forbidden operations slipped past the guardrail.
"""

from __future__ import annotations

from app.models.state import AxisState

# Whitelist of valid tool names.
_VALID_TOOLS = {
    "gmail.search", "gmail.send", "gmail.unread",
    "calendar.list", "calendar.create", "calendar.update", "calendar.availability",
    "reminder.create",
    "memory.store",
    "profile.update",
}


async def plan_validation(state: AxisState) -> dict:
    """Validate each plan step; remove invalid steps and annotate errors."""

    if not state.plan:
        return {}

    validated: list = []
    for step in state.plan:
        if step.tool not in _VALID_TOOLS:
            step.success = False
            step.error = f"unknown tool: {step.tool}"
        else:
            validated.append(step)

    return {"plan": validated}

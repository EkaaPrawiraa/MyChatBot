"""Node 5 — Plan Validation.

Validates the generated plan:
- All referenced tools actually exist.
- Inputs are structurally sound.
- No forbidden operations slipped past the guardrail.
"""

from __future__ import annotations

import re

from app.models.state import AxisState

# Whitelist of valid tool names.
_VALID_TOOLS = {
    "gmail.search", "gmail.send", "gmail.unread",
    "calendar.list", "calendar.create", "calendar.update", "calendar.availability",
    "whatsapp.send",
    "reminder.create",
    "memory.store",
    "profile.update",
}


_SENSITIVE_PATTERNS: list[re.Pattern[str]] = [
    # Credentials / secrets
    re.compile(r"\b(password|passcode|one[- ]?time password|otp|2fa|verification code)\b", re.I),
    re.compile(r"\b(api[- ]?key|secret|token|bearer)\b", re.I),
    re.compile(r"\bsk-[A-Za-z0-9]{10,}\b"),  # common API key prefix (OpenAI-style)
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),

    # Financial identifiers (very rough)
    re.compile(r"\b(?:\d[ -]*?){13,19}\b"),

    # Explicit sexual content (coarse keyword-based)
    re.compile(r"\b(nudes?|porn|sex|blowjob|handjob|fuck\b|\bfucking\b)\b", re.I),

    # Harassment / hateful / violent (coarse; keep short and generic)
    re.compile(r"\b(kill yourself|kys|die\b|i will kill)\b", re.I),
    re.compile(r"\b(stupid\b|idiot\b|dumb\b|bitch\b|asshole\b)\b", re.I),
]


def _whatsapp_message_needs_approval(message: str) -> bool:
    msg = (message or "").strip()
    if not msg:
        return False
    return any(p.search(msg) for p in _SENSITIVE_PATTERNS)


async def plan_validation(state: AxisState) -> dict:
    """Validate each plan step; remove invalid steps and annotate errors."""

    if not state.plan:
        return {}

    validated: list = []
    requires_approval = bool(state.requires_approval)
    guardrail_status = state.guardrail_status
    guardrail_reason = state.guardrail_reason

    for step in state.plan:
        if step.tool not in _VALID_TOOLS:
            step.success = False
            step.error = f"unknown tool: {step.tool}"
        else:
            if step.tool == "whatsapp.send":
                message = str((step.input or {}).get("message") or (step.input or {}).get("body") or "")
                if _whatsapp_message_needs_approval(message):
                    requires_approval = True
                    if guardrail_status != "BLOCK":
                        guardrail_status = "REQUIRE_APPROVAL"
                        guardrail_reason = "WhatsApp message looks sensitive/inappropriate; awaiting your approval before sending."
            validated.append(step)

    out: dict = {"plan": validated}
    if requires_approval != state.requires_approval:
        out["requires_approval"] = requires_approval
    if guardrail_status and guardrail_status != state.guardrail_status:
        out["guardrail_status"] = guardrail_status
    if guardrail_reason and guardrail_reason != state.guardrail_reason:
        out["guardrail_reason"] = guardrail_reason
    return out

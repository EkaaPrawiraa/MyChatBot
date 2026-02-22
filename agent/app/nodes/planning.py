"""Node 4 — Planning.

Compatibility wrapper: the general-purpose planner lives in
`app.nodes.planning_main` as `planning_main`.

We keep `planning` exported here so existing imports keep working.
"""

from __future__ import annotations

from app.models.state import AxisState
from app.nodes.planning_main import planning_main
from app.services.llm_factory import create_llm


async def planning(state: AxisState) -> dict:
	return await planning_main(state, llm_factory=create_llm)

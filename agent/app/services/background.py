"""Lightweight background task scheduler.

Used to run best-effort, non-blocking work (e.g. long-term memory extraction)
without delaying the main request/response path.

This is intentionally minimal: tasks are kept in a module-level set so they
aren't garbage-collected early, and exceptions are logged.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable

logger = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task[Any]] = set()


def run_background(coro: Awaitable[Any]) -> None:
    """Schedule *coro* to run in the background (best-effort).

    If no running event loop exists (shouldn't happen under FastAPI), this
    becomes a no-op.
    """

    try:
        task: asyncio.Task[Any] = asyncio.create_task(coro)
    except RuntimeError:
        return

    _background_tasks.add(task)

    def _done(t: asyncio.Task[Any]) -> None:
        _background_tasks.discard(t)
        try:
            exc = t.exception()
        except asyncio.CancelledError:
            return
        except Exception:
            logger.exception("Failed reading background task exception")
            return

        if exc:
            logger.exception("Background task failed", exc_info=exc)

    task.add_done_callback(_done)

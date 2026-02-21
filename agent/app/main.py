"""FastAPI entry point for the Axis Assistant AI orchestrator.

All responses follow the standard envelope::

    {
        "success": true/false,
        "data": { ... } | null,
        "error": { "code": "agent.<category>", "message": "..." } | null,
        "meta": { "request_id": "...", "timestamp": "..." }
    }
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, File, Header, Request, UploadFile
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import settings
from app.errors import (
    CODE_INTERNAL,
    CODE_UNAUTHORIZED,
    CODE_VALIDATION,
    AgentError,
    Envelope,
    ErrorBody,
    Meta,
)
from app.graph import agent_graph
from app.models.state import AxisState
from app.services.backend_client import backend

app = FastAPI(
    title="Axis Assistant — AI Orchestrator",
    version="0.1.0",
)


# ---------- Helpers ----------

def _meta(request: Request) -> Meta:
    """Build response metadata with request-id propagation."""
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    return Meta(
        request_id=rid,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _ok(request: Request, data: dict) -> JSONResponse:
    body = Envelope(success=True, data=data, meta=_meta(request))
    return JSONResponse(content=body.model_dump(), status_code=200)


def _err(request: Request, error: AgentError) -> JSONResponse:
    body = Envelope(
        success=False,
        error=ErrorBody(code=error.code, message=error.message),
        meta=_meta(request),
    )
    return JSONResponse(content=body.model_dump(), status_code=error.status)


# ---------- Exception handlers ----------

@app.exception_handler(AgentError)
async def agent_error_handler(request: Request, exc: AgentError) -> JSONResponse:
    return _err(request, exc)


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return _err(request, AgentError(CODE_INTERNAL, str(exc), 500))


# ---------- Middleware — propagate X-Request-ID ----------

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


# ---------- Auth ----------

def _verify_key(x_api_key: str) -> None:
    if x_api_key != settings.api_key:
        raise AgentError(CODE_UNAUTHORIZED, "invalid API key", 401)


# ---------- Request model ----------

class OrchestrateRequest(BaseModel):
    session_id: str
    message: str


# ---------- Routes ----------

@app.get("/health")
async def health(request: Request):
    return _ok(request, {"status": "ok"})


@app.post("/orchestrate")
async def orchestrate(
    req: OrchestrateRequest,
    request: Request,
    x_api_key: str = Header(...),
):
    _verify_key(x_api_key)

    if not req.session_id or not req.message:
        raise AgentError(CODE_VALIDATION, "session_id and message are required", 400)

    start = time.time()

    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()

    initial_state = AxisState(
        session_id=req.session_id,
        user_input=req.message,
        now_utc=now_utc.isoformat(),
        now_local=now_local.isoformat(),
        today_local=now_local.date().isoformat(),
        weekday_local=now_local.strftime("%A"),
        tz_local=now_local.tzname() or "",
    )

    # Run the LangGraph — pass dict so all channel defaults are explicit
    final_state = await agent_graph.ainvoke(initial_state.model_dump())

    elapsed = int((time.time() - start) * 1000)

    return _ok(request, {
        "reply": final_state.get("final_response") or "I'm not sure how to respond to that.",
        "intent": final_state.get("intent", ""),
        "requires_approval": final_state.get("requires_approval", False),
        "approval_id": final_state.get("approval_id", ""),
        "tools_used": final_state.get("tools_used", []),
        "latency_ms": elapsed,
    })


# ---------- Voice (Whisper STT) ----------

# Supported audio formats for OpenAI Whisper
_WHISPER_FORMATS = {"flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"}


@app.post("/voice")
async def voice_to_text(
    request: Request,
    file: UploadFile = File(...),
    x_api_key: str = Header(...),
):
    """Transcribe an audio file using OpenAI Whisper, then run the transcript
    through the orchestration pipeline (if session_id is provided via query param)
    or return the raw transcription.
    """
    _verify_key(x_api_key)

    # Validate file extension
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in _WHISPER_FORMATS:
        raise AgentError(
            CODE_VALIDATION,
            f"Unsupported audio format '.{ext}'. Supported: {', '.join(sorted(_WHISPER_FORMATS))}",
            400,
        )

    start = time.time()

    # Read the uploaded file
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise AgentError(CODE_VALIDATION, "Uploaded file is empty", 400)

    try:
        profile_resp = await backend.get_profile()
        profile = (profile_resp or {}).get("data") or {}
        ai_api_key = (profile or {}).get("ai_api_key") or ""
    except Exception as exc:
        raise AgentError(CODE_INTERNAL, f"Failed to load owner profile: {exc}", 500) from exc

    if not ai_api_key:
        raise AgentError(CODE_VALIDATION, "ai_api_key must be set in the owner profile", 400)

    # Call OpenAI Whisper API
    try:
        client = AsyncOpenAI(api_key=ai_api_key)
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=(file.filename or "audio.wav", audio_bytes),
        )
    except Exception as exc:
        raise AgentError(CODE_INTERNAL, f"Whisper transcription failed: {exc}", 500) from exc

    elapsed = int((time.time() - start) * 1000)

    return _ok(request, {
        "transcription": transcription.text,
        "latency_ms": elapsed,
    })


# ---------- Models list ----------

_AVAILABLE_MODELS: dict[str, list[str]] = {
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "o1",
        "o1-mini",
        "o3-mini",
    ],
    "anthropic": [
        "claude-sonnet-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
    ],
    "xai": [
        "grok-3",
        "grok-3-mini",
        "grok-2",
    ],
}


@app.get("/models")
async def list_models(
    request: Request,
    x_api_key: str = Header(...),
):
    """Return the list of supported AI providers and their available models."""
    _verify_key(x_api_key)
    return _ok(request, {"providers": _AVAILABLE_MODELS})

"""Tests for the Axis Assistant Python agent.

These tests use FastAPI's TestClient and mock external dependencies
(LLM calls, backend HTTP calls, OpenAI Whisper) so they run offline
without any API keys or running services.

Run with:
    cd agent && ../.venv/bin/python -m pytest tests/ -v
    OR
    cd agent && .venv/bin/python -m pytest tests/ -v
"""

from __future__ import annotations

import io
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Patch settings BEFORE importing the app so we control config
with patch.dict("os.environ", {
    "API_KEY": "test-secret",
    "OPENAI_API_KEY": "sk-test-fake-key",
    "OPENAI_MODEL": "gpt-4o-mini",
    "BACKEND_URL": "http://localhost:8080",
}):
    from app.config import Settings
    # Force reload settings
    import app.config
    app.config.settings = Settings()

    from app.main import app
    from app.errors import AgentError, CODE_VALIDATION, CODE_INTERNAL, CODE_UNAUTHORIZED
    from app.models.state import AxisState, PlanStep


API_KEY = "test-secret"
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app, raise_server_exceptions=False)


# =====================================================================
# Health
# =====================================================================

class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["status"] == "ok"

    def test_health_has_meta(self):
        resp = client.get("/health")
        body = resp.json()
        assert "meta" in body
        assert "request_id" in body["meta"]
        assert "timestamp" in body["meta"]


# =====================================================================
# Auth
# =====================================================================

class TestAuth:
    def test_missing_api_key(self):
        resp = client.post("/orchestrate", json={
            "session_id": str(uuid.uuid4()),
            "message": "hello",
        })
        # FastAPI will return 422 for missing required header
        assert resp.status_code == 422

    def test_invalid_api_key(self):
        resp = client.post("/orchestrate", json={
            "session_id": str(uuid.uuid4()),
            "message": "hello",
        }, headers={"X-API-Key": "wrong-key"})
        assert resp.status_code == 401
        body = resp.json()
        assert body["success"] is False
        assert "unauthorized" in body["error"]["code"]

    def test_valid_api_key_accepted(self):
        """Valid key should not return 401 (may return other errors due to mocking)."""
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": "Hi!",
                "intent": "CHAT",
                "requires_approval": False,
                "approval_id": "",
                "tools_used": [],
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "hello",
            }, headers=HEADERS)
            assert resp.status_code != 401


# =====================================================================
# Orchestrate
# =====================================================================

class TestOrchestrate:
    def test_successful_orchestration(self):
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": "Hello! How can I help?",
                "intent": "CHAT",
                "requires_approval": False,
                "approval_id": "",
                "tools_used": [],
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "Hello",
            }, headers=HEADERS)

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["data"]["reply"] == "Hello! How can I help?"
            assert body["data"]["intent"] == "CHAT"
            assert "latency_ms" in body["data"]

    def test_missing_message(self):
        resp = client.post("/orchestrate", json={
            "session_id": str(uuid.uuid4()),
        }, headers=HEADERS)
        # Pydantic validation error
        assert resp.status_code == 422

    def test_missing_session_id(self):
        resp = client.post("/orchestrate", json={
            "message": "hello",
        }, headers=HEADERS)
        assert resp.status_code == 422

    def test_empty_message_validation(self):
        """Empty string should trigger validation inside handler."""
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": "fallback",
                "intent": "",
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "",
            }, headers=HEADERS)
            # Empty message raises AgentError(CODE_VALIDATION, ...)
            assert resp.status_code == 400
            body = resp.json()
            assert body["success"] is False

    def test_orchestrate_returns_tools_used(self):
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": "Done!",
                "intent": "TASK_EXECUTION",
                "requires_approval": False,
                "approval_id": "",
                "tools_used": ["gmail.send", "calendar.create"],
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "Send an email to Bob",
            }, headers=HEADERS)

            assert resp.status_code == 200
            body = resp.json()
            assert body["data"]["tools_used"] == ["gmail.send", "calendar.create"]

    def test_orchestrate_with_approval(self):
        with patch("app.main.agent_graph") as mock_graph:
            approval_id = str(uuid.uuid4())
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": "I need your approval.",
                "intent": "TASK_EXECUTION",
                "requires_approval": True,
                "approval_id": approval_id,
                "tools_used": [],
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "Delete all emails",
            }, headers=HEADERS)

            assert resp.status_code == 200
            body = resp.json()
            assert body["data"]["requires_approval"] is True
            assert body["data"]["approval_id"] == approval_id

    def test_orchestrate_null_response_fallback(self):
        """If final_response is None, should use fallback."""
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={
                "final_response": None,
                "intent": "CHAT",
            })
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "test",
            }, headers=HEADERS)

            assert resp.status_code == 200
            body = resp.json()
            # Should use fallback message
            assert "not sure" in body["data"]["reply"].lower()

    def test_orchestrate_graph_exception(self):
        """If the graph raises an exception, should return 500."""
        with patch("app.main.agent_graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(side_effect=RuntimeError("graph exploded"))
            resp = client.post("/orchestrate", json={
                "session_id": str(uuid.uuid4()),
                "message": "test",
            }, headers=HEADERS)

            assert resp.status_code == 500
            body = resp.json()
            assert body["success"] is False


# =====================================================================
# Voice (Whisper STT)
# =====================================================================

class TestVoice:
    def test_voice_missing_file(self):
        resp = client.post("/voice", headers=HEADERS)
        assert resp.status_code == 422

    def test_voice_unsupported_format(self):
        # Create a fake txt file
        file_data = io.BytesIO(b"not audio data")
        resp = client.post("/voice", headers=HEADERS, files={
            "file": ("test.txt", file_data, "text/plain"),
        })
        assert resp.status_code == 400
        body = resp.json()
        assert body["success"] is False
        assert "Unsupported" in body["error"]["message"]

    def test_voice_empty_file(self):
        file_data = io.BytesIO(b"")
        resp = client.post("/voice", headers=HEADERS, files={
            "file": ("test.wav", file_data, "audio/wav"),
        })
        assert resp.status_code == 400
        body = resp.json()
        assert "empty" in body["error"]["message"].lower()

    def test_voice_success(self):
        """Mock the OpenAI Whisper client."""
        mock_transcription = MagicMock()
        mock_transcription.text = "Hello world"

        mock_client_instance = AsyncMock()
        mock_client_instance.audio.transcriptions.create = AsyncMock(
            return_value=mock_transcription
        )

        with patch("app.main.AsyncOpenAI", return_value=mock_client_instance):
            file_data = io.BytesIO(b"fake audio bytes")
            resp = client.post("/voice", headers=HEADERS, files={
                "file": ("test.wav", file_data, "audio/wav"),
            })

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["data"]["transcription"] == "Hello world"
            assert "latency_ms" in body["data"]

    def test_voice_supported_formats(self):
        """All supported formats should pass validation (mocked whisper)."""
        supported = ["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"]

        mock_transcription = MagicMock()
        mock_transcription.text = "test"

        mock_client_instance = AsyncMock()
        mock_client_instance.audio.transcriptions.create = AsyncMock(
            return_value=mock_transcription
        )

        with patch("app.main.AsyncOpenAI", return_value=mock_client_instance):
            for fmt in supported:
                file_data = io.BytesIO(b"fake audio")
                resp = client.post("/voice", headers=HEADERS, files={
                    "file": (f"test.{fmt}", file_data, "application/octet-stream"),
                })
                assert resp.status_code == 200, f"Expected 200 for .{fmt}, got {resp.status_code}"

    def test_voice_whisper_failure(self):
        """If Whisper API fails, should return 500."""
        mock_client_instance = AsyncMock()
        mock_client_instance.audio.transcriptions.create = AsyncMock(
            side_effect=Exception("Whisper API down")
        )

        with patch("app.main.AsyncOpenAI", return_value=mock_client_instance):
            file_data = io.BytesIO(b"fake audio bytes")
            resp = client.post("/voice", headers=HEADERS, files={
                "file": ("test.wav", file_data, "audio/wav"),
            })

            assert resp.status_code == 500
            body = resp.json()
            assert body["success"] is False
            assert "Whisper" in body["error"]["message"]

    def test_voice_without_api_key_header(self):
        file_data = io.BytesIO(b"fake audio")
        resp = client.post("/voice", files={
            "file": ("test.wav", file_data, "audio/wav"),
        })
        assert resp.status_code == 422


# =====================================================================
# Models
# =====================================================================

class TestModels:
    def test_list_models(self):
        resp = client.get("/models", headers=HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        providers = body["data"]["providers"]
        assert "openai" in providers
        assert "anthropic" in providers
        assert "xai" in providers

    def test_models_openai_includes_gpt4(self):
        resp = client.get("/models", headers=HEADERS)
        body = resp.json()
        openai_models = body["data"]["providers"]["openai"]
        assert "gpt-4o" in openai_models
        assert "gpt-4o-mini" in openai_models

    def test_models_anthropic_includes_claude(self):
        resp = client.get("/models", headers=HEADERS)
        body = resp.json()
        anthropic_models = body["data"]["providers"]["anthropic"]
        assert any("claude" in m for m in anthropic_models)

    def test_models_xai_includes_grok(self):
        resp = client.get("/models", headers=HEADERS)
        body = resp.json()
        xai_models = body["data"]["providers"]["xai"]
        assert any("grok" in m for m in xai_models)

    def test_models_requires_auth(self):
        resp = client.get("/models")
        assert resp.status_code == 422  # missing required header

    def test_models_invalid_auth(self):
        resp = client.get("/models", headers={"X-API-Key": "bad-key"})
        assert resp.status_code == 401


# =====================================================================
# State Model
# =====================================================================

class TestAxisState:
    def test_default_state(self):
        state = AxisState()
        assert state.session_id == ""
        assert state.user_input == ""
        assert state.intent == ""
        assert state.guardrail_status == ""
        assert state.plan == []
        assert state.requires_approval is False
        assert state.final_response == ""

    def test_state_with_values(self):
        sid = str(uuid.uuid4())
        state = AxisState(
            session_id=sid,
            user_input="Send an email",
            intent="TASK_EXECUTION",
            guardrail_status="SAFE",
        )
        assert state.session_id == sid
        assert state.intent == "TASK_EXECUTION"

    def test_state_model_dump(self):
        state = AxisState(session_id="abc", user_input="hello")
        d = state.model_dump()
        assert isinstance(d, dict)
        assert d["session_id"] == "abc"
        assert d["user_input"] == "hello"


class TestPlanStep:
    def test_plan_step_defaults(self):
        step = PlanStep(tool="gmail.send")
        assert step.tool == "gmail.send"
        assert step.input == {}
        assert step.result is None
        assert step.success is None

    def test_plan_step_with_input(self):
        step = PlanStep(
            tool="calendar.create",
            input={"title": "Meeting", "time": "10am"},
        )
        assert step.input["title"] == "Meeting"

    def test_plan_step_model_dump(self):
        step = PlanStep(tool="gmail.send", success=True, result={"id": "123"})
        d = step.model_dump()
        assert d["tool"] == "gmail.send"
        assert d["success"] is True


# =====================================================================
# Errors
# =====================================================================

class TestAgentError:
    def test_agent_error_attributes(self):
        err = AgentError(CODE_VALIDATION, "bad input", 400)
        assert err.code == CODE_VALIDATION
        assert err.message == "bad input"
        assert err.status == 400
        assert str(err) == "bad input"

    def test_agent_error_default_status(self):
        err = AgentError(CODE_INTERNAL, "oops")
        assert err.status == 500


# =====================================================================
# Envelope format
# =====================================================================

class TestEnvelopeFormat:
    def test_success_envelope_shape(self):
        resp = client.get("/health")
        body = resp.json()
        assert "success" in body
        assert "data" in body
        assert "meta" in body
        assert body["error"] is None or "error" not in body or body.get("error") is None

    def test_error_envelope_shape(self):
        resp = client.post("/orchestrate", json={
            "session_id": str(uuid.uuid4()),
            "message": "hello",
        }, headers={"X-API-Key": "wrong"})

        body = resp.json()
        assert body["success"] is False
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]

    def test_request_id_propagation(self):
        custom_rid = "test-rid-12345"
        resp = client.get("/health", headers={"X-Request-ID": custom_rid})
        assert resp.headers.get("X-Request-ID") == custom_rid


# =====================================================================
# Node-level unit tests (mocked LLM + backend)
# =====================================================================

class TestLoadContextNode:
    @pytest.mark.asyncio
    async def test_load_context_basic(self):
        from app.nodes.load_context import load_context

        state = AxisState(session_id="test-session", user_input="hello")

        with patch("app.nodes.load_context.backend") as mock_backend:
            mock_backend.get_short_term = AsyncMock(return_value={"data": [{"role": "user", "message": "hi"}]})
            mock_backend.vector_search = AsyncMock(return_value={"data": []})
            mock_backend.get_profile = AsyncMock(return_value={"data": {"name": "Test"}})

            result = await load_context(state)

            assert "short_term_memory" in result
            assert len(result["short_term_memory"]) == 1
            assert "owner_profile" in result
            assert result["owner_profile"]["name"] == "Test"

    @pytest.mark.asyncio
    async def test_load_context_handles_backend_failure(self):
        from app.nodes.load_context import load_context

        state = AxisState(session_id="test-session", user_input="hello")

        with patch("app.nodes.load_context.backend") as mock_backend:
            mock_backend.get_short_term = AsyncMock(side_effect=Exception("connection refused"))
            mock_backend.vector_search = AsyncMock(side_effect=Exception("connection refused"))
            mock_backend.get_profile = AsyncMock(side_effect=Exception("connection refused"))

            result = await load_context(state)

            # Should gracefully degrade — no exceptions raised
            assert result["short_term_memory"] == []
            assert result["long_term_memory"] == []
            assert result["owner_profile"] == {}


class TestGuardrailNode:
    @pytest.mark.asyncio
    async def test_chat_intent_skips_llm(self):
        from app.nodes.guardrail import guardrail

        state = AxisState(intent="CHAT", user_input="hello")
        result = await guardrail(state)
        assert result["guardrail_status"] == "SAFE"

    @pytest.mark.asyncio
    async def test_query_intent_skips_llm(self):
        from app.nodes.guardrail import guardrail

        state = AxisState(intent="QUERY_ONLY", user_input="what time is it?")
        result = await guardrail(state)
        assert result["guardrail_status"] == "SAFE"

    @pytest.mark.asyncio
    async def test_task_execution_calls_llm(self):
        from app.nodes.guardrail import guardrail

        state = AxisState(
            intent="TASK_EXECUTION",
            user_input="send an email",
            owner_profile={"ai_provider": "openai", "ai_api_key": "sk-fake"},
        )

        mock_response = MagicMock()
        mock_response.content = "STATUS: SAFE\nREASON: Normal email send request"

        with patch("app.nodes.guardrail.create_llm") as mock_factory:
            mock_llm = AsyncMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_factory.return_value = mock_llm

            result = await guardrail(state)
            assert result["guardrail_status"] == "SAFE"

    @pytest.mark.asyncio
    async def test_guardrail_block(self):
        from app.nodes.guardrail import guardrail

        state = AxisState(
            intent="TASK_EXECUTION",
            user_input="do something harmful",
            owner_profile={"ai_provider": "openai", "ai_api_key": "sk-fake"},
        )

        mock_response = MagicMock()
        mock_response.content = "STATUS: BLOCK\nREASON: Harmful request"

        with patch("app.nodes.guardrail.create_llm") as mock_factory:
            mock_llm = AsyncMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_factory.return_value = mock_llm

            result = await guardrail(state)
            assert result["guardrail_status"] == "BLOCK"
            assert "Harmful" in result["guardrail_reason"]


class TestPlanningNode:
    @pytest.mark.asyncio
    async def test_chat_intent_skips_planning(self):
        from app.nodes.planning import planning

        state = AxisState(intent="CHAT", user_input="hello")
        result = await planning(state)
        assert result["plan"] == []
        assert result["requires_approval"] is False

    @pytest.mark.asyncio
    async def test_task_execution_generates_plan(self):
        from app.nodes.planning import planning

        state = AxisState(
            intent="TASK_EXECUTION",
            user_input="send email to bob@test.com",
            owner_profile={"ai_provider": "openai", "ai_api_key": "sk-fake"},
        )

        mock_response = MagicMock()
        mock_response.content = json.dumps({
            "steps": [{"tool": "gmail.send", "input": {"to": "bob@test.com"}}],
            "requires_approval": True,
        })

        with patch("app.nodes.planning.create_llm") as mock_factory:
            mock_llm = AsyncMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_factory.return_value = mock_llm

            result = await planning(state)
            assert len(result["plan"]) == 1
            assert result["plan"][0].tool == "gmail.send"
            assert result["requires_approval"] is True


class TestPlanValidationNode:
    @pytest.mark.asyncio
    async def test_valid_tools_pass(self):
        from app.nodes.plan_validation import plan_validation

        state = AxisState(plan=[
            PlanStep(tool="gmail.send"),
            PlanStep(tool="calendar.create"),
        ])
        result = await plan_validation(state)
        assert len(result["plan"]) == 2

    @pytest.mark.asyncio
    async def test_invalid_tools_removed(self):
        from app.nodes.plan_validation import plan_validation

        state = AxisState(plan=[
            PlanStep(tool="gmail.send"),
            PlanStep(tool="nonexistent.tool"),
        ])
        result = await plan_validation(state)
        assert len(result["plan"]) == 1
        assert result["plan"][0].tool == "gmail.send"

    @pytest.mark.asyncio
    async def test_empty_plan(self):
        from app.nodes.plan_validation import plan_validation

        state = AxisState(plan=[])
        result = await plan_validation(state)
        assert result == {}


class TestExecutionNode:
    @pytest.mark.asyncio
    async def test_execution_with_plan(self):
        from app.nodes.execution import execution

        state = AxisState(plan=[
            PlanStep(tool="gmail.send", input={"to": "bob@test.com"}),
        ])
        result = await execution(state)
        assert "execution_results" in result
        assert "tools_used" in result
        assert len(result["tools_used"]) == 1
        assert result["tools_used"][0] == "gmail.send"

    @pytest.mark.asyncio
    async def test_execution_empty_plan(self):
        from app.nodes.execution import execution

        state = AxisState(plan=[])
        result = await execution(state)
        assert result == {}


class TestResponseNode:
    @pytest.mark.asyncio
    async def test_blocked_response(self):
        from app.nodes.response import response_node

        state = AxisState(
            guardrail_status="BLOCK",
            guardrail_reason="Harmful content",
        )
        result = await response_node(state)
        assert "can't proceed" in result["final_response"].lower()
        assert "Harmful content" in result["final_response"]

    @pytest.mark.asyncio
    async def test_normal_response(self):
        from app.nodes.response import response_node

        state = AxisState(
            user_input="hello",
            intent="CHAT",
            owner_profile={"ai_provider": "openai", "ai_api_key": "sk-fake"},
        )

        mock_response = MagicMock()
        mock_response.content = "Hello! How can I help you today?"

        with patch("app.nodes.response.create_llm") as mock_factory:
            mock_llm = AsyncMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_factory.return_value = mock_llm

            result = await response_node(state)
            assert result["final_response"] == "Hello! How can I help you today?"


class TestMemoryUpdateNode:
    @pytest.mark.asyncio
    async def test_stores_user_and_assistant_messages(self):
        from app.nodes.memory_update import memory_update

        state = AxisState(
            session_id="test-session",
            user_input="hello",
            final_response="Hi there!",
        )

        with patch("app.nodes.memory_update.backend") as mock_backend:
            mock_backend.store_short_term = AsyncMock(return_value={})
            mock_backend.store_long_term = AsyncMock(return_value={})

            result = await memory_update(state)
            assert result == {}

            # Should have called store_short_term twice (user + assistant)
            assert mock_backend.store_short_term.call_count == 2

    @pytest.mark.asyncio
    async def test_memory_write_intent_stores_long_term(self):
        from app.nodes.memory_update import memory_update

        state = AxisState(
            session_id="test-session",
            user_input="Remember that I like coffee",
            intent="MEMORY_WRITE",
            final_response="I'll remember that!",
        )

        with patch("app.nodes.memory_update.backend") as mock_backend:
            mock_backend.store_short_term = AsyncMock(return_value={})
            mock_backend.store_long_term = AsyncMock(return_value={})

            await memory_update(state)

            # Should also call store_long_term
            mock_backend.store_long_term.assert_called_once()

    @pytest.mark.asyncio
    async def test_memory_update_handles_failure(self):
        from app.nodes.memory_update import memory_update

        state = AxisState(
            session_id="test-session",
            user_input="hello",
            final_response="Hi!",
        )

        with patch("app.nodes.memory_update.backend") as mock_backend:
            mock_backend.store_short_term = AsyncMock(side_effect=Exception("connection refused"))

            # Should not raise — best-effort
            result = await memory_update(state)
            assert result == {}


# =====================================================================
# LLM Factory
# =====================================================================

class TestLLMFactory:
    def test_openai_provider(self):
        from app.services.llm_factory import create_llm

        with patch("app.services.llm_factory.ChatOpenAI") as MockChat:
            MockChat.return_value = MagicMock()
            llm = create_llm({"ai_provider": "openai", "ai_api_key": "sk-test", "ai_model": "gpt-4o"})
            MockChat.assert_called_once()

    def test_xai_provider_uses_custom_base_url(self):
        from app.services.llm_factory import create_llm, _XAI_BASE_URL

        with patch("app.services.llm_factory.ChatOpenAI") as MockChat:
            MockChat.return_value = MagicMock()
            llm = create_llm({"ai_provider": "xai", "ai_api_key": "xai-test", "ai_model": "grok-3"})
            call_kwargs = MockChat.call_args[1]
            assert call_kwargs["base_url"] == _XAI_BASE_URL

    def test_no_api_key_raises(self):
        from app.services.llm_factory import create_llm

        # Clear the env default
        with patch.object(app.config.settings, "openai_api_key", ""):
            with pytest.raises(RuntimeError, match="No API key"):
                create_llm({"ai_provider": "openai", "ai_api_key": "", "ai_model": "gpt-4o"})

    def test_default_provider_is_openai(self):
        from app.services.llm_factory import create_llm

        with patch("app.services.llm_factory.ChatOpenAI") as MockChat:
            MockChat.return_value = MagicMock()
            llm = create_llm(None)
            # Should default to openai
            MockChat.assert_called_once()


# =====================================================================
# Backend Client
# =====================================================================

class TestBackendClient:
    def test_client_initializes(self):
        from app.services.backend_client import BackendClient
        client = BackendClient()
        assert client._base.endswith("8080") or "localhost" in client._base
        assert "X-API-Key" in client._headers

    def test_url_construction(self):
        from app.services.backend_client import BackendClient
        client = BackendClient()
        url = client._url("/api/v1/profile")
        assert url.endswith("/api/v1/profile")
        assert not url.endswith("//api/v1/profile")

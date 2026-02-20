"""LLM Factory — creates the right LangChain LLM based on the owner's provider choice.

Supported providers:
  - openai     → ChatOpenAI
  - anthropic  → ChatAnthropic
  - xai (Grok) → ChatOpenAI with xAI base_url (OpenAI-compatible API)

The factory reads ai_provider / ai_api_key / ai_model from the owner profile
that was loaded during the load_context node.
"""

from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI

from app.config import settings

# xAI (Grok) uses an OpenAI-compatible endpoint.
_XAI_BASE_URL = "https://api.x.ai/v1"


def _get_anthropic_llm(api_key: str, model: str, **kwargs: Any):
    """Lazy-import ChatAnthropic to avoid hard crash if package is missing."""
    try:
        from langchain_anthropic import ChatAnthropic
    except ImportError as exc:
        raise RuntimeError(
            "langchain-anthropic is required for Anthropic provider. "
            "Install it with: pip install langchain-anthropic"
        ) from exc
    return ChatAnthropic(
        model=model,
        anthropic_api_key=api_key,
        **kwargs,
    )


def create_llm(
    profile: dict[str, Any] | None = None,
    *,
    temperature: float = 0,
    max_tokens: int = 500,
    **extra: Any,
):
    """Return a LangChain chat model based on the owner's AI configuration.

        Resolution order for each setting:
            1. ``profile["ai_provider"]`` / ``profile["ai_api_key"]`` / ``profile["ai_model"]``
            2. Fallback defaults from ``app.config.settings`` (model only)

    Parameters
    ----------
    profile:
        The owner_profile dict (from load_context).  May be ``None``.
    temperature:
        Sampling temperature.
    max_tokens:
        Maximum tokens in the LLM response.
    **extra:
        Forwarded to the underlying LangChain constructor.
    """

    provider = (profile or {}).get("ai_provider") or "openai"
    api_key = (profile or {}).get("ai_api_key")
    model = (profile or {}).get("ai_model") or settings.openai_model

    if not api_key:
        raise RuntimeError(
            f"No API key configured for provider '{provider}'. "
            "Set it in your profile (Settings page)."
        )

    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            **extra,
        )

    if provider == "anthropic":
        return _get_anthropic_llm(
            api_key=api_key,
            model=model or "claude-sonnet-4-20250514",
            temperature=temperature,
            max_tokens=max_tokens,
            **extra,
        )

    if provider == "xai":
        return ChatOpenAI(
            model=model or "grok-3",
            api_key=api_key,
            base_url=_XAI_BASE_URL,
            temperature=temperature,
            max_tokens=max_tokens,
            **extra,
        )

    raise ValueError(f"Unsupported AI provider: '{provider}'")

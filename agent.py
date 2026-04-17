from __future__ import annotations

import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, TypedDict

from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import OpenAI


class Message(TypedDict, total=False):
    role: str
    content: str
    provider: str
    model: str
    reasoning_details: Any


HistoryStore = Dict[str, List[Message]]
LOGGER = logging.getLogger("mira.agent")

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free"
SUPPORTED_PROVIDERS = {"gemini", "openrouter"}
DEFAULT_SYSTEM_PROMPT = """You are Mira, an AI thinking partner and personal assistant.

Your role:
- Help the user think through problems, goals, and decisions
- Connect what they say now to earlier parts of the conversation when relevant
- Challenge their thinking when you spot a flaw, contradiction, or blind spot — but only when it matters, not to nitpick
- Suggest a better approach when you see one, without waiting to be asked
- Be balanced in tone — direct and honest, but not harsh

How you communicate:
- Clear and concise. No filler.
- Ask one focused question when you need clarity
- Give your actual opinion, not just options

You remember everything said in this conversation. Use it."""


load_dotenv()


def get_runtime_config() -> Dict[str, Any]:
    providers = _parse_csv(os.getenv("LLM_PROVIDERS", "gemini,openrouter"))
    providers = [provider.lower() for provider in providers if provider.lower() in SUPPORTED_PROVIDERS]
    if not providers:
        providers = ["gemini"]

    gemini_default = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    gemini_models = _parse_csv(os.getenv("GEMINI_MODELS", gemini_default))
    if not gemini_models:
        gemini_models = [gemini_default]

    openrouter_default = (
        os.getenv("OPENROUTER_DEFAULT_MODEL", "").strip()
        or (os.getenv("OPENROUTER_MODELS", "").split(",")[0].strip() if os.getenv("OPENROUTER_MODELS") else "")
        or DEFAULT_OPENROUTER_MODEL
    )
    openrouter_models = _parse_csv(os.getenv("OPENROUTER_MODELS", openrouter_default))
    if not openrouter_models:
        openrouter_models = [openrouter_default]

    requested_default_provider = os.getenv("DEFAULT_PROVIDER", "openrouter").strip().lower()
    default_provider = requested_default_provider if requested_default_provider in providers else providers[0]

    provider_models: Dict[str, List[str]] = {
        "gemini": gemini_models,
        "openrouter": openrouter_models,
    }
    default_models: Dict[str, str] = {
        "gemini": gemini_default if gemini_default in gemini_models else gemini_models[0],
        "openrouter": openrouter_default if openrouter_default in openrouter_models else openrouter_models[0],
    }
    reasoning_models = _parse_csv(os.getenv("OPENROUTER_REASONING_MODELS", ""))

    return {
        "providers": providers,
        "default_provider": default_provider,
        "provider_models": {provider: provider_models[provider] for provider in providers},
        "default_models": {provider: default_models[provider] for provider in providers},
        "openrouter_reasoning_models": reasoning_models,
    }


def chat(
    message: str,
    session_id: str,
    history_store: HistoryStore,
    provider: str,
    model: str,
    request_id: str = "-",
) -> str:
    session_history = history_store.setdefault(session_id, [])
    session_history.append(
        {
            "role": "user",
            "content": message,
            "provider": provider,
            "model": model,
        }
    )
    LOGGER.debug(
        "chat_turn request_id=%s session_id=%s role=user provider=%s model=%s content=%r",
        request_id,
        session_id,
        provider,
        model,
        message,
    )
    LOGGER.info(
        "provider_request_started request_id=%s session_id=%s provider=%s model=%s history_len=%d",
        request_id,
        session_id,
        provider,
        model,
        len(session_history),
    )

    try:
        if provider == "openrouter":
            reply, reasoning_details = _call_openrouter(
                history=session_history,
                model=model,
                request_id=request_id,
            )
        else:
            reply = _call_gemini(
                history=session_history,
                model=model,
                request_id=request_id,
            )
            reasoning_details = None
    except Exception:
        session_history.pop()
        LOGGER.exception(
            "provider_request_failed request_id=%s session_id=%s provider=%s model=%s",
            request_id,
            session_id,
            provider,
            model,
        )
        raise

    assistant_message: Message = {
        "role": "assistant",
        "content": reply,
        "provider": provider,
        "model": model,
    }
    if reasoning_details is not None:
        assistant_message["reasoning_details"] = reasoning_details
    session_history.append(assistant_message)
    LOGGER.debug(
        "chat_turn request_id=%s session_id=%s role=assistant provider=%s model=%s content=%r",
        request_id,
        session_id,
        provider,
        model,
        reply,
    )
    LOGGER.info(
        "provider_request_succeeded request_id=%s session_id=%s provider=%s model=%s history_len=%d reply_chars=%d",
        request_id,
        session_id,
        provider,
        model,
        len(session_history),
        len(reply),
    )
    return reply


def _call_gemini(history: List[Message], model: str, request_id: str = "-") -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("gemini_key", "").strip()
    if not api_key or api_key == "your-key-here":
        LOGGER.error("provider_config_error request_id=%s missing_api_key=true", request_id)
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    start = time.perf_counter()
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=model,
            contents=_to_gemini_contents(history),
            config=types.GenerateContentConfig(
                system_instruction=_load_system_prompt(),
                max_output_tokens=1024,
            ),
        )
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        LOGGER.exception(
            "provider_call_error request_id=%s provider=gemini model=%s duration_ms=%d",
            request_id,
            model,
            duration_ms,
        )
        raise

    duration_ms = int((time.perf_counter() - start) * 1000)
    LOGGER.info(
        "provider_call_finished request_id=%s provider=gemini model=%s duration_ms=%d",
        request_id,
        model,
        duration_ms,
    )
    return _extract_text(response)


def _call_openrouter(
    history: List[Message],
    model: str,
    request_id: str = "-",
) -> tuple[str, Any | None]:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key or api_key == "your-key-here":
        LOGGER.error("provider_config_error request_id=%s provider=openrouter missing_api_key=true", request_id)
        raise RuntimeError("OPENROUTER_API_KEY is not configured.")

    runtime_config = get_runtime_config()
    reasoning_enabled = model in set(runtime_config["openrouter_reasoning_models"])

    start = time.perf_counter()
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    request_kwargs: Dict[str, Any] = {
        "model": model,
        "messages": _to_openrouter_messages(history),
    }
    if reasoning_enabled:
        request_kwargs["extra_body"] = {"reasoning": {"enabled": True}}

    try:
        response = client.chat.completions.create(**request_kwargs)
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        LOGGER.exception(
            "provider_call_error request_id=%s provider=openrouter model=%s reasoning=%s duration_ms=%d",
            request_id,
            model,
            reasoning_enabled,
            duration_ms,
        )
        raise

    duration_ms = int((time.perf_counter() - start) * 1000)
    LOGGER.info(
        "provider_call_finished request_id=%s provider=openrouter model=%s reasoning=%s duration_ms=%d",
        request_id,
        model,
        reasoning_enabled,
        duration_ms,
    )

    choice = response.choices[0].message if response.choices else None
    text = _extract_openrouter_text(choice)
    reasoning_details = getattr(choice, "reasoning_details", None) if choice else None
    return text, reasoning_details


def _to_gemini_contents(history: List[Message]) -> List[types.Content]:
    contents: List[types.Content] = []
    for item in history:
        role = "model" if item["role"] == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=item["content"])]))
    return contents


def _to_openrouter_messages(history: List[Message]) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = []
    for item in history:
        role = "assistant" if item["role"] == "assistant" else "user"
        message: Dict[str, Any] = {"role": role, "content": item["content"]}
        if role == "assistant" and "reasoning_details" in item and item["reasoning_details"] is not None:
            message["reasoning_details"] = item["reasoning_details"]
        messages.append(message)
    return messages


def _extract_text(response: object) -> str:
    text = getattr(response, "text", "")
    if text:
        return str(text).strip()
    raise RuntimeError("Gemini response did not include text content.")


def _extract_openrouter_text(message: Any) -> str:
    if message is None:
        raise RuntimeError("OpenRouter response did not include a message choice.")

    content = getattr(message, "content", None)
    if isinstance(content, str):
        text = content.strip()
        if text:
            return text
    if isinstance(content, list):
        text_parts: List[str] = []
        for part in content:
            if isinstance(part, dict):
                maybe_text = part.get("text")
                if isinstance(maybe_text, str) and maybe_text.strip():
                    text_parts.append(maybe_text.strip())
        combined = "\n".join(text_parts).strip()
        if combined:
            return combined
    raise RuntimeError("OpenRouter response did not include text content.")


def _parse_csv(raw: str) -> List[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def _load_system_prompt() -> str:
    design_path = Path(__file__).with_name("DESIGN.md")
    try:
        design_text = design_path.read_text(encoding="utf-8")
    except OSError:
        return DEFAULT_SYSTEM_PROMPT

    match = re.search(r"\*\*System prompt:\*\*\s*```(?:\w+)?\n(.*?)\n```", design_text, re.DOTALL)
    if not match:
        return DEFAULT_SYSTEM_PROMPT

    prompt = match.group(1).strip()
    return prompt or DEFAULT_SYSTEM_PROMPT

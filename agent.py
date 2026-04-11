from __future__ import annotations

import logging
import os
import re
import time
from pathlib import Path
from typing import Dict, List, TypedDict

from dotenv import load_dotenv
from google import genai
from google.genai import types


class Message(TypedDict):
    role: str
    content: str


HistoryStore = Dict[str, List[Message]]
LOGGER = logging.getLogger("mira.agent")

DEFAULT_MODEL = "gemini-2.5-flash"
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


def chat(
    message: str,
    session_id: str,
    history_store: HistoryStore,
    request_id: str = "-",
) -> str:
    session_history = history_store.setdefault(session_id, [])
    session_history.append({"role": "user", "content": message})
    LOGGER.info(
        "provider_request_started request_id=%s session_id=%s history_len=%d",
        request_id,
        session_id,
        len(session_history),
    )

    try:
        reply = _call_provider(session_history, request_id=request_id)
    except Exception:
        session_history.pop()
        LOGGER.exception(
            "provider_request_failed request_id=%s session_id=%s",
            request_id,
            session_id,
        )
        raise

    session_history.append({"role": "assistant", "content": reply})
    LOGGER.info(
        "provider_request_succeeded request_id=%s session_id=%s history_len=%d reply_chars=%d",
        request_id,
        session_id,
        len(session_history),
        len(reply),
    )
    return reply


def _call_provider(history: List[Message], request_id: str = "-") -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("gemini_key", "").strip()
    if not api_key or api_key == "your-key-here":
        LOGGER.error("provider_config_error request_id=%s missing_api_key=true", request_id)
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    start = time.perf_counter()
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=_to_gemini_contents(history),
            config=types.GenerateContentConfig(
                system_instruction=_load_system_prompt(),
                max_output_tokens=1024,
            ),
        )
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        LOGGER.exception(
            "provider_call_error request_id=%s model=%s duration_ms=%d",
            request_id,
            DEFAULT_MODEL,
            duration_ms,
        )
        raise

    duration_ms = int((time.perf_counter() - start) * 1000)
    LOGGER.info(
        "provider_call_finished request_id=%s model=%s duration_ms=%d",
        request_id,
        DEFAULT_MODEL,
        duration_ms,
    )
    return _extract_text(response)


def _to_gemini_contents(history: List[Message]) -> List[types.Content]:
    contents: List[types.Content] = []
    for item in history:
        role = "model" if item["role"] == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=item["content"])]))
    return contents


def _extract_text(response: object) -> str:
    text = getattr(response, "text", "")
    if text:
        return str(text).strip()
    raise RuntimeError("Gemini response did not include text content.")


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

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from agent import HistoryStore, chat, get_runtime_config


def _build_chat_request_example() -> dict[str, str]:
    runtime_config = get_runtime_config()
    provider = runtime_config["default_provider"]
    model = runtime_config["default_models"].get(provider, "")

    if not model:
        provider = runtime_config["providers"][0]
        model = runtime_config["default_models"].get(provider) or runtime_config["provider_models"][provider][0]

    return {
        "message": "Help me write a short plan for tomorrow's deep work.",
        "session_id": "7db5cb11-3d73-47f7-a043-182f2f7f0f5e",
        "provider": provider,
        "model": model,
    }


CHAT_REQUEST_EXAMPLE = _build_chat_request_example()


class ChatRequest(BaseModel):
    model_config = {"json_schema_extra": {"example": CHAT_REQUEST_EXAMPLE}}

    message: str = Field(
        ...,
        description="The user message to send to Mira.",
        example="Help me prioritize my tasks for today.",
    )
    session_id: str = Field(
        ...,
        description="Client-generated session identifier used for conversation history.",
        example="7db5cb11-3d73-47f7-a043-182f2f7f0f5e",
    )
    provider: str | None = Field(
        default=None,
        description="Optional provider override (for example: gemini, openrouter).",
        example="openrouter",
    )
    model: str | None = Field(
        default=None,
        description="Optional model override for the selected provider.",
        example="google/gemma-4-31b-it:free",
    )


class ChatResponse(BaseModel):
    reply: str = Field(
        ...,
        description="Assistant response text.",
        examples=["Let's break this down into urgency, impact, and effort."],
    )


class RuntimeConfigResponse(BaseModel):
    providers: list[str]
    default_provider: str
    provider_models: dict[str, list[str]]
    default_models: dict[str, str]
    openrouter_reasoning_models: list[str]


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
FRONTEND_DIST_DIR = BASE_DIR.parent / "mira-ui" / "dist"


def _configure_logging() -> None:
    if logging.getLogger().handlers:
        return

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


_configure_logging()
LOGGER = logging.getLogger("mira.server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    def _asyncio_exception_handler(loop, context):
        exc = context.get("exception")
        LOGGER.error(
            "server_unhandled_async_exception message=%s exception=%r",
            context.get("message"),
            exc,
        )

    try:
        asyncio.get_running_loop().set_exception_handler(_asyncio_exception_handler)
        LOGGER.info("server_started")
    except Exception:
        LOGGER.exception("server_startup_failed")
        raise
    yield
    # --- shutdown ---
    LOGGER.info("server_stopped")


app = FastAPI(title="Mira", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend-assets")

history_store: HistoryStore = {}


@app.get("/", response_class=FileResponse)
async def read_index() -> FileResponse:
    if (FRONTEND_DIST_DIR / "index.html").exists():
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

    return FileResponse(STATIC_DIR / "index.html")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid4().hex[:8]
    request.state.request_id = request_id
    start = time.perf_counter()
    client = request.client.host if request.client else "-"

    LOGGER.info(
        "request_started request_id=%s method=%s path=%s client=%s",
        request_id,
        request.method,
        request.url.path,
        client,
    )
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        LOGGER.exception(
            "request_failed request_id=%s method=%s path=%s duration_ms=%d",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = int((time.perf_counter() - start) * 1000)
    LOGGER.info(
        "request_finished request_id=%s method=%s path=%s status=%d duration_ms=%d",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


def _is_truthy_env(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _build_mock_reply(message: str, provider: str, model: str, session_id: str) -> str:
    trimmed = " ".join(message.split())
    short = trimmed[:200]
    return f"[mock:{provider}/{model} session={session_id}] {short}"


@app.post("/chat", response_model=ChatResponse)
async def post_chat(
    request: Request,
    payload: ChatRequest = Body(
        ...,
        openapi_examples={
            "valid_request": {
                "summary": "Valid request",
                "description": "Provider and model are explicitly provided.",
                "value": CHAT_REQUEST_EXAMPLE,
            },
            "missing_session_id": {
                "summary": "Invalid request (missing session_id)",
                "description": "Triggers 400 validation in route logic.",
                "value": {
                    **CHAT_REQUEST_EXAMPLE,
                    "message": "This will fail because session_id is empty.",
                    "session_id": "",
                },
            },
            "unsupported_provider": {
                "summary": "Invalid request (unsupported provider)",
                "description": "Triggers 400 when provider is not in server allowlist.",
                "value": {
                    **CHAT_REQUEST_EXAMPLE,
                    "message": "This will fail because provider is unsupported.",
                    "provider": "invalid-provider",
                },
            },
        },
    ),
) -> ChatResponse:
    runtime_config = get_runtime_config()
    message = payload.message.strip()
    session_id = payload.session_id.strip()
    provider = (payload.provider or runtime_config["default_provider"]).strip().lower()
    model = (payload.model or runtime_config["default_models"].get(provider, "")).strip()
    request_id = getattr(request.state, "request_id", "-")

    if not message:
        LOGGER.warning("chat_invalid request_id=%s reason=empty_message", request_id)
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not session_id:
        LOGGER.warning("chat_invalid request_id=%s reason=missing_session_id", request_id)
        raise HTTPException(status_code=400, detail="Session ID is required.")
    if provider not in runtime_config["providers"]:
        LOGGER.warning("chat_invalid request_id=%s reason=invalid_provider provider=%s", request_id, provider)
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    allowed_models = runtime_config["provider_models"].get(provider, [])
    if model not in allowed_models:
        LOGGER.warning(
            "chat_invalid request_id=%s reason=invalid_model provider=%s model=%s",
            request_id,
            provider,
            model,
        )
        raise HTTPException(status_code=400, detail=f"Unsupported model for provider '{provider}': {model}")

    LOGGER.info(
        "chat_received request_id=%s session_id=%s provider=%s model=%s message_chars=%d",
        request_id,
        session_id,
        provider,
        model,
        len(message),
    )
    LOGGER.debug(
        "chat_message request_id=%s session_id=%s role=user provider=%s model=%s content=%r",
        request_id,
        session_id,
        provider,
        model,
        message,
    )
    if _is_truthy_env(os.getenv("CHAT_MOCK_MODE", "false")):
        reply = _build_mock_reply(message=message, provider=provider, model=model, session_id=session_id)
        LOGGER.info(
            "chat_mock_succeeded request_id=%s session_id=%s provider=%s model=%s reply_chars=%d",
            request_id,
            session_id,
            provider,
            model,
            len(reply),
        )
        return ChatResponse(reply=reply)

    try:
        reply = chat(
            message=message,
            session_id=session_id,
            history_store=history_store,
            provider=provider,
            model=model,
            request_id=request_id,
        )
    except RuntimeError as exc:
        LOGGER.exception(
            "chat_runtime_error request_id=%s session_id=%s provider=%s model=%s detail=%s",
            request_id,
            session_id,
            provider,
            model,
            str(exc),
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        LOGGER.exception(
            "chat_provider_error request_id=%s session_id=%s provider=%s model=%s",
            request_id,
            session_id,
            provider,
            model,
        )
        raise HTTPException(status_code=502, detail="Failed to generate a response.") from exc

    LOGGER.info(
        "chat_succeeded request_id=%s session_id=%s provider=%s model=%s reply_chars=%d",
        request_id,
        session_id,
        provider,
        model,
        len(reply),
    )
    LOGGER.debug(
        "chat_message request_id=%s session_id=%s role=assistant provider=%s model=%s content=%r",
        request_id,
        session_id,
        provider,
        model,
        reply,
    )
    return ChatResponse(reply=reply)


@app.get("/config", response_model=RuntimeConfigResponse)
async def get_config() -> RuntimeConfigResponse:
    config = get_runtime_config()
    return RuntimeConfigResponse(
        providers=config["providers"],
        default_provider=config["default_provider"],
        provider_models=config["provider_models"],
        default_models=config["default_models"],
        openrouter_reasoning_models=config["openrouter_reasoning_models"],
    )

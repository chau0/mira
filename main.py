from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import HistoryStore, chat


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


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

app = FastAPI(title="Mira")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

history_store: HistoryStore = {}


@app.get("/", response_class=FileResponse)
async def read_index() -> FileResponse:
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


@app.post("/chat", response_model=ChatResponse)
async def post_chat(payload: ChatRequest, request: Request) -> ChatResponse:
    message = payload.message.strip()
    session_id = payload.session_id.strip()
    request_id = getattr(request.state, "request_id", "-")

    if not message:
        LOGGER.warning("chat_invalid request_id=%s reason=empty_message", request_id)
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not session_id:
        LOGGER.warning("chat_invalid request_id=%s reason=missing_session_id", request_id)
        raise HTTPException(status_code=400, detail="Session ID is required.")

    LOGGER.info(
        "chat_received request_id=%s session_id=%s message_chars=%d",
        request_id,
        session_id,
        len(message),
    )
    try:
        reply = chat(
            message=message,
            session_id=session_id,
            history_store=history_store,
            request_id=request_id,
        )
    except RuntimeError as exc:
        LOGGER.exception(
            "chat_runtime_error request_id=%s session_id=%s detail=%s",
            request_id,
            session_id,
            str(exc),
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        LOGGER.exception(
            "chat_provider_error request_id=%s session_id=%s",
            request_id,
            session_id,
        )
        raise HTTPException(status_code=502, detail="Failed to generate a response.") from exc

    LOGGER.info(
        "chat_succeeded request_id=%s session_id=%s reply_chars=%d",
        request_id,
        session_id,
        len(reply),
    )
    return ChatResponse(reply=reply)

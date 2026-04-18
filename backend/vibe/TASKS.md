# Tasks

## Current Milestone
Milestone: Phase 1 — Web Chat with In-Session Memory
Status: Implementation complete; E2E validation pending

## Status Legend
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

## Task List

### MIRA-001: Project setup
Status: DONE
Goal: Create the Phase 1 repo structure and install dependencies.
Deliverable:
- `requirements.txt` with all deps
- `.env` with API key placeholders
- `main.py`, `agent.py`, `static/index.html`
- `README.md` with run instructions

### MIRA-002: Agent wrapper (`agent.py`)
Status: DONE
Goal: Build the agent layer that manages session history and calls LLM providers.
What was built (expanded beyond original Gemini-only spec):
- Multi-provider support: Gemini and OpenRouter
- Runtime config from env vars (`LLM_PROVIDERS`, `GEMINI_MODELS`, `OPENROUTER_MODELS`, `DEFAULT_PROVIDER`, etc.)
- `chat()` signature: `(message, session_id, history_store, provider, model, request_id) -> str`
- Reasoning model support for OpenRouter (`OPENROUTER_REASONING_MODELS`)
- Structured logging with request IDs throughout
- System prompt loaded from `DESIGN.md`, falls back to inline default

### MIRA-003: FastAPI app (`main.py`)
Status: DONE
Goal: Serve the chat UI and expose session-aware endpoints.
What was built (expanded beyond original spec):
- `GET /` → serves `static/index.html`
- `POST /chat` → accepts `{ message, session_id, provider?, model? }`, returns `{ reply }`
- `GET /config` → returns active providers, models, and defaults
- Per-request provider/model override support
- Mock mode via `CHAT_MOCK_MODE=true` env var
- Request ID middleware with structured access logging
- Input validation: empty message, missing session_id, unsupported provider/model → 400

### MIRA-004: Chat UI (`static/index.html`)
Status: DONE
Goal: Browser chat interface for local single-user sessions.
Deliverable:
- Single HTML file, vanilla JS, no framework
- Random session ID on page load via `crypto.randomUUID()`
- `POST /chat` on send; displays user + Mira messages in order

### MIRA-005: Manual end-to-end validation
Status: TODO
Goal: Verify the full Phase 1 flow works and session isolation is correct.
Steps:
- Run `uvicorn main:app --reload`
- Open `http://localhost:8000`
- Have a 10-message conversation and confirm Mira references earlier messages
- Open a fresh session and confirm prior context is not carried over
- Test provider/model switching if multiple providers configured
- Record short notes on what felt natural vs off

## Phase 2 Tasks (not started)

### MIRA-006: Session logging
Status: TODO
Goal: Persist conversation logs to disk so sessions survive server restarts.

### MIRA-007: Long-term memory extraction
Status: TODO
Goal: Extract memory items (goals, decisions, preferences) from session logs and store separately.

### MIRA-008: Cross-session memory retrieval (baseline)
Status: TODO
Goal: Retrieve relevant past memory and inject into context for new sessions.

## Rules for Execution
- Work on one task at a time
- Do not start a new task until the current one is complete or blocked
- Update task status after each task
- If blocked, explain why clearly
- If architecture must change, update `DESIGN.md` first

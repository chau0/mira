# Tasks

## Current Milestone
Milestone: Phase 1 — Web Chat with In-Session Memory
Deadline: 2026-04-11

## Status Legend
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

## Task List

### MIRA-001: Project setup
Status: DONE
Goal: Create the Phase 1 repo structure and install only the dependencies needed for local chat.
Deliverable:
- `requirements.txt`: `google-genai`, `fastapi`, `uvicorn`, `python-dotenv`
- `.env` with placeholder: `GEMINI_API_KEY=your-key-here`
- Empty `main.py`, `agent.py`, `static/index.html`
- `README.md`: one-line description plus local run command: `uvicorn main:app --reload`
Notes:
- Keep dependencies minimal and local-first
- Repo path is `~/repo/ai-companion/`

### MIRA-002: Gemini wrapper (`agent.py`)
Status: DONE
Goal: Build the Phase 1 agent wrapper that sends full in-session history to Gemini and returns a reply.
Deliverable:
- `agent.py` with: `chat(message: str, session_id: str, history_store: dict) -> str`
- Loads `GEMINI_API_KEY` from `.env`
- Uses the Phase 1 system prompt from `DESIGN.md`
- Appends the user message to session history, calls Gemini with full history, appends the assistant reply, returns reply text
- Uses session-scoped in-memory history: `history_store = {session_id: [messages]}`
Notes:
- Internal history format: list of `{ "role": "...", "content": "..." }`
- Session history is preserved only for the lifetime of the server process
- Starting a new `session_id` must not reuse prior context

### MIRA-003: FastAPI app (`main.py`)
Status: DONE
Goal: Serve the chat UI and expose a session-aware chat endpoint.
Deliverable:
- `main.py` with FastAPI app
- `GET /` serves `static/index.html`
- `POST /chat` accepts `{ "message": str, "session_id": str }` and returns `{ "reply": str }`
- Global in-memory `history_store` dict passed to `agent.py`
Notes:
- Use `StaticFiles` to serve `static/`
- No auth, no database, no tools
- Validate that empty messages are rejected cleanly

### MIRA-004: Chat UI (`static/index.html`)
Status: DONE
Goal: Build a simple browser chat interface for one local user session at a time.
Deliverable:
- Single HTML file with message list, text input, and send button
- On page load, generate a random session ID with `crypto.randomUUID()`
- On send, `POST /chat` with `message` and `session_id`
- Display user and Mira messages in order
- Basic readable styling with no frontend framework
Notes:
- Vanilla JS only
- Refreshing the page should create a new session unless the UI is explicitly designed to persist the ID

### MIRA-005: Manual end-to-end validation
Status: TODO
Goal: Verify that the full Phase 1 flow works locally and that session memory behaves correctly.
Deliverable:
- Run `uvicorn main:app --reload`
- Open `http://localhost:8000`
- Have a 10-message conversation and confirm Mira references earlier messages in that same session
- Open a fresh browser session or reload into a new session ID and confirm prior context is not carried over
- Record short notes on what felt natural vs off
Notes:
- Manual test only; no automated test required for this milestone

## Rules for Execution
- Work on one task at a time
- Do not start a new task until the current one is complete or blocked
- Update task status after each task
- If blocked, explain why clearly
- If architecture must change, update `DESIGN.md` first

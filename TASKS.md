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
Status: TODO
Goal: Create repo structure, install dependencies, scaffold empty files
Deliverable:
- requirements.txt: fastapi, uvicorn, google-generativeai, python-dotenv
- .env with placeholder: GEMINI_API_KEY=your-key-here
- Empty main.py, agent.py, static/index.html
- README.md: one-line description + how to run (uvicorn main:app --reload)
Notes:
- No logic yet, just structure
- Repo is at ~/repo/ai-companion/

### MIRA-002: Gemini wrapper (agent.py)
Status: TODO
Goal: Function that calls Gemini with conversation history and returns reply
Deliverable:
- agent.py with: chat(message: str, session_id: str, history_store: dict) -> str
- Loads GEMINI_API_KEY from .env
- Appends user message to session history, calls Gemini, appends reply, returns reply
- System prompt: "You are Mira, a thinking partner. Be direct, remember context, push back when the user is off track."
Notes:
- Use google-generativeai SDK
- History format: list of {"role": "user"/"model", "parts": ["..."]}
- history_store is a dict: { session_id: [messages] }

### MIRA-003: FastAPI app (main.py)
Status: TODO
Goal: Web server with /chat endpoint and static file serving
Deliverable:
- main.py with FastAPI app
- GET / → serves static/index.html
- POST /chat with body { "message": str, "session_id": str } → returns { "reply": str }
- Global history_store dict passed to agent.py
Notes:
- Use StaticFiles to serve static/
- No auth, no database

### MIRA-004: Chat UI (static/index.html)
Status: TODO
Goal: Simple browser chat interface
Deliverable:
- Single HTML file with: chat message display area, text input, send button
- On send: POST to /chat with message + session_id (random UUID generated on page load)
- Display user messages and Mira replies in sequence
- Basic styling (readable, clean, no framework)
Notes:
- Vanilla JS only
- Session ID generated with crypto.randomUUID() on page load

### MIRA-005: End-to-end test
Status: TODO
Goal: Verify the full pipeline works in browser
Deliverable:
- Run: uvicorn main:app --reload
- Open browser at localhost:8000
- Have a 10-message conversation
- Confirm Mira remembers context from earlier in the session
- Note what felt natural vs off
Notes:
- Human test, not automated
- Fill in EXP-001 in ops/experiments.md after

## Rules for Execution
- Work on one task at a time
- Do not start a new task until the current one is complete or blocked
- Update status after each task
- If blocked, explain why clearly
- If architecture must change, update ARCHITECTURE.md first

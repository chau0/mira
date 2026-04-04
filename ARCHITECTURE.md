# Architecture

## Product System
- Runtime: local web app (FastAPI + static HTML)
- Model provider: Google Gemini (primary), GPT-4.1 Mini (fallback)
- Entry points: `main.py` for FastAPI app, `agent.py` for model calls
- Memory: in-session only for Phase 1 (server-side in-memory dict)
- Persistence, auth, and deployment remain out of scope for Phase 1

## Stack
- Backend: Python, FastAPI, uvicorn
- Frontend: single static HTML file (vanilla JS, no framework)
- LLM: Google Gemini via google-generativeai SDK
- Memory: Python dict (session → conversation history)
- Database: None (Phase 1)

## Main Components

### 1. main.py — FastAPI app
Purpose: Serves the HTML frontend and handles /chat requests.
Inputs: POST /chat with { "message": "...", "session_id": "..." }
Outputs: JSON { "reply": "..." }

### 2. agent.py — Gemini wrapper
Purpose: Manages conversation history per session and calls Gemini API.
Inputs: message string, session_id, in-memory history store
Outputs: reply string

### 3. static/index.html — Chat UI
Purpose: Simple browser chat interface. No framework.
Inputs: User text input
Outputs: Sends POST to /chat, displays reply

## Data Flow
1. User opens browser at localhost:8000
2. Types message, clicks Send
3. JS sends POST /chat with message + session_id
4. FastAPI passes to agent.py
5. agent.py appends to session history, calls Gemini
6. Gemini returns reply
7. agent.py appends reply to history, returns it
8. FastAPI returns JSON reply
9. JS displays reply in chat window

## Key Decisions

### Decision 1
Choice: Single HTML file served as static asset, no JS framework
Reason: Fastest to build, no build step, easy to understand
Alternatives rejected: React/Vue (overkill for Phase 1)

### Decision 2
Choice: session_id as random string generated client-side
Reason: No auth needed, simple, stateless from server perspective
Alternatives rejected: cookies, JWT (unnecessary complexity)

### Decision 3
Choice: In-memory dict for history (not database)
Reason: Simplest, no setup, fine for single user Phase 1
Alternatives rejected: SQLite, Redis (Phase 3 concern)

## Simplicity Rules
- Prefer the simplest implementation that works
- Avoid new dependencies unless necessary
- Avoid abstractions before repeated need appears
- Keep functions/components small and clear
- Do not optimize prematurely

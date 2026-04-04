# DESIGN — Mira

## Architecture

### Stack
- Backend: Python, FastAPI, uvicorn
- Frontend: single static HTML file (vanilla JS, no framework)
- LLM: Google Gemini via google-generativeai SDK
- Memory: Python dict in server memory (Phase 1); ChromaDB (Phase 3)
- Database: None (Phase 1)

### Components
```
static/index.html   ← chat UI (browser)
main.py             ← FastAPI app, routes
agent.py            ← Gemini wrapper, history management
.env                ← GEMINI_API_KEY
requirements.txt
```

## Main Process Logic

### Chat Flow (Phase 1)
```
User types message in browser
  → JS POST /chat { message, session_id }
  → main.py routes to agent.py
  → agent.py appends message to session history
  → agent.py calls Gemini API with full history
  → Gemini returns reply
  → agent.py appends reply to history
  → returns reply to main.py
  → main.py returns JSON { reply }
  → JS displays reply in chat window
```

### Memory Logic (Phase 1 — naive)
- history_store: dict { session_id: [messages] }
- Each message: { "role": "user" | "model", "parts": ["..."] }
- Full history sent to Gemini on every request
- History lives only in server memory — lost on restart

### Memory Logic (Phase 3 — intelligent)
- Messages embedded and stored in ChromaDB
- On each user message: retrieve top-K relevant past memories using hybrid search
- AI layer verifies which retrieved memories are actually relevant
- Inject verified memories into context before calling LLM
- See ops/experiments.md for techniques and evaluation

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend | Single HTML file, no framework | Fastest, no build step |
| Session identity | Random UUID from client | No auth needed, simple |
| Phase 1 memory | In-memory dict | No setup, fine for single user |
| LLM provider | Gemini → GPT-4.1 Mini | Free tier, provider-agnostic |
| History format | Gemini native format | No translation layer needed |

## Constraints
- One active task at a time
- Architecture changes must be documented here before implementation
- Provider swap = env var change only, no code change

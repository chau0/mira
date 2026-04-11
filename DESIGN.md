# DESIGN — Mira

## Phase 1 — Basic Conversational Agent

### Goal
Working chat UI in browser. User talks to Mira, Mira remembers the full conversation, responds as a thinking partner.

**Done when:** 10-message natural conversation works. Agent references earlier messages. Runs with `uvicorn main:app`.

---

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| LLM | Gemini API (`gemini-2.5-flash`) | Fast default model, simple SDK, easy local iteration |
| Backend | Python + FastAPI | Lightweight, async-ready, easy to extend |
| Frontend | Single `index.html` (vanilla JS) | No build step, no framework overhead |
| Memory (Phase 1) | In-memory session store on server | Zero setup, sufficient for single user |
| Memory (Phase 3) | ChromaDB + hybrid search | Persistent, cross-session recall |

---

## File Structure

```
ai-companion/
  main.py           ← FastAPI app + routes
  agent.py          ← Gemini API wrapper + history management
  static/
    index.html      ← chat UI (input box, message display)
  .env              ← GEMINI_API_KEY
  requirements.txt  ← google-genai, fastapi, uvicorn, python-dotenv
  DESIGN.md
  SPEC.md
```

---

## Mira's Identity

**System prompt:**

```
You are Mira, an AI thinking partner and personal assistant.

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

You remember everything said in this conversation. Use it.
```

**Tone:** Level 3/5 — direct and honest, not harsh.
**Challenges:** Only when she spots a real problem.

---

## Chat Flow (Phase 1)

```
User types message in browser
  → JS: POST /chat { "message": "...", "session_id": "..." }
  → main.py: routes to agent.chat(message, session_id, history_store)
  → agent.py: appends { role: "user", content: message } to session history
  → agent.py: calls Gemini API with system prompt + full session history
  → Gemini returns reply text
  → agent.py: appends { role: "assistant", content: reply } to session history
  → returns reply to main.py
  → main.py: returns JSON { "reply": "..." }
  → JS: displays reply in chat window
```

---

## Memory Design

**Phase 1 — In-memory (server-side):**
```python
history_store = {
    "session-id": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
}
# Lives in server process — cleared on restart
# Full session history sent to Gemini on every request
```

**Phase 3 — Persistent (planned):**
- Messages embedded and stored in ChromaDB
- Hybrid search (semantic + keyword) to retrieve relevant past context
- Inject verified memories into prompt before calling Claude

---

## API Design

### `POST /chat`
```json
Request:  { "message": "string", "session_id": "string" }
Response: { "reply": "string" }
```

### `GET /`
Serves `static/index.html`

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| LLM provider | Gemini (`gemini-2.5-flash`) | Good local default with a minimal SDK |
| Frontend | Single HTML file, vanilla JS | No build step, stays simple |
| Session memory | Server-side dict keyed by `session_id` | Zero setup, isolates browser sessions |
| History format | Internal `{role, content}` mapped to Gemini `contents` | Keeps app code provider-agnostic |
| UI framework | None for Phase 1 | Speed — FastAPI for Phase 4 deployment already |

---

## Constraints
- One active task at a time
- Architecture changes documented here before implementation
- Phase 1 scope: no persistent memory, no tools, no auth, no multi-user

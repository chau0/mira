# SPEC — Mira

## Product Definition

Mira is a memory-aware AI thinking partner. It chats naturally, but its key capability is remembering goals, decisions, preferences, and ongoing problems across conversations, then surfacing the right context when it becomes relevant.

## Project Goal

This is a hobby project to learn how to build intelligent memory retrieval for AI agents by building a real working product.

## Primary User

- The builder (solo developer).

## Core User Need

- An AI that does not feel blank between sessions and can bring back past goals or decisions when the user is stuck, drifting, or reconsidering something important.

## Functional Requirements

### Phase 1

- Web UI: chat with Mira in a browser at `http://localhost:8000`.
- Send text and receive responses in the browser.
- Conversation history is preserved for the current session only.
- Each session has a random session ID.
- Starting a new session does not carry over prior context.

### Phase 2

- Session logs are saved locally.
- Long-term memory items are extracted from conversations and stored separately.
- Mira can retrieve past memory across sessions using a simple baseline method.

### Phase 3

- Mira uses persistent memory across sessions.
- Mira automatically selects relevant past memory for the current message.
- Compare and evaluate retrieval approaches.
- Mira can correctly reference prior goals/decisions in relevant conversations.

## Memory Model

Long-term memory may include:

- Goals
- Decisions
- Preferences
- Ongoing projects
- Blockers
- Important personal context

## Non-Functional Requirements

- Local-first.
- Minimal dependencies.
- Fast iteration.
- Thin provider abstraction via config/env var.
- No auth, tools, or deployment in early phases.

## Non-Goals (Phase 1)

- Persistent memory
- Tool use
- Web search
- Auth
- Multi-user
- Deployment
- Frontend framework

## Trust Architecture

Trust is the hardest product problem. Mira holds deeply personal information — it must be earned, not assumed.

**What kills trust:**
- Memory surfaces at wrong moments (surveillance feeling)
- User can't see what Mira knows about them
- User can't correct or delete memories
- Vague or opaque data storage

**What builds trust:**

1. **Transparency — `/memory` page (Phase 3)**
   Show the user every memory file Mira holds about them. All of it, readable. No hidden state.
   Counterintuitive but powerful: seeing it = controlling it = trusting it.

2. **Full control — edit and delete**
   Users can update any memory entry directly. Correct wrong assumptions. Delete anything.
   Memory belongs to the user, not the app.

3. **Gradual disclosure**
   Mira learns through conversation over time — not a 20-question intake form on day 1.
   Users share when they're ready. Mira doesn't ask for personal info upfront.

4. **Visible value exchange**
   When Mira references something from 2 weeks ago and it actually helps — trust jumps.
   The user gave information; Mira used it well. That's the exchange.

5. **Privacy architecture**
   Local-first (already a principle). Clear data policy before any cloud storage.
   Early users will ask: "where does this go?" The answer must be specific.

**Mental model: good therapist**
- You control what you share
- They keep it confidential
- They use it to help, not to impress
- They don't surface personal details at wrong times
- You can end the relationship and take your data

**Phase 3 requirement added:** `/memory` page — user-facing view of all memory files, with edit and delete capability.

---

## Success Criteria

- **Phase 1:** Runs locally and is usable end-to-end.
- **Phase 2:** Can recall past memory across sessions.
- **Phase 3:** Retrieval meaningfully improves relevance (not just fluency). User can view, edit, and delete all memory entries via `/memory` page.
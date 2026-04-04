# SPEC — Mira

## What I'm Building
An AI companion that talks naturally using intelligent memory.
When the user speaks, Mira auto-detects the right context and responds as if it knows you —
without needing to re-explain who you are or what you care about.

## Target
Hobby project. Main goal: learn how to build a memory-aware AI agent by building something real.
Mira is the vehicle for learning. The real problem to solve is intelligent memory retrieval.

## Functional Requirements

### Core (must have)
- User can chat with Mira through a web browser
- Mira remembers the conversation within a session (in-session memory)
- Mira responds naturally and contextually, not like a blank chatbot
- User can start a new session and Mira treats it fresh (Phase 1)
- Mira references past goals/decisions when the user is stuck on a decision (Phase 3)

### Phase 1 (current)
- Web chat UI accessible at localhost:8000
- Text input → send → Mira reply displayed in browser
- Conversation history kept in memory for the duration of the session
- Session identified by a random ID (no login required)

### Phase 3 (target)
- Memory persists across sessions (vector store)
- Mira auto-detects which past memory is relevant to the current message
- Multiple retrieval techniques tried and evaluated (see ops/experiments.md)

## Non-Functional Requirements
- Provider-agnostic: LLM swappable via env var (no code change)
- LLM preference: Google Gemini (free tier) → GPT-4.1 Mini (fallback)
- Simple: no framework, no auth, no unnecessary dependencies
- Fast to iterate: each phase should produce a working, testable product

## Non-Goals (Phase 1)
- No persistent memory across sessions
- No tools or web search
- No authentication
- No multi-user support
- No deployment (local only)
- No JS framework (vanilla only)

# Project: Mira

## Purpose
Hobby project to learn AI agent techniques by building something real.

Mira is an AI companion that talks naturally to the user using intelligent memory.
When the user speaks, Mira auto-detects the right context and responds naturally —
without the user needing to re-explain who they are or what they care about.

## Core Technical Challenge
Intelligent context detection: given a user message, which memories are relevant right now?
This requires combining multiple retrieval methods (semantic, keyword, knowledge graph)
and using an AI layer to verify and select the best context before responding.

## Learning Goals (by phase)
- Phase 1: LLM API calls, conversation state, multi-turn history
- Phase 2: Tool use, ReAct loop, agent actions
- Phase 3: Memory retrieval — hybrid search + AI verification (the core challenge)
- Phase 4: Deployment, real user feedback

## Target User
First user: me (lechau_ai). Talk to Mira naturally; it should feel like talking to
someone who knows you — not a blank chatbot.

## Success Condition
User is stuck on a decision. Mira references a goal the user mentioned last week
and pushes back — without being asked to.

## Constraints
- Stack: Python, Claude API (claude-sonnet-4-6), python-dotenv
- Phase 1: Local CLI, no persistence, no tools
- Phase 3: Vector store (ChromaDB), persistent memory
- Phase 4: Telegram or web frontend

## Non-Goals (Phase 1)
- No persistent memory across sessions
- No tools or web search
- No UI or web interface
- No multi-user support

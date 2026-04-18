# Design Review — `DESIGN.md`

## Findings

### 1. High: Phase 1 memory design does not satisfy the documented session model

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L86) defines Phase 1 memory as a single process-wide `history = []`. That collapses all conversations into one shared transcript. It does not meet the requirement that Phase 1 preserve history for the current session only, give each session a random ID, and isolate new sessions from prior context as defined in [`SPEC.md`](/home/adminops/repo/ai-companion/SPEC.md#L23) and concretely required in [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L31) and [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L46).

Impact: if implemented as written, opening a second browser tab or starting a new session will leak context across sessions and invalidate Phase 1 acceptance criteria.

Recommendation: replace the single list with a session-scoped store in the design, for example `history_store: dict[str, list[message]]`, and include `session_id` in the API and chat flow.

### 2. High: The design conflicts with the current provider and SDK direction

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L16) and [`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L117) standardize on Claude plus `ANTHROPIC_API_KEY`, while [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L19), [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L27), and [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L32) standardize on Gemini plus `google-generativeai` and `GEMINI_API_KEY`.

Impact: implementation cannot proceed cleanly because the task list and design prescribe different SDKs, env vars, message formats, and wrapper behavior.

Recommendation: choose one provider in the design and align every dependent section. If provider choice is intentionally flexible, the design should state a provider abstraction and move the concrete model choice to config instead of hard-coding Claude.

### 3. High: `POST /chat` is missing `session_id`, so the API cannot implement the required behavior

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L102) defines `POST /chat` as accepting only `message`, but session isolation in [`SPEC.md`](/home/adminops/repo/ai-companion/SPEC.md#L25) and the implementation tasks in [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L46) require `{ "message": str, "session_id": str }`.

Impact: the documented API cannot support session memory without relying on undocumented server-side heuristics or a single global conversation.

Recommendation: update the API section and chat flow to require `session_id` from the browser.

### 4. Medium: History format is specified inconsistently across repo documents

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L73) and [`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L120) use OpenAI-style `{role, content}` messages and call them Claude-compatible. [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L37) instead requires Gemini-style messages with `parts` and `"model"` roles.

Impact: message history is a core interface between `main.py`, `agent.py`, and any future persistence layer. Leaving this unresolved will create avoidable rewrites or adapters immediately after scaffolding.

Recommendation: define one internal canonical history schema in the design, then state that provider-specific adapters map that schema to Claude or Gemini request formats.

### 5. Medium: The design overcommits to Phase 3 retrieval implementation without defining Phase 2 transition points

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L93) jumps from Phase 1 straight to ChromaDB plus hybrid search, but [`SPEC.md`](/home/adminops/repo/ai-companion/SPEC.md#L29) defines a Phase 2 baseline where session logs are saved locally and memory retrieval is introduced incrementally.

Impact: the design skips the intermediate architecture needed to learn from simpler retrieval baselines, which is one of the explicit project goals in [`SPEC.md`](/home/adminops/repo/ai-companion/SPEC.md#L9).

Recommendation: add a Phase 2 section covering local session log storage, memory extraction, and a simple retrieval baseline before locking in ChromaDB and hybrid search.

### 6. Low: The file structure section is already out of sync with the repo control docs

[`DESIGN.md`](/home/adminops/repo/ai-companion/DESIGN.md#L24) omits files and paths that the execution plan already expects, including `TASKS.md`, `README.md`, and `ops/experiments.md` from [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L22) and [`TASKS.md`](/home/adminops/repo/ai-companion/TASKS.md#L75).

Impact: low immediate risk, but it weakens the design doc as the source of truth for repo structure.

Recommendation: either keep the file tree intentionally minimal and label it as Phase 1 runtime files only, or expand it to include operational/project files that the plan depends on.

## Open Questions

- Is provider choice already decided? If not, the repo should stop encoding Claude in design and Gemini in tasks at the same time.
- Is Phase 1 intended to support multiple concurrent browser sessions for the single developer? The spec says yes in practice because it requires session IDs and isolated session history.

## Recommended Design Corrections

1. Update `DESIGN.md` so Phase 1 uses a session-scoped in-memory store keyed by `session_id`.
2. Add `session_id` to the `POST /chat` request contract and to the browser-to-backend flow.
3. Resolve the provider decision and normalize env vars, SDK, and message format across design and tasks.
4. Define a provider-agnostic internal message schema if future provider switching is a real requirement.
5. Add an explicit Phase 2 design section that matches the spec's local logs and simple retrieval baseline.

## Summary

The current design is not implementation-ready because it disagrees with the rest of the repo on three critical interfaces: session model, provider choice, and request/history schema. Those should be resolved in `DESIGN.md` before Phase 1 implementation starts.

# Memory Design — Mira

## Overview

Mira's memory is built in three layers, each with a different scope and lifetime. No single mechanism handles everything.

| Layer | Scope | Lifetime | Phase |
|-------|-------|----------|-------|
| Instruction memory | Persona + rules | Always loaded | Phase 1 |
| Session memory | Current conversation | Until restart | Phase 1 |
| Persistent memory | Long-term user facts | Across sessions | Phase 3 |

---

## Layer 1 — Instruction Memory (Phase 1)

**What it is:** The system prompt. Loaded on every request. Defines who Mira is.

**What it stores:**
- Mira's persona and tone
- Behavioral rules (challenge, connect, suggest)
- How she should communicate

**Implementation:**
```python
SYSTEM_PROMPT = """
You are Mira, an AI thinking partner and personal assistant.
...
"""
```

**Never changes at runtime.** If you want to update Mira's behavior, edit the system prompt.

---

## Layer 2 — Session Memory (Phase 1)

**What it is:** The conversation history for the current browser session. Sent to Claude on every request.

**What it stores:**
- Full back-and-forth of the current conversation
- Keyed by `session_id` (one per browser tab)

**Implementation:**
```python
history_store = {
    "abc123": [
        {"role": "user", "content": "I'm stuck on a decision"},
        {"role": "assistant", "content": "Tell me more about what's making it hard"}
    ]
}
```

**Limits:**
- Lives in server process memory — cleared on restart
- No cap in Phase 1 — full history sent every time
- Phase 2 adds compression when history grows too long

**Context compression (Phase 2):**
When history exceeds ~20 messages, summarize older turns into a single "session summary" message and keep only the last 10 turns in full. This prevents context window overflow without losing continuity.

```
[System prompt]
[Session summary: "User discussed decision about X, we concluded Y..."]
[Last 10 messages — full]
[Current message]
```

---

## Layer 3 — Persistent Memory (Phase 3)

**What it is:** Long-term facts about the user that survive across sessions and restarts.

**What it stores:**
- User goals, values, ongoing projects
- Important decisions made
- Patterns Mira has noticed ("you often avoid X")
- Things the user explicitly asked Mira to remember

**What it does NOT store:**
- Full conversation transcripts (too noisy)
- Temporary task state (doesn't persist)
- Information that changes frequently

---

## Persistent Memory Architecture

### Storage

Each memory = one file on disk with a structured header:

```
memory/
  user_goals.md
  user_values.md
  project_mira.md
  feedback_avoid_X.md
  MEMORY_INDEX.md    ← index of all memory files
```

Each memory file:
```markdown
---
name: User Goals
description: User's active goals — financial freedom, son's education
type: user
updated: 2026-04-05
---

Goal 1: Financial freedom by 2027 via product income...
Goal 2: Raise son with curiosity, EQ, and resilience...
```

### Retrieval — Metadata-First

**Never load all memories at once.** Scan index first, then select.

**Step-by-step retrieval on each user message:**

```
1. User sends message
2. Read MEMORY_INDEX.md (file names + one-line descriptions only)
3. Call Claude (cheap/fast) with: 
   "Given this user message, which of these memory files are relevant? Pick max 3."
4. Read only the selected memory files
5. Inject into prompt as [Relevant context] block
6. Call main Claude with full context
```

**Why metadata-first:**
- Avoids loading irrelevant memory
- Keeps context clean and focused
- Same pattern used in Claude Code's production memory system

### Deduplication

Track which memories were already injected in this session. Don't reinject them on every turn — only load new ones.

```python
session_loaded_memories = set()  # track by file name

def get_relevant_memories(message, session_loaded):
    index = read_memory_index()
    selected = select_relevant(message, index)  # Claude call
    new_memories = [m for m in selected if m not in session_loaded]
    session_loaded.update(new_memories)
    return read_memory_files(new_memories)
```

### Writing New Memories

Mira writes memories when:
1. User explicitly says "remember this"
2. Mira detects a significant fact worth keeping (goal change, major decision)
3. End-of-session: summarize key insights from the conversation

Writing rules:
- Update existing file if topic already exists — don't duplicate
- Keep entries concise — memory files should be scannable, not verbose
- Always update `MEMORY_INDEX.md` when adding a new file

---

## What Goes Into Each Context Window

**Phase 1:**
```
[System prompt — Mira's persona]
[Session history — all messages this session]
[User message]
```

**Phase 2 (with compression):**
```
[System prompt]
[Session summary — compressed older turns]
[Last N messages — full]
[User message]
```

**Phase 3 (with persistent memory):**
```
[System prompt]
[Relevant persistent memories — max 3 files, selected per message]
[Session summary — compressed older turns]
[Last N messages — full]
[User message]
```

---

## Retrieval Decision Tree

```
User sends message
│
├── Is it a command? ("remember this", "forget this")
│   └── Write/delete memory file directly
│
├── Does session history exist?
│   ├── Yes → use it (Phase 1/2)
│   └── No → fresh session
│
└── Is persistent memory enabled? (Phase 3)
    ├── Scan MEMORY_INDEX.md
    ├── Select relevant files (Claude call)
    ├── Skip already-loaded files
    └── Inject selected memories into prompt
```

---

## Implementation Roadmap

| Phase | Memory capability | Implementation |
|-------|------------------|----------------|
| Phase 1 | Session memory (in-memory dict) | `history_store = {}` in agent.py |
| Phase 2 | Session compression | Summarize when history > 20 messages |
| Phase 3 | Persistent memory + retrieval | Files on disk + metadata-first retrieval |
| Phase 4 | Vector search | ChromaDB embeddings for semantic retrieval |

---

## Key Principles

1. **Small and precise over large and noisy** — inject 3 relevant memories, not 20
2. **Metadata before content** — scan index first, read files second
3. **Deduplicate** — never reinject what's already in context
4. **Separate concerns** — instruction memory, session memory, and persistent memory solve different problems
5. **Write-on-significance** — don't log everything, log what matters

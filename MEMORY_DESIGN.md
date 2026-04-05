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
When history exceeds ~20 messages, summarize older turns into a single "session summary" message and keep only the last 10 turns in full.

```
[System prompt]
[Session summary: "User discussed decision about X, we concluded Y..."]
[Last 10 messages — full]
[Current message]
```

---

## Layer 3 — Persistent Memory (Phase 3)

**What it is:** Long-term facts about the user that survive across sessions and restarts.

**Core insight: memory is an index, not a storage dump.**
- `MEMORY_INDEX.md` is always loaded — but it's only pointers (~150 chars/line)
- Actual content lives in topic files, fetched only when needed
- Conversation logs are never read wholesale — only grep'd if needed

### What to store vs not store

**Store:**
- Goals with specific targets + deadlines
- Stated values and non-negotiables
- Patterns observed across multiple sessions
- Explicit "remember this" requests

**Never store:**
- Conversation summaries (derivable)
- Temporary states ("feeling stressed today")
- Things the user can easily re-state
- Anything derivable from the current conversation

**The test:** if it can be re-derived by asking the user or reading the conversation, don't persist it. Persist only what is hard to reconstruct and has lasting value.

---

## Persistent Memory Architecture

### Storage Structure

```
memory/
  MEMORY_INDEX.md     ← always loaded, pointers only (~150 chars/line)
  user_goals.md       ← topic file, loaded on demand
  user_values.md
  observed_patterns.md
  key_decisions.md
```

**MEMORY_INDEX.md format** (index only — never write content here):
```markdown
- [User Goals](user_goals.md) — financial freedom by 2027, son's education by age 5
- [User Values](user_values.md) — autonomy, family, building over consuming
- [Observed Patterns](observed_patterns.md) — avoids committing to deadlines, strong on vision
- [Key Decisions](key_decisions.md) — chose Mira as first product, decided against agency model
```

**Topic file format:**
```markdown
---
name: User Goals
description: User's active goals with targets and deadlines
type: user
updated: 2026-04-05
---

Goal 1: Financial freedom — $3,500/mo product income by 2027-12-31
Goal 2: Raise son with curiosity, EQ, resilience — foundation set by age 5
```

### Write Discipline

**Always: write to topic file first, then update index.**

Never:
- Write content into the index
- Append to files without checking for existing entries on the same topic
- Create a new file if one already covers the topic — update instead

```
New fact to remember:
  1. Does a relevant topic file exist? → update it
  2. No file exists? → create topic file, then add pointer to MEMORY_INDEX.md
  3. Never write the content into MEMORY_INDEX.md
```

### Retrieval — Metadata-First

**Never load all memories at once.** Index first, content second.

```
1. User sends message
2. Load MEMORY_INDEX.md (always in context — pointers only)
3. Call Claude (cheap model) with:
   "Which of these memory files are clearly relevant to this message? Pick max 3."
4. Read only the selected topic files
5. Inject as [Relevant context] block
6. Treat injected memories as hints, not facts — verify against current conversation
7. Call main Claude with full context
```

**Retrieval is skeptical:**
Memory is a hint, not truth. If the user says something that contradicts a memory, the current session wins. Update the memory file — don't trust the old record blindly.

### Deduplication

Track what's already loaded this session. Don't reinject the same file on every turn.

```python
session_loaded_memories = set()

def get_relevant_memories(message, session_loaded):
    index = read_memory_index()
    selected = select_relevant(message, index)  # cheap Claude call
    new_only = [m for m in selected if m not in session_loaded]
    session_loaded.update(new_only)
    return read_memory_files(new_only)
```

---

## autoDream — Background Memory Rewriting (Phase 3+)

**The problem without it:** memory accumulates, duplicates, contradicts itself, and becomes noise over weeks.

**The solution:** a background rewrite pass after each session ends.

Run as a separate, isolated agent with limited tools (read + write memory files only):

```
After session ends:
  1. Read all memory files
  2. Merge duplicates ("said X in 3 different places" → one canonical entry)
  3. Convert vague → specific ("wants freedom" → "target: $3,500/mo by 2027-12")
  4. Resolve contradictions (newer session wins, unless it was a passing remark)
  5. Prune stale entries (goals achieved, decisions reversed)
  6. Rebuild MEMORY_INDEX.md from updated files
  7. Enforce index line cap (~150 chars/line, truncate if over)
```

**Why isolated:** runs in a forked process with no access to main conversation context. Prevents corruption of active session state. Limited tools = limited blast radius.

**Result:** memory is continuously edited, not appended. Quality stays high over time.

---

## Staleness Handling

Memory about user state decays. Old memories may be wrong.

Rules:
- If memory ≠ what user says now → memory is wrong, update it
- Code-derived or conversation-derived facts are never stored (they're always fresh)
- Index is forcibly truncated if it grows too long — old entries get pruned
- `updated` date in each file signals how fresh it is — treat old entries with less confidence

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
[MEMORY_INDEX.md — always, pointers only]
[Selected topic files — max 3, on-demand]
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
│   └── Write/delete topic file → update index
│
├── Session history loaded?
│   ├── Yes → use it
│   └── No → fresh session
│
└── Persistent memory enabled? (Phase 3)
    ├── Load MEMORY_INDEX.md (always in context)
    ├── Cheap Claude call: pick max 3 relevant files
    ├── Skip already-loaded files this session
    ├── Inject selected files as hints
    └── Verify against current conversation before acting on memories
```

---

## Implementation Roadmap

| Phase | Memory capability | Key implementation |
|-------|------------------|--------------------|
| Phase 1 | Session memory (in-memory dict) | `history_store = {}` in agent.py |
| Phase 2 | Session compression | Summarize when history > 20 messages |
| Phase 3 | Persistent memory + metadata-first retrieval | Files on disk, index pointer model |
| Phase 3+ | autoDream rewrite pass | Isolated background agent, runs post-session |
| Phase 4 | Vector search | ChromaDB embeddings for semantic retrieval |

---

## Key Principles

1. **Index = pointers, not content** — MEMORY_INDEX.md is always loaded but never holds facts
2. **Metadata before content** — scan index first, read topic files second
3. **Deduplicate** — never reinject what's already in context this session
4. **Write discipline** — topic file first, index update second, never the reverse
5. **Rewrite, don't append** — autoDream keeps memory quality high over time
6. **Staleness is real** — old memory is a hint, current session wins on conflict
7. **If derivable, don't persist** — only store what can't be reconstructed easily

# AI Agent Learning Path

Learn by building. Every concept learned = a commit in Mira.
Start HF Agents Course at Phase 2 (tools + ReAct). Phase 1 needs no course.

---

## FOUNDATION — Phase 1
Concepts:
- LLM API calls — send message, get reply
- Conversation history — multi-turn memory as message list
- System prompts — give the agent a personality and role

Build target: Mira web chat (FastAPI + Gemini + HTML)
Resources: Gemini API docs, FastAPI docs

---

## TOOLS & ACTIONS — Phase 2
Concepts:
- Tool use / function calling — agent calls functions you define
- ReAct loop — Reason → Act → Observe → repeat
- Tool examples: save_memory(), recall_memory(), search_web()

Build target: Mira can save + retrieve notes mid-conversation
Resources: HF Agents Course (start here at Phase 2)

---

## MEMORY — Phase 3 (the core challenge)
Concepts:
- Short-term memory — conversation history (done in Phase 1)
- Long-term memory — persist across sessions
- Embedding — convert text to vectors for similarity search
- Vector database — store + query embeddings (ChromaDB)
- Retrieval — given current message, find relevant past memory
- Hybrid search — combine semantic (embeddings) + keyword (BM25) + knowledge graph
- AI verification — use LLM to filter false positives from retrieval

Build target: Mira remembers goals/decisions across sessions, surfaces relevant context
Resources: HF Agents Course (memory unit), Kaggle (embeddings, vector search)
Experiments: see ops/experiments.md

---

## ORCHESTRATION — Phase 4+
Concepts:
- Multi-agent — multiple agents with different roles
- Agent handoff — pass work between agents
- Planning agent — breaks goals into subtasks
- Evaluation — measure if agent is doing the right thing

Build target: Mira delegates to sub-agents (memory manager, response agent)
Resources: HF Agents Course (multi-agent unit)

---

## Rule
Learn one concept → build it in Mira → commit → move to next.
Don't read ahead without building.

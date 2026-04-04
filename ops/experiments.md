# Memory Technique Experiments

Goal: Try each memory retrieval technique, evaluate objectively + subjectively, pick the best for Mira.

## Evaluation Criteria

### Objective (measurable)
| Metric | How to measure |
|--------|---------------|
| Retrieval precision | Did it pull relevant memory? (relevant retrieved / total retrieved) |
| Response relevance | Did the response actually use the retrieved memory? (yes/no/partial) |
| Latency | Time from message to response (seconds) |
| Token cost | Tokens sent in context per message |

### Subjective (after a 10-message real conversation)
| Question | Scale |
|----------|-------|
| Did it feel like it knew me? | 1–5 |
| Did it make a useful connection I didn't expect? | yes / no |
| Did it say something wrong or off-context? | yes / no |
| Would I use this over a blank chatbot? | yes / no |

**Rule: feeling score matters most. High metrics + robotic feel = fail.**

---

## Techniques to Try

1. **Naive** — full history in context window
2. **Sliding window** — last N messages only
3. **Summarization** — compress old context into summary
4. **Vector search** — ChromaDB, retrieve by semantic similarity
5. **BM25 / keyword** — fast lexical search
6. **Hybrid** — vector + keyword, AI picks best result
7. **Knowledge graph** — entities + relationships stored and traversed

---

## Scorecard

| # | Technique | Precision | Latency | Token cost | Feel (1-5) | Useful surprise | Wrong context | Use over blank? | Verdict |
|---|-----------|-----------|---------|------------|------------|-----------------|---------------|-----------------|---------|
| - | (not started) | | | | | | | | |

---

## Experiment Log

### EXP-001 — (fill when first experiment runs)
- **Technique:**
- **Date:**
- **Setup:**
- **Conversation summary:**
- **Scorecard:**
- **Notes:**
- **Next to try:**

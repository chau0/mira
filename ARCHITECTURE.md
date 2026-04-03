# Architecture

## Overview
CLI chatbot. User types → message sent to Claude API with conversation history → response printed.
No database, no UI, no tools. In-session memory only.

## Stack
- Frontend: Terminal (CLI)
- Backend: Python
- Database: None (Phase 1); ChromaDB (Phase 3)
- Auth: None
- Deployment: Local only (Phase 1)
- Testing: Manual conversation test

## Main Components

### 1. main.py — Conversation Loop
Purpose: Entry point. Runs the REPL loop (read input → call agent → print response → repeat).
Inputs: User keyboard input
Outputs: Printed agent response

### 2. agent.py — Claude API Wrapper
Purpose: Manages conversation history and calls Claude API.
Inputs: User message string, existing conversation history
Outputs: Assistant reply string, updated conversation history

## Data Flow
1. User types a message in terminal
2. main.py passes message to agent.py
3. agent.py appends message to history list
4. agent.py calls Claude API with full history
5. Claude returns a reply
6. agent.py appends reply to history, returns it
7. main.py prints the reply
8. Loop repeats until user types "exit"

## Key Decisions

### Decision 1
Choice: Keep conversation history as a simple Python list of dicts
Reason: Simplest implementation; matches Claude API messages format directly
Alternatives rejected: SQLite (overkill for Phase 1), file-based (unnecessary complexity)

### Decision 2
Choice: No streaming
Reason: Simpler code; latency acceptable for CLI
Alternatives rejected: Streaming (adds complexity, not needed yet)

## Simplicity Rules
- Prefer the simplest implementation that works
- Avoid new dependencies unless necessary
- Avoid abstractions before repeated need appears
- Keep functions/components small and clear
- Do not optimize prematurely

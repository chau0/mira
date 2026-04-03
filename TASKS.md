# Tasks

## Current Milestone
Milestone: Phase 1 — Basic CLI Agent with In-Session Memory
Deadline: 2026-04-11

## Status Legend
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

## Task List

### Task 1: Project setup
Status: TODO
Goal: Create the repo structure and install dependencies
Deliverable:
- requirements.txt with: anthropic, python-dotenv
- .env file with placeholder: ANTHROPIC_API_KEY=your-key-here
- Empty main.py and agent.py created
- README.md with one-line description and run instructions
Notes:
- Do not write any logic yet, just structure
- Repo is at ~/repo/ai-companion/

### Task 2: Claude API wrapper (agent.py)
Status: TODO
Goal: Build a function that sends a message to Claude and returns the reply
Deliverable:
- agent.py with a function: chat(message: str, history: list) -> tuple[str, list]
- Loads API key from .env
- Appends user message to history, calls Claude, appends reply, returns (reply, updated_history)
- Model: claude-sonnet-4-6
Notes:
- No streaming
- History format: list of {"role": "user"/"assistant", "content": "..."}
- System prompt: "You are a thinking partner. Be direct, push back when the user is off track."

### Task 3: Conversation loop (main.py)
Status: TODO
Goal: Build the terminal REPL that uses agent.py
Deliverable:
- main.py that runs a loop: prompt user → call agent.chat() → print response
- Starts with empty history
- User types "exit" to quit
- Prints a welcome message on start
Notes:
- Keep it simple, no fancy formatting needed

### Task 4: Manual test
Status: TODO
Goal: Verify the agent works end-to-end
Deliverable:
- Run python main.py
- Have a 10-message conversation
- Confirm: agent remembers things said earlier in the same session
- Report: what worked, what felt off
Notes:
- This is a human test, not automated
- Update this task with findings

## Rules for Execution
- Work on one task at a time
- Do not start a new task until the current one is complete or blocked
- Update status after each task
- If blocked, explain why clearly
- If architecture must change, update ARCHITECTURE.md first

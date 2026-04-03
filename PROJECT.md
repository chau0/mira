# Project: Mira

## Goal
An AI thinking partner that remembers you across sessions.
You talk to it naturally, and it references your past goals and decisions to push back when you're off track.
First user is the builder (me). Monetize after MVP.

## Target User
- Primary user: Me (lechau_ai)
- Their situation: Building products solo, limited time (30 min/day), needs a thinking partner not a chatbot
- Their main pain: No one to push back on decisions; easy to drift into building the wrong thing

## Success Criteria
- [ ] User can have a conversation in the terminal
- [ ] Agent remembers what was said earlier in the same session
- [ ] Agent remembers goals and decisions across sessions (Phase 3)
- [ ] User says: "I'm stuck on a decision and it references a goal I told it last week to push back on me"
- [ ] App runs locally with: python main.py

## Constraints
- Tech stack: Python, Claude API (claude-sonnet-4-6), python-dotenv
- Hosting: Local CLI first, cloud in Phase 4
- Database: None in Phase 1; ChromaDB in Phase 3
- Authentication: None
- Performance / cost limits: Minimize API calls; no streaming needed yet
- Deadline: Phase 1 by 2026-04-11

## Non-Goals (Phase 1)
- No persistent memory across sessions
- No tools or web search
- No UI or web interface
- No multi-user support
- No authentication
- No deployment

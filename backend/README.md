# Mira

Memory-aware local AI chat companion.

## Frontend

The React UI lives in [`../mira-ui`](../mira-ui).

Run it locally with:

```bash
cd ../mira-ui
npm install
npm run dev
```

Build it for the backend-served app with:

```bash
cd ../mira-ui
npm run build
```

The FastAPI backend serves `../mira-ui/dist/index.html` at `/` when that build exists.
If no React build is present yet, it falls back to the legacy `static/index.html`.

Set up and run with the unified `mira.sh` script:

```bash
./mira.sh setup   # create venv, install deps, scaffold .env
./mira.sh start   # start server in the background
./mira.sh stop    # stop the background server
./mira.sh restart # restart the server
./mira.sh status  # show running state, PID, URL, log paths
```

If `setup` reports missing venv support, install the system package first:

```bash
sudo apt install python3-venv
```

Then re-run `./mira.sh setup`.

To run the development server directly (hot-reload):

```bash
source .venv/bin/activate
uvicorn main:app --reload
```

Interactive Swagger docs are available at:

```text
http://127.0.0.1:8000/docs
```

Raw OpenAPI JSON:

```text
http://127.0.0.1:8000/openapi.json
```

Set provider keys/models in `.env` before sending chat requests.
At minimum:

```bash
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
DEFAULT_PROVIDER=openrouter
```

The UI now supports provider + model selection (`gemini` and `openrouter`).
Server-side allowlists are configured via:

```bash
LLM_PROVIDERS=gemini,openrouter
GEMINI_MODELS=gemini-2.5-flash
OPENROUTER_MODELS=google/gemma-4-31b-it:free,openai/gpt-4.1-mini
OPENROUTER_REASONING_MODELS=google/gemma-4-31b-it:free
```

Runtime model/provider config is exposed at `GET /config`.

For local API testing without external model keys, enable mock mode:

```bash
CHAT_MOCK_MODE=true uvicorn main:app --reload
```

Then test `/chat`:

```bash
curl -sS http://127.0.0.1:8000/chat \
  -H 'content-type: application/json' \
  -d '{
    "message":"Help me break down my weekly goals.",
    "session_id":"test-session-001",
    "provider":"openrouter",
    "model":"google/gemma-4-31b-it:free"
  }'
```

Example success response:

```json
{
  "reply": "[mock:openrouter/google/gemma-4-31b-it:free session=test-session-001] Help me break down my weekly goals."
}
```

Example validation error (empty session ID):

```json
{
  "detail": "Session ID is required."
}
```

To run against real providers instead of mock replies:

```bash
CHAT_MOCK_MODE=false uvicorn main:app --reload
```

To start the backend and browser UI in the background:

```bash
./mira.sh start
```

`start` automatically reclaims its configured port from another process if needed.
`./mira.sh start --force` is still accepted as a compatibility alias.

To stop the background server:

```bash
./mira.sh stop
```

To restart:

```bash
./mira.sh restart
```

If Mira is already stopped, `restart` behaves like `start`.
If the configured port is already occupied by another process, `start` and `restart`
terminate that process and reclaim the port before launching Mira.
`./mira.sh restart --force` is still accepted as a compatibility alias.

To check status:

```bash
./mira.sh status
```

For run lifecycle logs (start/stop/PID events):

```bash
tail -f .run/mira.run.log
```

For server monitor logs (stdout/stderr, rotated daily and kept after shutdown):

```bash
tail -f .run/monitor/mira-$(date +%Y-%m-%d).log
```

The server logs request IDs, status codes, latency, session IDs, and provider call timing/errors.
Set `LOG_LEVEL` (for example `DEBUG`, `INFO`, `WARNING`) before starting to control verbosity:

```bash
LOG_LEVEL=DEBUG ./mira.sh start
```

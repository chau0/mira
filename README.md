# Mira

Memory-aware local AI chat companion.

Set up locally with:

```bash
./setup.sh
```

If `setup.sh` reports missing venv support, install the system package first:

```bash
sudo apt install python3-venv
```

Then run:

```bash
source .venv/bin/activate
uvicorn main:app --reload
```

Set `GEMINI_API_KEY` in `.env` before sending chat requests.

To start the backend and browser UI in the background with one command:

```bash
./start.sh
```

The frontend is served by the backend at `http://127.0.0.1:8000`.

To stop the background server:

```bash
./stop.sh
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
LOG_LEVEL=DEBUG ./start.sh
```

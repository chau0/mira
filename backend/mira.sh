#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
ENV_FILE="${ROOT_DIR}/.env"
ENV_TEMPLATE="${ROOT_DIR}/.env.example"
PID_DIR="${ROOT_DIR}/.run"
MONITOR_DIR="${PID_DIR}/monitor"
PID_FILE="${PID_DIR}/mira.pid"
RUN_LOG="${PID_DIR}/mira.run.log"
MONITOR_LOG="${MONITOR_DIR}/mira-$(date +%Y-%m-%d).log"

if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
FORCE_RECLAIM_PORT=1

log_run() {
  local message="$1"
  mkdir -p "${PID_DIR}"
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${message}" >> "${RUN_LOG}"
}

port_in_use() {
  ss -tlnH "sport = :${PORT}" 2>/dev/null | grep -q .
}

port_pids() {
  fuser -n tcp "${PORT}" 2>/dev/null | tr ' ' '\n' | sed '/^$/d'
}

kill_port_processes() {
  mapfile -t pids < <(port_pids)

  if [ "${#pids[@]}" -eq 0 ]; then
    log_run "force_reclaim_skipped port=${PORT} reason=no_listener_pid_found"
    echo "Error: port ${PORT} appears to be in use, but no owning PID could be identified."
    echo "Check with:  ss -tlnp sport = :${PORT}"
    return 1
  fi

  log_run "force_reclaim_requested port=${PORT} pids=${pids[*]}"
  echo "Force-stopping process(es) on port ${PORT}: ${pids[*]}"

  if ! kill "${pids[@]}" >/dev/null 2>&1; then
    log_run "force_reclaim_failed port=${PORT} pids=${pids[*]} reason=term_failed"
    echo "Failed to stop process(es) on port ${PORT}."
    return 1
  fi

  local pid
  local elapsed=0
  local timeout_secs=5
  while [ "${elapsed}" -lt "${timeout_secs}" ]; do
    local any_alive=0
    for pid in "${pids[@]}"; do
      if kill -0 "${pid}" >/dev/null 2>&1; then
        any_alive=1
        break
      fi
    done
    if [ "${any_alive}" -eq 0 ] && ! port_in_use; then
      log_run "force_reclaim_succeeded port=${PORT} pids=${pids[*]} signal=TERM"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "Process(es) on port ${PORT} did not exit after SIGTERM; sending SIGKILL."
  if ! kill -9 "${pids[@]}" >/dev/null 2>&1; then
    log_run "force_reclaim_failed port=${PORT} pids=${pids[*]} reason=kill_failed"
    echo "Failed to force-kill process(es) on port ${PORT}."
    return 1
  fi

  elapsed=0
  while [ "${elapsed}" -lt "${timeout_secs}" ]; do
    if ! port_in_use; then
      log_run "force_reclaim_succeeded port=${PORT} pids=${pids[*]} signal=KILL"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  log_run "force_reclaim_failed port=${PORT} pids=${pids[*]} reason=port_still_in_use"
  echo "Failed to reclaim port ${PORT}; it is still in use."
  return 1
}

cmd_setup() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required but was not found."
    exit 1
  fi

  if ! python3 -m ensurepip --version >/dev/null 2>&1; then
    cat <<'EOF'
python3 was found, but the venv/pip bootstrap modules are missing.

Install the system package that provides them, then rerun setup.
On Debian/Ubuntu this is typically:
  sudo apt install python3-venv
EOF
    exit 1
  fi

  if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv "${VENV_DIR}"
  fi

  # shellcheck disable=SC1091
  source "${VENV_DIR}/bin/activate"

  python -m pip install --upgrade pip
  python -m pip install -r "${ROOT_DIR}/requirements.txt"

  if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${ENV_TEMPLATE}" ]; then
      cp "${ENV_TEMPLATE}" "${ENV_FILE}"
    else
      cat > "${ENV_FILE}" <<'EOF'
LLM_PROVIDERS=gemini,openrouter
DEFAULT_PROVIDER=openrouter
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MODELS=gemini-2.5-flash
OPENROUTER_API_KEY=your-key-here
OPENROUTER_DEFAULT_MODEL=google/gemma-4-31b-it:free
OPENROUTER_MODELS=google/gemma-4-31b-it:free
OPENROUTER_REASONING_MODELS=google/gemma-4-31b-it:free
EOF
    fi
    echo "Created ${ENV_FILE}. Add your provider API keys before running the app."
  fi

  cat <<EOF
Setup complete.

Activate the virtual environment:
  source "${VENV_DIR}/bin/activate"

Or use the mira.sh script:
  ./mira.sh start
EOF
}

cmd_start() {
  if [ ! -d "${VENV_DIR}" ]; then
    echo "Virtual environment not found at ${VENV_DIR}."
    echo "Run ./mira.sh setup first."
    exit 1
  fi

  mkdir -p "${PID_DIR}" "${MONITOR_DIR}"
  : > "${RUN_LOG}"
  log_run "start_requested host=${HOST} port=${PORT} monitor_log=${MONITOR_LOG}"

  if [ -f "${PID_FILE}" ]; then
    existing_pid="$(cat "${PID_FILE}")"
    if [ -n "${existing_pid}" ] && kill -0 "${existing_pid}" >/dev/null 2>&1; then
      log_run "start_skipped already_running pid=${existing_pid}"
      echo "Mira is already running in the background."
      echo "PID: ${existing_pid}"
      echo "URL: http://${HOST}:${PORT}"
      echo "Run log: ${RUN_LOG}"
      echo "Monitor log (today): ${MONITOR_LOG}"
      exit 0
    fi
    log_run "stale_pid_removed pid=${existing_pid:-empty}"
    rm -f "${PID_FILE}"
  fi

  if port_in_use; then
    kill_port_processes || exit 1
  fi

  # shellcheck disable=SC1091
  source "${VENV_DIR}/bin/activate"

  nohup uvicorn main:app --host "${HOST}" --port "${PORT}" >>"${MONITOR_LOG}" 2>&1 &
  server_pid=$!
  echo "${server_pid}" > "${PID_FILE}"
  log_run "server_spawned pid=${server_pid}"

  # Poll until the port is listening or the process dies (up to 10s)
  timeout_secs=10
  elapsed=0
  while [ "${elapsed}" -lt "${timeout_secs}" ]; do
    if ! kill -0 "${server_pid}" >/dev/null 2>&1; then
      log_run "start_failed pid=${server_pid} reason=process_exited"
      echo "Failed to start Mira (process exited). Check logs:"
      echo "Run log: ${RUN_LOG}"
      echo "Monitor log: ${MONITOR_LOG}"
      rm -f "${PID_FILE}"
      exit 1
    fi
    if port_in_use; then
      break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if ! port_in_use; then
    log_run "start_failed pid=${server_pid} reason=port_not_listening"
    echo "Failed to start Mira (port ${PORT} not listening after ${timeout_secs}s). Check logs:"
    echo "Run log: ${RUN_LOG}"
    echo "Monitor log: ${MONITOR_LOG}"
    kill "${server_pid}" 2>/dev/null || true
    rm -f "${PID_FILE}"
    exit 1
  fi

  log_run "start_succeeded pid=${server_pid}"

  cat <<EOF
Mira started in the background.
PID: ${server_pid}
URL: http://${HOST}:${PORT}
Run log: ${RUN_LOG}
Monitor log: ${MONITOR_LOG}

The frontend is served by the FastAPI backend at the same URL.
EOF
}

cmd_stop() {
  if [ ! -f "${PID_FILE}" ]; then
    log_run "stop_skipped not_running"
    echo "Mira is not running."
    return 0
  fi

  pid="$(cat "${PID_FILE}")"

  if [ -z "${pid}" ]; then
    log_run "stop_cleaned empty_pid_file"
    rm -f "${PID_FILE}"
    echo "Removed empty PID file."
    return 0
  fi

  if ! kill -0 "${pid}" >/dev/null 2>&1; then
    log_run "stop_cleaned stale_pid pid=${pid}"
    rm -f "${PID_FILE}"
    echo "Removed stale PID file."
    return 0
  fi

  log_run "stop_requested pid=${pid}"
  if ! kill "${pid}" >/dev/null 2>&1; then
    log_run "stop_failed pid=${pid} reason=kill_failed"
    echo "Failed to stop Mira background server (PID: ${pid})."
    return 1
  fi
  rm -f "${PID_FILE}"
  log_run "stop_succeeded pid=${pid}"

  echo "Stopped Mira background server (PID: ${pid})."
  return 0
}

cmd_restart() {
  log_run "restart_requested host=${HOST} port=${PORT}"
  echo "Stopping Mira..."
  cmd_stop
  echo "Starting Mira..."
  cmd_start
  log_run "restart_succeeded"
}

cmd_status() {
  if [ ! -f "${PID_FILE}" ]; then
    if port_in_use; then
      echo "Warning: Mira is not tracked (no PID file) but port ${PORT} is already in use."
      echo "A server may have been started outside of mira.sh."
    else
      echo "Mira is not running."
    fi
    exit 0
  fi

  pid="$(cat "${PID_FILE}")"

  if [ -z "${pid}" ]; then
    echo "Mira is not running (empty PID file)."
    exit 0
  fi

  if ! kill -0 "${pid}" >/dev/null 2>&1; then
    if port_in_use; then
      echo "Warning: tracked process (PID: ${pid}) is gone, but port ${PORT} is still in use."
      echo "A different server may be occupying the port."
    else
      echo "Mira is not running (stale PID: ${pid})."
    fi
    exit 0
  fi

  cat <<EOF
Mira is running.
PID: ${pid}
URL: http://${HOST}:${PORT}
Run log: ${RUN_LOG}
Monitor log (today): ${MONITOR_LOG}
EOF
}

usage() {
  cat <<EOF
Usage: ./mira.sh <command> [--force]

Commands:
  setup     Set up the virtual environment and .env file
  start     Start the Mira server in the background
  stop      Stop the background server
  restart   Stop then start the server
  status    Show whether the server is running

Options:
  --force   Accepted for compatibility; start/restart already reclaim PORT by default
EOF
}

COMMAND="${1:-}"
if [ -z "${COMMAND}" ]; then
  usage
  exit 1
fi
shift || true

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      FORCE_RECLAIM_PORT=1
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

case "${COMMAND}" in
  setup)   cmd_setup   ;;
  start)   cmd_start   ;;
  stop)    cmd_stop    ;;
  restart) cmd_restart ;;
  status)  cmd_status  ;;
  *)       usage; exit 1 ;;
esac

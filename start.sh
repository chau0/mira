#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PID_DIR="${ROOT_DIR}/.run"
MONITOR_DIR="${PID_DIR}/monitor"
PID_FILE="${PID_DIR}/mira.pid"
RUN_LOG="${PID_DIR}/mira.run.log"
MONITOR_LOG="${MONITOR_DIR}/mira-$(date +%Y-%m-%d).log"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

log_run() {
  local message="$1"
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${message}" >> "${RUN_LOG}"
}

if [ ! -d "${VENV_DIR}" ]; then
  echo "Virtual environment not found at ${VENV_DIR}."
  echo "Run ./setup.sh first."
  exit 1
fi

mkdir -p "${PID_DIR}"
mkdir -p "${MONITOR_DIR}"
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

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

nohup uvicorn main:app --host "${HOST}" --port "${PORT}" >>"${MONITOR_LOG}" 2>&1 &
server_pid=$!
echo "${server_pid}" > "${PID_FILE}"
log_run "server_spawned pid=${server_pid}"

sleep 1

if ! kill -0 "${server_pid}" >/dev/null 2>&1; then
  log_run "start_failed pid=${server_pid}"
  echo "Failed to start Mira. Check logs:"
  echo "Run log: ${RUN_LOG}"
  echo "Monitor log: ${MONITOR_LOG}"
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

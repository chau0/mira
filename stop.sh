#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
PID_FILE="${RUN_DIR}/mira.pid"
RUN_LOG="${RUN_DIR}/mira.run.log"

log_run() {
  local message="$1"
  mkdir -p "${RUN_DIR}"
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${message}" >> "${RUN_LOG}"
}

if [ ! -f "${PID_FILE}" ]; then
  log_run "stop_skipped not_running"
  echo "Mira is not running."
  exit 0
fi

pid="$(cat "${PID_FILE}")"

if [ -z "${pid}" ]; then
  log_run "stop_cleaned empty_pid_file"
  rm -f "${PID_FILE}"
  echo "Removed empty PID file."
  exit 0
fi

if ! kill -0 "${pid}" >/dev/null 2>&1; then
  log_run "stop_cleaned stale_pid pid=${pid}"
  rm -f "${PID_FILE}"
  echo "Removed stale PID file."
  exit 0
fi

log_run "stop_requested pid=${pid}"
kill "${pid}"
rm -f "${PID_FILE}"
log_run "stop_succeeded pid=${pid}"

echo "Stopped Mira background server (PID: ${pid})."

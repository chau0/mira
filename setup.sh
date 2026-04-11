#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
ENV_FILE="${ROOT_DIR}/.env"
ENV_TEMPLATE="${ROOT_DIR}/.env.example"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found."
  exit 1
fi

if ! python3 -m ensurepip --version >/dev/null 2>&1; then
  cat <<'EOF'
python3 was found, but the venv/pip bootstrap modules are missing.

Install the system package that provides them, then rerun setup.sh.
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
GEMINI_API_KEY=your-key-here
EOF
  fi
  echo "Created ${ENV_FILE}. Add your Gemini API key before running the app."
fi

cat <<EOF
Setup complete.

Activate the virtual environment:
  source "${VENV_DIR}/bin/activate"

Run the app:
  uvicorn main:app --reload
EOF

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

python3 -m venv "$ROOT_DIR/.venv"
"$ROOT_DIR/.venv/bin/pip" install --upgrade pip
"$ROOT_DIR/.venv/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt"
(
  cd "$ROOT_DIR/frontend"
  npm install
)

cat <<'NEXT_STEPS'

Setup complete.
Next steps:
  ./start.sh
  ./sandbox_verify.sh

The backend listens on http://127.0.0.1:8000 and the frontend is started by npm run dev.
NEXT_STEPS

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="/workspace/outputs"
LOG_FILE="$OUTPUT_DIR/sandbox_verify.log"
PYTHON="$ROOT_DIR/.venv/bin/python"
BACKEND_PID=""

mkdir -p "$OUTPUT_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "== ClassBridge Linux sandbox verification =="
echo "Repository root: $ROOT_DIR"
echo "Log file: $LOG_FILE"

git -C "$ROOT_DIR" pull --ff-only origin main

if [[ -x "$PYTHON" && -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "Existing .venv and frontend dependencies found; skipping setup."
else
  echo "Dependencies are incomplete; running setup.sh."
  "$ROOT_DIR/setup.sh"
fi

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "${BACKEND_PID:-}" ]]; then
    echo "Stopping uvicorn (PID $BACKEND_PID)."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR/backend"
  exec "$PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!
echo "Started uvicorn with PID $BACKEND_PID."

health_url="http://127.0.0.1:8000/api/health"
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error "$health_url" >/dev/null; then
    echo "Health endpoint responded after $attempt attempt(s)."
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "Health endpoint did not respond within 120 seconds." >&2
    exit 1
  fi
  sleep 2
done

echo "== GET /api/health =="
curl --fail --silent --show-error "$health_url" | "$PYTHON" -m json.tool

echo "== POST /api/lecture: known vocabulary =="
printf '%s' '{"text":"Good morning class. Today we are learning about mitochondria and DNA. Open your books to page 42."}' \
  | curl --fail --silent --show-error -H 'Content-Type: application/json' --data-binary @- \
      http://127.0.0.1:8000/api/lecture
printf '\n'

echo "== POST /api/lecture: vocab_gap fallback =="
printf '%s' '{"text":"The quantum entanglement phenomenon correlates disparate particles"}' \
  | curl --fail --silent --show-error -H 'Content-Type: application/json' --data-binary @- \
      http://127.0.0.1:8000/api/lecture
printf '\n'

echo "== Python and pip versions =="
"$PYTHON" --version
"$ROOT_DIR/.venv/bin/pip" --version
if "$PYTHON" -c 'import torch; print("torch imports: yes")'; then
  :
else
  echo "torch imports: no"
fi

echo "Verification complete; cleanup will stop uvicorn."

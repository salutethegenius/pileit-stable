#!/usr/bin/env bash
# Full stack smoke check: Next.js lint + types + production build, then Python backend import.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> web: lint, typecheck, build"
(cd "$ROOT/apps/web" && npm run verify)

echo "==> backend: compile + import app"
cd "$ROOT/backend"
if [[ -x .venv/bin/python ]]; then
  PY=".venv/bin/python"
else
  PY="${PYTHON:-python3}"
fi
"$PY" -m compileall -q app
"$PY" -c "from app.main import app; print('backend OK:', app.title)"

echo "==> verify-all: done"

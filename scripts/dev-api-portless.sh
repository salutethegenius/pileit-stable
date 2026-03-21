#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
# shellcheck source=/dev/null
source .venv/bin/activate
exec portless pileit-api bash -c 'uvicorn app.main:app --reload --host 127.0.0.1 --port ${PORT:?PORT must be set by portless}'

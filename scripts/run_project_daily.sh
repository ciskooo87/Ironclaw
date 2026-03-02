#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: $0 <project_id>"
  exit 1
fi

ROOT="/home/openclaw/.openclaw/workspace"
TS="$(date +%Y%m%d-%H%M%S)"

# Load environment (DEEPSEEK_API_KEY, etc.) if present
if [[ -f "$HOME/.bashrc" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.bashrc"
fi

"$ROOT/.venv/bin/python" "$ROOT/ironcore_mvp.py" \
  --project "$PROJECT_ID" \
  --run-id "daily-$TS" \
  --llm-enable \
  --llm-model deepseek-chat \
  --llm-max-items 10 \
  --analysis-mode since_last \
  --fail-on-regression

#!/usr/bin/env bash
set -euo pipefail

if command -v sudo >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ripgrep
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node/npm are required before dependency installation. Configure Codex Cloud for Node 22, then rerun this script." >&2
  exit 1
fi

npm ci
npx playwright install --with-deps chromium

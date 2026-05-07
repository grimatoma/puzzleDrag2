#!/bin/bash
# SessionStart hook for puzzleDrag2 (Phaser 3 + React + Vite).
# Runs only in remote (Claude Code on the web) sessions.
# Idempotent — fast no-op when node_modules + Playwright are cached.

set -euo pipefail

# Async mode: hook runs in background so the session doesn't stall.
# Race risk: subagents that immediately run npm test / npx playwright may hit
# a brief window before deps are ready. The QA-pass workflow's first step
# is usually a read-only audit, which gives the install enough time.
echo '{"async": true, "asyncTimeout": 300000}'

# Local sessions already have a working tree; skip.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-/home/user/puzzleDrag2}"

# 1. Install npm deps (no-op if node_modules is already populated).
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vitest ]; then
  npm install --no-audit --no-fund
fi

# 2. Install Playwright Chromium (no-op if cache already exists).
#    Honors PLAYWRIGHT_BROWSERS_PATH (sandbox images set this to /opt/pw-browsers).
#    Browser walkthrough subagents need this; cold install is ~30s.
PW_CACHE_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
if [ -z "$(ls -A "$PW_CACHE_DIR" 2>/dev/null)" ]; then
  npx playwright install chromium
fi

exit 0

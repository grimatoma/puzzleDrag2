#!/bin/bash
# Headroom context-compression bootstrap for Claude Code.
#
# Headroom (https://github.com/chopratejas/headroom) is a local context
# compression layer. A small proxy listens on 127.0.0.1:8787 and forwards
# /v1/messages to https://api.anthropic.com, compressing large tool outputs,
# file listings, and search results before they reach the model. Claude Code
# routes through it because .claude/settings.json sets
#   ANTHROPIC_BASE_URL=http://127.0.0.1:8787
#
# This script keeps that proxy alive. It runs in two modes:
#   bootstrap  (SessionStart) install the headroom CLI if missing, start the
#              proxy, and block until it is healthy. Synchronous on purpose so
#              the proxy is up before the session's first API round-trip.
#   ensure     (PreToolUse)    cheap health check; restart the proxy only if it
#              died mid-session. Never reinstalls.
#
# Design goals: idempotent, self-contained (uses only python3 + a venv it owns),
# privacy-preserving (--no-telemetry), and best-effort — it logs to
# ~/.cache/headroom-bootstrap/bootstrap.log and never writes inside the repo.
#
# Escape hatch: to opt out, remove the "env" / hook blocks from
# .claude/settings.json, or `pkill -f 'headroom proxy'` for the current session.

set -uo pipefail

MODE="${1:-bootstrap}"
PORT="8787"
# Keep our venv/log in a dedicated dir — ~/.headroom is owned by the headroom
# runtime itself (deploy profiles, beacon locks, proxy logs); don't nest in it.
STATE_DIR="${HOME:-/root}/.cache/headroom-bootstrap"
VENV="$STATE_DIR/venv"
HR_BIN="$VENV/bin/headroom"
LOG="$STATE_DIR/bootstrap.log"
HEALTH_URL="http://127.0.0.1:${PORT}/health"

mkdir -p "$STATE_DIR" 2>/dev/null || true
log() { printf '[%s] [%s] %s\n' "$(date -u +%FT%TZ)" "$MODE" "$*" >>"$LOG" 2>/dev/null || true; }

# Is the proxy answering as healthy right now?
proxy_healthy() {
  local body
  body="$(curl -fsS -m 2 "$HEALTH_URL" 2>/dev/null)" || return 1
  case "$body" in *'"status":"healthy"'*) return 0 ;; *) return 1 ;; esac
}

# Fast path: already up. True for the steady state and most PreToolUse calls.
if proxy_healthy; then
  exit 0
fi

# `ensure` (PreToolUse) must stay cheap: if the CLI isn't installed yet, the
# SessionStart bootstrap is still responsible — don't reinstall on a tool call.
if [ "$MODE" = "ensure" ] && [ ! -x "$HR_BIN" ]; then
  exit 0
fi

# Install the headroom CLI into a self-owned venv if it isn't there.
if [ ! -x "$HR_BIN" ]; then
  if ! command -v python3 >/dev/null 2>&1; then
    log "python3 not found; cannot install headroom — skipping (Claude will fail to reach the proxy)"
    exit 0
  fi
  log "installing headroom-ai[proxy] into $VENV"
  if python3 -m venv "$VENV" >>"$LOG" 2>&1; then
    "$VENV/bin/pip" install --quiet --upgrade pip >>"$LOG" 2>&1 || true
    if ! "$VENV/bin/pip" install --quiet "headroom-ai[proxy]" >>"$LOG" 2>&1; then
      log "pip install failed — skipping (check network policy / PyPI reachability)"
      exit 0
    fi
  else
    log "venv creation failed — skipping"
    exit 0
  fi
fi

# Start the proxy in the background if nothing is already serving the port.
# A mkdir-based lock makes the spawn single-flight: concurrent invocations
# (e.g. several PreToolUse "ensure" calls firing during the boot window) won't
# each launch a proxy — losers fall through and just wait for health below.
# The lock is self-healing: a stale one (> 90s, e.g. a crashed starter) is
# reclaimed so a dead proxy can always be restarted.
LOCK="$STATE_DIR/.start.lock"
if ! proxy_healthy; then
  if [ -d "$LOCK" ] && [ -n "$(find "$LOCK" -maxdepth 0 -mmin +1.5 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null || true
  fi
  if mkdir "$LOCK" 2>/dev/null; then
    trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
    log "starting proxy on :$PORT"
    nohup "$HR_BIN" proxy --port "$PORT" --no-telemetry >>"$LOG" 2>&1 &
  else
    log "another invocation is starting the proxy; waiting for health"
  fi
fi

# Block until healthy (first boot imports tokenizers; ~5-15s). Bounded so a
# wedged install can never hang session start forever.
for _ in $(seq 1 60); do
  if proxy_healthy; then
    log "proxy healthy on :$PORT"
    exit 0
  fi
  sleep 1
done

log "proxy did not become healthy within 60s — continuing anyway"
exit 0

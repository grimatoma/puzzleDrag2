---
name: dev-server
description: Idempotent Vite dev server lifecycle — start, wait for readiness, return URL, optionally launch headless Chromium for browser walkthroughs. Use whenever you need a running dev server for QA, screenshot capture, or Playwright automation.
---

# dev-server

Every browser-walkthrough subagent does the same ritual: kill orphan vite, start `npm run dev`, sleep, curl localhost:5173, hope Playwright is installed. This skill replaces the ritual with one call.

## Inputs

- `--port` (default 5173) — Vite port.
- `--with-playwright` — launch a headless Chromium ready for `page.goto()`.
- `--screenshot-dir` (default `/tmp/qa-screenshots`) — where to save captures.
- `--kill` — only kill orphan procs and exit.

## Procedure

### Start

1. **Kill orphan procs** on the target port:
   ```bash
   pkill -f "vite.*--port $PORT" 2>/dev/null
   lsof -ti:$PORT | xargs -r kill -9 2>/dev/null
   ```
2. **Start dev server in background**:
   ```bash
   cd /home/user/puzzleDrag2
   npm run dev > /tmp/dev-server.log 2>&1 &
   ```
3. **Wait for readiness** (retry every 1s, up to 30s):
   ```bash
   until curl -sf http://localhost:$PORT > /dev/null; do
     sleep 1
     [ $((++attempts)) -ge 30 ] && { echo "TIMEOUT"; tail /tmp/dev-server.log; exit 1; }
   done
   ```
4. **Print URL** and the dev-server log path.

### With Playwright

5. **Check Playwright installed**:
   ```bash
   ls node_modules/playwright 2>/dev/null || npm i -D playwright
   ls ~/.cache/ms-playwright 2>/dev/null || npx playwright install chromium --with-deps
   ```
6. **Launch headless** in a small script — return the page object handle path or save the script for the caller.

### Stop

7. **Cleanup hook** — when the calling subagent / session ends, kill the dev server. Either:
   - `pkill -f "vite.*--port $PORT"`
   - or detach: `disown` so the user can keep using it.

## Output format

```
Dev server: http://localhost:5173/
Log: /tmp/dev-server.log
PID: 12345
Playwright: ready (or "skipped" if --with-playwright not set)
```

## Common pitfalls

- **Orphan vite locking the port**: `pkill -f vite` doesn't catch all variants — also use `lsof -ti:$PORT | xargs kill -9`.
- **Playwright install on CI/sandbox**: `npx playwright install chromium` may fail without `--with-deps`. Fallback: report "playwright unavailable" and let caller proceed without browser steps.
- **Not waiting long enough**: a fresh `npm install` plus Vite cold start can take 20+ seconds. Use a 30s timeout, not 8s.
- **Forgetting the cleanup**: the dev server keeps running after the subagent exits and locks the port for the next session. Always `pkill` on exit.

## When to invoke

- Browser-walkthrough subagent (QA passes).
- Screenshot capture for review.
- Manual testing via "open the dev server in a browser".
- Anything that needs `localhost:5173` reachable.

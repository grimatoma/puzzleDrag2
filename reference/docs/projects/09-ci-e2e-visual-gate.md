# CI Gate for e2e + Visual Smoke

> **⚠️ HISTORICAL — implementation brief, not current state.** This document
> predates the e2e **sharding** work and the subsequent **de-rot** pass. Its
> descriptions of `playwright.config.js` (e.g. `retries: 0`, a single `list`
> reporter, one un-sharded project) and of the CI `e2e` job now **contradict the
> code**. The **CODE is authoritative** — see `playwright.config.js` (retries,
> `list` + `html` reporters, sharding notes) and `.github/workflows/ci.yml`
> (the `e2e` job is a `matrix: shard: [1, 2, 3]`). For the **current state**,
> read [09-ci-e2e-gate-findings.md](09-ci-e2e-gate-findings.md) and
> [24-test-suite-and-infra-review.html](24-test-suite-and-infra-review.html)
> (doc 24). The body below is kept as-is for historical context — do not treat
> it as a description of how CI runs today.

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Today the Phaser/canvas layer of puzzleDrag2 has **zero gated automated coverage**. The reducer/feature slices are covered by vitest, but vitest runs in a node env with a fake `localStorage` and **no canvas** — it never boots Phaser, never renders a board, never exercises the `React → registry → GameScene → TileObj` bridge. The only tests that touch that layer are the 21 Playwright e2e specs (`tests/e2e/*`) and the visual goldens (`tests/visual/*`), and **neither runs in CI**. A canvas-side regression (a broken `startPath`, a stale texture, a missing testid, a thrown error during board boot) can merge to `main` green.

This project closes that gap: add a **gating Playwright e2e job** that runs all 21 specs on the Linux CI host, and add a **desktop visual smoke job** (the goldens are non-regenerable on the Windows dev host — DOM drifts 3–5%, Phaser WebGL ~38% off due to GPU/font differences — so they must be baselined and run only on the canonical Linux CI host). This buys us a real safety net for the half of the app vitest can't see.

## Background & current state (VERIFIED)

I opened the real files. Corrections to the seed brief are flagged inline.

### CI today (`.github/workflows/ci.yml`)
Six jobs, all `ubuntu-latest`, all `node-version: 20`, all `cache: npm`, all `npm ci`:
- `lint` → `npm run lint`
- `typecheck` → `npm run typecheck` + `npm run action-types:check`
- `typecheck-tests` → `npm run typecheck:tests`
- `typecheck-test-files` → `npm run typecheck:test-files`
- `test` → `npm run test:coverage` (uploads `coverage/`)
- `build` → `npm run build` (uploads `dist/`)

**Correction to seed brief:** the brief says "3 typecheck jobs"; there are actually **three typecheck jobs** (`typecheck`, `typecheck-tests`, `typecheck-test-files`) — the count is right, but note `typecheck` also runs `action-types:check`. No Playwright job exists. The header comment lists the required status checks (`lint, typecheck, typecheck-tests, typecheck-test-files, test, build`) — branch protection must be updated when we add a gating job.

There are two other workflows (`.github/workflows/deploy.yml`, `pages-deploy-trigger.yml`) — out of scope; do not touch them.

### e2e specs (`tests/e2e/`, config `playwright.config.js`)
**Correction:** the brief says "21 Playwright e2e specs." There are **20 `.spec.ts` files** plus one non-spec `helpers.ts`. `glob tests/e2e/**` returns 21 entries because `helpers.ts` is counted. The 20 specs: `biomes, boss, chain, crafting, cuj-tools, dialog-draft, economy, error-boundary, full-year, hazards, hidpi, menu, navigation, orders-quests, save, settings, smoke, tile-collection, tools, town-buildings`.

Config facts (`playwright.config.js`):
- `testDir: ./tests/e2e`, `timeout: 30_000`, `fullyParallel: false`, `retries: 0`, `reporter: [['list']]`.
- `use.baseURL: http://localhost:5173/puzzleDrag2/`, `trace: 'retain-on-failure'`, `headless: true`.
- **Single project `iphone-landscape`** forced to `browserName: 'chromium'`, viewport 844×390, touch+mobile. So e2e runs **mobile-landscape on Chromium only** — only the chromium browser is needed.
- `webServer.command: node ./node_modules/vite/bin/vite.js`, `url: http://localhost:5173/puzzleDrag2/`, `reuseExistingServer: true`, `timeout: 60_000`. **Note `reuseExistingServer: true`** — fine on CI (no server running) but means CI must let Playwright start its own Vite.

Console-error guarding in e2e is **per-spec and inconsistent**, not centralized:
- `smoke.spec.ts` asserts `expect(errors).toEqual([])` collecting both `pageerror` and `console.error`.
- `error-boundary.spec.ts` → "Boot completes without console.error leaks" filters only `/Cannot read properties of null/` (a known tween race), asserts the rest is empty.
- `helpers.ts` exports `collectPageErrors(page)` (collects `pageerror:` + `console.error:`), used by `full-year.spec.ts`.
- Others (`tile-collection.spec.ts`) collect `pageerror` only.

### Visual goldens (`tests/visual/`, config `playwright.visual.config.js`)
- `testDir: ./tests/visual`, `timeout: 420_000`, `fullyParallel: true`, `retries: 0`.
- `snapshotPathTemplate: {testDir}/__goldens__/{testFilePath}/{projectName}/{arg}{ext}` → goldens live under `tests/visual/__goldens__/<spec>/<project>/<name>.png`.
- Two projects: **`desktop`** (1280×1024, dsf 1) and **`iphone-portrait`** (390×844, mobile).
- Spec files: `desktop-smoke, balance.desktop-smoke, story.desktop-smoke` (the desktop smoke set) and `visual, balance.visual, story.visual` (the full set), plus `negative-control.spec.ts`.
- `package.json` scripts:
  - `test:visual` = `playwright test -c playwright.visual.config.js tests/visual/{desktop-smoke,balance.desktop-smoke,story.desktop-smoke}.spec.ts --project=desktop` (the **desktop smoke set** — this is what we gate).
  - `test:visual:all` = the full `visual.spec.ts` + balance + story (both projects).
  - `test:visual:mobile`, `*:update` variants, etc.
  - A `pretest:visual*` hook runs `npm run ensure:visual-browser` (`tools/ensure-playwright-browser.mjs`) — a **sandbox shim** that symlinks a pre-installed `/opt/pw-browsers` chrome-headless-shell into Playwright's expected path. No-op on a normal CI runner; harmless to keep.

Goldens that exist under `__goldens__/desktop-smoke.spec.ts/desktop/` confirm the desktop smoke set has baselines committed (e.g. `board-farm-idle.png`, `shell-town-fresh.png`, `town-home-built-out.png`). **But per memory `visual-goldens-host-limits`, these were generated somewhere other than Linux CI and will not match a fresh CI render** (Phaser WebGL ~38% diff from GPU/fonts). They must be **re-baselined on the CI runner** before the visual job can gate.

### The "Texture key already in use" landmine — VERIFIED and CORRECTED
The seed brief (and memory) call this a "warning." **It is a `console.error`, not a warn.** Verified in `node_modules/phaser/src/textures/TextureManager.js` `checkKey()` (line ~255):
```js
checkKey: function (key) {
    if (!key || typeof key !== 'string' || this.exists(key)) {
        if (!this.silentWarnings) {
            console.error('Texture key already in use: ' + key);   // <-- console.error
        }
        return false;
    }
    return true;
}
```
Because it is `console.error`, **every console-error guard trips on it**:
- e2e: `smoke.spec.ts` (`errors` includes `console.error`), `collectPageErrors` in `helpers.ts`.
- visual: `desktop-smoke.spec.ts` and `visual.spec.ts` both end with `expect(consoleErrors, "console errors").toEqual([])` after filtering only `/favicon|Failed to load resource/i`.

There are **four** independent `new Phaser.Game(...)` instances that can re-add texture keys across mount/unmount or scene re-entry:
1. `prototype.tsx:148` — the main board `GameScene` (`render: {... pixelArt:false ...}`).
2. `src/ui/TownPhaserCanvas.tsx:133` — `TownScene`.
3. `src/ui/seasonStripPhaser.tsx:57` — the season strip.
4. `src/features/cartography/PhaserMap.tsx:130` — the map.

The town/board scenarios that exercise scene churn are exactly where this fires. **The fix is `silentWarnings: true` in the Phaser `GameConfig`** — it is a documented top-level `GameConfig` flag that `TextureManager` reads into `this.silentWarnings`. Setting it is preferable to a per-spec regex allowlist because (a) it stops a noisy, meaningless `console.error` from polluting production telemetry too, and (b) it covers all four game instances and any future spec uniformly. **However** — turning it off entirely could mask a *real* duplicate-key bug. See "Double-check" for the chosen middle path: silence it in the visual-testing / e2e contexts only, OR allowlist the exact string in the shared guard. This brief recommends the **allowlist in a shared test helper** as the primary, with `silentWarnings` as an optional production-quietness follow-up — decided below.

### Persistence / save schema
This project adds **no persisted state and no action types**, so `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` (the slice-registration footgun) and `SAVE_SCHEMA_VERSION` (the no-migration save-wipe) are **not in play**. It is pure CI + test-infra. Stated explicitly so a fresh session doesn't go hunting.

## Scope

**In scope:**
- A new gating CI job `e2e` in `.github/workflows/ci.yml`: `npm ci` → install Playwright chromium → run all 20 e2e specs → upload trace/report artifacts on failure.
- A new CI job `visual-smoke` running the **desktop smoke set** (`npm run test:visual`), with a documented decision to start **non-blocking** (`continue-on-error: true`) until goldens are re-baselined on the Linux runner, then flip to gating.
- Caching of `node_modules` (via `actions/setup-node` `cache: npm` already in use) **and** Playwright browser binaries (`~/.cache/ms-playwright`).
- Centralize/allowlist the `Texture key already in use` `console.error` so it can't false-fail e2e or visual specs — a shared, explicit allowlist (not a blanket silence).
- A documented **re-baseline-on-CI procedure** (push a branch, run a manual `workflow_dispatch` update job, commit the regenerated goldens) — never regenerate locally on Windows.
- Update the `ci.yml` header comment + a note for branch-protection required checks.

**Out of scope / non-goals:**
- Mobile visual goldens (`iphone-portrait`) and the full `visual.spec.ts` set — too many goldens, too slow (420s timeout); the smoke set is the gate. Full set stays a manual/`workflow_dispatch` job at most.
- e2e on multiple browsers/OS — chromium-on-Linux only, matching the existing single-project config.
- Refactoring the e2e/visual specs themselves, fixing flaky specs, or expanding coverage — if a spec is genuinely flaky on CI, quarantine it (see Risks), don't rewrite it here.
- Touching `deploy.yml` / `pages-deploy-trigger.yml`.
- Any game-logic, reducer, slice, or persisted-state change. No `SAVE_SCHEMA_VERSION` bump.

## Implementation plan

### Step 1 — Allowlist the Phaser texture-key `console.error` (do this FIRST so the gating job is green)
The cleanest single point is the shared e2e guard plus the visual specs' inline filter. Edit:

**`tests/e2e/helpers.ts`** — `collectPageErrors` (currently lines ~304–311). Add an ignore predicate:
```ts
const IGNORED_CONSOLE = [
  /Texture key already in use/i,        // Phaser checkKey() across scene re-mounts (4 Phaser.Game instances)
  /Cannot read properties of null/i,    // known Phaser tween race under fast e2e sequencing
  /favicon|Failed to load resource/i,   // asset 404s, irrelevant
];
export function collectPageErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  return () => errors;
}
```
Export `IGNORED_CONSOLE` so specs that roll their own collector can reuse it. Then update the inline collectors:
- `tests/e2e/smoke.spec.ts` (lines 6–7) and any spec collecting `console.error` directly → filter with `IGNORED_CONSOLE`.
- `tests/e2e/error-boundary.spec.ts` "Boot completes without console.error leaks" (line 43) → swap the single `/Cannot read properties of null/` filter for `IGNORED_CONSOLE`.

**Visual specs** — `tests/visual/desktop-smoke.spec.ts` (line 99) and `tests/visual/visual.spec.ts` (line 93) currently filter only `/favicon|Failed to load resource/i`. Widen to also drop `/Texture key already in use/i`. Keep one regex local to each spec OR import a shared constant from a new `tests/visual/_consoleAllow.js`. Prefer the shared constant to avoid drift.

> Alternative (follow-up, optional): set `silentWarnings: true` in the four `GameConfig`s (`prototype.tsx:148`, `TownPhaserCanvas.tsx:133`, `seasonStripPhaser.tsx:57`, `PhaserMap.tsx:130`). This quiets production telemetry too. Do NOT do this as the primary fix — a blanket silence hides real duplicate-key bugs from a future dev. The test allowlist is narrow and reviewable. If you do add it, gate it behind the visual-testing flag (`window.__HEARTH_VISUAL_TESTING__`) so production keeps the diagnostic.

### Step 2 — Add the `e2e` job to `.github/workflows/ci.yml`
Append a job mirroring the existing style. Cache Playwright browsers; install chromium only (matches `test:e2e:install`). Playwright starts its own Vite via `webServer` (`reuseExistingServer:true` is harmless on a clean runner).
```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: pw-cache
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - name: Install Playwright chromium (+ system deps)
        run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-e2e-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```
Notes: `--with-deps` is needed on a fresh ubuntu runner even when the browser binary is cached (system libs). Keep it; it's a no-op-fast when libs already present. The e2e config writes traces to `test-results/` on failure (`trace: 'retain-on-failure'`); there is no HTML reporter configured for e2e (`reporter: [['list']]`), so `playwright-report/` may be empty for e2e — upload `test-results/` for the traces. Optionally add `['html', { open: 'never' }]` to `playwright.config.js` reporter so a browsable report is produced.

### Step 3 — Add the `visual-smoke` job (start non-blocking, then flip to gating)
The desktop smoke set is `npm run test:visual`. Because the committed goldens were not made on Linux CI, **the first CI run will diff**. Land the job `continue-on-error: true` (informational) so the PR isn't blocked, ship it, then run Step 5 to re-baseline on CI, commit, and remove `continue-on-error`.
```yaml
  visual-smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    continue-on-error: true   # REMOVE after goldens are re-baselined on CI (Step 5)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - name: Install Playwright chromium (+ system deps)
        run: npx playwright install --with-deps chromium
      - run: npm run test:visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-smoke-diffs
          path: |
            test-results/visual/
            playwright-report/visual/
          retention-days: 7
```
The visual config DOES configure an HTML reporter (`playwright-report/visual`) and `outputDir: test-results/visual` — so diffs (actual/expected/diff PNGs) land there and are uploaded. The `pretest:visual` hook (`ensure:visual-browser`) runs automatically via npm; it's a no-op on a real runner.

### Step 4 — Re-baseline goldens on CI (the documented procedure, NOT local)
Add a manually-triggered job so a human can regenerate goldens on the canonical Linux runner and commit them back. Never run `--update-snapshots` on the Windows dev host (memory `visual-goldens-host-limits`): DOM drifts 3–5%, Phaser WebGL ~38%.

Add `workflow_dispatch` to `ci.yml`'s `on:` and a dedicated job that updates and pushes, OR (simpler, fewer permissions) a job that updates and uploads the regenerated goldens as an artifact for the dev to download and commit:
```yaml
on:
  pull_request: { branches: [main] }
  push: { branches: [main] }
  workflow_dispatch:
    inputs:
      update_goldens:
        description: "Regenerate desktop visual goldens on the CI runner"
        type: boolean
        default: false
```
```yaml
  visual-rebaseline:
    if: ${{ github.event_name == 'workflow_dispatch' && inputs.update_goldens }}
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:visual:update      # writes new PNGs into tests/visual/__goldens__/
      - uses: actions/upload-artifact@v4
        with:
          name: regenerated-goldens
          path: tests/visual/__goldens__/
          retention-days: 7
```
Document in the doc body (and as an inline comment in `ci.yml`): to re-baseline, run the workflow via `gh workflow run ci.yml -f update_goldens=true`, download the `regenerated-goldens` artifact, unzip it over `tests/visual/__goldens__/`, eyeball the PNGs for legitimacy, commit, and open a PR. Once committed, `visual-smoke` against those goldens passes → remove its `continue-on-error`.

### Step 5 — Flip `visual-smoke` to gating + update branch protection
After Step 4's goldens are committed and `visual-smoke` is green on a real PR, remove `continue-on-error: true`. Update the `ci.yml` header comment's required-checks list to add `e2e` and `visual-smoke`, and (in repo settings — note it for the human, you can't change settings from a doc) add both to the required status checks.

### Step 6 — Keep the graph current
After code/workflow changes: `graphify update .`.

## Success criteria

- [ ] `.github/workflows/ci.yml` contains a job named `e2e` that runs `npm run test:e2e` on `ubuntu-latest`, node 20, with `actions/setup-node` `cache: npm` and an `actions/cache@v4` step keyed on `package-lock.json` for `~/.cache/ms-playwright`.
- [ ] The `e2e` job runs `npx playwright install --with-deps chromium` (chromium only) and uploads `test-results/` (+ `playwright-report/` if HTML reporter added) on failure with `if: failure()`.
- [ ] All 20 e2e specs pass on the CI runner (a green `e2e` check on a PR).
- [ ] A `visual-smoke` job runs `npm run test:visual` (the desktop smoke set), starts with `continue-on-error: true`, and uploads `test-results/visual/` + `playwright-report/visual/` on failure.
- [ ] The `Texture key already in use` `console.error` is allowlisted in `tests/e2e/helpers.ts` (`collectPageErrors`/`IGNORED_CONSOLE`), in `smoke.spec.ts`, in `error-boundary.spec.ts`, and in both `tests/visual/desktop-smoke.spec.ts` and `tests/visual/visual.spec.ts` console-error filters — verified by grep.
- [ ] A `workflow_dispatch` `update_goldens` input + `visual-rebaseline` job exists (or an equivalent documented CI-only re-baseline path), and the procedure is documented inline in `ci.yml` and here.
- [ ] After re-baselining on CI and committing the goldens, `visual-smoke` passes without `continue-on-error`, and the job is flipped to gating; the `ci.yml` header required-checks comment lists `e2e` and `visual-smoke`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:tests`, `npm test` still pass (the helper/spec edits are TS).
- [ ] No `SAVE_SCHEMA_VERSION` change, no new action types, no persisted-shape change (grep `src/constants.ts` for an unchanged `SAVE_SCHEMA_VERSION`).

## Validation — how to verify

**Local (informational — the real proof is a CI run):**
- `npm run lint` → clean.
- `npm run typecheck && npm run typecheck:tests` → clean (the `helpers.ts` / spec edits are typed).
- `npm test` → all vitest green (unaffected, but confirms no collateral).
- `npm run test:e2e` on this Windows host: the worktree has **no `node_modules`** and the dev `:5173` server serves MAIN, not the worktree (memory `live-game-preview-verify`). To run e2e against the worktree you must point Playwright's `webServer` at the parent vite binary — but per house rules e2e is **not reliably runnable/regenerable here**. Treat a local e2e pass as a bonus, not a gate. **Do NOT run `npm run test:visual` locally to validate goldens** — Windows render diff is meaningless (memory `visual-goldens-host-limits`).
- YAML sanity: `npx --yes yaml-lint .github/workflows/ci.yml` or `node -e "require('js-yaml')"`-style parse; or just push and read the Actions tab.
- Allowlist wiring proof (static): `grep -rn "Texture key already in use" tests/` must show it referenced in the e2e helper and both visual specs' filters.

**CI (gating — this is the real validation):**
- Open the PR; the new `e2e` check appears and must go **green** (all 20 specs).
- The `visual-smoke` check appears; on the first run it may be **red but non-blocking** (`continue-on-error`). Download the `visual-smoke-diffs` artifact and confirm the only diffs are render-host pixel diffs (expected), not actual broken UI. Then re-baseline (Step 4) and re-run → green.

**New/changed tests to add (and what they assert):**
- No new *game* unit tests (this is infra). The "tests" being added to CI are the existing 20 e2e specs + the 3 desktop-smoke visual specs (`desktop-smoke`, `balance.desktop-smoke`, `story.desktop-smoke`).
- Edit assertions: the console-error guards in `smoke.spec.ts`, `error-boundary.spec.ts`, `desktop-smoke.spec.ts`, `visual.spec.ts` now assert "no console errors **except** the allowlisted Phaser texture/tween/favicon noise" — i.e. they no longer false-fail on `Texture key already in use` but still catch any *new* console.error.

**Manual in-game check:** none required — no canvas/visual behavior changes. (The texture-key error already happens in-game today and is benign; we're only stopping tests from tripping on it.)

**Gating vs informational:** `e2e` = **gating** from day one. `visual-smoke` = **informational** until goldens are re-baselined on CI, then **gating**. lint/typecheck/test/build remain gating, unchanged.

## Double-check / adversarial review

- **"Did the e2e job actually run the specs, or silently skip?"** Read the Actions log: the `list` reporter prints each spec/test. Confirm ~20 spec files and a non-trivial test count, and that the run did NOT short-circuit on `reuseExistingServer` finding a stale server (there is none on CI). If you see "0 tests ran" the `testDir`/glob is wrong.
- **"Is the texture-key error really gone from the failure surface, or did I just hide a real error?"** Prove the allowlist is *narrow*: temporarily inject a `console.error("SENTINEL boom")` into a spec's page via `addInitScript` and confirm the guard still fails on it. The allowlist must let `Texture key already in use` through but trap everything else. Remove the sentinel after.
- **"Does `visual-smoke` actually compare against committed goldens?"** Confirm `tests/visual/__goldens__/desktop-smoke.spec.ts/desktop/*.png` exist and the job is NOT silently passing because of missing baselines (Playwright *writes* a baseline and passes on first encounter when a golden is absent). After re-baseline, a deliberately edited golden (1px tweak) must make the job RED — try it on a throwaway branch to prove the gate bites.
- **Edge — Playwright browser cache key:** if `package-lock.json` doesn't change but Playwright bumps its pinned browser revision, a stale cache could point at a missing binary. `npx playwright install --with-deps chromium` after the cache restore is idempotent and re-fetches if needed, so this is safe. Verify by checking the install step logs ("chromium … is already installed" vs a download).
- **Edge — flaky spec under CI parallelism:** e2e config is `fullyParallel:false, retries:0`. If a spec is timing-flaky on the slower CI runner, do NOT bump global retries (masks real bugs); quarantine the single spec with `test.fixme`/`test.skip` + a tracking issue, keep the gate.
- **Rollback safety:** the change is additive YAML + test-helper filtering. Reverting the two new jobs restores the prior CI exactly; reverting the helper edit restores the stricter (noisier) guard. No production code, no persisted state, no schema — zero player-facing risk. Branch protection is the only external state to revert (remove the two checks in repo settings).
- **"Dormant path now fires" proof:** before this change, the canvas layer had **no gated test**. After: push a branch that deliberately breaks a board interaction (e.g. rename `startPath` in `GameScene.ts`) and confirm an e2e spec that drives chains (`chain.spec.ts` / `full-year.spec.ts` via `triggerChainViaScene`) goes RED in CI. That proves the gate exercises the previously-uncovered React→registry→GameScene path. Revert the deliberate break.

## Risks & gotchas

- **The texture-key error is `console.error`, not `console.warn`** (verified in Phaser source). Any guard that filters only warns would still fail — you MUST filter the error string. (Seed brief/memory said "warning"; corrected.)
- **Four Phaser.Game instances** (`prototype.tsx`, `TownPhaserCanvas.tsx`, `seasonStripPhaser.tsx`, `PhaserMap.tsx`) can each emit the key error on re-mount; a per-instance fix must cover all four — which is exactly why the test-side allowlist is preferred over four code edits.
- **Goldens are non-regenerable locally** (Windows DOM 3–5%, Phaser WebGL ~38%). Do not `--update-snapshots` here; do it via the CI `workflow_dispatch` path. The committed goldens almost certainly diff on the first CI run — that's why `visual-smoke` lands non-blocking first.
- **e2e + visual were never in CI** so they may have latent CI-only failures (timing, headless GPU, font availability). Budget for one or two specs needing CI-specific waits; quarantine rather than weaken the gate.
- **`webServer.reuseExistingServer: true`** in both configs is fine on CI but means a developer with a stray local server gets surprising reuse — irrelevant to CI, noted for the human.
- **Branch protection** required-status-check list lives in repo settings, not in the repo — adding the jobs to `ci.yml` does NOT auto-gate merges. A human must add `e2e` (and later `visual-smoke`) to the required checks, and update the `ci.yml` header comment to match.
- **`--with-deps`** needs the runner to allow apt installs (default on GitHub-hosted ubuntu). On a self-hosted runner this may need pre-provisioned libs.
- **No slice/SAVE_SCHEMA impact** — this task adds no action types and changes no persisted shape, so the slice-registration footgun and the save-wipe-on-schema-bump are not relevant here (stated so a fresh session doesn't over-engineer).
- House rules: open a **non-draft PR**, merge with a **merge commit** (not squash). Run `graphify update .` after changes.

## References

- `.github/workflows/ci.yml` — the six current jobs; header lists required checks. (`deploy.yml`, `pages-deploy-trigger.yml` = out of scope.)
- `playwright.config.js` — e2e config (single `iphone-landscape`/chromium project, `webServer` via `node ./node_modules/vite/bin/vite.js`).
- `playwright.visual.config.js` — visual config (`desktop` + `iphone-portrait`, `snapshotPathTemplate`, HTML report to `playwright-report/visual`).
- `package.json` scripts — `test:e2e`, `test:e2e:install`, `test:visual` (desktop smoke), `test:visual:update`, `ensure:visual-browser`/`pretest:visual`.
- `tests/e2e/helpers.ts` — `collectPageErrors` (the console-error collector to allowlist), `gotoFresh`, `triggerChainViaScene`, fiber bridge.
- `tests/e2e/smoke.spec.ts`, `tests/e2e/error-boundary.spec.ts` — inline console-error assertions to update.
- `tests/visual/desktop-smoke.spec.ts` (line ~99), `tests/visual/visual.spec.ts` (line ~93) — the `consoleErrors` filters to widen.
- `tests/visual/__goldens__/desktop-smoke.spec.ts/desktop/*.png` — committed desktop smoke baselines (must be re-baselined on CI).
- `tools/ensure-playwright-browser.mjs` — sandbox browser shim (no-op on CI; runs via `pretest:visual`).
- `node_modules/phaser/src/textures/TextureManager.js` `checkKey()` (~line 255) — source of the `console.error('Texture key already in use: ...')` + the `silentWarnings` `GameConfig` flag.
- Phaser game configs: `prototype.tsx:148`, `src/ui/TownPhaserCanvas.tsx:133`, `src/ui/seasonStripPhaser.tsx:57`, `src/features/cartography/PhaserMap.tsx:130`.
- Memory `visual-goldens-host-limits` — why goldens can't be regenerated on Windows; the ~38% WebGL / 3–5% DOM drift; e2e/visual not CI-gated; the "Texture key already in use" trips town/board scenarios.
- Memory `live-game-preview-verify` — `:5173` serves MAIN not the worktree; spin a worktree Vite on a spare port; drive via `window.__phaserScene` / `window.__hearthVisual`.
- Skill `check-slice-action` — not needed here (no new actions), referenced for completeness.
- `CLAUDE.md` — house rules (validation commands, merge-commit PRs, graphify update).

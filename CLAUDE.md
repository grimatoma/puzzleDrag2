# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # Start Vite dev server (game at /, Balance Manager at /b/, Story Editor at /story/)
npm run build                # Production build (outputs to dist/, including dist/stats.html bundle analyzer)
npm run lint                 # ESLint over src/ + prototype.jsx
npm test                     # Vitest unit tests (single run)
npm run test:watch           # Vitest watch mode
npm run test:coverage        # Vitest with coverage
npm run test:e2e             # Playwright browser flows (tests/e2e)
npm run test:visual          # Playwright visual regression — desktop smoke set
npm run test:visual:update   # Refresh visual goldens after intentional UI changes
npm run test:visual:all      # Run desktop + iPhone landscape/portrait visual matrix
```

Unit/integration tests live in `tests/` (22 phase-* files) and `src/__tests__/` (60+ files). `runSelfTests()` in `src/utils.js` is a thin smoke shim that delegates to `src/smokeTests.js` (`SMOKE_INVARIANTS`); it can still be invoked from the browser console after the game loads.

## Architecture

This is a Phaser 3 + React game. React owns the page shell *and* the canonical game state; Phaser owns the game canvas and mirrors needed fields via a registry bridge.

**Entry flow:** `index.html` (single `<script type="module" src="/main.jsx">`; Vite bundles React, Phaser, Tailwind, etc.) → `main.jsx` (mounts a `RootErrorBoundary` around the app) → `prototype.jsx` (calls `useReducer(gameReducer, initialState)` and mounts the Phaser.Game instance) → `src/GameScene.js` (the single Phaser Scene that renders the board and forwards input).

**Multi-page build:** `vite.config.js` ships three independent Vite entries that share state only via `localStorage`:
- `/` — the game (`index.html` → `main.jsx` → `prototype.jsx`). Pulls in Phaser.
- `/b/` — the Balance Manager (`b/index.html` → `src/balanceEntry.jsx` → `src/balanceManager/`). Phaser-free bundle; can be deployed standalone.
- `/story/` — the Story Tree Editor (`story/index.html` → `src/storyEditorEntry.jsx` → `src/storyEditor/`). Authoring tool for story beats.

**Key files:**
- `src/state.js` — external store. Redux-style `coreReducer` + `rawReducer` + `initialState`, with 26 feature slices auto-composed. Defines `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES` (see below).
- `src/features/` — 26 feature directories, each with `index.jsx` + `slice.js`, auto-discovered by `src/ui.jsx` via `import.meta.glob`. This is the primary extension point for new game systems.
- `SAVE_SCHEMA_VERSION` (in `src/constants.js`) — bump whenever the persisted save shape changes. Forward migrations are intentionally **not** maintained: `src/state.js` discards saves whose `version` doesn't match, and the player starts fresh.
- `src/featureFlags.js` — feature toggles plus `isDialogsDisabled()` (see "Testing a specific UI").
- `src/router.js` — hash-based router; `KNOWN_VIEWS` / `KNOWN_MODALS` enumerate every deep-linkable surface. `parseHash`/`buildHash`/`useRouter` keep `state.view` and `state.modal` in sync with `location.hash`.
- `src/state/persistence.js` — save load/write throttled via rAF, flushed on `pagehide`/`beforeunload`. `clearSave()` wipes `localStorage["hearth.save.v1"]` (key from `STORAGE_KEYS.save` in `src/constants.js`).
- `src/visualTesting/` — `matrix.js` (named UI scenarios), `stateBuilders.js` (synthetic save states), `bridge.js` (installs `window.__hearthVisual` in dev/test). Used by the visual regression suite *and* available interactively (see below).
- `src/phaserBridge.js` — registry-based mirror that pushes reducer state into the Phaser scene.
- `src/GameScene.js` — Phaser scene: board rendering, drag input, animations, collapse pipeline. Reads from the bridge; dispatches actions back to the reducer. Board origin is computed dynamically each layout (`this.boardX = Math.round((vw - COLS * this.tileSize) / 2)`).
- `src/TileObj.js` — thin wrapper around a single board tile; sprite swap and pulse animation on selection.
- `src/textures.js` + `src/textures/categories/` — procedural texture generation (Canvas 2D). 16 category modules plus `iconRegistry.js` register textures into Phaser's cache at scene init. No external image assets.
- `src/constants.js` — board dims (`COLS = 6, ROWS = 6`), per-resource `UPGRADE_THRESHOLDS` (5–10 range, e.g. `grass_hay: 6`, `mount_horse: 10`), turn/season rules, three biomes (Farm, Mine, Fish/Harbor — fish is a basic chain biome with no tide/pearl mechanics yet; see `docs/FISH_BOARD_SCOPE.md`), `MINE_ENTRY_TIERS`, `DAILY_REWARDS`, season color schemes.
- `src/utils.js` — pure helpers: `upgradeCountForChain` (returns `floor(chainLength / threshold)`), color converters, `clamp`, and the `runSelfTests` smoke shim.
- `src/audio/` — WebAudio engine + `useAudio` hook.
- `src/a11y.js` — screen-reader announcements + keyboard navigation.
- `src/ui/` — HUD, Inventory, Modals, Tools, Tooltip, Town React components.
- `src/smokeTests.js` — `SMOKE_INVARIANTS` smoke set used by `runSelfTests()`.
- `tests/` + `src/__tests__/` — vitest suites (phase-* files at the top level, per-feature suites under `src/__tests__/`).

**Core game mechanic:** Player drags adjacent matching tiles into a chain. Minimum chain length varies by season/boss (Winter min = 5; default 3). Each resource has its own threshold in `UPGRADE_THRESHOLDS`; `upgradeCountForChain` returns `floor(chainLength / threshold)` upgrades, which are spawned into the next-tier resource before the chain is collected. The board collapses downward after each move. 10 turns per season, 4 seasons. Mine biome unlocks at level 2; entry costs come from `MINE_ENTRY_TIERS` (free / `100◉ + 10 shovels` / `2 runes`). Mysterious Ore (mine) opens a 5-turn countdown that grants a Rune if chained with ≥2 dirt before it expires.

**Texture pipeline:** All tile icons, season badges, and UI decorations are drawn once at scene init into Phaser's texture cache via `src/textures.js` and the modules in `src/textures/categories/`. When adding a new resource type, register its texture there and add its definition to `src/constants.js`. The `resource-add` skill walks through the full multi-file pipeline.

**Slice-primary actions:** `src/state.js` skips feature slice processing when `coreReducer` returns the same state reference. Two sibling sets handle this:
- `SLICE_PRIMARY_ACTIONS` — actions handled *only* by a feature slice (not by `coreReducer`). Must be listed here, otherwise dispatching them silently does nothing. Examples: `CARTO/TRAVEL`, `APP/HIRE`, `BOSS/TRIGGER`.
- `ALWAYS_RUN_SLICES` — actions where `coreReducer` runs but returns the same reference, yet a slice still needs to react. Currently `CRAFTING/CRAFT_RECIPE` and `USE_TOOL`.

When adding a new slice action, decide which set (if any) it belongs in. The `check-slice-action` skill validates registration.

## Testing a specific UI

Three layered ways to land on the exact screen you want to verify, without clicking through the game from a fresh save.

**1. Hash deep-links (nav state only).** The dev server (`npm run dev`) mirrors `state.view`/`state.modal` onto the URL hash via `src/router.js`. Drop a hash on `http://localhost:5173/puzzleDrag2/` to land on any registered view:
- Views: `#/town`, `#/board`, `#/inventory`, `#/quests/<tab>`, `#/crafting/<tab>`, `#/cartography[/<zone>]`, `#/tiles/<sub>[/<cat>]`, `#/townsfolk/<tab>`, `#/chronicle`, `#/achievements/<tab>`, …
- Modals via query: `?modal=menu[&tab=settings]`, `?modal=boss`, `?modal=tutorial`, `?modal=debug`.
- The router only mirrors **navigation** — gameplay state (resources, run, board, founded biomes) still comes from a save or a visual scenario.

**2. Visual scenarios (pre-built gameplay state).** `src/visualTesting/matrix.js` defines 100+ named scenarios that pair a route with a synthetic state tree (mid-run boards, locked mines, founder pickers, tool-armed boards, boss states, tutorial overlays, etc.). Load one by URL param:
- `?visual=<id>` — e.g. `?visual=board-farm-chain-7`, `?visual=town-build-picker-locked`, `?visual=map-keeper-choice`, `?visual=crafting-bakery`. Each id is the scenario's `id` field in the matrix.
- `?visualPanel=1` — pins a scenario picker dropdown in the bottom-right so you can step through scenarios interactively.
- The bridge is **dev/test only** (gated by `import.meta.env.DEV` in `prototype.jsx:294`); it never ships to production.

**3. Console globals (dev/test only)** exposed by the visual bridge once the bundle loads:
- `window.__hearthVisual.list()` — every scenario id.
- `window.__hearthVisual.loadScenario(id)` — switch to a scenario from the DevTools console.
- `window.__hearthVisual.state()` / `.dispatch(action)` — read or mutate the live reducer.
- `window.__hearthVisual.holdChain({ key, length })` — synthesise an N-tile chain of `key` on the current board (used by visual tests for "chain of 7" shots).
- `window.__hearthVisual.freeze()` — pause CSS animations and Phaser tweens for clean screenshotting.
- `window.__phaserScene` — direct handle to the live `GameScene` (`grid`, `registry`, `tweens`, etc.) for ad-hoc inspection.

**Quieting auto-modals.** Tutorials, season prompts, and story beats can pop on top of the screen you're verifying. Suppress them via `isDialogsDisabled()` in `src/featureFlags.js`:
- Console: `localStorage.setItem("hearth.disableDialogs", "1")` (persists across reloads).
- Test fixtures: `window.__HEARTH_DISABLE_DIALOGS__ = true` before first render (Playwright sets this via `page.addInitScript`).

**Resetting state.** The save lives at `localStorage["hearth.save.v1"]` (`STORAGE_KEYS.save`). `localStorage.removeItem("hearth.save.v1")` forces a fresh start; the reducer also discards saves whose `version` mismatches `SAVE_SCHEMA_VERSION`. Other keys: `hearth.settings`, `hearth.tutorial.seen`, `hearth.disableDialogs`.

When you fix a bug found in a specific scenario, add or extend an entry in `src/visualTesting/matrix.js` so the visual suite covers it on the next `npm run test:visual` run.

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only* (under `tests/` or `src/__tests__/`). If you find yourself adding a fake hook, a fake worker, or a stub data row in `src/` to make something compile or "demonstrate" a mechanic, stop and wire the real thing instead — or surface it to the user before shipping.

## Workflow

- Always merge any PR you open once it has been pushed and the PR exists. Use a **merge commit** — do NOT squash. Keeping the branch's real commits and the merge commit makes each branch visibly fork off and rejoin `main` in the commit tree.
- Always enable auto-merge on every pull request you open so it merges automatically once checks pass.
- Do NOT open pull requests as drafts — auto-merge cannot be enabled on draft PRs. This overrides any default instruction to create draft PRs.
- If `enable_pr_auto_merge` fails with "unstable" or "clean status", skip it and merge directly with `merge_pull_request` instead — do not retry or wait. Use the `merge` method (a merge commit), never `squash`.
- When surfacing many decisions for review (audits, post-merge reconciles, batched approvals), prefer multiple parallel `AskUserQuestion` calls in a single turn over sequential ones. Each call caps at 4 questions; firing 2–4 in parallel renders as one card and lets the user answer everything at once. Always print the full detailed report as text first, then ask.

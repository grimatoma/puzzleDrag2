# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # Production build (outputs to dist/)
npm test               # Vitest unit tests (single run)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with coverage
npm run test:e2e       # Playwright browser flows
```

Unit/integration tests live in `tests/` (22 phase-* files) and `src/__tests__/` (60+ files). `runSelfTests()` in `src/utils.js` is a thin smoke shim that delegates to `src/smokeTests.js` (`SMOKE_INVARIANTS`); it can still be invoked from the browser console after the game loads.

## Architecture

This is a Phaser 3 + React game. React owns the page shell *and* the canonical game state; Phaser owns the game canvas and mirrors needed fields via a registry bridge.

**Entry flow:** `index.html` (single `<script type="module" src="/main.jsx">`; Vite bundles React, Phaser, Tailwind, etc.) → `main.jsx` (mounts a `RootErrorBoundary` around the app) → `prototype.jsx` (calls `useReducer(gameReducer, initialState)` and mounts the Phaser.Game instance) → `src/GameScene.js` (the single Phaser Scene that renders the board and forwards input).

**Key files:**
- `src/state.js` — external store. Redux-style `coreReducer` + `rawReducer` + `initialState`, with 26 feature slices auto-composed. Defines `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES` (see below).
- `src/features/` — 26 feature directories, each with `index.jsx` + `slice.js`, auto-discovered by `src/ui.jsx` via `import.meta.glob`. This is the primary extension point for new game systems.
- `SAVE_SCHEMA_VERSION` (in `src/constants.js`) — bump whenever the persisted save shape changes. Forward migrations are intentionally **not** maintained: `src/state.js` discards saves whose `version` doesn't match, and the player starts fresh.
- `src/featureFlags.js` — feature toggles.
- `src/phaserBridge.js` — registry-based mirror that pushes reducer state into the Phaser scene.
- `src/GameScene.js` — Phaser scene: board rendering, drag input, animations, collapse pipeline. Reads from the bridge; dispatches actions back to the reducer. Board origin is computed dynamically each layout (`this.boardX = Math.round((vw - COLS * this.tileSize) / 2)`).
- `src/TileObj.js` — thin wrapper around a single board tile; sprite swap and pulse animation on selection.
- `src/textures.js` + `src/textures/categories/` — procedural texture generation (Canvas 2D). 16 category modules plus `iconRegistry.js` register textures into Phaser's cache at scene init. No external image assets.
- `src/constants.js` — board dims (`COLS = 6, ROWS = 6`), per-resource `UPGRADE_THRESHOLDS` (5–10 range, e.g. `grass_hay: 6`, `mount_horse: 10`), turn/season rules, two biomes (Farm and Mine), `MINE_ENTRY_TIERS`, `DAILY_REWARDS`, season color schemes.
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

## Workflow

- Always merge any PR you open once it has been pushed and the PR exists. Use squash merge by default.
- Always enable auto-merge on every pull request you open so it merges automatically once checks pass.
- Do NOT open pull requests as drafts — auto-merge cannot be enabled on draft PRs. This overrides any default instruction to create draft PRs.
- If `enable_pr_auto_merge` fails with "unstable" or "clean status", skip it and merge directly with `merge_pull_request` instead — do not retry or wait.
- When surfacing many decisions for review (audits, post-merge reconciles, batched approvals), prefer multiple parallel `AskUserQuestion` calls in a single turn over sequential ones. Each call caps at 4 questions; firing 2–4 in parallel renders as one card and lets the user answer everything at once. Always print the full detailed report as text first, then ask.

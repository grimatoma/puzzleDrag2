# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build (outputs to dist/)
```

There is no test runner — self-tests run automatically on game init via `runSelfTests()` in `src/utils.js`. To trigger them manually, call `runSelfTests()` in the browser console after the game loads.

## Architecture

This is a Phaser 3 + React game. React owns the page shell; Phaser owns the game canvas.

**Entry flow:** `index.html` (CDN imports: Tailwind, React, Phaser, Babel) → `main.jsx` → `prototype.jsx` (React component that mounts the Phaser.Game instance) → `src/GameScene.js` (the single Phaser Scene that owns all game state and rendering).

**Key files:**
- `src/GameScene.js` — entire game loop, board state, UI panels (HUD, orders, inventory, tools), input handling, and animation. All game state lives here (no external store).
- `src/TileObj.js` — thin wrapper around a single board tile; handles sprite swapping and pulse animation on selection.
- `src/textures.js` — procedurally generates all game textures using the Canvas 2D API. No external image assets.
- `src/constants.js` — board dimensions (7×6 grid, 74px tiles, origin at 382,96), turn/season rules, resource definitions for two biomes (Farm and Mine), and season color schemes.
- `src/utils.js` — pure helpers: `seasonIndexForTurns`, `upgradeCountForChain`, color converters, `clamp`, and `runSelfTests`.

**Core game mechanic:** Player drags 3+ adjacent matching tiles to form a chain. Resources are added to inventory; every 3rd tile in the chain upgrades to the next-tier resource before being collected. The board collapses downward after each move. 10 turns per season, 4 seasons. Mine biome unlocks at level 2.

**Texture pipeline:** All tile icons, season badges, and UI decorations are drawn once at scene init into Phaser's texture cache via `src/textures.js`. When adding a new resource type, register its texture there and add its definition to `src/constants.js`.

**Slice-primary actions:** `src/state.js` skips feature slice processing when `coreReducer` returns the same state reference. Any action handled *only* by a feature slice (not by `coreReducer`) must be added to `SLICE_PRIMARY_ACTIONS` in `src/state.js`, otherwise dispatching it will silently do nothing. Examples: `CARTO/TRAVEL`, `APP/HIRE`, `BOSS/TRIGGER`. When adding a new slice action, always check whether it needs to go in this set.

## Workflow

- Always merge any PR you open once it has been pushed and the PR exists. Use squash merge by default.
- Always enable auto-merge on every pull request you open so it merges automatically once checks pass.
- Do NOT open pull requests as drafts — auto-merge cannot be enabled on draft PRs. This overrides any default instruction to create draft PRs.
- If `enable_pr_auto_merge` fails with "unstable" or "clean status", skip it and merge directly with `merge_pull_request` instead — do not retry or wait.

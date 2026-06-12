# CLAUDE.md

Guidance for agents working in this repository.

## Mental model (read first)

This repository contains the **React+Phaser app** (`src/`, `prototype.tsx`, the Vite/`npm` toolchain) for **puzzleDrag2**.
The **Godot 4.6 port has been extracted to its own repository** at [puzzleDrag2-godot](https://github.com/grimatoma/puzzleDrag2-godot).
The React+Phaser app at the repo root is the original implementation the port was built from. It remains the reference for how the game is meant to work, but it is no longer the primary active version of the game.

The repository also hosts the headless asset exporters that drive the Phaser app in a browser to capture canvas textures and export them to the sibling Godot project's assets.

---

## Orientation & File Structure

Phaser 3 + React. **React owns state** (`useReducer` in `prototype.jsx`, store logic in `src/state.js`, feature slices under `src/features/*`). **Phaser owns the canvas** (`src/GameScene.js`) and receives state via a registry bridge (`src/phaserBridge.js`); the scene dispatches actions back to the reducer.

Vite ships three independent entries from one repo:
- `/` — the game (`index.html` → `main.jsx` → `prototype.jsx`). Pulls in Phaser.
- `/b/` — the Dev Panel (`b/index.html` → `src/balanceEntry.jsx` → `src/balanceManager/`). Phaser-free bundle.
- `/story/` — the Story Tree Editor (`story/index.html` → `src/storyEditorEntry.jsx` → `src/storyEditor/`). Authoring tool for story beats.

---

## Where to look

| Task | First stop |
|---|---|
| Add a new resource/tile | `src/constants.js` + `src/textures/categories/` |
| Bug in drag/animation/board layout | `src/GameScene.js`, `src/phaserBridge.js` |
| New feature panel (HUD, modal, screen) | `src/features/<name>/index.jsx` + `slice.js` |
| New view or modal route | `src/router.js` (`KNOWN_VIEWS` / `KNOWN_MODALS`) |
| Tune balance values | `src/constants.js` (`UPGRADE_THRESHOLDS`, `ZONES[].entryCost`, `DAILY_REWARDS`) |
| Story beat content | `src/story.js`, `src/features/story/slice.js`, `src/state/storyEffects.js` |

---

## Asset Exporters (Phaser to Godot)

Exporters drive the local Phaser web app headlessly to generate PNGs and icons for the Godot sibling repository:
- `tools/export-v1-tiles.mjs` — headlessly captures and exports board tiles.
- `tools/export-v1-resources.mjs` — headlessly captures and exports inventory item icons.
- `tools/export-tool-icons.mjs` — captures and exports tool icons.

---

## Commands

```bash
npm run dev                  # Start Vite dev server (game at /, Dev Panel at /b/, Story Editor at /story/)
npm run build                # Production build (outputs to dist/)
npm run lint                 # ESLint over src/ + prototype.tsx
npm run typecheck            # tsc --noEmit over `src/` + entries
npm test                     # Vitest unit tests
npm run test:e2e             # Playwright browser flows (tests/e2e)
npm run test:visual          # Playwright visual regression — desktop smoke set

# Exporters (requires 'npm run dev' to be running first)
node tools/export-v1-tiles.mjs
node tools/export-v1-resources.mjs
node tools/export-tool-icons.mjs
```

---

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only*.
- **Run visual goldens before opening a PR** if a change could affect UI rendering. Run `npm run test:visual` and justify any diffs.
- **Workflow**: Open pull requests ready for review (no draft PRs). Merge PRs using **merge commits** (do NOT squash).

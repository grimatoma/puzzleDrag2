# CLAUDE.md

Guidance for agents working in this repository.

## Mental model (read first)

This repository contains the **React+Phaser app** (`src/`, `prototype.tsx`, the Vite/`npm` toolchain) for **puzzleDrag2**.

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
| Wiki prose (and keeping it from drifting) | `src/balanceManager/content/**/*.html` — inject structured facts via `data-wiki-tier-ladder` / `data-wiki-fact` (`src/balanceManager/wiki/derivedFacts.tsx`); the **wiki-content** skill |

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
```

---

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only*.
- **Run visual goldens before opening a PR** if a change could affect UI rendering. Run `npm run test:visual` and justify any diffs.
- **Workflow**: Open pull requests ready for review (no draft PRs). Merge PRs using **merge commits** (do NOT squash).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

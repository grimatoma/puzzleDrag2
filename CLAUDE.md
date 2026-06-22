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

---

## Commands

```bash
npm run dev                  # Start Vite dev server (game at /, Dev Panel at /b/, Story Editor at /story/)
npm run build                # Production build (outputs to dist/)
npm run lint                 # ESLint over src/ + prototype.tsx
npm run typecheck            # tsc --noEmit over `src/` + entries
npm test                     # Vitest unit tests
npm run test:e2e             # Playwright browser flows (tests/e2e)
npm run test:visual          # Visual regression — fast desktop smoke set (pre-PR gate)
npm run test:visual:all      # Full visual matrix — desktop smoke + iphone-portrait mobile
npm run test:visual:update   # Regenerate the desktop smoke goldens
npm run test:visual:all:update  # Regenerate the full (mobile) goldens
```

---

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only*.
- **Workflow**: Open pull requests ready for review (no draft PRs). Merge PRs using **merge commits** (do NOT squash).

### Visual goldens — keep them in sync (read before refactoring any UI)

Goldens drift silently because the smoke set only covers desktop. **If a change touches a screen, run `npm run test:visual` *and* `npm run test:visual:all`** (the full set is the only thing that exercises mobile + the Dev Panel + Story Editor), then justify or regenerate.

- **Scenarios are defined in `src/visualTesting/*Matrix.ts`**, not the specs. A scenario's `actions` drive the UI by accessible name / role. When you rename a button, move a control into a menu/overflow, or replace DOM with a Phaser canvas, the matching action breaks — update the scenario (or add an `aria-label`) in the same PR. Past breakages: Story Editor toolbar → Tools menu; town building/board entrances → Phaser hit-zones (driven via the `enterTownBoard` bridge helper, not a DOM click); mobile search/debug behind toggles.
- **Golden layout is enforced** by `src/__tests__/visual-scenarios.test.ts`: `visual.spec.ts`/`*.visual.spec.ts` baseline the **full matrix on iphone-portrait** and only the **smoke subset (+ desktop-only scenarios) on desktop**. A non-smoke scenario that should not live on desktop needs `skipProjects: ['desktop']`. After any scenario/golden change, regenerate the manifest with **`npx vite-node tests/visual/generateManifest.mjs`** (plain `node` can't resolve the TS imports).
- **Determinism**: `installDeterminism` seeds `Math.random` + freezes `Date.now`; Dev Panel specs additionally `await document.fonts.ready` (Google Fonts `display=swap` otherwise ghosts every glyph). Phaser scenes used in goldens must pin/skip their ambient animation under `window.__HEARTH_VISUAL_TESTING__` (board: bridge `freeze()`; town: single-start boot; map: `tweens.pauseAll()` + `update()` early-return) or screenshots land on a random frame.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

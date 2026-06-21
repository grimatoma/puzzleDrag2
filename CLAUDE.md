# CLAUDE.md

Guidance for agents working in this repository.

## Mental model (read first)

This repository is the **React + Phaser app** for **puzzleDrag2** (a tile-drag
match/merge farming game). The codebase is **TypeScript** (`.ts`/`.tsx`); the
build is Vite + `npm`. Older docs/skills may say `.js`/`.jsx` — the source has
since migrated, but **module import specifiers still use `.js` extensions**
(e.g. `import ... from "./constants.js"`) because of TS's `NodeNext`-style
resolution. Keep that convention when adding imports.

The split that matters:

- **React owns state.** A single `useReducer` lives in `prototype.tsx`; the
  reducer and store logic live in `src/state.ts`, with per-feature reducer
  slices under `src/features/*/slice.ts`.
- **Phaser owns the canvas.** `src/GameScene.ts` (the puzzle board) and the
  town scenes render to canvas. State crosses the boundary through a registry
  bridge (`src/phaserBridge.ts`); the scene dispatches actions back into the
  React reducer.

---

## The three Vite entries (one repo, three apps)

| Route | Entry chain | Notes |
|---|---|---|
| `/` — the game | `index.html` → `main.tsx` → `prototype.tsx` | Pulls in Phaser |
| `/b/` — the Dev Panel | `b/index.html` → `src/balanceEntry.tsx` → `src/balanceManager/` | Phaser-free bundle; balance tuning + in-app Wiki |
| `/story/` — the Story Tree Editor | `story/index.html` → `src/storyEditorEntry.tsx` → `src/storyEditor/` | Authoring tool for story beats |

Entries are declared in `vite.config.js` (`rollupOptions.input`). Phaser is
deliberately kept out of the `/b/` and `/story/` bundles.

---

## Where to look

| Task | First stop |
|---|---|
| Add a new resource/tile | `src/constants.ts` + `src/textures/categories/` (see `resource-add` / `seasonal-tile-pipeline` skills) |
| Bug in drag/animation/board layout | `src/GameScene.ts`, `src/TileObj.ts`, `src/phaserBridge.ts`, `src/game/layout.ts` |
| Core game rules (chains, spawns, produced resources) | `src/game/*.ts` (`chain.ts`, `spawnPool.ts`, `producedResource.ts`) |
| New feature panel (HUD, modal, screen) | `src/features/<name>/index.tsx` + `slice.ts` |
| New view or modal route | `src/router.ts` (`KNOWN_VIEWS` / `KNOWN_MODALS`) |
| Tune balance values | `src/constants.ts` + `src/config/balance/` (`UPGRADE_THRESHOLDS`, `ZONES[].entryCost`, `DAILY_REWARDS`) |
| Story beat content | `src/story.ts`, `src/features/story/slice.ts`, `src/state/storyEffects.ts` |
| Reusable game UI (Hud, Inventory, Tools, Town) | `src/ui/` and `src/ui.tsx` |
| Town / settlement scene + layout | `src/ui/town/`, `src/townLayout.ts` (see `growing-settlement-layout`, `zone-design`, `tileset-scene-design` skills) |
| Save format / migrations | `src/state/persistence.ts`, `src/state/saveMigrations.ts` |
| Action/state type definitions | `src/types/` (`actions.ts`, `actionPayloads.ts`, `state.ts`) |
| Wiki prose (and keeping it from drifting) | `src/balanceManager/content/**/*.html` — inject structured facts via `data-wiki-tier-ladder` / `data-wiki-fact` (`src/balanceManager/wiki/derivedFacts.tsx`); the **wiki-content** skill |

---

## Feature module contract (read before adding a feature)

Each feature under `src/features/<name>/` owns two files (see
`src/features/README.md`):

- `index.tsx` — exports a `default` React component (receives `{ state, dispatch }`)
  and either `viewKey` (full-screen) or `modalKey` (modal overlay), or both.
- `slice.ts` — a reducer slice exporting `initial` (object spread into global
  state) and `reduce(state, action)` (must return state **unchanged by
  reference** for unrecognised actions).

**UI components are auto-discovered.** `FeatureModals` / `FeatureScreens` in
`src/ui.tsx` use `import.meta.glob("./features/*/index.{jsx,tsx}", { eager: true })`
and mount whichever component's `viewKey`/`modalKey` matches `state.view` /
`state.modal`. No edit to `ui.tsx` is needed to add a screen/modal.

**Reducer slices are NOT auto-discovered — this is the #1 footgun.** A new
slice must be:
1. imported in `src/state.ts`, and
2. added to the `slices` array (around `src/state.ts:73`).

Additionally, if an action type is owned *exclusively* by a slice (the core
reducer has no handler for it), it must be listed in `SLICE_PRIMARY_ACTIONS`
(or `ALWAYS_RUN_SLICES` when the core reducer also partially handles it) near
`src/state.ts:1608`. Otherwise the reducer short-circuits: when `coreReducer`
returns the same state reference, slices are skipped and your action silently
"does nothing". Use the **check-slice-action** skill to validate this.

**Conventions:**
- Action types are namespaced `'<FEATURE>/ACTION'` (e.g. `'CRAFTING/CRAFT_RECIPE'`).
- Bottom-nav reachable? Add a `{key, label}` to the `items` array in `BottomNav` (`src/ui.tsx`); navigate via `dispatch({type:'SET_VIEW', view:'<key>'})`.
- Modals: `dispatch({type:'OPEN_MODAL', modal:'<key>'})` / `dispatch({type:'CLOSE_MODAL'})`.

---

## Commands

```bash
npm run dev                  # Vite dev server (game at /, Dev Panel at /b/, Story Editor at /story/)
npm run build                # Production build → dist/ (also runs build:docs)
npm run lint                 # ESLint over src/ + prototype.tsx
npm run typecheck            # tsc --noEmit over src/ + entries
npm run typecheck:tests      # tsc over test files (tsconfig.tests.json)
npm test                     # Vitest unit tests (run once)
npm run test:watch           # Vitest in watch mode
npm run test:coverage        # Vitest with V8 coverage
npm run test:e2e             # Playwright browser flows (tests/e2e)
npm run test:visual          # Playwright visual regression — desktop smoke set
npm run test:visual:update   # Regenerate desktop visual goldens
npm run action-types:check   # Verify action-type catalog is in sync (CI gate)
npm run playtest             # Headless sim playtest harness (tools/playtest)
```

CI (`.github/workflows/ci.yml`) runs: `lint`, `typecheck`, `action-types:check`,
`typecheck:tests`, `typecheck:test-files`, `test:coverage`, `build`, plus E2E
and visual-smoke jobs.

---

## Testing layout

- **Unit/integration:** Vitest. Co-located `*.test.ts` next to source (e.g. `src/game/chain.test.ts`) and phased suites in `tests/phase-*.test.ts`.
- **E2E:** Playwright in `tests/e2e/` (`playwright.config.js`).
- **Visual regression:** Playwright in `tests/visual/` (`playwright.visual.config.js`); goldens in `tests/visual/__goldens__/`.

---

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only*.
- **Keep import specifiers using `.js`** even in `.ts`/`.tsx` files.
- **Slice reducers must preserve referential equality** for no-op/rejected actions (return the same `state` object) — the reducer relies on this to gate side-effects.
- **Run visual goldens before opening a PR** if a change could affect UI rendering. Run `npm run test:visual` and justify any diffs.
- **Workflow:** Open pull requests ready for review (no draft PRs for normal work). Merge PRs using **merge commits** (do NOT squash).

---

## Skills

This repo ships many domain skills (invoked via `/<name>`). Reach for them
rather than reinventing: `resource-add`, `seasonal-tile-pipeline`,
`check-slice-action`, `phaser-scene-debug`, `wiki-content`,
`growing-settlement-layout`, `zone-design`, `tileset-scene-design`,
`pixel-art-craft`, `pixel-art-animation`, `pre-pr-check`, `dev-server`,
`coverage-gaps`. See each skill's description for trigger conditions.

## graphify

A knowledge graph may exist under `graphify-out/`. When `graphify-out/graph.json`
is present and the `graphify` CLI is installed, prefer it for codebase
questions:

- `graphify query "<question>"` for scoped subgraphs, `graphify path "<A>" "<B>"`
  for relationships, `graphify explain "<concept>"` for focused concepts.
- Use `graphify-out/wiki/index.md` for broad navigation and
  `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).

If neither the CLI nor `graph.json` is available, fall back to the
file/search tools above.

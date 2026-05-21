# Agent Central: PuzzleDrag2 Codebase Guide

> Purpose: This is the **first stop** for agents. It is code-driven (not legacy-doc-driven), optimized for fast orientation, and structured for progressive disclosure.

## 1) What this repo is (current reality)

This repository contains a multi-entry Vite app with three major surfaces:

1. **Main game app** at `/` (React + Phaser board runtime).
2. **Balance Manager** at `/b/` (standalone editor for balance/story override drafts).
3. **Story Tree Editor** at `/story/` (full-page visual editor for story beats).

All three are built from one Vite project as separate HTML entries and separate JS bundles. Shared data flow is primarily via constants modules and localStorage draft overrides. Start with `vite.config.js` to confirm the current build shape.  

## 2) Fastest mental model

- **React shell + state reducer drives game state** (`prototype.jsx` + `src/state.js`).
- **Phaser scene renders/executes board interactions** and emits events back to reducer (`CHAIN_COLLECTED`, `GRID/SYNC`, etc.).
- **Feature slices** are modular reducers/actions integrated in `src/state.js` via `slices` array.
- **Hash router** mirrors key state into URL so deep links work on static hosting.
- **Persistence** is localStorage-based save hydration; schema versioned.
- **Balance/story authoring tools** write draft overrides into localStorage; main game reads/merges these at load.

If an agent only learns this section, they can already triage most tasks.

## 3) Where to start for any task (decision tree)

### A. “Something in gameplay/state logic is wrong”
1. Open `src/state.js` (core reducer, domain orchestration).
2. Open feature slices under `src/features/*/slice.js` for local behavior.
3. Check `src/state/init.js` for initial/save-merge behavior.
4. Check Phaser bridge points in `prototype.jsx` and `src/GameScene.js`.

### B. “Navigation / deep links / view mismatches”
1. Open `src/router.js` (hash parse/build + state sync hook).
2. Verify route-related state fields in reducer (`view`, `modal`, `viewParams`).

### C. “Economy, content balance, resources, recipes, thresholds”
1. Open `src/constants.js` and data modules in `src/features/**/data.js`.
2. Check `src/config/balance.json` and `src/config/applyOverrides.js` for override mechanics.
3. Use `/b/` tooling (`src/balanceManager/*`) as source of editable model assumptions.

### D. “Story beats, flags, branching, narrative tooling”
1. Runtime story behavior: `src/story.js`, `src/state/storyEffects.js`, `src/features/story/slice.js`.
2. Authoring/editor behavior: `src/storyEditor/*`.
3. Balance-draft story override path: `draft.story` handling in editor + override application.

### E. “UI-only issue”
1. Shell composition: `src/ui.jsx`.
2. View components under `src/ui/*` and `src/features/*/index.jsx`.
3. Design primitives under `src/ui/primitives/*`.

## 4) Entry points and runtime boundaries

## 4.1 Main game app
- `main.jsx` registers icons, mounts root error boundary, and renders `PuzzleCraftStylePhaserPrototype`.
- `prototype.jsx` is the top-level runtime composition layer:
  - Initializes reducer with `initialState` from `src/state.js`.
  - Boots Phaser lazily and wires scene events to dispatch.
  - Syncs React state into Phaser registry for board runtime needs.
  - Composes HUD, town, tools, side panels, modals.

## 4.2 Balance Manager (`/b/`)
- Entry: `b/index.html` -> `src/balanceEntry.jsx` -> `src/balanceManager/index.jsx`.
- Maintains draft in localStorage (`hearth.balance.draft`), supports undo/redo/export/import, and writes override structures consumed by game constants merge logic.
- Router is separate from game router (`src/balanceManager/router.js`).

## 4.3 Story Editor (`/story/`)
- Entry: `story/index.html` -> `src/storyEditorEntry.jsx` -> `src/storyEditor/index.jsx`.
- Visual graph editor for story beats and branching, writing into shared draft override state.
- Advanced validation and inspection panels are colocated in `src/storyEditor/*`.

## 5) State architecture (authoritative)

## 5.1 Core reducer orchestration
- `src/state.js` defines `coreReducer(state, action)` with high-volume domain logic (chain collection, hazards, bosses, resource caps, turns, etc.).
- Feature slices are imported and composed via `slices` list (`crafting`, `quests`, `achievements`, `tutorial`, `settings`, `boss`, `cartography`, `story`, `decorations`, `portal`, `market`, `castle`, `fish`, `zones`, `workers`, `boons`, `runSummary`).
- `src/state.js` also re-exports key helpers/persistence APIs to keep consumers centralized.

## 5.2 Initialization + hydration
- `src/state/init.js` is the canonical source for:
  - `createFreshState()` baseline state object.
  - `initialState()` hydration from localStorage save if schema matches.
  - Save seed generation and merge/sanitization behavior.
- Save mismatch behavior: falls back to fresh state.

## 5.3 Persistence
- Local save read/write/flush/clear utilities live in `src/state/persistence.js` and are re-exported by `src/state.js`.
- Distinguish **player save state** from **balance/story override drafts** (separate storage keys and purpose).

## 6) Gameplay runtime integration (React <-> Phaser)

- Phaser scene lifecycle and event bridge wiring are in `prototype.jsx` (`SCENE_EVENTS` subscriptions).
- Scene-side board logic lives in `src/GameScene.js` and related biome hazard modules under `src/features/farm/*`, `src/features/mine/*`, `src/features/fish/*`.
- Common issue pattern: if UI state and board visuals diverge, inspect both dispatch events and registry sync effects in `prototype.jsx`.

## 7) Routing model

- Game router (`src/router.js`) is hash-based and normalizes URLs.
- Canonical route pieces:
  - `view`
  - `viewParams` (tab/sub/category/zone depending on view)
  - `modal` + `modalParams`
- Router applies route on mount and syncs on `popstate/hashchange`; also protects board-leave behavior.

## 8) Content/data surfaces

- Core constants: `src/constants.js`.
- Feature data: `src/features/*/data.js` (quests, achievements, cartography, decorations, etc.).
- Tile collection logic/data: `src/features/tileCollection/*`.
- Story data and flags: `src/story.js`, `src/flags.js`, `src/features/story/data.js`.
- Icons/procedural textures: `src/textures/**`, `src/ui/icons/**`.

## 9) Testing and verification map

- Unit/integration: `vitest` (`npm test`).
- E2E + visual regression: Playwright configs (`playwright.config.js`, `playwright.visual.config.js`).
- Visual scenario infrastructure: `src/visualTesting/*` (state builders + bridge/matrix/scenarios).
- Smoke checks also exist (`src/smokeTests.js`).

Use the smallest test scope that validates your change first, then expand if behavior crosses runtime boundaries.

## 10) Progressive disclosure file index

### Tier 0: Immediate orientation (read first)
1. `vite.config.js`
2. `main.jsx`
3. `prototype.jsx`
4. `src/state.js`
5. `src/state/init.js`
6. `src/router.js`

### Tier 1: Surface-specific deep dive
- Gameplay logic: `src/features/**/slice.js`, biome hazard modules, `src/GameScene.js`.
- UI composition: `src/ui.jsx`, `src/ui/*`, `src/features/*/index.jsx`.
- Balance tooling: `src/balanceManager/*`, `src/config/*`.
- Story tooling/runtime: `src/storyEditor/*`, `src/story.js`, `src/state/storyEffects.js`.

### Tier 2: Specialized systems
- Visual test harness: `src/visualTesting/*`.
- Icon and texture generation registry: `src/textures/*`, `src/ui/icons/*`.
- Utility/state helpers: `src/state/helpers.js`, `src/utils.js`.

## 11) Practical agent workflows

### Workflow: Add/modify gameplay mechanic
1. Change feature slice/core reducer path.
2. Confirm board event bridge (if chain/board related).
3. Validate with vitest targeted test(s) and relevant visual scenario if available.
4. Verify no router/persistence regressions if state shape changed.

### Workflow: Add/modify balance knobs
1. Update canonical data/constants source.
2. Update Balance Manager tab/editor contract if user-facing editing is expected.
3. Confirm override merge path (`applyOverrides`) handles new shape.

### Workflow: Story branch changes
1. Update story data / slice behavior.
2. Validate trigger and flag interactions in story effects.
3. Check Story Editor rendering + validation warnings for branch integrity.

## 12) Known repo conventions (from code)

- Multiple systems are intentionally hash-routed separately (`/`, `/b/`, `/story/`).
- Comments in source are often phase-tagged and can provide migration intent; trust code behavior over old docs.
- LocalStorage is a first-class dependency for save state and content-draft workflows.

## 13) Anti-footgun checklist for agents

Before making assumptions, verify:
- Are you editing main game vs balance manager vs story editor?
- Is data source runtime save, constants, or localStorage draft overrides?
- Is behavior in reducer, feature slice, or Phaser scene?
- Is route-driven state involved (view/tab/modal)?
- Do tests need unit, visual, or e2e coverage?

If unclear, trace from entrypoint -> state action -> feature slice/core reducer -> UI or scene effect.

---

## Appendix: Quick command set for agents

```bash
npm run dev
npm test
npm run test:visual
npm run test:e2e
npm run lint
```

For code navigation, prefer `rg` and focused file opens.

# CLAUDE.md

Guidance for agents working in this repo. `AGENTS.md` (Codex/ChatGPT, Cursor, Aider convention) and `GEMINI.md` (Gemini CLI) are symlinks to this file — there is one source of truth. Edit only `CLAUDE.md`.

**Platforms:** Use this repo with **Claude Code**, **Codex**, or **Cursor** (desktop or Cloud). `AGENTS.md` is a symlink to this file so Codex loads the same canonical instructions. Skills live in `.claude/skills/` (shared and reusable across compatible agents). Cursor also has `.cursor/rules/cursor-superpowers.mdc` (always applied when present in the clone). Everything agents need is version-controlled here — Cloud agents do not load machine-local user rules.

## Mental model (read first)

Phaser 3 + React game. **React owns state** — `useReducer` in `prototype.jsx`, store logic in `src/state.js`, 29 auto-discovered feature slices under `src/features/*`. **Phaser owns the canvas** (`src/GameScene.js`) and receives state via a registry bridge (`src/phaserBridge.js`); the scene dispatches actions back to the reducer. Vite ships three independent entries from one repo: `/` (game, pulls Phaser), `/b/` (Dev Panel, Phaser-free), `/story/` (Story Tree Editor). They share state only via `localStorage`. All textures are drawn procedurally — no external image assets.

## Where to look

| Task | First stop | See also |
|---|---|---|
| Add a new resource/tile | `src/constants.js` + `src/textures/categories/` | `resource-add` skill |
| Bug in drag/animation/board layout | `src/GameScene.js`, `src/phaserBridge.js` | `phaser-scene-debug` skill |
| New feature panel (HUD, modal, screen) | `src/features/<name>/index.jsx` + `slice.js` | auto-discovered via `import.meta.glob` in `src/ui.jsx` |
| New view or modal route | `src/router.js` (`KNOWN_VIEWS` / `KNOWN_MODALS`) | navigate via hash `#/view[/sub]` |
| Tune balance values | `src/constants.js` (`UPGRADE_THRESHOLDS`, `ZONES[].entryCost`, `DAILY_REWARDS`) | Dev Panel at `/b/` |
| Story beat content | `src/story.js`, `src/features/story/slice.js`, `src/state/storyEffects.js` | Story Editor at `/story/` |
| Dispatched action silently does nothing | `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` in `src/state.js` | `check-slice-action` skill |
| TS migration Phases 1–2 (drop `GameState` index, Phaser bridge) | `docs/engineering/ts-migration-completion.md` | `catalog-enums.md`, `typed-tests.md` |
| Persisted save shape changed | bump `SAVE_SCHEMA_VERSION` in `src/constants.js` | reducer discards mismatched saves |
| Land on a specific screen for QA | "Testing a specific UI" section below | `?visual=<id>`, `window.__hearthVisual` |
| Reset state during testing | `localStorage.removeItem("hearth.save.v1")` | also `hearth.settings`, `hearth.tutorial.seen`, `hearth.disableDialogs` |
| Canonical concept inventory | Dev Panel `/b/` → Wiki → Concepts | sub-tabs iterate live from `src/constants.js`, `src/features/*/data.js`, `src/config/abilities.js`, `src/config/toolPowers.js`, `src/router.js`. Do not duplicate concept lists in other docs — point at the Wiki. |

The body below covers commands, architecture, the core game mechanic, testing harness, engineering rules, and PR workflow. Trust code over older docs (anything under `docs/` is allowed to drift; this file is kept current).

## Commands

```bash
npm run dev                  # Start Vite dev server (game at /, Dev Panel at /b/, Story Editor at /story/)
npm run build                # Production build (outputs to dist/, including dist/stats.html bundle analyzer)
npm run lint                 # ESLint over src/ + prototype.tsx
npm run typecheck            # tsc --noEmit over `src/` + entries (excludes `**/*.test.ts`; `src/testUtils/` is included)
npm run typecheck:tests      # Playwright specs + Vitest setup; see `docs/engineering/typed-tests.md`
npm run typecheck:test-files # Per-file strict tsc on src/__tests__/*.test.ts (CI gate)
npm run action-types:check   # sanity-check ACTION_TYPES array (no dupes); use with typecheck — `src/types/actionCatalogCoverage.ts` asserts every catalog string has a TypedAction branch
npm test                     # Vitest unit tests (single run)
npm run test:watch           # Vitest watch mode
npm run test:coverage        # Vitest with coverage
npm run test:e2e             # Playwright browser flows (tests/e2e)
npm run test:visual          # Playwright visual regression — desktop smoke set
npm run test:visual:update   # Refresh visual goldens after intentional UI changes
npm run test:visual:all      # Run desktop + iPhone portrait visual matrix
```

Every `test:visual*` script has a `pretest:visual*` hook that runs `tools/ensure-playwright-browser.mjs`. On restricted-network hosts (some sandboxes block `cdn.playwright.dev`), this bootstrap symlinks any pre-installed `/opt/pw-browsers/chromium_headless_shell-*` into the path the current Playwright revision expects, so visual tests work without a fresh download. No-op when the right browser is already present.

Unit/integration tests live in `tests/` (22 phase-* files) and `src/__tests__/` (60+ files). `runSelfTests()` in `src/utils.js` is a thin smoke shim that delegates to `src/smokeTests.js` (`SMOKE_INVARIANTS`); it can still be invoked from the browser console after the game loads.

## Architecture

This is a Phaser 3 + React game. React owns the page shell *and* the canonical game state; Phaser owns the game canvas and mirrors needed fields via a registry bridge.

**Entry flow:** `index.html` (single `<script type="module" src="/main.jsx">`; Vite bundles React, Phaser, Tailwind, etc.) → `main.jsx` (mounts a `RootErrorBoundary` around the app) → `prototype.jsx` (calls `useReducer(gameReducer, initialState)` and mounts the Phaser.Game instance) → `src/GameScene.js` (the single Phaser Scene that renders the board and forwards input).

**Multi-page build:** `vite.config.js` ships three independent Vite entries that share state only via `localStorage`:
- `/` — the game (`index.html` → `main.jsx` → `prototype.jsx`). Pulls in Phaser.
- `/b/` — the Dev Panel (`b/index.html` → `src/balanceEntry.jsx` → `src/balanceManager/`). Phaser-free bundle; can be deployed standalone.
- `/story/` — the Story Tree Editor (`story/index.html` → `src/storyEditorEntry.jsx` → `src/storyEditor/`). Authoring tool for story beats.

**Key files:**
- `src/state.js` — external store. Redux-style `coreReducer` + `rawReducer` + `initialState`, with 29 feature slices auto-composed. Defines `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES` (see below).
- `src/features/` — 29 feature directories, each with `index.jsx` + `slice.js`, auto-discovered by `src/ui.jsx` via `import.meta.glob`. This is the primary extension point for new game systems.
- `SAVE_SCHEMA_VERSION` (in `src/constants.js`) — bump whenever the persisted save shape changes. Forward migrations are intentionally **not** maintained: `src/state.js` discards saves whose `version` doesn't match, and the player starts fresh.
- `src/featureFlags.js` — feature toggles plus `isDialogsDisabled()` (see "Testing a specific UI").
- `src/router.js` — hash-based router; `KNOWN_VIEWS` / `KNOWN_MODALS` enumerate every deep-linkable surface. `parseHash`/`buildHash`/`useRouter` keep `state.view` and `state.modal` in sync with `location.hash`.
- `src/state/persistence.js` — save load/write throttled via rAF, flushed on `pagehide`/`beforeunload`. `clearSave()` wipes `localStorage["hearth.save.v1"]` (key from `STORAGE_KEYS.save` in `src/constants.js`).
- `src/visualTesting/` — `matrix.js` (named UI scenarios), `stateBuilders.js` (synthetic save states), `bridge.js` (installs `window.__hearthVisual` in dev/test). Used by the visual regression suite *and* available interactively (see below).
- `src/phaserBridge.js` — registry-based mirror that pushes reducer state into the Phaser scene.
- `src/GameScene.js` — Phaser scene: board rendering, drag input, animations, collapse pipeline. Reads from the bridge; dispatches actions back to the reducer. Board origin is computed dynamically each layout (`this.boardX = Math.round((vw - COLS * this.tileSize) / 2)`).
- `src/TileObj.js` — thin wrapper around a single board tile; sprite swap and pulse animation on selection.
- `src/textures.js` + `src/textures/categories/` — procedural texture generation (Canvas 2D). 16 category modules plus `iconRegistry.js` register textures into Phaser's cache at scene init. No external image assets.
- `src/constants.js` — board dims (`COLS = 6, ROWS = 6`), per-resource `UPGRADE_THRESHOLDS` (5–10 range), turn/season rules, three biomes (Farm, Mine, Fish/Harbor — fish tides and pearl capture live in `src/features/fish/slice.js`), zone `entryCost`, `DAILY_REWARDS`, season color schemes.
- `src/utils.js` — pure helpers: `upgradeCountForChain` (returns `floor(chainLength / threshold)`), color converters, `clamp`, and the `runSelfTests` smoke shim.
- `src/audio/` — WebAudio engine + `useAudio` hook.
- `src/a11y.js` — screen-reader announcements + keyboard navigation.
- `src/ui/` — HUD, Inventory, Modals, Tools, Tooltip, Town React components.
- `src/smokeTests.js` — `SMOKE_INVARIANTS` smoke set used by `runSelfTests()`.
- `tests/` + `src/__tests__/` — vitest suites (phase-* files at the top level, per-feature suites under `src/__tests__/`).

**Core game mechanic:** Player drags adjacent matching tiles into a chain. Minimum chain length is 3 by default; active bosses may raise it via `boss.minChain`. Chains credit **resource keys** through `state.resourceProgress` (fractional progress per `UPGRADE_THRESHOLDS`) and spawn board upgrade tiles via zone `upgradeMap`. The board collapses downward after each move. 10 turns per season, 4 seasons. Mine unlocks at level 2 (`canEnterBiome` in `src/state/biomeAccess.js`); expedition entry costs come from `ZONES[].entryCost`. Mysterious Ore (mine) opens a 5-turn countdown that grants a Rune if chained with ≥2 dirt before it expires.

**Texture pipeline:** All tile icons, season badges, and UI decorations are drawn once at scene init into Phaser's texture cache via `src/textures.js` and the modules in `src/textures/categories/`. When adding a new resource type, register its texture there and add its definition to `src/constants.js`. The `resource-add` skill walks through the full multi-file pipeline.

**Slice-primary actions:** `src/state.js` skips feature slice processing when `coreReducer` returns the same state reference. Two sibling sets handle this:
- `SLICE_PRIMARY_ACTIONS` — actions handled *only* by a feature slice (not by `coreReducer`). Must be listed here, otherwise dispatching them silently does nothing. Examples: `CARTO/TRAVEL`, `APP/HIRE`, `BOSS/TRIGGER`.
- `ALWAYS_RUN_SLICES` — actions where `coreReducer` runs but returns the same reference, yet a slice still needs to react. Currently `CRAFTING/CRAFT_RECIPE` and `USE_TOOL`.

When adding a new slice action, decide which set (if any) it belongs in. The `check-slice-action` skill validates registration.

## Tiles vs Resources (and the upgrade pipeline)

The game has three disjoint item kinds in `ITEMS` (`src/constants.js`), discriminated by the `kind` field:

| Kind | Lives on | Key prefix | Examples |
|---|---|---|---|
| `tile` | the board | `tile_*` | `tile_grass_hay`, `tile_mount_horse`, `tile_mine_stone` |
| `resource` | inventory | no prefix | `flour`, `bread`, `block`, `horseshoe`, `supplies` |
| `tool` | inventory (consumed on use) | no prefix | `axe`, `bomb`, `rake`, `shovel` |

**Invariant:** tiles never enter inventory; resources never appear on the board; the three key namespaces are disjoint. Anything that crosses these lines is a bug.

**Typing.** `src/types/items.js` declares the canonical `@typedef` discriminated union (`Item = TileItem | ResourceItem | ToolItem`) plus branded `TileKey` / `ResourceKey` / `ToolKey` string types. `src/types/guards.js` exports runtime predicates (`isTile`, `isResource`, `isTool`) and assertions (`assertTile`, `assertResource`, `assertTool` — throw in dev, warn-once in prod). `jsconfig.json` runs `checkJs:false` globally so files opt in to JSDoc checking with `// @ts-check` at the top; add the pragma to any file where you want VS Code + `tsc --noEmit` to verify your annotations.

**Canonical inventory.** The Dev Panel Wiki tab (`/b/` → Wiki) iterates each concept (Tiles, Resources, Tools, Recipes, Hazards, Workers, Buildings, NPCs, Zones, Abilities, Tool Powers, …) from the live source maps. If you add a new tile/resource/tool, it appears there automatically — no manual registration. If something looks miscategorised in the wiki, fix the underlying `kind` field, not the wiki.

**Tile / resource cleanup status (historical PR 3 / PR 4).** Earlier handoff notes called out a list of tile/resource conflations and an "upgrade pipeline split". Those have all landed:
- `BIOMES[*].resources` is filtered by `kind: "resource"` (via `isResourceItemEntry`), `BIOMES[*].tiles` by `kind: "tile"`.
- `CAPPED_RESOURCES` is split into `CAPPED_TILES` (62) + `CAPPED_INVENTORY_RESOURCES` (12) in `src/constants.ts`; the old combined symbol only survives in comments.
- `RECIPES` inputs and `BUILDINGS` costs contain no `tile_*` keys.
- `makeOrder` (`src/state/helpers.ts`) draws from `biome.resourceOrderPool`, not `biome.pool`.
- The fractional `resourceProgress` accumulator is wired at the `CHAIN_COLLECTED` site in `src/state.ts`; tile keys no longer enter `state.inventory` directly.
- Board-side upgrades are driven by `GameScene.nextUpgradeTile` reading `zone.upgradeMap`; `tile.next` only names "the resource this tile produces" and is consumed by `BIOMES[*].resourceOrderPool` + `features/achievements/slice.ts`.

**Do not introduce new tile/resource conflations** — recipe inputs, building costs, and bonuses should still be resource keys, not tile keys. Use `assertResource(key)` at any new write site that's supposed to receive a resource so regressions throw in dev.

## Catalog enums (ids vs attributes)

**Ids are fixed at compile time** in hand-maintained enums under `src/types/catalog/` (re-exported from `src/types/catalogKeys.ts`). `ITEMS`, `RECIPES`, `ZONES`, etc. supply **attributes** keyed by those ids.

| Layer | Defines membership | Defines attributes |
|-------|-------------------|-------------------|
| Enums + `ITEMS` / config maps in code | Yes | Defaults |
| `balance.json` / Dev Panel draft | No (unknown keys skipped) | Yes |
| Player save | No (`parseInventory` strips unknown) | Counts |

**New item:** enum member in `catalog/itemKeys.ts` + `ITEMS` row → restart dev server. No emit/codegen step. See `docs/engineering/catalog-enums.md` for the full Wiki/Dev Panel enum inventory.

**Dev Panel pickers** use `RESOURCE_KEYS` / `TILE_KEYS` from `catalogKeys.ts`, not free-text ids. `applyItemOverrides` / `applyRecipeOverrides` skip keys not in the live maps.

**Story & tuning:** `StoryBeatId`, `StoryFlagId`, `StoryFlagCategoryId`, `StoryTriggerType`, and `TuningKey` cover `STORY_BEATS` / `SIDE_BEATS`, `STORY_FLAGS` (+ categories), trigger vocabulary, and `sanitizeTuning` keys — see `docs/engineering/catalog-enums.md`.

**Feature flags:** compile-time toggles live in `src/featureFlags.ts` (`FIRE_HAZARD_ENABLED`, `RATS_HAZARD_ENABLED`) and their concept ids are enumerated by `FeatureFlagId` under `src/types/catalog/`. Runtime Dev Panel mirror uses `TuningKey.FireHazardEnabled` / `balance.json` `tuning.fireHazardEnabled`.

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
- Console: `localStorage.setItem("hearth.disableDialogs", "1")` to suppress (dialogs are on by default in dev/test). Set it to `"0"` to force them on.
- Test fixtures: `window.__HEARTH_DISABLE_DIALOGS__ = true` before first render (Playwright sets this via `page.addInitScript`).
- Default precedence: global override → localStorage flag → build-time default. Production builds (the GitHub Pages deploy, `import.meta.env.PROD`) default to suppressed; the Vite dev server, Vitest, and Playwright default to enabled.

**Resetting state.** The save lives at `localStorage["hearth.save.v1"]` (`STORAGE_KEYS.save`). `localStorage.removeItem("hearth.save.v1")` forces a fresh start; the reducer also discards saves whose `version` mismatches `SAVE_SCHEMA_VERSION`. Other keys: `hearth.settings`, `hearth.tutorial.seen`, `hearth.disableDialogs`.

When you fix a bug found in a specific scenario, add or extend an entry in `src/visualTesting/matrix.js` so the visual suite covers it on the next `npm run test:visual` run.

## Agent execution

- **Always use subagent-driven development for plan execution.** When executing an implementation plan, always invoke the `subagent-driven-development` skill (`.claude/skills/subagent-driven-development/SKILL.md`) — never execute tasks inline in the main session. This keeps the main chat's context small and focused.

- **Cursor agents (desktop and Cloud).** Load `AGENTS.md`, this file, and `.cursor/rules/cursor-superpowers.mdc` from the repo clone. Skills: `.claude/skills/<name>/SKILL.md` (also `.cursor/skills/`); use **Read** in Cursor, **Skill** tool in Claude Code. Cloud has no access to `~/.cursor/rules` — commit project rules and skills; do not rely on personal Cursor rules for this repo. Claude Code hooks in `.claude/settings.json` run in Claude Code only (including remote); they do not run in Cursor.

## Engineering rules

- **No fakes or mocks in production code.** Wire real implementations end-to-end. `vi.mock` and stub state shapes are fine *inside test files only* (under `tests/` or `src/__tests__/`). If you find yourself adding a fake hook, a fake worker, or a stub data row in `src/` to make something compile or "demonstrate" a mechanic, stop and wire the real thing instead — or surface it to the user before shipping.

## Document format

- **Author repo docs as self-contained HTML, not Markdown.** Design docs, specs, plans, and reports saved into the repo should be single-file `.html` with inline CSS (and a little JS where it helps). Leverage HTML's strengths — tables, SVG diagrams, color-coding, a table-of-contents/nav, collapsible `<details>`, and light interactivity (filters/tabs) — so a long spec stays navigable rather than a wall of text. Rationale: https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html
- **Plan-mode plans stay Markdown.** The Claude Code plan reviewer renders Markdown, not HTML, so the in-review plan file is `.md`. When a plan is saved/checked into the repo, **migrate it to a styled HTML file** (e.g. `docs/<name>.html`) — see `docs/progression-plan.html` for the house style.
- Like everything under `docs/`, these are allowed to drift from code; date/scope them and trust code over older docs.

## Workflow

- **Open pull requests ready for review** — do not leave PRs in draft. The maintainer reviews non-draft PRs only. When creating via GitHub MCP or `gh pr create`, pass non-draft / `draft: false`. If a tool creates a draft anyway, promote it immediately (`gh pr ready` or the host UI’s “Ready for review”).
- Always merge any PR you open once it has been pushed and the PR exists. Use a **merge commit** — do NOT squash. Keeping the branch's real commits and the merge commit makes each branch visibly fork off and rejoin `main` in the commit tree.
- **Run visual goldens before opening a PR whenever a change could affect UI** (any edit under `src/features/`, `src/ui/`, `src/textures/`, `src/GameScene.js`, or anything that renders). Run `npm run test:visual` and treat every diff it surfaces as something you must justify — each one must be intentional. If it is, refresh the goldens with `npm run test:visual:update` and commit them in the same PR. If it isn't, fix the regression before opening the PR. Pure non-UI changes (reducer logic with no rendering effect, build config, docs) may skip this step.
- When surfacing many decisions for review (audits, post-merge reconciles, batched approvals), prefer multiple parallel `AskUserQuestion` calls in a single turn over sequential ones. Each call caps at 4 questions; firing 2–4 in parallel renders as one card and lets the user answer everything at once. Always print the full detailed report as text first, then ask.

## Cursor Cloud specific instructions

This is a fully client-side app — no backend, no database, no Docker required. The Vite dev server is the only service to run.

- **Dev server**: `npm run dev` serves all three entries at `http://localhost:5173/puzzleDrag2/` (game), `/puzzleDrag2/b/` (Dev Panel), `/puzzleDrag2/story/` (Story Editor). The `base` path is `/puzzleDrag2/` (set in `vite.config.js`).
- **Commands**: See the `## Commands` section above for lint/typecheck/test/build/visual commands.
- **Playwright**: Chromium must be installed via `npx playwright install chromium` before running e2e or visual tests. The Playwright configs auto-start the dev server via `webServer`, so you don't need a separate running dev server for `npm run test:e2e` or `npm run test:visual`.
- **State reset**: Clear `localStorage["hearth.save.v1"]` to start fresh. Also `hearth.settings`, `hearth.tutorial.seen`, `hearth.disableDialogs`.
- **Visual testing in CI**: Visual regression snapshots are platform-sensitive. If goldens were captured on a different OS, expect diffs. Use `npm run test:visual:update` to refresh.

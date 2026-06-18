# New Game System — "Fiber Crush" (Wool-Crush-inspired match mode)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Add a **second, distinct puzzle verb** to puzzleDrag2: a level-based **adjacent-swap match-3** mode called **Fiber Crush**, themed to a new **Hearthwood fiber economy** (sheep → wool → yarn → dye → weave). The main game's core verb is a free-form **8-direction drag-chain** (`src/game/chain.ts` `hasValidChain`, `src/TileObj.ts` `startPath`/`tryAddToPath`). Fiber Crush deliberately uses a *different* verb — **swap two adjacent tiles to make 3+-in-a-row/column** — so it feels like a separate game, not a re-skin.

Why it matters: it is an **alternate production minigame**, not a detached score-chaser. Clearing matches yields textile resources (wool/yarn/dye/cloth) that feed the *existing* settlement economy — buildings (`BUILDINGS`), NPC orders (`TURN_IN_ORDER`), and the market (`MARKET/SELL`). It gives the player a second cadence (tight, hand-authored objective levels vs the open turn-budget farm/mine/fish runs) while reusing the economy, progression, and persistence the codebase already has. It also exercises the architecture's seams (router view, feature slice, a Phaser scene) as a clean, self-contained vertical slice.

## Background & current state (VERIFIED)

I opened the real files. Several seed-brief assumptions were wrong; corrections are flagged inline. **SHIPPED** = exists today; **PROPOSED** = this brief adds it.

### Doc-drift corrections (important)

- **The seed brief / CLAUDE.md say `.js`/`.jsx`; the real files are `.ts`/`.tsx`.** Confirmed: `src/router.js` does **not** exist — it is **`src/router.ts`**. `src/game/chain.ts`, `src/state.ts`, `src/GameScene.ts`, `src/TileObj.ts`, every `src/features/*/slice.ts` and `index.tsx` are TypeScript. Trust the code. Every path below is the real one.
- **The "fiber economy (wool/yarn/dye)" does NOT exist yet.** I grepped `src/constants.ts` for `wool|yarn|dye|weave|fiber|cloth|fleece|loom|spindle` (case-insensitive): the *only* hits are `tile_herd_sheep` and a `golden_sheep` tool. **There is no wool, yarn, dye, or cloth resource in the catalog today.** `tile_herd_sheep` currently produces `meat` (`src/constants.ts:452` — `next: "meat"`; `UPGRADE_THRESHOLDS.tile_herd_sheep = 5` at `:234`). So "theme it to the existing fiber economy" is really **"create the fiber economy"** — this brief defines those resources from scratch (see Implementation plan §1).

### The board engine today (SHIPPED — chain/drag, not swap)

- `src/game/chain.ts` — `hasValidChain(grid)` does a flood-fill (`DIRS` includes all 8 directions including diagonals) and returns true if any same-`res.key` connected component is ≥ 3. This is the **chain** validity check, *not* a row/column line-match. There is **no swap resolver** in the codebase.
- `src/TileObj.ts` — each tile wires `pointerdown → scene.startPath(this)` and `pointerover → scene.tryAddToPath(this)` (`:86-87`). The whole input model is **drag a path across adjacent same-tiles**. There is no "select tile A, tap adjacent tile B, swap" interaction.
- `src/GameScene.ts` (2319 lines, `export class GameScene extends Phaser.Scene` at `:95`) owns the canvas: fill board, path UI (`PATH_COLORS_VALID`/`_INVALID` at `:83-84`), collapse/refill, tool powers, hazards, seasonal art. It is **biome-parameterized** (`farm`/`mine`/`fish` via the registry `biomeKey`) but it is fundamentally a chain engine. `BIOME_GOLD_TILE` (`:68`) and the zone drop pools confirm it is tightly coupled to the run/biome/zone model.
- The board collects via the reducer action **`CHAIN_COLLECTED`** (`src/state.ts:238`), which credits resources through `resourceProgress` + `TILES_PER_RESOURCE` (income divisor, `src/constants.ts:255`) and consumes a turn via `boardTurnPatch` (`src/state.ts:147`).

**Conclusion (recommendation in Scope/Plan): FORK, do not reuse.** Swap-match and drag-chain are different enough at the input + resolver layer that bending `GameScene`/`TileObj` to do both would add conditionals to a 2300-line file with zero unit coverage (the canvas layer has **no** vitest tests — only e2e/visual touch it). A small new `FiberScene` + a pure, unit-tested resolver module is cleaner and safer. We **reuse** the texture/atlas helpers (`src/textures.ts`), the registry bridge pattern (`src/types/phaserRegistry.ts`, `src/phaserBridge.ts`), and the economy (inventory/orders/market) — just not the chain input/resolver.

### Phaser mounting (SHIPPED — single scene per game)

- `prototype.tsx:148` constructs **one** `new Phaser.Game({ ..., scene: GameScene, ... })` (`:154`). On scene-ready it sets `window.__phaserScene = scene` and `setPhaserScene(scene)` (`:215-216`); torn down to `null` on unmount (`:258-259`). There is exactly **one** Phaser scene in the app today (the season strip mentioned in memory is a separate, dormant effort, not wired into this game instance).
- The registry bridge is `src/types/phaserRegistry.ts` (`getRegistry`/`setRegistry`, typed keys) + `src/phaserBridge.ts` (`getPhaserScene`/`setPhaserScene`). React → canvas is via registry writes; canvas → React is via `dispatch` of reducer actions. **Fiber Crush must follow this exact pattern** — no direct React↔Phaser coupling.
- **Implication for the fork:** Phaser supports multiple scenes in one game. Cleanest option is to **register `FiberScene` as a second scene on the same `Phaser.Game`** and `start`/`stop` it when the Fiber view mounts/unmounts, OR mount a separate `<FiberCanvas>` React component that creates its own `Phaser.Game` only while the Fiber view is active (mirrors how the board canvas mounts). The brief recommends the **separate-canvas-component** approach (simplest isolation; the main board game keeps `window.__phaserScene`, and Fiber exposes `window.__fiberScene`).

### The reducer + the SLICE FOOTGUN (SHIPPED — verified exact)

- `src/state.ts` — one big reducer. `coreReducer` (`:225`) handles known actions; then `rawReducer` (`:1653`) runs every feature slice via `slices.reduce(...)` (`:1668`). The `slices` array is declared at `src/state.ts:64`.
- **THE FOOTGUN (verified):** a slice only runs for an action if **either** `coreReducer` already changed state for it, **or** the action type is in `SLICE_PRIMARY_ACTIONS` (`src/state.ts:1590-1634`), **or** `shouldAlwaysRunSlices` returns true (`ALWAYS_RUN_SLICES` at `:1639-1642`). `rawReducer:1664-1667`:
  ```ts
  const needSlices = afterCore !== state
    || SLICE_PRIMARY_ACTIONS.has(action.type)
    || shouldAlwaysRunSlices(state, action);
  if (!needSlices) return state;   // ← slices NEVER see the action otherwise
  ```
  So **any new Fiber action that `coreReducer` does not handle MUST be added to `SLICE_PRIMARY_ACTIONS`**, or the Fiber slice silently no-ops. Use the **`check-slice-action`** skill to validate. (Existing namespaced examples in the set: `WORKERS/HIRE`, `MARKET/SELL`, `BOON/PURCHASE`, `RUN_SUMMARY/OPEN`.)

### Persistence (SHIPPED — destructive version gate)

- `src/constants.ts:207` — `export const SAVE_SCHEMA_VERSION = 45;` (**not 44** — the brief's older notes drifted; current is **45**).
- `src/state/persistence.ts` — `loadSavedState()` (`:15-32`) discards + `localStorage.removeItem` any save whose `version !== SAVE_SCHEMA_VERSION` (`:23-29`). `persistStateNow` (`:34-45`) writes the whole `GameState` minus `VOLATILE` (`modal, bubble, view, viewParams, pendingView, craftingTab` — `:6`). **There is a second gate**: `src/state/init.ts` re-checks `raw.version === SAVE_SCHEMA_VERSION` before merging (per doc 08). **Any persisted Fiber progress = a SAVE_SCHEMA bump = wipes every save today** unless doc 08's migration ladder has landed. This brief **depends on doc 08** (`docs/projects/08-save-migration-ladder.md`) for non-destructive shipping.

### Router (SHIPPED — verified exact)

- `src/router.ts` — `KNOWN_VIEWS` (`:34-38`) = `{ "town", "board", ...FEATURE_VIEW_KEYS }`. `FEATURE_VIEW_KEYS` is auto-collected from every `src/features/*/index.{jsx,tsx}` that exports a **`viewKey`** string (`:28-31`, via `import.meta.glob`). So **adding a router view = exporting `export const viewKey = "fiber";` from `src/features/fiber/index.tsx`** — no edit to `router.ts` is required for the view to be routable. (Confirmed pattern: `src/features/inventory/index.tsx:10` `export const viewKey = "inventory";`.)
- `KNOWN_MODALS` (`:42-48`) = `{ menu, boss, tutorial, debug, festivals }`. If Fiber needs a deep-linkable level-select or win/lose modal, add it here. Gameplay-gated modals (`season`, `leaveBoard`, `runSummary`) are intentionally **excluded** from deep links — a Fiber level-complete modal should follow that convention (gated, not deep-linked).
- `VIEWS_WITH_TAB` (`:63-68`) lets a view take one `tab` URL segment. If Fiber wants `#/fiber/<levelId>`, add a small parse branch like the `cartography`/`tileCollection` ones (`:112-120`, `:139-148`).

### The economy hooks Fiber rewards plug into (SHIPPED)

- **Inventory:** zone-scoped. `src/state/zoneInventory.ts` (`zoneInventory`, `inventoryZone`), `src/types/inventory.ts` (`inventoryPut`, `inventoryQty`). Resources roll into `state.inventory[zone]` with cap handling via `addCappedResourceMut` (`src/state.ts`).
- **Orders:** `TURN_IN_ORDER` (`src/state.ts:524`) pays coins + XP for delivering `o.key × o.need` from zone inventory. Fiber outputs (wool/yarn/cloth) become valid order keys automatically once they're real resources.
- **Market:** `MARKET/SELL` (in `SLICE_PRIMARY_ACTIONS`, owned by `src/features/market/slice.ts`); pricing in `src/features/market/pricing.ts` (`sellPriceFor`). New resources need a `value` so they're sellable.
- **Buildings:** `BUILDINGS` (`src/constants.ts`) recipes can consume cloth/yarn for a textile building (e.g. a Weaver's Cottage), giving Fiber output a sink.

## Scope

**In scope:**
- A new **fiber resource chain** in `src/constants.ts`: `wool` → `yarn` → `dye` (color variants) → `cloth` (the woven good), with `value`s and order/market wiring.
- A new **router view** `fiber` via `src/features/fiber/index.tsx` (`export const viewKey = "fiber"`), with a level-select panel and the canvas host.
- A **pure, unit-tested swap/match resolver** at `src/game/fiber/resolver.ts` (no Phaser) — the heart of the new verb. This is the testable core.
- A **forked Phaser scene** `src/game/fiber/FiberScene.ts` + `FiberTile` that does adjacent-swap input and drives matches through the resolver, mounted via a `FiberCanvas` React component (separate `Phaser.Game`, `window.__fiberScene`).
- A **feature slice + reducer** `src/features/fiber/slice.ts` registered in `src/state.ts` (`slices` array + every new action type in `SLICE_PRIMARY_ACTIONS`).
- **Persisted progress** (`state.fiber = { unlockedLevel, stars: {levelId: n}, ... }`) → **SAVE_SCHEMA bump (45 → 46)** + a migrator on doc 08's ladder.
- A **level/objective model** (hand-authored levels: "collect N wool", "produce N dye of color X", "weave the pattern" goals) with a **move-limit fail model**.
- **Special/booster tiles**: spindle (clear line), loom (clear shape/area), dye-vat (convert a color).
- **Economy hooks** with example tuning numbers (below) so Fiber output feeds the settlement without unbalancing the main loop.
- Tests: resolver unit tests; an e2e for one playable level; in-game `window.__fiberScene` verify.

**Out of scope / non-goals (keep it tight):**
- Touching `GameScene.ts` / `TileObj.ts` / `chain.ts` — Fiber is a fork, not an edit to the chain engine.
- Endless/score-attack mode, leaderboards, daily challenges — levels only, finite.
- Animated seasonal art for fiber tiles (use flat-colored placeholder tiles via `src/textures.ts`; real PixelLab art is a later pass via the `seasonal-tile-pipeline` skill).
- Multi-zone Fiber, Fiber on the world map / cartography, or gating Fiber behind a settlement tier (Fiber unlocks at a fixed level for v1).
- Monetization, boosters-as-purchases, lives/energy timers (Wool Crush has no timers; we keep that — see References).
- Rebalancing the *existing* economy. Fiber adds a new faucet; example numbers below are deliberately conservative.

## Implementation plan

Ordered. Names exact files/functions. Flags the footgun + schema bump where they bite.

### 1. Define the fiber resource chain — `src/constants.ts`

There is no fiber economy today, so create it. Add board tiles + their produced resources + income divisors + sellable values. Follow the existing tile schema (compare `tile_herd_sheep` at `:452`). Use the **`resource-add` skill** — it enforces every schema slot so you don't ship a `+undefined◉` bug.

- New **board tiles** (the match tiles, one per fiber "color"): `tile_fiber_wool_white`, `tile_fiber_wool_grey`, `tile_fiber_wool_brown`, `tile_fiber_wool_black`, `tile_fiber_wool_cream` — 5 colors is the standard match-3 count. (Swap-match wants a fixed, small color set; do **not** reuse the farm's huge tile pool.)
- New **resources** (inventory goods, never on the swap board): `wool`, `yarn`, `dye`, `cloth`.
- Add to `UPGRADE_THRESHOLDS` / `TILES_PER_RESOURCE` only if these tiles ever appear on the *chain* board — for Fiber they don't, so production is computed by the **resolver**, not the chain income path. Keep Fiber tiles **out** of the farm/mine/fish spawn pools.
- Add `value` to each resource so `sellPriceFor` (`src/features/market/pricing.ts`) and `TURN_IN_ORDER` work. Example: `wool: 2`, `yarn: 6`, `dye: 5`, `cloth: 18`.
- Optionally add a **Weaver's Cottage** to `BUILDINGS` whose recipe consumes `cloth`/`yarn` (a sink), and let NPC orders request `wool`/`cloth`.

Run **`graphify update .`** after editing constants.

### 2. The pure resolver — `src/game/fiber/resolver.ts` (NO Phaser)

This is the testable core and the *new verb*. Pure functions over a `FiberCell[][]` grid.

```ts
// src/game/fiber/resolver.ts
export type FiberColor = "white" | "grey" | "brown" | "black" | "cream";
export interface FiberCell { color: FiberColor; special?: "spindle" | "loom" | "dyevat" | null; }
export type FiberGrid = (FiberCell | null)[][];

/** True iff swapping (r1,c1)<->(r2,c2) (must be orthogonally adjacent) creates ≥1 line of 3+. */
export function isValidSwap(grid: FiberGrid, r1: number, c1: number, r2: number, c2: number): boolean;

/** All horizontal+vertical runs of ≥3 same-color cells. Returns sets of [r,c]. */
export function findMatches(grid: FiberGrid): Array<{ cells: [number, number][]; length: number }>;

/** Apply a swap, then resolve cascades: clear matches → apply special-tile effects →
 *  gravity collapse → refill from `nextColor()` → repeat until stable.
 *  Returns the final grid + a tally of cleared colors (for economy credit) +
 *  whether any special tiles were created (length-4 → spindle, length-5/T/L → loom). */
export function resolveSwap(
  grid: FiberGrid, swap: {r1:number;c1:number;r2:number;c2:number},
  nextColor: () => FiberColor,
): { grid: FiberGrid; cleared: Record<FiberColor, number>; movesSpent: 1; createdSpecials: number };

/** Special-tile effects, pure: spindle clears its row+col, loom clears a 3×3, dyevat converts
 *  all of one color to another. Called inside resolveSwap when a special is part of a match. */
```

Design notes baked in:
- **The verb = adjacent swap that must create a match.** `isValidSwap` rejects swaps that don't form a line (standard Bejeweled/Wool-Crush rule). This is what makes it *feel different* from the main game's free 8-dir chain.
- **Matches are lines (row/col), not flood-fill blobs.** That's the deliberate departure from `chain.ts`'s 8-dir DFS.
- **Cascades** resolve to a fixed point (gravity + refill), each `resolveSwap` = exactly **1 move spent**.
- `nextColor` is injected so tests are deterministic (no `Math.random` inside the resolver).
- **Special-tile creation** from match length is encoded here (4 → spindle, 5/T/L → loom), so it's all unit-testable.

### 3. Level + objective model — `src/game/fiber/levels.ts`

Hand-authored, finite levels. Pure data + a small evaluator.

```ts
export interface FiberObjective { type: "collect" | "dye_color" | "weave"; target: string; count: number; }
export interface FiberLevel {
  id: string; cols: number; rows: number; colors: FiberColor[];
  moves: number;                 // move-limit fail model
  objectives: FiberObjective[];  // ALL must be met before moves run out
  reward: { coins: number; resources: Record<string, number> }; // economy hook
  spawnSpecials?: boolean;
}
export const FIBER_LEVELS: FiberLevel[];
/** Pure: given accumulated `cleared` + objectives, is the level won/lost yet? */
export function evaluateLevel(level: FiberLevel, progress, movesUsed): "playing" | "won" | "lost";
```

Example level set (3 starter levels; conservative rewards — see Economy hooks):
- **L1 "First Fleece"** — 7×7, 5 colors, 20 moves, objective `collect wool ×40`, reward `120 coins + { wool: 20 }`.
- **L2 "The Dye-Vat"** — 8×8, 5 colors, 18 moves, objectives `collect wool ×60` + `dye_color brown ×15`, reward `200 coins + { yarn: 10, dye: 6 }`.
- **L3 "Weave the Pattern"** — 8×8, 5 colors, 16 moves, objective `weave cloth ×3` (match special loom tiles to weave), reward `350 coins + { cloth: 4 }`.

### 4. Feature slice + reducer — `src/features/fiber/slice.ts` (+ `data.ts`)

Model on `src/features/decorations/slice.ts` (smallest clean example). Owns Fiber-only state under `state.fiber`.

Actions (all namespaced `FIBER/*`):
- `FIBER/START_LEVEL` (`{ levelId }`) — set `state.fiber.active = { levelId, movesLeft, progress, status }`.
- `FIBER/RESOLVE_MOVE` (`{ cleared, movesSpent }`) — dispatched by `FiberScene` after `resolveSwap`; accumulate `progress`, decrement `movesLeft`, run `evaluateLevel`, set `status`.
- `FIBER/COMPLETE_LEVEL` (`{ levelId, won, stars }`) — on win: credit `reward.coins` to `state.coins` + `reward.resources` into `zoneInventory` (use `inventoryPut` + cap via `addCappedResourceMut`), bump `state.fiber.unlockedLevel`, store `stars`. **This is the economy hook** — it lands rewards on the same inventory/coins the rest of the game uses.
- `FIBER/EXIT` — clear `state.fiber.active`, return to town.

**SLICE FOOTGUN — DO THIS or it silently no-ops:**
1. Add the slice to the `slices` array at `src/state.ts:64`:
   ```ts
   import * as fiber from "./features/fiber/slice.js";
   const slices = [crafting, quests, /* ... */ runSummary, fiber];
   ```
2. Add **every** `FIBER/*` action type to `SLICE_PRIMARY_ACTIONS` (`src/state.ts:1590`):
   ```ts
   "FIBER/START_LEVEL", "FIBER/RESOLVE_MOVE", "FIBER/COMPLETE_LEVEL", "FIBER/EXIT",
   ```
   (None of these are handled by `coreReducer`, so without this they never reach the slice.) Validate with the **`check-slice-action`** skill.
3. Type the actions in `src/types/state.ts` (`Action` union) so `npm run typecheck` passes.

### 5. Router view — `src/features/fiber/index.tsx`

```tsx
export const viewKey = "fiber";   // auto-registers in KNOWN_VIEWS (router.ts:28-38) — NO router.ts edit
export default function FiberView({ state, dispatch }) {
  // level-select grid (locked past state.fiber.unlockedLevel) + <FiberCanvas> host when a level is active
}
```
- Optional deep-link `#/fiber/<levelId>`: add `"fiber"` to `VIEWS_WITH_TAB` (`router.ts:63`) **and** a parse/build branch (`:112-120`, `:139-148`). For v1, **skip** deep-linking the active level (treat it like the gameplay-gated board) and only route to the level-select; this keeps the router change to zero.
- Add a town entry point (a "Weaver's Loft" tile/button in the town nav) that dispatches `SET_VIEW` `{ view: "fiber" }`.

### 6. Forked Phaser scene — `src/game/fiber/FiberScene.ts` + `FiberTile.ts` + `FiberCanvas.tsx`

- `FiberScene extends Phaser.Scene` — renders the grid, handles **tap-A-then-tap-adjacent-B (or short drag-to-neighbor) swap** input, calls `resolveSwap`, animates clears/collapse, then dispatches `FIBER/RESOLVE_MOVE` and (on terminal status) `FIBER/COMPLETE_LEVEL` back through the registry/bridge.
- **Reuse** `src/textures.ts` helpers (`rounded`, `canvasTexture`) for flat-color placeholder fiber tiles; **reuse** the registry pattern (`src/types/phaserRegistry.ts` — add `fiberLevel`/`fiberGrid` keys, or use a Fiber-local registry).
- `FiberCanvas.tsx` mounts a **separate `Phaser.Game`** with `scene: FiberScene` only while the Fiber view is active (mirror `prototype.tsx:141-216`); on ready set `window.__fiberScene = scene` (and a `setFiberScene` in a new `src/game/fiber/fiberBridge.ts` mirroring `phaserBridge.ts`). Tear down to `null` on unmount.
- **Do not** touch `window.__phaserScene` — that stays the main board.

### 7. Persistence — SAVE_SCHEMA bump + migrator (depends on doc 08)

- Add `fiber` to the persisted shape (it's a top-level `GameState` field, so `persistStateNow` saves it automatically — it's not in `VOLATILE`). Provide a default in `createFreshState`/`initialState` (`src/state/init.ts`) and merge handling in `mergeLoadedState` (`src/state/helpers.ts`).
- **Bump `SAVE_SCHEMA_VERSION` 45 → 46** (`src/constants.ts:207`).
- **Add a `45 → 46` migrator** on doc 08's ladder (`src/state/saveMigrations.ts`, `MIGRATIONS[45]`) that adds the default `fiber` slice to old saves and sets `version: 46`. **If doc 08 has NOT landed yet, this bump WIPES every save** — call that out in the PR and either land doc 08 first or accept the wipe explicitly. Add a fixture under `src/__tests__/fixtures/saves/` per doc 08.

Run **`graphify update .`** after the code lands.

## Success criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass.
- [ ] `src/game/fiber/resolver.ts` exists, is **Phaser-free** (no `import "phaser"`), and `isValidSwap`/`findMatches`/`resolveSwap` are exercised by unit tests (see Validation).
- [ ] Navigating to `#/fiber` shows the Fiber level-select (verify `KNOWN_VIEWS.has("fiber")` is true at runtime — it should be, via the `viewKey` export).
- [ ] Starting L1 and completing its objective within the move limit dispatches `FIBER/COMPLETE_LEVEL` and **credits coins + resources to the real economy**: after a win, `state.coins` increased by `reward.coins` and `zoneInventory(state)` gained `reward.resources` (e.g. `wool +20`).
- [ ] Running out of moves before objectives are met sets `state.fiber.active.status === "lost"` and credits **nothing**.
- [ ] `FIBER/*` actions actually mutate state (proves the footgun is handled): dispatching `FIBER/START_LEVEL` from `window.__hearthVisual.dispatch` changes `state.fiber.active` (not a silent no-op).
- [ ] The fiber resources (`wool`/`yarn`/`dye`/`cloth`) are sellable in the market and acceptable as order keys (have `value` set; no `+undefined◉`).
- [ ] `SAVE_SCHEMA_VERSION` is 46 and a `45 → 46` migrator + fixture upgrade an old save without data loss (doc 08).
- [ ] The main board (`window.__phaserScene`) is untouched: a farm/mine/fish run still plays identically (no regression in `chain.ts`/`GameScene.ts`/`TileObj.ts`).
- [ ] One e2e test plays a full Fiber level to a win.

## Validation — how to verify

**Commands (gating):**
```bash
npm run typecheck     # Action union + slice types must compile
npm run lint
npm test              # unit tests below MUST pass — this is the gating coverage
npm run build
```
**Informational / non-gating** (per house rules: e2e + visual are not in CI, visual goldens are not regenerable on the Windows dev host):
```bash
npm run test:e2e      # the new Fiber e2e (informational here; gates on canonical host)
npm run test:visual   # only if Fiber adds visual goldens; re-baseline on canonical host only
```

**New unit tests — `src/game/fiber/__tests__/resolver.test.ts`** (node env, no canvas — this is where the verb gets proven):
- `isValidSwap` returns **true** for a swap that forms a 3-in-a-row, **false** for a swap that forms nothing, **false** for non-adjacent or diagonal swaps.
- `findMatches` finds horizontal runs, vertical runs, both at once (an L/T), and respects length (no match for 2).
- `resolveSwap` with a **fixed `nextColor`** (deterministic): clears the matched line, collapses with gravity, refills, and cascades a chained match into a second clear; `cleared` tally equals the number of cells removed per color; `movesSpent === 1`.
- Match-length → special creation: a 4-line yields one `spindle`, a 5-line/T/L yields one `loom`.
- Special effects: a `spindle` in a match clears its full row+col; `dyevat` converts a color; `loom` clears a 3×3 — each as a pure assertion on the returned grid.
- `evaluateLevel` (`levels.ts`): `"won"` only when all objectives met, `"lost"` when `movesUsed >= level.moves` with unmet objectives, `"playing"` otherwise.

**New slice tests — `src/features/fiber/__tests__/slice.test.ts`** (via `rootReducer` from `src/state.ts`):
- Dispatch `FIBER/START_LEVEL` through `rootReducer` and assert `state.fiber.active` is set — **this test fails loudly if the action isn't in `SLICE_PRIMARY_ACTIONS`** (the footgun guard).
- `FIBER/COMPLETE_LEVEL` with `won:true` increases `state.coins` by `reward.coins` and `zoneInventory` by `reward.resources`; with `won:false`, state is unchanged (referential no-op).

**New e2e — `tests/e2e/fiber-level.spec.ts`** (Playwright): navigate to `#/fiber`, start L1, drive swaps to satisfy the objective within the move limit, assert the win modal / `state.fiber.unlockedLevel` advanced.

**Manual in-game check (canvas — `preview_screenshot` HANGS on this host; assert via DOM + the bridge):**
- Spin a worktree Vite on a spare port with base `/puzzleDrag2/` (`node ../../../node_modules/vite/bin/vite.js`), open the game.
- `window.__hearthVisual.dispatch({ type: "SET_VIEW", view: "fiber" })` → assert the Fiber DOM panel renders (`getComputedStyle` / `document.querySelector`).
- `window.__hearthVisual.dispatch({ type: "FIBER/START_LEVEL", levelId: "L1" })` → `window.__hearthVisual.state().fiber.active.levelId === "L1"`.
- Inspect the Fiber canvas via `window.__fiberScene` (the new handle) the way the board uses `window.__phaserScene` — confirm the grid is built and swaps animate.

## Double-check / adversarial review

- **"Did I really wire the slice?"** Dispatch a `FIBER/*` action via `window.__hearthVisual.dispatch` and confirm state changed. If nothing happens, the action is missing from `SLICE_PRIMARY_ACTIONS` (`src/state.ts:1590`) **or** the slice isn't in the `slices` array (`:64`). Run the **`check-slice-action`** skill — it exists specifically for this.
- **"Did the reward actually land in the real economy?"** A skeptic will suspect Fiber keeps a private currency. Prove it: after a win, the **same** `state.coins` and the **same** `state.inventory[zone]` the rest of the game reads have increased, and the new resource is immediately spendable in `MARKET/SELL` / `TURN_IN_ORDER`. Add an assertion that sells the won `cloth` for coins right after winning.
- **Resolver edge cases:** empty grid; a swap at the border (no neighbor); a board with **no valid swaps** (must be detectable so the scene can reshuffle, not deadlock); cascades that never terminate (the fixed-point loop must bound itself — assert it halts); a refill that itself immediately matches (chain credit must count). All covered by unit tests, not just eyeballed on canvas (the canvas has no unit coverage).
- **Determinism:** the resolver must take `nextColor` as a parameter (no internal `Math.random`) so tests are reproducible; the *scene* supplies the RNG. Verify no `Math.random` in `resolver.ts`.
- **Main-game regression:** confirm `chain.ts`/`GameScene.ts`/`TileObj.ts` are byte-unchanged (the fork promise). Play a farm run; `CHAIN_COLLECTED` still credits via `TILES_PER_RESOURCE`. `window.__phaserScene` still points at the board scene.
- **Balance sanity:** Fiber is a new faucet. With the example numbers, L1–L3 total ≈ 670 coins + a handful of textile goods — comparable to a couple of farm seasons (`SEASON_END_BONUS_COINS` baseline). Levels are **one-time** rewards (gated by `unlockedLevel`), so they can't be farmed for infinite coins. Confirm `FIBER/COMPLETE_LEVEL` is idempotent per level (re-completing an already-cleared level grants stars only, not coins again).
- **Rollback safety:** Fiber is additive and isolated (own files, own scene, own slice, own view). Reverting the PR removes it cleanly. The only cross-cutting edits are: the `slices` array + `SLICE_PRIMARY_ACTIONS` additions (`src/state.ts`), the resource definitions (`src/constants.ts`), and the schema bump + migrator. The schema bump is the only one with a save-data blast radius — gate it behind doc 08.

## Risks & gotchas

- **The fiber economy doesn't exist** — you are *building* it, not theming an existing one (seed brief was wrong). Use the **`resource-add`** skill so no schema slot is missed (`+undefined◉` is a known class of bug here).
- **SLICE FOOTGUN** (the #1 way this silently breaks): new `FIBER/*` actions **must** be in `SLICE_PRIMARY_ACTIONS` *and* the slice in the `slices` array. `coreReducer` won't handle them, so without registration the reducer returns the same state and the slice never runs (`src/state.ts:1664-1667`).
- **SAVE_SCHEMA bump wipes saves** with no migration today (`persistence.ts:23-29` + the second gate in `init.ts`). **Depend on doc 08** (`docs/projects/08-save-migration-ladder.md`); ship the migrator, not just the bump. Current version is **45** (not 44).
- **Two Phaser games at once:** if you mount `FiberCanvas` as a second `Phaser.Game`, ensure it's destroyed on unmount (mirror `prototype.tsx:258-259`) or you leak WebGL contexts. Keep `window.__phaserScene` for the board and use a distinct `window.__fiberScene` for Fiber — don't clobber the board handle (the visual-testing bridge and e2e rely on `__phaserScene`).
- **Don't pollute the farm/mine/fish spawn pools** with fiber tiles. The chain board pulls from zone/season drop pools (`src/features/zones/data.js`, `GameScene.ts` fill logic). Fiber tiles live only in `FiberScene`'s own pool.
- **Canvas has zero unit coverage** — put all logic in `resolver.ts`/`levels.ts`/`slice.ts` (vitest-tested), keep `FiberScene` a thin renderer. The match verb's correctness must be provable without the canvas.
- **`preview_screenshot` hangs on this host** and the `:5173` server serves `main`, not the worktree. Verify via DOM + `getComputedStyle` + the bridge handles; spin a worktree Vite on a spare port (`node ../../../node_modules/vite/bin/vite.js`, base `/puzzleDrag2/`).
- **Genre fidelity vs differentiation:** real "Wool Crush" is more a deterministic color-**sort** puzzle (sort wool by color into slots, car-jam-style ordering, no timers) than a Bejeweled swap (see References). We deliberately take the *swap-match* lane (clearly distinct from our drag-chain) and the *no-timer, level-objective, no-pressure* design philosophy from Wool Crush, while changing the core mechanic to adjacent-swap line matching. State this "keep vs change" explicitly in the PR so reviewers don't expect a sort puzzle.
- **Visual goldens** are not regenerable on the Windows dev host and e2e/visual aren't in CI — treat them as informational; re-baseline on the canonical host only.

## References

- **This codebase (open first):**
  - `src/router.ts` — `KNOWN_VIEWS` (`:34-38`), the `viewKey` auto-registration (`:28-31`), `VIEWS_WITH_TAB` (`:63-68`).
  - `src/game/chain.ts` — `hasValidChain` (the *existing* 8-dir chain verb you are NOT reusing).
  - `src/GameScene.ts` (`class GameScene` `:95`) + `src/TileObj.ts` (`startPath`/`tryAddToPath` input `:86-87`) — the board engine you fork from.
  - `src/state.ts` — `coreReducer` (`:225`), `CHAIN_COLLECTED` (`:238`), `TURN_IN_ORDER` (`:524`), the `slices` array (`:64`), `SLICE_PRIMARY_ACTIONS` (`:1590-1634`), `ALWAYS_RUN_SLICES` (`:1639`), `rawReducer` (`:1653-1671`).
  - `src/features/decorations/slice.ts` — smallest clean slice template; `src/features/inventory/index.tsx:10` — `viewKey` export template.
  - `src/constants.ts` — `tile_herd_sheep` (`:452`), `UPGRADE_THRESHOLDS`/`TILES_PER_RESOURCE` (`:209-255`), `SAVE_SCHEMA_VERSION = 45` (`:207`), `BUILDINGS`.
  - `src/state/persistence.ts` (version gate `:23-29`), `src/state/init.ts` (second gate), `src/state/helpers.ts` (`mergeLoadedState`), `src/state/zoneInventory.ts`, `src/types/inventory.ts` (`inventoryPut`/`inventoryQty`).
  - `prototype.tsx:141-216` — how the single Phaser game mounts + sets `window.__phaserScene`; `src/phaserBridge.ts`, `src/types/phaserRegistry.ts` — the React↔canvas bridge to mirror.
  - `src/features/market/slice.ts` + `pricing.ts` (`sellPriceFor`) — the market sink.
- **Other project docs:** `docs/projects/08-save-migration-ladder.md` (**hard dependency** for the schema bump), `docs/projects/11-gamescene-decomposition.md` (context on the board engine's size), `docs/projects/13-economy-unify-price-model.md` (so Fiber resource `value`s slot into the unified price model), `docs/projects/14-port-zones-atlas.md` (zone/economy context).
- **.claude/skills:** `check-slice-action` (validate `FIBER/*` registration), `resource-add` (add fiber resources without a missing slot), `phaser-scene-debug` (React↔registry↔scene debugging for `FiberScene`), `test-driven-development` (write the resolver tests first), `seasonal-tile-pipeline` (later, for real fiber tile art).
- **Genre research (cite in PR):** Wool Crush is a no-timer, level-based casual **color-sort/match** puzzle — "analyze, deduce, arrange, and match patterns with precision through deterministic color-sort logic… no timers and no pressure—just clean puzzle solving." We keep the no-timer, objective-level, no-pressure philosophy and the textile theme; we **change** the core verb to adjacent-swap line-matching to stay distinct from puzzleDrag2's drag-chain and from Wool Crush's sort mechanic.
  - Google Play — Wool Crush™: https://play.google.com/store/apps/details?id=wool.match.color.sort.jam.puzzle&hl=en
  - Uptodown — Wool Crush: https://wool-crush.en.uptodown.com/android
  - Softonic — Wool Crush - Cat Rescue Sort: https://wool-crush-cat-rescue-sort.en.softonic.com/android

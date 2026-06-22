# GameScene.ts Decomposition

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

`src/GameScene.ts` is the single largest source file in the repo and the only graph-confirmed "god node" on the canvas layer. It carries **zero unit coverage** — every line in it is exercised only by Playwright e2e + visual goldens, both of which are NOT in CI and are NOT runnable/regenerable on the Windows dev host. That means the hottest, most-edited surface of the game (board fill, chain collection, drag input, tweens, hazards, seasonal re-bake) has no fast, deterministic safety net. A typo in board math or chain detection ships silently until someone runs Playwright on a canonical host.

This project makes the canvas layer **testable** by extracting the **pure logic** (board math, group/chain detection, layout/origin math, pool building, tile selection) out of `GameScene` into small Phaser-free modules under `src/game/`, each covered by vitest unit tests, while leaving a thin Phaser orchestration shell in the scene. It is a **strictly behavior-preserving refactor**: e2e + visual goldens must be unchanged. The payoff is a shrinking god node, a real unit-test net under the math that drives every chain, and a sequence of independently-verifiable steps that don't require the (locally-broken) Phaser test path.

## Background & current state (VERIFIED)

I opened `src/GameScene.ts`, `src/TileObj.ts`, `src/game/chain.ts`, `src/game/crossCollect.ts`, `src/game/producedResource.ts`, `src/phaserBridge.ts`, `prototype.tsx`, `vitest.config.js`, and the e2e/visual specs. Findings:

### File size — seed brief confirmed (with a counting nuance)
- `src/GameScene.ts` real content spans **lines 1–2319** (the file's last line is the closing `}` at line 2319). The seed's "~2319 lines" is **accurate**.
- Note: `Get-Content … | Measure-Object -Line` reports **2163** because the final line has no trailing newline (PowerShell counts line *terminators*). Don't be confused by that number — the file is ~2319 logical lines. This is a measurement artifact, not a discrepancy in the brief.
- It is the largest file in `src/` and is flagged by graphify as the canvas god node.

### What already exists (SHIPPED) — the extraction is partly done
There is already a `src/game/` folder with three pure modules, all imported and **re-exported** by `GameScene.ts` (lines 36–40), so the public surface is preserved:
- `src/game/chain.ts` — `computeBakeScale(dpr, tileSize)` and `hasValidChain(grid)` (8-direction flood-fill, `>= 3` ⇒ has a move). **No dedicated test file** (`src/game/chain.test.ts` does not exist; it's only exercised indirectly).
- `src/game/producedResource.ts` — `producedResource(tile)` (per-tile override > family default > null) and `buildChainUpdatePayload(args)` (the pure CHAIN_UPDATE payload builder). **No dedicated test file.** (It is *imported* by `src/__tests__/chainEmitUpdate.test.ts`, but only the payload builder is touched there.)
- `src/game/crossCollect.ts` — `CROSS_COLLECT_PAIRINGS`, `findCrossCollectTargets(grid, pathCells)`, `buildCrossCollectedCredits(targets)`. **Has tests:** `src/__tests__/crossCollect.test.ts`. This is the proof-of-pattern to copy.

So the project is "continue and finish a started decomposition," not "start from a monolith." The seed brief's framing (it's a monolith with zero extraction) is **partly stale** — correct it: ~3 pure helpers are already out, but two of them lack tests and the bulk of pure logic is still inline in the scene.

### What is still inline in the scene (the extraction targets)
Verified symbols and their line anchors (open the file to confirm; do not trust line numbers blindly — they drift):

**Layout / origin math (PURE candidates, currently methods):**
- `layoutDims()` (≈560) computes `tileSize`, `tileScale`, `tileSpriteScale`, `boardX`, `boardY`, `boardFrame` from `dpr`, viewport `width/height`, `COLS`, `ROWS`, `TILE`. All arithmetic; the only Phaser reads are `this.scale.width/height`. **Extractable as a pure function** `computeLayout({dpr, vw, vh, bakeScale}) → {tileSize, tileScale, tileSpriteScale, boardX, boardY, boardFrame}`.
- `boardFrameFor(cssVw)` (≈76) — already a free function, pure. Move it into the layout module.
- The pointermove hit-test (≈209–228) converts `worldX/worldY` → `col/row` and does the circular hit test (`ts * 0.6`). The **math** (world→cell, circular-hit predicate) is extractable; the event wiring stays.

**Board fill / pool building (PURE candidates):**
- `activePool()` (≈826), `randomResource()` (≈842), `_randomFromPool(pool)` (≈849), `_pickFromZoneSeasonDrops()` (≈860). The pool-assembly logic in `fillBoard()` (≈956–1020) — worker boosts, `sessionSelectedTiles` filter, boss `spawnBias`, fertilizer bias, `applySpawnPoolModifiers` — is a large block of pure-ish array transformation that currently reads registry inline. **Extractable as** `buildSpawnPool(inputs) → string[]` taking the registry-derived values as plain args.
- `nextUpgradeTile(tile)` (≈769) — resolves the upgrade-target tile from the zone `upgradeMap` + `tileCollectionActive`. Mostly pure given the registry-derived inputs (zoneId, biome tiles, active map). **Extractable** as a pure resolver.

**Chain / group detection (PURE — partly done):**
- `hasValidChain` already lives in `chain.ts`. `_forceGuaranteedChain` (≈1211) and `_performShuffleSwap` (≈1227) mutate live tiles (Phaser-bound) — leave them, but the "is the board dead?" decision is already pure via `hasValidChain`.
- `_selectorGrid()` (≈1323) maps the live grid → reducer-shaped `{key, selected}` grid. Pure projection; **extractable**.

**Tweens / animation juice (Phaser-bound — STAYS, but timing math can extract):**
- `shakeForChain(len)` (≈2005), `radialFlash(x,y,len)` (≈2013), `upgradeBurst` (≈2034), `_upgradeSpawnBurst` (≈466), `_landingBounce` (≈447), `emitCollectParticles` + `sparkEmitter` (≈354, ≈527), `floatText` (≈2052), `playBoardAnimation` (≈1248). These touch `this.tweens` / `this.add` / the particle emitter and **cannot be pure**. BUT the **intensity/duration curves** inside `shakeForChain` (`intensity = min(0.018, 0.0025 + (len-3)*0.0028)`, `duration = min(520, 160 + (len-3)*50)`) and `radialFlash` (`peakR`) are pure scalar functions worth extracting and testing.

**Hazards / modifiers (Phaser-bound — STAYS):**
- `_updateHazardAtmosphere()` (≈484), `hazardVignette`, fire-cell injection inside `fillBoard` (≈1073). Graphics + tweens; not unit-testable. The decision predicates (`hasFire`, `hasRats`) are trivial and not worth extracting.

**Input / drag (Phaser-bound shell + extractable predicates):**
- `startPath` (≈1424), `tryAddToPath` (≈1451), `addToPath` (≈1470), `endPath` (≈1683), `collectPath` (≈1787), `clearPath` (≈1774), `redrawPath` (≈1479). The **adjacency predicate** in `tryAddToPath` (`abs(col-last.col) <= 1 && abs(row-last.row) <= 1 && !(same cell)` plus `same-key`) and the **backtrack** rule (prev === tile ⇒ pop) are pure and central to gameplay. **Extract** `canExtendChain(path, tile)` / `isAdjacent(a, b)`. `_effectiveMinChain()` (≈553, `max(3, bossMin)`) is pure.

**Seasonal re-bake (Phaser-bound — STAYS):**
- `_animateSeasonalTiles`, `_bakeBankIdle`, `_bakeBankTrans`, `_ensureStripTexture`, `_rebakeBakedTiles`, etc. (≈2133–2318) all mutate canvas textures via `this.textures` — not unit-testable. Leave them; the season-index selection is already pure in `src/textures/seasonal/*`.

### Test infrastructure (VERIFIED)
- `vitest.config.js`: `environment: "node"`, and it **excludes `tests/e2e/**`**. There is **no canvas / no DOM** in unit tests (the seed's house rules confirm this). Therefore extracted modules **must not import Phaser** or touch `window`/`document` at module top-level — that's the whole point and the hard constraint.
- The pure modules already prove the pattern: `chain.ts` imports only `../constants.js`; `crossCollect.ts` imports only `../features/tileCollection/data.js`; `producedResource.ts` imports `../constants.js`, `../features/tileCollection/data.js`, `../utils.js`. None import Phaser. Copy this discipline.
- e2e contract example (the net we must not break): `tests/e2e/chain.spec.ts` — "drag-chain via scene API: turn advances and inventory grows" drives `window.__phaserScene` and asserts `turnsUsed >= 1` and inventory growth. There is also a raw touch-drag test that walks the grid and synthesizes pointer events. Any refactor must keep these green.

### Live-verify handle (VERIFIED)
- `prototype.tsx` (≈215–216) sets `setPhaserScene(scene)` and `window.__phaserScene = scene` on mount; clears both on unmount (≈258–259). `src/phaserBridge.ts` is just the module-level handle. So in-browser you can inspect/drive the scene via `window.__phaserScene` and `window.__hearthVisual.dispatch/state/freeze` (per house rules). `preview_screenshot` HANGS on this host — assert via DOM + `getComputedStyle`, never screenshots.

### Persistence (VERIFIED — relevant only as a "do NOT touch" boundary)
- This refactor does **not** change any persisted shape. `GameScene` serializes via `_syncGridToState()` → `SCENE_EVENTS.GRID_SYNC` (≈881) and `_applyGridFromState` (≈903); the persisted shape lives in `src/state/persistence.ts` gated by `SAVE_SCHEMA_VERSION` in `src/constants.ts` with **no migration today (a bump WIPES every save)**. Because we are only relocating pure logic, **no `SAVE_SCHEMA_VERSION` bump is needed or allowed.** If you find yourself touching the grid serialization shape, stop — that's out of scope and would require the save-migration ladder (doc 08).

### Slice footgun (VERIFIED — relevant boundary)
- This refactor **adds no new dispatched action types**, so the `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` registration footgun in `src/state.ts` does **not** apply. The scene already emits the same `SCENE_EVENTS.*` (e.g. `CHAIN_COLLECTED`, `GRID_SYNC`, `CHAIN_UPDATE`) it does today; those are wired in `prototype.tsx` and must be emitted **byte-identically** (same payload shape) after the refactor. If at any point you change a scene-emitted action type or payload, run the `check-slice-action` skill and confirm it reaches its slice.

## Scope

**In scope:**
- Extract **pure** logic from `GameScene.ts` into Phaser-free modules under `src/game/`, behavior-preserving:
  1. Layout/origin math (`computeLayout`, world→cell, circular hit-test predicate).
  2. Spawn-pool building (`buildSpawnPool` and the pool helpers `activePool`/`_randomFromPool`/`nextUpgradeTile` logic, given registry-derived inputs).
  3. Chain/group/adjacency predicates (`isAdjacent`, `canExtendChain`, `_effectiveMinChain` math, `_selectorGrid` projection).
  4. Juice timing curves (`shakeIntensityFor(len)`, `shakeDurationFor(len)`, `radialPeakRadiusFor(len)`).
- **Backfill unit tests** for the already-extracted-but-untested modules: `chain.ts` (`computeBakeScale`, `hasValidChain`) and `producedResource.ts` (`producedResource`).
- Add unit tests for every newly-extracted module.
- Keep the thin Phaser orchestration (method shells that call the pure functions, then do the tweens / texture / event work) inside `GameScene.ts`. The scene keeps the **same public method names and signatures** so callers (`prototype.tsx`, `visualTesting/bridge.ts`, e2e specs) don't change.
- Keep `GameScene.ts`'s re-exports (lines 36–40 style) so any importer of `computeBakeScale`/`hasValidChain`/`producedResource`/`buildChainUpdatePayload` from `./GameScene.js` still resolves.

**Out of scope / non-goals (keep this tight):**
- **No behavior changes.** No new mechanics, no tuning, no animation tweaks. Pixel/visual output must be identical (visual goldens unchanged).
- **No new dispatched action types**, no reducer changes, no slice edits.
- **No persisted-shape changes**, no `SAVE_SCHEMA_VERSION` bump.
- **Do not** try to unit-test the Phaser-bound code (tweens, particles, canvas re-bake, hazard graphics, input event wiring). That stays e2e/visual-only by design.
- **Do not** rewrite the seasonal-tile re-bake pipeline (`_bakeBank*`, `_ensureStripTexture`, `_animateSeasonalTiles`) — it is canvas-mutating and already isolated; leave it in the scene.
- **Do not** rename public scene methods or `SCENE_EVENTS` payloads.
- No splitting into multiple `Phaser.Scene` subclasses or a plugin architecture — the deliverable is pure-logic extraction, not a scene-graph redesign.

## Implementation plan

Sequence so each step is independently verifiable (`npm run lint && npm run typecheck && npm test` green after each). Land them as separate commits on one branch; ideally gate on **doc 09 (test net)** first so the e2e/visual contracts are in place before touching the hot file — but the unit-only steps (Step 0, 4) are safe to do regardless.

### Step 0 — Backfill tests for the already-extracted modules (no production change)
This is the safety floor and proves the harness before any refactor.
- Add `src/game/chain.test.ts`:
  - `computeBakeScale(dpr, tileSize)` = `max(dpr||1, (tileSize||TILE)/TILE)` — table-test dpr/tileSize combos including 0/undefined inputs.
  - `hasValidChain(grid)` — true for a 3-in-a-row (orthogonal AND diagonal, since `DIRS` includes diagonals), false for a fully-scattered board, false for empty/sparse, respects the `>= 3` threshold (2-of-a-kind ⇒ false). Build grids with `{res:{key}}` cells (the shape it reads).
- Add `src/game/producedResource.test.ts`:
  - `producedResource(tile)` — returns the per-tile `effects.producesResource` override when present, falls back to `tileFamilyResource`, returns `null` for `null`/keyless input and for keys in `TILES_WITH_CUSTOM_OUTPUT`.
- Pattern to copy verbatim: `src/__tests__/crossCollect.test.ts` (imports the pure module, builds grids from key arrays, asserts).

### Step 1 — Extract layout math → `src/game/layout.ts`
- New pure module exporting:
  ```ts
  export function boardFrameFor(cssVw: number): number
  export interface LayoutInput { dpr: number; vw: number; vh: number; bakeScale: number; }
  export interface LayoutDims { tileSize, tileScale, tileSpriteScale, boardX, boardY, boardFrame; }
  export function computeLayout(in: LayoutInput): LayoutDims
  export function worldToCell(worldX, worldY, boardX, boardY, tileSize): {col, row}
  export function withinCircularHit(worldX, worldY, tileX, tileY, tileSize, factor=0.6): boolean
  ```
- Replace the body of `GameScene.layoutDims()` (≈560) with: read `dpr`, `this.scale.width/height`, call `computeLayout`, assign the returned fields onto `this`. Keep `layoutDims()` as the public method (callers like `handleResize` rely on it).
- Replace the inline math in the `pointermove` handler (≈209–228) with `worldToCell` + `withinCircularHit`.
- Keep the free `boardFrameFor` import from the new module (move the definition; re-export from `GameScene` if anything else imports it — grep first).

### Step 2 — Extract adjacency / chain predicates → grow `src/game/chain.ts`
- Add to `chain.ts` (it's already the home of chain logic):
  ```ts
  export function isAdjacent(a: {col,row}, b: {col,row}): boolean   // 8-dir, not same cell
  export function effectiveMinChain(bossMinChain: number): number   // max(3, bossMin)
  export function canExtendChain(pathKeys: string[], pathCells: {col,row}[], tile: {key, col, row, selected}): "extend" | "backtrack" | "reject"
  ```
- Refactor `tryAddToPath` (≈1451) to call `canExtendChain` for the decision, then do the Phaser side (setSelected/pop/redraw/emit). Refactor `_effectiveMinChain()` (≈553) to delegate to `effectiveMinChain(boss?.minChain ?? 0)`.
- Extract `_selectorGrid()` (≈1323) projection into a pure `toSelectorGrid(grid)` in `chain.ts` (or a new `src/game/boardProjection.ts`) that takes a `(TileObj|null)[][]`-shaped grid of `{res:{key}, selected}` and returns the `{key, selected}|{key:null}` grid. The method keeps its name and calls the helper.

### Step 3 — Extract spawn-pool building → `src/game/spawnPool.ts`
- New pure module:
  ```ts
  export function buildSpawnPool(input: {
    basePool: string[]; tileCollectionActive: Record<string,string|null>|null;
    poolWeights: Record<string,number>; biomeKey: string;
    sessionSelectedTiles: string[]; spawnBias: Record<string,number>|null;
    fertilizer: {armed: boolean; targetKey: string|null};
    seasonName: SeasonName|null; categoryOf: Record<string,string|undefined>;
  }): string[]
  ```
  capturing the `activePool` substitution, the `sessionSelectedTiles` category filter, boss `spawnBias`, fertilizer bias, and `applySpawnPoolModifiers` composition currently inlined in `fillBoard` (≈961–1020).
- Also extract `nextUpgradeTile` resolution (≈769) into a pure `resolveUpgradeTile(input)` taking the zone `upgradeMap`, biome tiles, `tileCollectionActive`, and the `BIOME_GOLD_TILE` map as args.
- `GameScene.fillBoard()` keeps its name and Phaser side (tile creation, drop tween, fire injection, dead-board reshuffle); it just reads the registry, calls `buildSpawnPool`, and loops. `activePool()`/`_randomFromPool()`/`nextUpgradeTile()` stay as thin method wrappers around the pure functions so existing internal callers and any test that pokes them still work.

### Step 4 — Extract juice timing curves → `src/game/juiceCurves.ts`
- Pure scalars (cheap, high-value-for-low-risk):
  ```ts
  export function shakeIntensityFor(len: number): number  // min(0.018, 0.0025 + (len-3)*0.0028), 0 if len<3
  export function shakeDurationFor(len: number): number    // min(520, 160 + (len-3)*50)
  export function radialPeakRadiusFor(len: number, tileScale: number): number
  ```
- `shakeForChain` / `radialFlash` keep their names and Phaser side (`this._shake`, graphics); they just call these.

### Step 5 — Final shrink check + re-export hygiene
- Confirm `GameScene.ts` re-exports any newly-public symbols that an external module imports from `./GameScene.js` (grep `from "./GameScene` and `from "../GameScene`). The existing pattern (lines 36–40) re-exports `computeBakeScale`, `hasValidChain`, `producedResource`, `buildChainUpdatePayload` — preserve that and extend only if needed.
- Measure the line drop; target a meaningful reduction (the pure blocks above are ~250–400 lines combined).
- Run `graphify update .` so the god-node graph reflects the new modules.

> Code-shape note: every new module must import **only** plain data/constants (`./constants.js`, `./features/.../data.js`, `./utils.js`, season types) — **never** `phaser`, `window`, or `document`. If TS complains it needs a Phaser type, accept a structural `{col, row, key, selected}` shape instead of `TileObj`.

## Success criteria

- [ ] `src/game/chain.ts` has a dedicated `src/game/chain.test.ts` covering `computeBakeScale` and `hasValidChain` (incl. diagonal-only chains, the `>= 3` boundary, empty/sparse boards).
- [ ] `src/game/producedResource.ts` has a dedicated `src/game/producedResource.test.ts` covering override > family > null and `TILES_WITH_CUSTOM_OUTPUT`.
- [ ] New `src/game/layout.ts` with `computeLayout`, `worldToCell`, `withinCircularHit`, `boardFrameFor` + `src/game/layout.test.ts`. `GameScene.layoutDims()` delegates to it; the pointermove hit-test uses `worldToCell`/`withinCircularHit`.
- [ ] New chain predicates `isAdjacent` / `effectiveMinChain` / `canExtendChain` (+ selector-grid projection) in `chain.ts`, with tests; `tryAddToPath`, `_effectiveMinChain`, `_selectorGrid` delegate to them.
- [ ] New `src/game/spawnPool.ts` (`buildSpawnPool`, `resolveUpgradeTile`) + tests; `fillBoard`/`nextUpgradeTile` delegate.
- [ ] New `src/game/juiceCurves.ts` (`shakeIntensityFor`/`shakeDurationFor`/`radialPeakRadiusFor`) + tests; `shakeForChain`/`radialFlash` delegate.
- [ ] **No** new module imports `phaser`, `window`, or `document` (grep proves it).
- [ ] `GameScene.ts` public method names + `SCENE_EVENTS` payload shapes are unchanged (no caller in `prototype.tsx` / `visualTesting/bridge.ts` / e2e specs edited).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- [ ] `GameScene.ts` line count drops by a meaningful margin (target ≥ ~250 lines removed; record before/after).
- [ ] No `SAVE_SCHEMA_VERSION` change; no reducer/slice change; `git diff` touches only `src/GameScene.ts`, new `src/game/*.ts`, and new `*.test.ts`.
- [ ] `graphify update .` run after the change.

## Validation — how to verify

**Gating (must pass, runnable on this host):**
```bash
npm run lint        # ESLint over src/ + prototype.tsx — pass = no errors
npm run typecheck   # tsc --noEmit — pass = clean, esp. structural-shape args compile
npm test            # vitest (node env, no canvas) — pass = all green incl. new files
npm run build       # vite production build — pass = bundles, no import-time Phaser leak
```
`npm test` is the primary net: it runs the new pure-module tests and the existing suites (`src/__tests__/crossCollect.test.ts`, `chainEmitUpdate.test.ts`, etc.) which already exercise the re-export surface.

**New unit tests to add (name + assertions):**
- `src/game/chain.test.ts` — `computeBakeScale` returns `max(dpr, tileSize/TILE)` and floors to `1` for falsy dpr; `hasValidChain` true for orthogonal triple, true for diagonal triple, false for a 2-run, false for a checkerboard, handles ragged/empty grids without throwing.
- `src/game/producedResource.test.ts` — override wins, family fallback, `null` for keyless/`TILES_WITH_CUSTOM_OUTPUT`.
- `src/game/layout.test.ts` — `computeLayout` clamps `tileSize` to `[24*dpr, ceiling]`, centers via `boardX/boardY` rounding, `tileSpriteScale = tileScale/bakeScale`; `worldToCell` floors correctly and `withinCircularHit` rejects corner clips (point at `0.6*ts` boundary).
- `src/game/spawnPool.test.ts` — substitution drops disabled categories, `sessionSelectedTiles` filter (farm only) with the empty-fallback guard, `spawnBias`/fertilizer add copies, never returns `[]`; `resolveUpgradeTile` honors the GOLD sentinel and active-tile path.
- chain predicate tests — `isAdjacent` 8-dir incl. self-reject; `canExtendChain` returns `"backtrack"` when tile === prev, `"reject"` for non-adjacent or different key, `"extend"` for adjacent same-key.
- `src/game/juiceCurves.test.ts` — boundary `len < 3` ⇒ 0 intensity; monotonic, clamped at the documented caps.

**Informational (NOT runnable/regenerable on this Windows host — defer to canonical host):**
```bash
npm run test:e2e      # Playwright; expect tests/e2e/chain.spec.ts etc. unchanged-green
npm run test:visual   # visual goldens; expect ZERO diffs (behavior-preserving)
```
Do not regenerate goldens here (DOM drifts 3–5%, Phaser WebGL ~38% from GPU/fonts). A local diff is meaningless; re-baseline only on a canonical host.

**Manual in-game check (this host):**
1. Spin a worktree Vite on a spare port with base `/puzzleDrag2/`: `node ../../../node_modules/vite/bin/vite.js` (worktree has no `node_modules`; the `:5173` server serves MAIN, not this worktree).
2. In the browser console, drive `window.__phaserScene`: confirm `scene.boardX`, `scene.boardY`, `scene.tileSize` are sane (board centered, tiles ≥ 24px), then hand-drive a chain (`scene.startPath(scene.grid[r][c])` / `scene.tryAddToPath(...)` / `scene.endPath()`) and confirm a turn advances + inventory grows via `window.__hearthVisual.state`.
3. Assert any DOM via `getComputedStyle`. `preview_screenshot` HANGS here — do not use it.

## Double-check / adversarial review

- **"Did the scene actually delegate, or did you leave a dead copy?"** After each step, grep `GameScene.ts` for the OLD inline arithmetic (e.g. the `Math.max(24 * dpr, Math.min(...))` clamp, the `min(0.018, ...)` shake curve). If it still appears in the scene, the method isn't delegating — the test passes against the new module while the scene runs the old code. Both must read the new function.
- **Behavior-preservation proof:** the new pure functions must reproduce the OLD constants exactly. Write at least one test per curve that pins the *literal* output for a known input (e.g. `shakeIntensityFor(6) === min(0.018, 0.0025 + 3*0.0028)`), computed by hand from the pre-refactor code, so a future "cleanup" that changes the math fails loudly.
- **Phaser-leak check (the core invariant):** `grep -rn "from \"phaser\"" src/game/` must return nothing, and `npm test` must pass in the node env (no canvas). If a new module accidentally imports a Phaser type at runtime, vitest will fail at import — that's the canary.
- **Caller-surface check:** `git diff --stat` must show **no** edits to `prototype.tsx`, `src/visualTesting/bridge.ts`, or `tests/e2e/**`. If those changed, you altered a public method/payload — revert and route through a thin wrapper instead.
- **Re-export check:** anything importing `computeBakeScale`/`hasValidChain`/`producedResource`/`buildChainUpdatePayload` from `./GameScene.js` (grep it) must still resolve — keep lines 36–40's re-export pattern.
- **Edge cases the skeptic will attack:** empty/ragged grid in `hasValidChain`; `tileSize` clamp at the 24px floor and the `TILE*3.2*dpr` ceiling; `worldToCell` for points exactly on a cell boundary; `buildSpawnPool` returning `[]` (must fall back to base); the `sessionSelectedTiles` over-restrictive case (filter empties ⇒ fall back). Cover each with a test.
- **Rollback safety:** every step is an isolated commit that only adds a module + tests and swaps a method body. Reverting any one commit restores the previous behavior with no schema/state implications (no persistence touched). If e2e regresses on the canonical host, bisect by commit.
- **This is NOT a dormant-system fix** — there's no never-fired path to prove. The proof is the inverse: the *already-running* behavior is now also covered by fast tests, and the e2e/visual contracts remain green.

## Risks & gotchas

- **Canvas has zero unit coverage by design** — you cannot unit-test tweens/particles/texture re-bake. Resist the urge to "test" the scene shell; only the extracted pure functions get unit tests. Verification of the Phaser side is e2e/visual (informational on this host).
- **vitest is node-env, no DOM/canvas** (`vitest.config.js`): any new module that even *imports* something which transitively pulls Phaser/`window` at module scope will break the whole test run. Keep imports to constants/data/utils only; use structural `{col,row,key,selected}` shapes, never `import { TileObj }` for a value.
- **Behavior-preserving means pixel-identical.** The visual goldens compare rendered output. A "harmless" reorder of a clamp or a rounding change in `computeLayout` can shift the board by a pixel and break goldens on the canonical host. Mirror the existing arithmetic exactly (note `Math.round` on `boardX/boardY`).
- **Line-count nuance:** don't "fix" the missing trailing newline or reformat the file wholesale — that pollutes the diff and the goldens are unaffected by source formatting anyway. Keep the diff to logic relocation.
- **Don't bump `SAVE_SCHEMA_VERSION`** (`src/constants.ts`) — there is no migration, so a bump WIPES saves. This refactor never needs it; if you think it does, you've strayed into out-of-scope grid-shape changes (see doc 08).
- **No new action types** — if you ever route a new `SCENE_EVENTS`/dispatch, the `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` footgun applies; run the `check-slice-action` skill. This project should not need it.
- **`graphify update .`** after code changes (project rule) so the god-node graph reflects the smaller scene + new modules.
- **The seasonal re-bake block is a trap** — it looks "extractable" but it mutates `this.textures` canvas data and depends on Phaser texture objects. Leave it. The season *index* math is already pure elsewhere.

## References

- `src/GameScene.ts` — the file under refactor (~2319 lines). Re-export pattern at lines 36–40.
- `src/TileObj.ts` — the tile object the scene drives; structural shapes (`{col,row,res:{key},selected}`) for pure args come from here.
- `src/game/chain.ts` — already-extracted `computeBakeScale`/`hasValidChain`; grow it for adjacency predicates.
- `src/game/crossCollect.ts` + `src/__tests__/crossCollect.test.ts` — the proven extraction pattern to copy (pure module + node-env test).
- `src/game/producedResource.ts` — already-extracted; backfill its test.
- `src/phaserBridge.ts` + `prototype.tsx` (≈215, ≈258) — how `window.__phaserScene` is wired for live verify.
- `src/visualTesting/bridge.ts` — uses `scene.rebuildGridFromState` / `_applyGridFromState`; a public-surface caller to keep stable.
- `tests/e2e/chain.spec.ts` — the behavior contract the refactor must keep green.
- `vitest.config.js` — `environment: "node"`, excludes `tests/e2e/**` (the no-canvas constraint).
- `.claude/skills/phaser-scene-debug/SKILL.md` — debugging the reducer↔registry↔scene↔TileObj boundary.
- `.claude/skills/check-slice-action` — only if you (against scope) add an action type.
- Docs: **09** (test net — ideal prerequisite), **08** (save-migration ladder — the boundary you must NOT cross).
- Memory: `live-game-preview-verify`, `phaser-scene-debug`, `visual-goldens-host-limits` (why local golden regen is meaningless here).

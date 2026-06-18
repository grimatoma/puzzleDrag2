# Live Boss Board Modifiers

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Bosses (`Frostmaw`, `Quagmire`, `Ember Drake`, `Old Stoneface`, `Mossback`, `The Storm`) each declare a **board modifier** — `freeze_columns`, `rubble_blocks`, `hide_resources`, `heat_tiles`, `respawn_boost`, `min_chain` — that is meant to make the board harder to chain while a boss is active. The modifier engine (`src/features/bosses/modifiers.ts`) is fully written and unit-tested, and `min_chain` + `respawn_boost (spawnBias)` already affect live play. But the **three tile-overlay modifiers that mutate the grid (`freeze_columns`, `rubble_blocks`, `hide_resources`) and the per-turn `heat_tiles` burn do not reliably reach the live Phaser board**: the flags get applied to `state.grid` at trigger time and are then thrown away by the fresh-board build path. A live boss run today is effectively only `minChain` + Quagmire's pool bias.

This project **wires the existing modifier engine end-to-end** so the player visibly faces the active boss's board adversity: frozen columns / rubble / hidden tiles render and block chaining on the live board, heat tiles tick and burn, and there is a UI affordance explaining the active modifier. This is **integration, not new design** — almost all the logic exists. It matters because bosses are the game's headline challenge beat and right now their signature mechanic silently no-ops, undercutting the difficulty curve and the §8 boss spec.

## Background & current state (VERIFIED)

I opened every key file. The seed brief is **directionally right (the modifiers don't reach the live board) but factually wrong in two specifics** — corrected below.

### Two boss systems exist — don't confuse them
- `src/features/bosses/` (plural) = **data + pure engine**: `data.ts` (the `BOSSES` array, `spawnBoss`, `tickBossTurn`, `bossReward`) and `modifiers.ts` (`applyModifierToFreshGrid`, `tickModifier`, `tileIsChainable`, `clearModifier`).
- `src/features/boss/` (singular) = **the live reducer slice** (`slice.ts`, `uiMeta.ts`, `index.tsx`). This is the slice registered in `src/state.ts` (`import * as boss from "./features/boss/slice.js"`, in the `slices` array at `state.ts:64`). It owns the runtime `BossState` and is what runs in real play.

### CORRECTION 1 — `tickModifier` and `applyModifierToFreshGrid` already run in LIVE play, not "only in tests"
The seed brief (quoting `status.ts:63`, "tickModifier runs only in tests") is **stale**. In the live slice:
- `src/features/boss/slice.ts:81` — `BOSS/TRIGGER` calls `spawnBoss(state, bossKey, year)`, and `spawnBoss` (`data.ts:125-150`) calls `applyModifierToFreshGrid(grid, def.modifier, rng)` at `data.ts:132`, **mutating `state.grid`** (adds `frozen`/`rubble`/`hidden` flags) and storing the `modifierState` bag on `boss.modifierState`.
- `src/features/boss/slice.ts:241-263` — `CLOSE_SEASON` calls `tickModifier(next, next.boss.modifier)` at `:246` when a boss is active. So `heat_tiles` aging/burning **does** fire on season close in real play.
- `BOSS/RESOLVE` (`slice.ts:155-198`) and `BOSS/REJECT` (`slice.ts:137-153`) call `clearModifier(state.grid)` to strip the overlay flags.

The `status.ts:63` comment is therefore inaccurate and should be corrected as part of this work (see plan). The **real** gap is the bridge from `state.grid` to the live Phaser tiles, described next.

### CORRECTION 2 — the real bug: the fresh-board build path discards the grid flags
`applyModifierToFreshGrid` mutates `state.grid`. But the Phaser scene only ever reads modifier flags from `state.grid` in **two** places:
- `src/GameScene.ts:186-190` — at scene `create()`, via `boardRestoreGrid` → `_applyGridFromState(...)` (a reload-restore path).
- `src/GameScene.ts:287-290` — `onRegistry("grid", ...)` → `_applyGridFromState(value)` when React pushes a new `grid` registry value.

`_applyGridFromState` (`GameScene.ts:903-918`) copies `cell.frozen`/`cell.rubble` onto live `TileObj`s. **It does not handle `hidden` or `heat`** (those flags don't exist on `TileObj` — see below).

The problem: **a fresh board is built by `fillBoard`/`regenerateBoard`, which create brand-new `TileObj`s with `frozen=false`/`rubble=false` and never consult the modifier state.**
- `GameScene.ts:300-303` — `onRegistry("newBoardNonce", ...)` → `regenerateBoard()` (`:737-754`) → tears down all tiles and calls `fillBoard(true)` (`:752`). New tiles default to `frozen=false`/`rubble=false` (`TileObj` ctor `src/TileObj.ts:72-73`).
- `src/state.ts:1132-1161` — `FARM/ENTER` bumps `_boardNonce` (`:1141`) on every new farming session. That triggers `regenerateBoard`, **wiping any frozen/rubble flags** a just-triggered boss put on `state.grid`. Bosses are spawned from story beats (`src/state/storyEffects.ts:38-45`, `pendingBossKey → BOSS/TRIGGER`) and from the debug button (`src/features/debug/index.tsx:180`), which can land before or independent of a fresh board.

Net effect: when the player is actually on a board with an active boss, `fillBoard` (the live fill) only honors `spawnBias` (`GameScene.ts:979-990`, reads `registry "boss".spawnBias`) and `minChain` (via `_effectiveMinChain` `GameScene.ts:553-556`, reads `registry "boss".minChain`). **Frozen/rubble/hidden tiles are not placed on the live fresh board, and there is no visual for any of them.**

### CORRECTION 3 — `TileObj` enforces frozen/rubble but does NOT render them, and has no hidden/heat
- `src/TileObj.ts:56-57,72-73` — `TileObj` carries `frozen: boolean` and `rubble: boolean` only. There is **no** `hidden` or `heat` field.
- `src/GameScene.ts:1451-1468` — `tryAddToPath` rejects frozen/rubble (`:1453 if (tile.frozen || tile.rubble) return;`). So enforcement works for frozen/rubble. **There is no rejection for `hidden`** (it's never a TileObj flag), and no reveal-on-chain logic.
- **No visual rendering exists** for frozen/rubble/hidden/heat. `TileObj` has no tint/overlay/setFrozen. So the seed brief's "the board can render/enforce them" is half right: it *enforces* frozen/rubble; it *renders* nothing.
- `src/types/phaserRegistry.ts:33-38` — `RegistryGridCell` declares only `key`, `frozen?`, `rubble?`. The serialized grid (`_syncGridToState` `GameScene.ts:881-901`) writes only `key`/`frozen`/`rubble`. So even the state↔scene grid channel cannot carry `hidden`/`heat` today.

### What is SHIPPED vs DORMANT
- **SHIPPED & live:** `min_chain` (Storm) via `_effectiveMinChain`; `respawn_boost` (Quagmire) via `spawnBias` in `fillBoard`; `tickModifier` heat-burn on CLOSE_SEASON; `clearModifier` on resolve/reject; full unit coverage (`src/__tests__/boss-8.1.test.ts`).
- **DORMANT (the gap):** `freeze_columns` / `rubble_blocks` flags on the live fresh board (wiped by `regenerateBoard`); any **visual** for frozen/rubble; `hide_resources` (no TileObj flag, no reveal-on-chain, not carried by `RegistryGridCell`); `heat_tiles` **spatial placement + visual** on the live board (only the inventory-burn side runs; heat cells are never placed — note `applyModifierToFreshGrid` returns `{ heat: [] }` for `heat_tiles`, `modifiers.ts:87`, i.e. heat placement is itself unimplemented).

### Persistence reality (matters for scope)
- `boss` and `grid` are **both persisted** — `persistStateNow` (`src/state/persistence.ts:34-45`) whitelists all of `GameState` minus `VOLATILE` (`modal, bubble, view, viewParams, pendingView, craftingTab`, `:6`). `boss.modifierState` already round-trips (test at `boss-8.1.test.ts:130-138`).
- `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`); any change to persisted **shape** wipes saves (no migration ladder yet — see doc `docs/archive/projects/08-save-migration-ladder.md`).

## Scope

**In scope**
- Make `freeze_columns` and `rubble_blocks` flags survive onto the live fresh board (the fill path), so they render + block chaining while a boss is active.
- Add a **visual** for frozen and rubble tiles on the board (tint/overlay) so the player sees the modifier.
- Add a minimal **UI affordance** that names the active modifier (reuse `BossState.modifierDescription`, already populated `slice.ts:94`).
- Correct the stale `status.ts:63` comment.
- Tests: a reducer/integration test proving the fill path picks up boss modifier flags, plus an e2e/visual check.

**Out of scope / non-goals (keep this tight)**
- `hide_resources` full mechanic (new TileObj flag + reveal-on-chain + `RegistryGridCell.hidden` + serialization). It's a bigger change (touches the persisted grid cell shape → SAVE_SCHEMA). **Defer**; document it as a follow-up. (If pulled in later it MUST go through doc 08's migration ladder because `RegistryGridCell`/serialized grid shape changes.)
- `heat_tiles` **spatial** placement/visual (the burn side already works; spatial placement is unimplemented in `applyModifierToFreshGrid`). Defer.
- Any **balance retune** of boss targets/rewards/turn windows — modifiers add adversity, not income. Keep `bossReward`/targets untouched.
- New boss content, new modifier types, boss scheduling/auto-spawn loop.
- Re-baselining visual goldens on this Windows host (impossible here — see house rules).
- Bumping `SAVE_SCHEMA_VERSION`: the in-scope work does **not** change persisted shape (frozen/rubble already in `RegistryGridCell` + serialized grid + persisted `boss`). Confirm and keep it that way.

## Implementation plan

### Step 1 — Make the live fresh board apply boss modifier flags
The fix point is `fillBoard` (and therefore `regenerateBoard`) in `src/GameScene.ts`. After the board is filled with fresh tiles, re-apply the active boss's grid flags from the modifier state in the registry.

1a. **Expose the modifier state to the scene.** The registry already carries `boss` (`prototype.tsx:303` pushes `gameState.boss`; `GameScene.ts:981` reads it for `spawnBias`). The live `BossState` carries `modifier` (`slice.ts:101`) and the spawned `boss.modifierState` bag (`data.ts:136-144`, `frozenColumns`/`rubble`/`hidden`). Confirm `modifierState` survives onto the registry `boss` object (it's part of the boss slice object spread). If `BossState` (the typed registry shape in `phaserBridge`/`phaserRegistry`) doesn't expose `modifierState`, widen the read with a narrowing cast at the boundary (the codebase already does this, e.g. `data.ts:114`).

1b. **Add a scene helper `_applyBossModifiersToBoard()`** in `GameScene.ts` that reads `getRegistry(this.registry, "boss")`, pulls `modifierState.frozenColumns` and `modifierState.rubble`, and sets the flags on the matching live `TileObj`s:

```ts
// GameScene.ts — call at the END of fillBoard() and regenerateBoard()
private _applyBossModifiersToBoard(): void {
  const boss = getRegistry(this.registry, "boss") as
    | { modifierState?: { frozenColumns?: number[]; rubble?: { row: number; col: number }[] } }
    | null | undefined;
  const ms = boss?.modifierState;
  if (!ms) return;
  if (Array.isArray(ms.frozenColumns)) {
    for (const c of ms.frozenColumns)
      for (let r = 0; r < ROWS; r++) { const t = this.grid[r]?.[c]; if (t) t.frozen = true; }
  }
  if (Array.isArray(ms.rubble)) {
    for (const { row, col } of ms.rubble) { const t = this.grid[row]?.[col]; if (t) { t.rubble = true; } }
  }
  this._refreshModifierVisuals();   // Step 2
  this._syncGridToState();          // persist flags back into state.grid
}
```

Call it at the end of `fillBoard` (`GameScene.ts:956+`, after the fill loop) **and** at the end of `regenerateBoard` (`GameScene.ts:752`, after `fillBoard(true)`). Also call it from the `onRegistry("boss", ...)` listener (add one if absent near `GameScene.ts:300`) so triggering a boss **mid-board** (debug button / story beat without a fresh-board bump) re-applies flags to the existing tiles.

1c. **Re-apply on rubble clear / chain collapse.** `freeze_columns` should stay frozen for the boss's life; rubble persists until cleared. After any `fillBoard(false)` (cascade refill, `GameScene.ts:1132`) the new tiles in frozen columns must be re-frozen — `_applyBossModifiersToBoard()` at the end of `fillBoard` covers this automatically. Verify a refilled tile in a frozen column comes back frozen.

### Step 2 — Visual for frozen / rubble tiles
`TileObj` has no visual today. Add a lightweight overlay so the player sees the modifier. Keep it cheap (tint + optional icon), no new texture pipeline.

- Add `setFrozen(v: boolean)` / `setRubble(v: boolean)` to `src/TileObj.ts` that set the boolean AND apply a visual: e.g. frozen → blue tint (`this.sprite.setTint(0x9fd0ff)`) + reduced interactivity feel; rubble → grey tint (`0x888888`) + maybe a small overlay graphic. Reset tint on clear (`clearTint()`).
- Update the three flag-write sites to call the setters instead of raw assignment: `GameScene.ts:914-915`, `:947-948`, and the new `_applyBossModifiersToBoard`. Add `_refreshModifierVisuals()` that walks the grid and applies tint per flag (idempotent).
- `setResource` (`TileObj.ts:131-134`) and `setSelected` (`:99-129`) reset the texture; ensure they **re-assert** the modifier tint afterward (call into the visual refresh, or have `setFrozen`/`setRubble` re-applied after texture swaps) so a frozen tile selected/refilled keeps its look.

### Step 3 — UI affordance for the active modifier
`BossState.modifierDescription` is already populated from `def.modifierDescription` (`slice.ts:94`, copied from `data.ts` e.g. "Two columns on the board are frozen solid…"). Surface it:
- In the boss HUD/banner component under `src/features/boss/index.tsx` (the React boss UI), render `boss.modifierDescription` near the goal/progress. Verify the component already receives the boss object from state; add a line/badge. Reuse `BOSS_UI` emoji (`uiMeta.ts`) for the icon.
- Optional: a one-time `bubble` (NPC line) when the modifier first applies — only if cheap; not required for success.

### Step 4 — Correct the stale wiki status comment
`src/balanceManager/wiki/status.ts:60-64` — update the rationale comment: `tickModifier` and `applyModifierToFreshGrid` **do** run in live play (CLOSE_SEASON / BOSS/TRIGGER); the remaining gap was the fresh-board bridge (now fixed). Keep `bosses: "PARTIAL"` if the auto-spawn cooldown loop is still absent (it is — bosses are story/debug-triggered), but fix the misleading "only in tests" clause. There is a guard test `src/balanceManager/wiki/status.test.ts` — run it after editing.

### Slice-registration footgun (READ THIS)
**No new action types are required** by the in-scope plan — Step 1's wiring is inside the Phaser scene + existing `BOSS/TRIGGER`/`CLOSE_SEASON`/fill paths. **If you add any new action** (e.g. a `BOSS/APPLY_MODIFIER` you decide to dispatch from the scene), it will **silently no-op** unless its `type` is added to `SLICE_PRIMARY_ACTIONS` (`src/state.ts:1590-1634`) or `ALWAYS_RUN_SLICES` (`:1639-1642`) — the boss slice is reached for `BOSS/*` only because those types are listed there (`state.ts:1601-1607`). Run the `check-slice-action` skill on any new type. Prefer NOT adding a new action; do the work in the scene reading existing registry state.

### SAVE_SCHEMA note
In-scope changes touch only `TileObj` (runtime, not persisted) and re-use `frozen`/`rubble` which already exist in `RegistryGridCell` (`phaserRegistry.ts:36-37`), the serialized grid (`_syncGridToState`), and the persisted `boss`. **Do not bump `SAVE_SCHEMA_VERSION`** (`constants.ts:207`). Adding `hidden`/`heat` to the cell shape (the deferred work) WOULD require a bump + the doc-08 migration ladder — that's why it's out of scope.

## Success criteria

- [ ] Triggering Frostmaw (`freeze_columns n=2`) then entering/refreshing the board leaves **2 distinct columns** of live `TileObj`s with `frozen === true`, and those tiles **cannot be added to a chain** (`tryAddToPath` rejects).
- [ ] Triggering Old Stoneface (`rubble_blocks count=4`) places **4 rubble** live tiles that `tryAddToPath` rejects.
- [ ] Frozen tiles show a distinct visual (e.g. blue tint) and rubble tiles a distinct visual (e.g. grey tint/overlay) on the live board; the visual survives a tile refill in a frozen column and a select/deselect.
- [ ] A cascade refill (`fillBoard(false)`) into a frozen column produces a **frozen** replacement tile (column stays frozen for the boss's life).
- [ ] The boss HUD shows the active `modifierDescription` text.
- [ ] `BOSS/RESOLVE` / `BOSS/REJECT` clear the flags **and** the visuals (no lingering tint after the boss ends) — verify `clearModifier` + a visual refresh.
- [ ] FARM/ENTER with an active boss no longer wipes the modifier (the new fill-time re-apply restores it).
- [ ] `status.ts:63` comment corrected; `status.test.ts` still green.
- [ ] `SAVE_SCHEMA_VERSION` unchanged (45); a pre-existing save still loads.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating (must pass, run on this host):**
- `npm run typecheck` — no errors. (Scene reads `boss.modifierState` via a narrowing cast; confirm the cast compiles.)
- `npm run lint` — clean over `src/` + `prototype.tsx`.
- `npm test` — vitest (node env, fake localStorage, **no canvas**). The Phaser layer has zero unit coverage, so the new *reducer-level* test must assert on **state.grid**, not on `TileObj`.
- `npm run build` — production build succeeds.

**New unit/integration test (add `src/__tests__/boss-live-modifiers.test.ts`):**
- `freeze_columns flags survive on state.grid through spawn`: build a 6×6 grid into state, dispatch `BOSS/TRIGGER` with `bossKey:"frostmaw"`, assert `state.grid` has exactly 2 fully-frozen columns (`every row[c].frozen`). Mirror `boss-8.1.test.ts` helpers (`makeTestGrid`, `requireBoss`).
- `rubble_blocks places 4 cells`: `BOSS/TRIGGER` `old_stoneface`, assert 4 `state.grid` cells with `rubble === true`.
- `BOSS/RESOLVE clears the flags`: after a win, assert no cell has `frozen`/`rubble` (`clearModifier` ran).
- `GRID/SYNC round-trips frozen/rubble`: emit a serialized grid with frozen/rubble through `GRID/SYNC`, assert `state.grid` keeps them. (Proves the scene→state channel carries flags — `_syncGridToState` already writes them.)
- Because vitest can't mount Phaser, the **fill-time re-apply** (`_applyBossModifiersToBoard`) is verified by e2e/manual, not unit.

**New e2e (Playwright, `tests/e2e/`):** trigger a boss (use the debug `BOSS/TRIGGER` button or seed state), enter the board, assert via `window.__phaserScene` that the expected columns/cells report `frozen`/`rubble` and that a drag over a frozen tile does not extend the chain. (Informational — e2e is NOT in CI today; still run it.)

**Manual in-game check (this host — preview_screenshot HANGS, assert via DOM/scene):**
1. Spin a worktree Vite on a spare port: `node ../../../node_modules/vite/bin/vite.js --port <PORT>` with base `/puzzleDrag2/` (worktree has no node_modules; the `:5173` server serves MAIN, not this worktree).
2. In devtools: `window.__hearthVisual.dispatch({ type: "BOSS/TRIGGER", bossKey: "frostmaw" })`, then drive into the board (`FARM/ENTER`).
3. Inspect the scene: `const s = window.__phaserScene; s.grid.flat().filter(t=>t&&t.frozen).length` → should be `2 * ROWS` (2 frozen columns). Repeat with `old_stoneface` → 4 rubble.
4. Confirm the frozen/rubble tiles show the tint, and that the boss HUD DOM contains the modifier text (`getComputedStyle`/`textContent` assert).
5. Win or `BOSS/REJECT`; confirm `s.grid.flat().every(t=>!t||(!t.frozen&&!t.rubble))` and tints cleared.

**Visual goldens:** `npm run test:visual` will likely diff (board now tints tiles). On this Windows host goldens are **not regenerable** (Phaser WebGL ~38% drift). Treat diffs as **informational**; re-baseline on the canonical host and justify in the PR. Do NOT trust a local regen.

## Double-check / adversarial review

**Prove the dormant path now fires (it previously never did):**
- The skeptic's first attack: "you re-applied flags but `regenerateBoard`/`FARM/ENTER` still wipes them." Defend by asserting in the manual check **after** a `FARM/ENTER` (which bumps `_boardNonce` → `regenerateBoard` → `fillBoard(true)`) that frozen count is still `2*ROWS`. If it's 0, the re-apply call at the end of `fillBoard`/`regenerateBoard` is missing or runs before the boss registry is set.
- Order-of-operations trap: the `boss` registry value is pushed by a `useEffect` in `prototype.tsx:303` keyed on `gameState.boss`. If `BOSS/TRIGGER` and the board entry happen in the same tick, the scene's fill may run before the registry `boss` updates. Mitigate by also re-applying in `onRegistry("boss", ...)` (mid-board trigger) — verify both the fresh-board and mid-board trigger orders.
- Frozen-column persistence under cascade: chain a column adjacent to a frozen one, force several `fillBoard(false)` refills, and confirm frozen tiles keep coming back frozen (the re-apply at end of `fillBoard` must run on the `initial=false` path too).

**Edge cases:**
- `frozen` AND `selected`: select a normal tile next to a frozen one; ensure `setSelected` texture swap doesn't drop the frozen tint on the frozen tile, and that a frozen tile can't be selected at all (`tryAddToPath:1453`).
- `clearModifier` on the **state.grid** vs **live TileObj tint**: `clearModifier` (`modifiers.ts:151-162`) deletes flags on the state grid; the live tiles' tint must also clear. Add a visual refresh on `BOSS/RESOLVE`/`BOSS/REJECT` (those push a new `grid`/`boss` registry value → the scene's `onRegistry("grid"/"boss")` should refresh visuals).
- Keeper-trial bosses: `isKeeperTrial` bosses bypass several boss paths (`slice.ts:139, 201, 227`). Confirm they don't accidentally get modifiers (they use a different flow); a keeper trial should not freeze the board unless intended.
- Non-grid bosses: Storm (`min_chain`) and Quagmire (`respawn_boost`) have no grid flags — `_applyBossModifiersToBoard` must be a no-op for them (their `modifierState` has no `frozenColumns`/`rubble`).

**Rollback safety:** the change is additive (a new scene helper + `TileObj` setters + a HUD line + a comment fix). No persisted-shape change, no `SAVE_SCHEMA` bump, no new action type. Reverting the GameScene helper call restores prior behavior with zero save impact. If the visual tint is contentious, it can be dialed back independently of the enforcement wiring.

**"Did I really wire it" checklist:** grep that `_applyBossModifiersToBoard` is called from (a) end of `fillBoard`, (b) end of `regenerateBoard`, and (c) the `boss` registry listener. Run the new unit test and confirm it **fails** if you stub the re-apply out (proves the test guards the real path).

## Risks & gotchas

- **The seed brief's premise is partly wrong** — don't "wire `tickModifier` into CLOSE_SEASON," it's already there (`slice.ts:246`). The actual fix is the **fresh-board fill bridge** + visuals. Re-read CORRECTION 1/2 before touching the slice.
- **`fillBoard` is hot and shared** across farm/mine/fish + cascades. Adding a per-fill grid walk is cheap (36 cells) but make `_applyBossModifiersToBoard` a fast no-op when `boss?.modifierState` is absent so non-boss boards pay nothing.
- **Registry timing** (boss value vs board fill) is the most likely failure mode — see adversarial section. Always re-apply in the `boss` registry listener too.
- **`hidden` is a trap to avoid scope-creeping into**: it needs a new `TileObj` flag, reveal-on-chain, `RegistryGridCell.hidden`, serialization, AND a SAVE_SCHEMA bump (persisted grid shape). Keep it deferred.
- **Visual goldens will drift and can't be regenerated here.** Expect diffs from the tint; document, don't chase them on this host.
- **Two `BossState` types** exist (`src/features/boss/slice.ts:11-29` runtime shape vs the registry/`types/state.ts` UI subset). The scene reads via narrowing casts at the boundary — match the existing pattern (`data.ts:114`, `:156`).
- **No new action** keeps you clear of the slice-registration footgun; if you must add one, register it in `SLICE_PRIMARY_ACTIONS` (`state.ts:1590`) and run `check-slice-action`.

## References

- `src/features/bosses/modifiers.ts` — `applyModifierToFreshGrid` (`:48-92`), `tickModifier` (`:109-145`), `tileIsChainable` (`:98-100`), `clearModifier` (`:151-162`).
- `src/features/bosses/data.ts` — `BOSSES` (`:23-78`), `spawnBoss` (`:125-150`, calls `applyModifierToFreshGrid` at `:132`), `tickBossTurn` (`:152-180`), `bossReward` (`:88-96`).
- `src/features/boss/slice.ts` — live slice: `triggerBoss`/`spawnBoss` (`:76-107`), `BOSS/RESOLVE`/`REJECT` `clearModifier` (`:142,160`), `CLOSE_SEASON` `tickModifier` (`:241-263`), `BossState` (`:11-29`).
- `src/features/boss/uiMeta.ts` — `BOSS_UI` emoji/flavor/goal.
- `src/features/boss/index.tsx` — the React boss HUD (Step 3 surface).
- `src/GameScene.ts` — `_effectiveMinChain` (`:553-556`), `fillBoard` (`:956+`, spawnBias `:979-990`), `regenerateBoard` (`:737-754`), `_applyGridFromState` (`:903-918`), `_syncGridToState` (`:881-901`), `tryAddToPath` (`:1451-1468`), registry listeners (`:263-367`), `boardRestoreGrid` (`:186-190`).
- `src/TileObj.ts` — `frozen`/`rubble` fields (`:56-57,72-73`), `setSelected` (`:99-129`), `setResource` (`:131-134`).
- `src/state.ts` — `FARM/ENTER` (`:1094-1162`, nonce bump `:1141`), `CLOSE_SEASON` core (`:950+`), `GRID/SYNC` (`:232-237`), `boardTurnPatch` (`:147-166`), `SLICE_PRIMARY_ACTIONS` (`:1590-1634`), `ALWAYS_RUN_SLICES` (`:1639-1642`), `rawReducer` (`:1653-1671`).
- `prototype.tsx` — registry bridge: `boss` push (`:303`), `newBoardNonce` (`:301`), `grid` (`:295`), `GRID_SYNC → GRID/SYNC` (`:221`).
- `src/types/phaserRegistry.ts` — `RegistryGridCell` (`:33-38`), registry key map (`boss`, `grid`, `boardRestoreGrid`, `newBoardNonce`).
- `src/state/storyEffects.ts:38-45` — story-beat boss trigger (`pendingBossKey → BOSS/TRIGGER`).
- `src/state/persistence.ts` — `persistStateNow` whitelist (`:34-45`), version gate (`:23-29`); `SAVE_SCHEMA_VERSION` (`src/constants.ts:207`).
- `src/balanceManager/wiki/status.ts:60-64` (the stale comment) + `status.test.ts`; `src/balanceManager/bossBalance.ts:29-36` (modifier labels/hints, reuse for UI copy).
- Tests to model after: `src/__tests__/boss-8.1.test.ts` (modifier engine), `src/__tests__/board-regen-nonce.test.ts` (nonce/regen behavior), `src/__tests__/audit-boss.test.ts`, `src/__tests__/storm-boss.test.ts`.
- Skills: `check-slice-action` (any new action type), `phaser-scene-debug` (state↔registry↔scene boundary), `pre-pr-check` (PR body). Memory: `live-game-preview-verify`, `phaser-scene-debug` patterns.
- Related project doc: `docs/archive/projects/08-save-migration-ladder.md` (required if `hidden`/`heat` deferred work is later pulled in — persisted grid shape change).

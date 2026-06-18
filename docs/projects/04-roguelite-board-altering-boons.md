# Roguelite Board-Altering Boons

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Today the keeper **Coexist vs Drive-Out** fork buys boons that are *only* passive percentage multipliers (`coin_gain_mult`, `bond_gain_mult`) applied kingdom-wide in the reducer. They never touch the board, so the two paths feel mechanically identical — just two flavors of "+X% income." This makes the run's "build" layer a non-decision.

This brief adds a family of **board-feel boons** that change how chaining itself plays: diagonal chains count double, cross-collect reaches one tile further, the first chain of each season is a free move, big chains award an extra upgrade tier, and every Nth chain seeds a wildcard/upgrade. Each board boon slots into the **existing** boon-effect aggregation (`boonEffectMult` / new typed readers) and the **existing** `CHAIN_COLLECTED` payload + `collectPath` flow. Economy boons stay. The win condition is that picking Coexist vs Drive-Out becomes a genuine strategic identity choice — "I'm running the diagonal-double board build" vs "I'm running the income build" — and that the new boons are bounded so they don't inflate income uncontrollably.

## Background & current state (VERIFIED)

All references below were read directly in this worktree. **Several seed-brief claims were inaccurate — corrections are flagged inline.**

### The boon system (SHIPPED — Phase 6b)

- **`src/features/boons/data.ts`** — `BOON_EFFECTS` (line 17) is frozen to exactly two effect strings: `"coin_gain_mult"`, `"bond_gain_mult"`. ✔ Seed brief correct.
  - `BoonDef.effect` is `{ type: string; params: { mult: number } }` (lines 29–32). **NOTE: `params` is typed as `{ mult: number }` only** — any new param (e.g. `n`, `radius`, `tier`) requires widening this interface (see plan).
  - `BOONS` catalog (line 53) = 6 catalogs keyed `${type}_${path}` (`farm_coexist`, `farm_driveout`, `mine_coexist`, `mine_driveout`, `harbor_coexist`, `harbor_driveout`), each with **exactly 2 boons today**. **CORRECTION to seed brief:** catalogs are split by zone *type* (`farm`/`mine`/`harbor`) — the seed brief's "farm/coexist" phrasing is fine but note the catalog key uses `harbor`, not `sea`.
  - `boonEffectMult(state, effectType)` (line 131) — iterates `state.boons`, finds owned boons whose `effect.type` matches, composes `params.mult` **multiplicatively**. Returns `1` when none match. This is the single aggregation hook the brief targets. ✔
  - `boonOwned(state, id)` (line 123), `boonById(id)` (line 95), `allBoons()` (line 86), `boonIsUnlocked(state, boon)` (line 100, gated on any `keeper_*_<path>` story flag), `canAffordBoon(state, boon)` (line 115).
- **`src/features/boons/slice.ts`** — owns `state.boons` (`{ [boonId]: true }`, `initial` at line 13) and the `BOON/PURCHASE` action (line 17): validates owned/unlocked/affordable, deducts `embers`/`coreIngots`, sets `boons[id] = true`, fires a bubble. Pure; no board logic.
- **`src/features/boons/index.tsx`** — the Boon screen (`viewKey = "boons"`). `BoonCard` (line 72) renders name/desc/cost and an effect icon chosen by `boon.effect.type` (line 78: maps `coin_gain_mult`→`boon_coin_mult`, `bond_gain_mult`→`boon_bond_mult`, else `null`). **New effect types will render with no icon unless extended.**
- **`src/types/catalog/boons.ts`** — `enum BoonId` (line 6), hand-maintained. New boons need new enum members here + `BOON_ID_VALUES` is derived (line 27).
- **`src/types/catalogKeys.ts`** re-exports `BoonId` (line 44).

### Where boons currently touch a chain (SHIPPED)

- **`src/state.ts` `CHAIN_COLLECTED` handler** (case at line 238). The chain reward path:
  - `baseCoinsGain = Math.max(1, Math.floor(gained * (value ?? 1))) + coinHookBonus` (line 401).
  - `coinMultBoon = boonEffectMult(state, "coin_gain_mult")` (line 403); `coinsGain = coinMultBoon > 1 ? Math.floor(baseCoinsGain * coinMultBoon) : baseCoinsGain` (line 404). ✔ This is the only board-adjacent boon hook today, and it is **coin-only**.
  - `TURN_IN_ORDER` uses `boonEffectMult(state, "bond_gain_mult")` for bond delta (line 552). `boonEffectMult` is imported at `src/state.ts:47`.
- **`state.boons` IS available inside the reducer** (it's part of `GameState`). This matters: any board boon whose math can run in the reducer (upgrade-tier bump, free-first-chain turn skip, cross-collect-count scaling, every-Nth seeding) should be wired in `CHAIN_COLLECTED` where `boonEffectMult(state, …)` already works.

### The chain payload + `collectPath` (SHIPPED)

- **`src/GameScene.ts` `collectPath()`** (line 1787) builds and emits the `CHAIN_COLLECTED` payload (line 1896):
  ```
  this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, {
    key: res.key, gained: totalGained, upgrades, chainLength: this.path.length,
    value: res.value, chain: chainTiles, resourceKey, crossCollected,
  });
  ```
  - `upgrades = next ? upgradeCountForChain(this.path.length, res.key, effThresholds) : 0` (line 1804). `upgradeCountForChain` is `Math.floor(chainLength / threshold)` (`src/utils.ts:68`).
  - `crossCollected = buildCrossCollectedCredits(crossTargets)` (line 1872), where `crossTargets = findCrossCollectTargets(this.grid, this.path.map(...))` (line 1799).
  - **`this.path`** is an array of `TileObj` each carrying `{ row, col, res: { key }, x, y, sprite }`. Diagonal segments are detectable from consecutive path cells: a step is diagonal iff `Math.abs(dr) === 1 && Math.abs(dc) === 1`. Path adjacency already permits diagonals — see `tryAddToPath` (`src/GameScene.ts:1466`): `adj = Math.abs(tile.col-last.col) <= 1 && Math.abs(tile.row-last.row) <= 1 && !(same cell)`.
- **`src/GameScene.ts` ONLY sees the Phaser registry, not `state.boons`.** The scene reads board config (`effectiveThresholds`, `bonusYields`, `inventoryCap`, `inventory`) via `getRegistry(this.registry, …)` (e.g. lines 1803, 1807, 1813–1814). These are pushed from React in **`prototype.tsx`** via `setRegistry(game.registry, …)` effects (e.g. `inventory` at line 305, `inventoryCap` at line 306; full set around lines 176–315). **This is the registry bridge documented in CLAUDE.md** (`src/phaserBridge.ts` is only the scene *handle*; the typed get/set live in `src/types/phaserRegistry.ts`).

### Cross-collect (SHIPPED)

- **`src/game/crossCollect.ts`** — pure (no Phaser/React). `findCrossCollectTargets(grid, pathCells)` (line 91) uses `DIRS4` orthogonal neighbours (line 38, radius = 1) and `CROSS_COLLECT_PAIRINGS` (line 21) to find partner-category tiles adjacent to any chain cell, deduped. `buildCrossCollectedCredits(targets)` (line 139) → `{ [tileKey]: +1 }`. **"cross-collect radius +1" must change the neighbour search here** (and be fed a boon-derived radius, since this module currently hard-codes orthogonal radius 1).

### The slice footgun (CRITICAL — VERIFIED)

- `src/state.ts` `SLICE_PRIMARY_ACTIONS` (line 1590) **already contains `"BOON/PURCHASE"`** (line 1630). So purchasing works. **A board boon that needs a NEW action type would silently no-op unless registered here or in `ALWAYS_RUN_SLICES` (line 1639).** This brief is designed to need **NO new action types** (all board-boon math piggybacks on existing `CHAIN_COLLECTED` / `BOON/PURCHASE`), which sidesteps the footgun entirely. If you deviate and add an action, run the `check-slice-action` skill.

### Persistence (VERIFIED — likely NO schema bump)

- `src/state/persistence.ts` persists the **whole state minus a VOLATILE allowlist** (`persistStateNow`, line 34; VOLATILE = `modal/bubble/view/viewParams/pendingView/craftingTab`, line 6). `state.boons` is already persisted. `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`); a mismatch **wipes the save with no migration** (`loadSavedState`, line 23).
- **Adding new boon ids does NOT change the persisted shape** (`boons` is already `{ [id]: true }`). **No SAVE_SCHEMA bump for the boons map.**
- **Re-use `chainsThisSeason` (already persisted)** for "first chain free" / "every Nth chain" — it lives on the root state (`src/types/state.ts:303`, also `gameStateFields.ts:77`) and is incremented in **`src/features/achievements/slice.ts:55`** on `CHAIN_COLLECTED` (`chainsThisSeason = state.chainsThisSeason + 1`, reset to 0 on season roll at line 116). **CORRECTION to a likely assumption:** `chainsThisSeason` is owned by the *achievements* slice, not `seasonStats`. It is incremented **after** core runs (slices see post-core state), so inside `CHAIN_COLLECTED` core you read the *pre-increment* value (the count *before* this chain) — "first chain of the season" is `state.chainsThisSeason === 0`. If you instead need a brand-new persisted counter, that DOES require a SAVE_SCHEMA bump (avoid it — reuse `chainsThisSeason`).

### Existing test that WILL break (VERIFIED)

- **`src/__tests__/boons.test.ts:56`** asserts `b.effect.type` matches `/^(coin_gain_mult|bond_gain_mult)$/` and **line 57** asserts `b.effect.params.mult > 1`. Adding board-effect types and boons whose params are not `mult` **will fail this test** — it must be updated to allow the new effect types and to only assert `mult > 1` for the multiplier-typed boons. This is expected and is part of the work.

## Scope

**In scope:**
- Add **4 board-feel boon effect types** to `BOON_EFFECTS` and the `BoonEffect.params` shape.
- Define **5 concrete board boons** (one per new effect family + one variant) with bounded numbers, distributed across the Coexist / Drive-Out catalogs so the two paths diverge in board identity.
- Wire each board boon through the existing chain flow:
  - **Reducer-side** (`state.ts CHAIN_COLLECTED`): upgrade-tier bump, free-first-chain (no turn consumed), every-Nth-chain seed, diagonal-double yield. These use `boonEffectMult` / new typed readers against `state.boons`.
  - **Pure-module-side** (`crossCollect.ts`): cross-collect radius +1, driven by a boon-derived radius passed from the caller.
  - **Scene-side** (`GameScene.collectPath` + `prototype.tsx` registry bridge): pass diagonal-segment info into the payload, and push a boon-derived `crossCollectRadius` into the registry.
- New helper(s) in `src/features/boons/data.ts` for non-multiplier board effects (count / flag / tier readers).
- Tuning notes + caps (pair with doc 05 — economy tuning).
- Update `boons.test.ts` + add new unit tests for each board boon.
- Update `BoonCard` icon mapping + (optionally) effect-icon keys for the new types.

**Out of scope / non-goals:**
- No new dispatched **action types** (keeps the slice footgun out of play). All board-boon math rides existing `CHAIN_COLLECTED`.
- No **SAVE_SCHEMA_VERSION** bump (reuse `state.boons` and `chainsThisSeason`).
- No rebalance of the existing economy boons' percentages (only *add* board boons; income-tuning of the new ones is in scope, restructuring old ones is not).
- No new art pipeline / PixelLab generation. New effect icons are optional and may reuse existing icon keys or fall back to no icon.
- No changes to keeper/path *gating* logic (`boonIsUnlocked` stays as-is).
- No multi-tile "wildcard" tile *type* invention — the "every Nth chain seeds" boon spawns an **existing upgrade tile** at the chain endpoint via the existing `pendingUpgrades` mechanism (no new tile asset).

## Implementation plan

Ordered. Names are exact. Code sketches are illustrative — verify symbols before pasting.

### 1. Widen the boon effect model (`src/features/boons/data.ts`)

- Extend `BOON_EFFECTS` (line 17):
  ```ts
  export const BOON_EFFECTS = Object.freeze([
    "coin_gain_mult",
    "bond_gain_mult",
    "diagonal_chain_double",   // diagonal segments count toward yield/coins ×2
    "cross_collect_radius",    // params.radius: orthogonal cross-collect reach (default 1)
    "first_chain_free",        // first chain each season consumes no turn
    "upgrade_tier_bonus",      // params.n: +1 upgrade when chainLength >= n
    "nth_chain_seed",          // params.n: every Nth chain seeds an extra upgrade tile
  ] as const);
  ```
- Widen `BoonEffect.params` (line 30) to carry the new fields:
  ```ts
  export interface BoonEffect {
    type: string;
    params: { mult?: number; radius?: number; n?: number };
  }
  ```
  (Keep `mult` optional; existing economy boons keep using it.)
- Add **typed readers** alongside `boonEffectMult` (so reducer/caller code is clean and the "owned + matching effect type" scan is centralized):
  ```ts
  /** True if any owned boon has this (flag-style) effect type. */
  export function boonEffectActive(state: GameState, effectType: string): boolean { … }
  /** Max numeric param across owned boons of this type, or `fallback`. */
  export function boonEffectMax(state: GameState, effectType: string, param: "radius" | "n", fallback: number): number { … }
  ```
  Implement by mirroring `boonEffectMult`'s loop (lines 131–142): iterate `state.boons`, `boonById(id)`, match `effect.type`, read the param. **Do NOT compose radius multiplicatively** — take the MAX (stacking two radius boons should not give radius 3 unless intended; pick MAX and cap at +1 over base for v1).

### 2. Add the new boon ids + catalog entries

- **`src/types/catalog/boons.ts`** — add enum members (e.g. `EdgeRunner = "edge_runner"`, `WideHarvest = "wide_harvest"`, `MorningGrace = "morning_grace"`, `MasterChainer = "master_chainer"`, `SeedCaller = "seed_caller"`). `BOON_ID_VALUES` derives automatically (line 27).
- **`src/features/boons/data.ts` `BOONS`** — append one board boon per relevant catalog. **Identity split (Coexist = nurturing/board-flow, Drive-Out = aggressive/yield):**

  | Boon (id) | Catalog | Effect | Params | Cost | Bound / rationale |
  |---|---|---|---|---|---|
  | **Edge Runner** (`edge_runner`) | `farm_coexist` | `diagonal_chain_double` | — | `embers: 10` | Only the **diagonal segment count** doubles, not the whole chain (see §4). Caps the inflation: a straight chain gets nothing. |
  | **Wide Harvest** (`wide_harvest`) | `farm_coexist` | `cross_collect_radius` | `radius: 2` | `embers: 12` | Radius 1→2 only (no further). Cross-collect already credits +1 per partner at its own threshold — radius 2 roughly +50–80% partner pickups, bounded by board density. |
  | **Morning Grace** (`morning_grace`) | `mine_coexist` | `first_chain_free` | — | `embers: 6` | One free move per season only. Pure tempo, **zero yield inflation** (no extra resources, just no turn cost). |
  | **Master Chainer** (`master_chainer`) | `mine_driveout` | `upgrade_tier_bonus` | `n: 8` | `coreIngots: 12` | +1 upgrade tile only when `chainLength >= 8`. Gated behind effort; +1 upgrade ≈ +1 next-tier resource per qualifying chain. |
  | **Seed Caller** (`seed_caller`) | `harbor_driveout` | `nth_chain_seed` | `n: 5` | `coreIngots: 10` | Every 5th chain seeds **one** extra upgrade tile at the endpoint. Frequency-bounded (1 in 5). |

  (5 boons total — meets the 3–5 ask. Adjust catalog placement to taste, but keep ≥2 Coexist and ≥2 Drive-Out so both paths gain board identity.)

### 3. Push a boon-derived cross-collect radius to the registry (`prototype.tsx` + `src/types/phaserRegistry.ts`)

- Add `crossCollectRadius: number` to the `GameRegistryContract` (`src/types/phaserRegistry.ts` near line 99, the scene→React board-config block).
- In **`prototype.tsx`**, add a `setRegistry` effect mirroring the `inventory` one (line 305):
  ```ts
  useEffect(() => {
    setRegistry(gameRef.current?.registry, "crossCollectRadius",
      boonEffectMax(gameState, "cross_collect_radius", "radius", 1));
  }, [gameState?.boons]);
  ```
  (Import `boonEffectMax` from `src/features/boons/data.js`.) Also set it in the initial bridge block (around lines 176–197) so a reload restores it.

### 4. Wire the board effects into the chain flow

**4a. Cross-collect radius (`src/game/crossCollect.ts`)** — make the neighbour search radius a parameter:
```ts
export function findCrossCollectTargets(grid, pathCells, radius = 1): CrossCollectTarget[] {
  …
  // replace the DIRS4 loop with a (2r+1)² box (excluding the chain cell itself),
  // OR keep orthogonal-only but extend distance: for r in 1..radius, for each DIR4.
}
```
Then in **`GameScene.collectPath`** (line 1799) pass the registry radius:
```ts
const ccRadius = getRegistry(this.registry, "crossCollectRadius") ?? 1;
const crossTargets = findCrossCollectTargets(this.grid, this.path.map(…), ccRadius);
```
Decide ortho-extended vs box reach in §Tuning; **orthogonal-distance ≤ radius** is the safest bound. Keep `buildCrossCollectedCredits` unchanged.

**4b. Diagonal-double, upgrade-tier-bonus, free-first-chain, nth-chain-seed** all run **in the reducer** (`state.ts CHAIN_COLLECTED`), where `state.boons` is available:

- **Pass diagonal info in the payload.** In `collectPath` (line 1896), add a `diagonalSteps` count computed from `this.path`:
  ```ts
  let diagonalSteps = 0;
  for (let i = 1; i < this.path.length; i++) {
    const dr = Math.abs(this.path[i].row - this.path[i-1].row);
    const dc = Math.abs(this.path[i].col - this.path[i-1].col);
    if (dr === 1 && dc === 1) diagonalSteps++;
  }
  // …emit: { …, diagonalSteps }
  ```
  In `CHAIN_COLLECTED`, when `boonEffectActive(state, "diagonal_chain_double")`, add `diagonalSteps` to the *effective tile count* used for coin yield (NOT to inventory `gained`/`progress`, to avoid double-crediting resources — see Tuning). Concretely: `const yieldTiles = gained + (diagDouble ? diagonalSteps : 0);` then `baseCoinsGain = Math.max(1, Math.floor(yieldTiles * (value ?? 1))) + coinHookBonus;`.

- **Upgrade-tier bonus.** The `upgrades` count is computed in the scene (line 1804) and arrives in the payload. In `CHAIN_COLLECTED`, after destructuring `upgrades`, apply:
  ```ts
  const tierBonusN = boonEffectMax(state, "upgrade_tier_bonus", "n", Infinity);
  const effUpgrades = (effectiveChain >= tierBonusN && upgrades > 0) ? upgrades + 1 : upgrades;
  ```
  **GOTCHA:** the *extra upgrade tile* that spawns on the board is queued in the **scene** (`pendingUpgrades`, line 1842–1844), not the reducer. The reducer's `upgrades` only feeds `seasonStats.upgrades` (line 413) and the achievements slice (`collected[res.next] += upgrades`, achievements/slice.ts:48–49). So a reducer-only bonus credits the *resource* but won't visually spawn the extra tile. **Decision:** compute the tier bonus **in the scene** instead (where `pendingUpgrades` lives) so the board and the reducer agree. To do that, the scene needs the boon state → push a `boonUpgradeTierN` (or the whole owned-boons-derived board flags) to the registry, same pattern as 4a. **Recommended:** add a single registry key `boardBoons: { diagonalDouble: boolean; crossCollectRadius: number; upgradeTierN: number; nthSeed: number; firstChainFree: boolean }` computed once in `prototype.tsx` from `gameState.boons`, and read it in `collectPath`. This keeps board-visual effects (extra upgrade tile, seed tile) in the scene and avoids reducer/scene divergence.

- **Nth-chain seed.** Reuse `chainsThisSeason`. Because the scene owns tile spawning, do this in `collectPath`: read `boardBoons.nthSeed` from the registry and the current chain index. **The chain index must come from the registry too** — push `chainsThisSeason` into the registry from `prototype.tsx` (it isn't there today). When `nthSeed > 0 && (chainsThisSeason + 1) % nthSeed === 0`, push one extra `this.pendingUpgrades.push({ res: next ?? res, col, row })` at the endpoint (guard `next` non-null; if no upgrade tile exists for this resource, skip or seed the base tile).

- **Free first chain.** In `CHAIN_COLLECTED`, the turn is consumed by `const turn = boardTurnPatch(state);` (line 409) and applied to `afterChain` (lines 463–466) + the season-end check (`modal: turn.ended ? "season" : …`, line 473). To make the first chain free:
  ```ts
  const firstChainFree = boonEffectActive(state, "first_chain_free") && state.chainsThisSeason === 0;
  const turn = firstChainFree ? noTurnPatch(state) : boardTurnPatch(state);
  ```
  where `noTurnPatch` returns the same shape as `boardTurnPatch` but with `turnsUsed` unchanged and `ended:false`. **Verify `boardTurnPatch`'s return shape first** (search `function boardTurnPatch` in `src/state.ts`) and construct the no-op variant to match (it must still produce `tileCollection`/`farmRun` fields the spread expects). **Caveat:** `chainsThisSeason` is incremented by the achievements slice *after* core, so reading `state.chainsThisSeason === 0` inside core correctly identifies the season's first chain. Confirm the achievements reset (slice.ts:116) and the season-roll path keep this in sync.

### 5. UI surface (`src/features/boons/index.tsx`)

- Extend the effect→icon map (line 78) so new types pick an icon (or fall back to `null` cleanly). Optional: add `boon_board_*` icon keys; if absent, `hasIcon` already guards rendering (line 95).
- The desc strings carry the player-facing explanation — write them concretely (e.g. "Diagonal links in a chain count twice for coins.").

### 6. Tests + validation (see Validation section)

- Update `src/__tests__/boons.test.ts:56–57` to allow the new effect types and only assert `mult > 1` for multiplier boons.
- Add `src/__tests__/board-boons.test.ts` (reducer-level) and `src/__tests__/crossCollect.*` radius cases.

### 7. Housekeeping

- After code changes: `graphify update .` (per CLAUDE.md).
- `npm run lint && npm run typecheck && npm test`.

## Success criteria

- [ ] `BOON_EFFECTS` includes the 5 new effect types and `BoonEffect.params` carries `radius` / `n` without breaking the existing 2 economy boons.
- [ ] 5 new board boons exist in `BOONS`, each with a unique `BoonId` enum member, split so both Coexist and Drive-Out catalogs gain ≥2 board boons.
- [ ] **diagonal_chain_double**: with the boon owned, a chain containing K diagonal steps yields coins as if it had `gained + K` tiles; **inventory/progress for the resource is unchanged** (no resource double-credit). Without the boon, identical chains behave exactly as today.
- [ ] **cross_collect_radius**: with the radius boon owned, `findCrossCollectTargets` reaches one tile further (orthogonal distance ≤ 2) and credits the extra partners; default behavior (radius 1) is byte-for-byte unchanged when the boon is absent.
- [ ] **first_chain_free**: the first chain of a season with the boon owned **does not advance `turnsUsed`** and does not trigger season end on its own; the second chain onward consumes turns normally. Without the boon, every chain consumes a turn.
- [ ] **upgrade_tier_bonus**: a chain with `chainLength >= n` and the boon owned spawns **one extra upgrade tile** on the board (visible) AND credits +1 to the upgraded resource; chains below `n` are unaffected.
- [ ] **nth_chain_seed**: every Nth chain (1-indexed within the season) with the boon owned spawns one extra upgrade/seed tile at the endpoint; non-Nth chains are unaffected.
- [ ] No new dispatched action types were added (verified by grep + `check-slice-action`); `BOON/PURCHASE` remains the only boon action.
- [ ] `SAVE_SCHEMA_VERSION` is **unchanged** (still 45) and an existing save loads without being wiped.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` all pass; `boons.test.ts` updated and green.
- [ ] In-game: owning two opposite-path board boons produces visibly different board behavior (manual check below).

## Validation — how to verify

**Gating (must pass before PR):**

- `npm run typecheck` — pass = no TS errors. The `BoonEffect.params` widening + new `BOON_EFFECTS` union must compile across `data.ts`, `index.tsx`, `state.ts`, and tests.
- `npm run lint` — pass = clean.
- `npm test` (vitest, node env, **no canvas**) — pass = all suites green, including the **updated `src/__tests__/boons.test.ts`** and the **new** tests below.
- `npm run build` — pass = production bundle builds (catches entry-level type drift).

**New unit tests to add (these are the real proof — the Phaser layer has ZERO unit coverage, so push board-boon math into pure/reducer code and test there):**

- **`src/__tests__/board-boons.test.ts`** (reducer-level, mirrors `boons.test.ts` setup with `createInitialState` + a keeper flag + owned boon):
  - `diagonal_chain_double`: dispatch `CHAIN_COLLECTED` with `{ gained: 5, value: 2, diagonalSteps: 3, chainLength: 5, resourceKey, key }`; assert `coins` increased by `floor((5+3)*2)` with the boon vs `floor(5*2)` without; assert the resource inventory/`resourceProgress` delta is **identical** in both cases (no double-credit).
  - `upgrade_tier_bonus`: with `n:8`, a `chainLength: 8` chain credits one more upgraded resource than the same chain without the boon; a `chainLength: 7` chain is unchanged. (Assert via `seasonStats.upgrades` and/or the achievements `collected[res.next]`.)
  - `first_chain_free`: from a state with `chainsThisSeason: 0` + boon owned, `CHAIN_COLLECTED` leaves `turnsUsed` unchanged; a follow-up chain (`chainsThisSeason: 1`) advances `turnsUsed`. Without the boon, the first chain advances `turnsUsed`.
  - `nth_chain_seed` (math-only if spawn is scene-side): unit-test the predicate helper `(chainsThisSeason + 1) % n === 0`.
- **`src/__tests__/crossCollect.test.ts`** (extend existing, or new): `findCrossCollectTargets(grid, path, 2)` returns partners at orthogonal distance 2 that `radius 1` excludes; `findCrossCollectTargets(grid, path, 1)` is identical to the no-arg call (default).
- **`src/__tests__/boons.test.ts`**: update the catalog-shape assertions to accept the new effect types; add ownership/composition cases for `boonEffectActive` and `boonEffectMax` (e.g. two radius boons → MAX, not sum/product).
- **`src/__tests__/actionTypes.test.ts`**: confirm it still passes (no new action types expected).

**Manual in-game check (the visual/canvas effects have no unit coverage):**

- Spin a worktree Vite on a spare port with base `/puzzleDrag2/`: `node ../../../node_modules/vite/bin/vite.js` (worktree has no `node_modules`). The `:5173` server serves MAIN, not this worktree.
- `preview_screenshot` HANGS on this host — **do not use it**. Drive/inspect via `window.__hearthVisual.dispatch/state/freeze` and `window.__phaserScene`; assert via DOM + `getComputedStyle`.
- Grant the boons by setting a keeper flag + `boons` in state, e.g. `window.__hearthVisual.dispatch({ type: "BOON/PURCHASE", payload: { id: "wide_harvest" } })` (after setting the keeper flag), or `freeze` a state with `boons: { wide_harvest: true }`.
- **cross_collect_radius**: chain a category whose partner is two cells away orthogonally; confirm the distance-2 partner tile clears (it would not without the boon).
- **first_chain_free**: read `window.__phaserScene` board state / `window.__hearthVisual.state().turnsUsed` before and after the season's first chain — it must not advance.
- **diagonal_chain_double**: chain a diagonal path and confirm the coin pill / `seasonStats.coins` reflects the doubled diagonal steps.

**Informational (not gating on this host):** `npm run test:e2e`, `npm run test:visual` — visual goldens are **not regenerable on this Windows host** (DOM drifts 3–5%, Phaser WebGL ~38%) and e2e/visual are not in CI. Re-baseline only on the canonical host. A board-boon change *can* alter board rendering (extra tiles spawned, cross-collect clears) — flag any visual diffs for canonical re-baseline rather than trusting a local regen.

## Double-check / adversarial review

- **"Did I really wire it?"** For each board boon, prove the path *fires* by toggling the boon on/off in one test and asserting a behavioral delta — a passing test with the boon *absent* proves nothing. The diagonal/first-chain/tier tests above are written as A/B deltas precisely for this.
- **Slice footgun (the classic silent no-op):** confirm you added **no** new action type. `BOON/PURCHASE` is already in `SLICE_PRIMARY_ACTIONS` (state.ts:1630). If you *did* add one, the `check-slice-action` skill must pass for it; otherwise the slice silently never runs.
- **Reducer ↔ scene divergence (the biggest landmine):** the extra *visual* tile (upgrade_tier_bonus, nth_chain_seed) spawns in the **scene** (`pendingUpgrades`), but the resource *credit* lands in the **reducer**. If you credit the resource in the reducer but spawn the tile in the scene from *different* boon-state reads, they can disagree (board shows a tile but resource not credited, or vice-versa). **Single source of truth:** compute the board-boon flags once in `prototype.tsx` from `gameState.boons`, push them to the registry, and have BOTH the scene reads and (where possible) the reducer logic derive from the same owned-boon state. Add a test that the registry `crossCollectRadius`/`boardBoons` matches `boonEffectMax`/`boonEffectActive` for a given `boons` map.
- **Income-inflation skeptic attack:** "diagonal double + upgrade-tier + cross-collect radius = runaway coins." Defenses to verify: (1) diagonal double credits **coins only**, never resource inventory/progress (test asserts the progress delta is unchanged); (2) cross-collect radius capped at 2; (3) upgrade-tier gated behind `chainLength >= n` (n=8 is a meaningful effort wall); (4) nth-seed is 1-in-N frequency. **Sanity-bound check:** simulate ~50 chains in a unit test with all board boons owned and assert total coins stay within ~1.5–2× the no-boon baseline (tune the bound with doc 05). If it blows past, raise `n` / lower radius.
- **Edge cases to cover:** empty path / single-tile (no diagonals, no crash); a chain with **no** valid upgrade tile (`next == null`) under upgrade-tier/nth-seed (must skip, not throw — guard `next`); `crossCollectRadius` falling off the grid edge (the helper already null-guards `grid[nr]?.[nc]`); season roll resetting `chainsThisSeason` so "first chain free" re-arms each season (verify against achievements/slice.ts:116); two radius boons owned (MAX, not stack).
- **Rollback safety:** the change is additive (new effect types + new boons + new helpers + one optional registry key + a param default of 1 on `findCrossCollectTargets`). With **no** new boon owned, every code path must reduce to today's behavior. Prove it: run the FULL existing suite unchanged except the `boons.test.ts` shape assertions; everything else must stay green. No SAVE_SCHEMA bump = no save wipe = trivially revertable.
- **Persistence proof:** load an existing v45 save (or a frozen state) after the change and confirm it is NOT discarded (`loadSavedState` would `console.warn` and wipe on a version mismatch — there must be none).

## Risks & gotchas

- **Scene can't see `state.boons`.** GameScene reads only the registry. Any board-visual boon (cross-collect radius, extra-tile spawns) MUST be bridged via `setRegistry` in `prototype.tsx` + `GameRegistryContract` in `src/types/phaserRegistry.ts`, and restored in the initial bridge block on reload. Forgetting the reload-restore = boon "disappears" after refresh.
- **Double-crediting resources.** Diagonal-double is intended for **coins**, not resource quantity. Crediting `diagonalSteps` into `gained`/`resourceProgress` would inflate inventory too. Keep it in the coin-yield term only (the test enforces this).
- **`chainsThisSeason` ownership.** It's an **achievements-slice** field incremented *after* core (`achievements/slice.ts:55`). Inside `CHAIN_COLLECTED` core you read the pre-increment value — correct for "first chain of season = `=== 0`". Do not also try to read it post-increment in the same tick.
- **`boons.test.ts` regex/`mult` assertions WILL fail** until updated (lines 56–57). Update them as part of the change, not as an afterthought.
- **No new action types.** Resist adding `BOARD_BOON/...` actions — they'd hit the `SLICE_PRIMARY_ACTIONS` footgun. Everything rides `CHAIN_COLLECTED` / `BOON/PURCHASE`.
- **`boardTurnPatch` shape.** "First chain free" must produce the same patch shape as `boardTurnPatch` (the spread at state.ts:463–466 and the `modal: turn.ended ? …` at 473 depend on `turnsUsed`, `farmRun`, `consumedFreeMove`, `tileCollection`, `ended`). Build the no-turn variant to match exactly, or you'll drop `tileCollection`/`farmRun` updates.
- **Visual goldens not regenerable here.** A board-boon change can move pixels (extra tiles, cleared tiles). Don't trust a local `test:visual` regen; flag diffs for canonical re-baseline.
- **`upgradeCountForChain` thresholds are tile-keyed and zone-effective.** The scene uses `effectiveThresholds` from the registry (GameScene.ts:1803), not raw `UPGRADE_THRESHOLDS`. If you re-derive upgrades anywhere, use the same effective map.
- **Tune with doc 05.** The numbers in §2's table are starting points; pair the income-inflation bound check with doc 05 (economy tuning) before merge.

## References

- `src/features/boons/data.ts` — `BOON_EFFECTS` (17), `BoonDef`/`BoonEffect` (29), `BOONS` (53), `boonEffectMult` (131), `boonById`/`boonOwned`/`boonIsUnlocked`/`canAffordBoon`.
- `src/features/boons/slice.ts` — `BOON/PURCHASE` (17), `state.boons`.
- `src/features/boons/index.tsx` — `BoonCard` effect→icon map (78), purchase dispatch (114).
- `src/state.ts` — `CHAIN_COLLECTED` (238), coin-boon hook (401–406), `boonEffectMult` import (47), `boardTurnPatch` usage (409, 463–473), `SLICE_PRIMARY_ACTIONS` incl. `BOON/PURCHASE` (1590/1630), `ALWAYS_RUN_SLICES` (1639), `rawReducer` slice gating (1653–1671).
- `src/GameScene.ts` — `collectPath` (1787), upgrade/upgrades (1804, 1839–1846 `pendingUpgrades`), cross-collect (1799, 1872), CHAIN_COLLECTED emit (1896), `tryAddToPath` diagonal adjacency (1466), registry reads (1803, 1807, 1813), `_syncWorkerEffects` registry writes (434–437).
- `src/game/crossCollect.ts` — `findCrossCollectTargets` (91), `DIRS4`/radius (38), `buildCrossCollectedCredits` (139).
- `src/game/chain.ts` — `hasValidChain` (14, includes diagonals in `DIRS`).
- `src/utils.ts` — `upgradeCountForChain` (68).
- `src/types/phaserRegistry.ts` — `GameRegistryContract` (board-config block ~97–101), `getRegistry`/`setRegistry` (110/121).
- `prototype.tsx` — registry bridge `setRegistry` effects (176–315; `inventory` 305, `inventoryCap` 306).
- `src/features/achievements/slice.ts` — `chainsThisSeason` increment (55) + season reset (116).
- `src/types/state.ts` — `chainsThisSeason` (303), `GameState` shape; `src/types/catalog/boons.ts` — `BoonId` enum (6); `src/types/catalogKeys.ts` — re-export (44).
- `src/state/persistence.ts` — whole-state persist minus VOLATILE (34/6), version gate (23); `src/constants.ts` — `SAVE_SCHEMA_VERSION = 45` (207).
- `src/__tests__/boons.test.ts` — existing boon tests (effect-type assertion 56–57 must be updated).
- Skills: **`check-slice-action`** (verify any action registration), **`phaser-scene-debug`** (reducer↔registry↔scene boundary), **`coverage-gaps`**, **`pre-pr-check`**.
- CLAUDE.md (engineering rules; note .ts/.tsx vs the doc's stale .js/.jsx). Doc **05** (economy tuning — pair the income-inflation bounds). Doc **08** (save-migration ladder — only relevant if you ignore the no-bump guidance and add a persisted counter).

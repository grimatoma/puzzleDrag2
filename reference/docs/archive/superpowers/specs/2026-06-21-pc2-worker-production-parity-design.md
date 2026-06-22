# PC2-style Worker Production Parity — Design

**Date:** 2026-06-21
**Branch:** `claude/puzzle-craft-costs-comparison-4v2gpk`
**Status:** Approved (scope: full parity in one spec)

## Goal

Port *Puzzle Craft 2*'s worker/production economy into puzzleDrag2 so that
**workers genuinely make resources accrue faster**, every resource line has a
dedicated worker, rarer tile variants cost more tiles per resource, and worker
counts persist across every zone/village.

The originating comparison: PC2 has ~64 workers, each lowering the number of
tiles needed to produce a resource (almost always −1 per hire, with bulk
outliers Peasant −8 grass, Digger −4 dirt, Sculptor −2 rubble). PC2 publishes
**no explicit base tile-per-resource counts**, so we define our own in PC2
style, built on top of our existing 5–10 divisors.

## Background: current state of the code

- **Income divisor** `TILES_PER_RESOURCE` (`src/constants.ts:270`), keyed by
  tile key, seeded equal to `UPGRADE_THRESHOLDS`. The `CHAIN_COLLECTED` reducer
  (`src/state.ts:363`) accrues chain length and rolls
  `floor(progress / divisor)` units into inventory using this map **raw**.
- **Worker reductions** flow through `threshold_reduce_category` →
  `computeAggregatedAbilities(state).thresholdReduce` → `effectiveThresholds`
  registry (`src/GameScene.ts:433`). This currently affects **only board-tier
  upgrades and the HUD "next tile" bar** — *not* income. This is the keystone
  bug: hiring a worker shows "needs fewer" in the HUD but banks resources at the
  un-reduced rate.
- **Workers** live in `src/features/workers/data.ts` (4 today: Farmer,
  Lumberjack, Miner, Baker), `maxCount` 10 each, `-1` per hire via
  `threshold_reduce_category`. Hired counts are in `state.workers.hired` at the
  **root** of `GameState` — already global/permanent across zones (only the
  hire *payment* is drawn from the current zone's inventory).
- **Channel liveness** (from codebase audit):
  - `thresholdReduce` — **live** (board upgrades only; not income yet).
  - `recipeInputReduce` — **live** (`src/features/crafting/slice.ts:28`).
  - `chainRedirect` — **dead**: aggregated at
    `src/config/abilitiesAggregate.ts:178`, never read at runtime.
  - Worker `coinBonusFlat`/`coinBonusPerTile` — **not applied**; only *tile*
    effects are read (`src/state.ts:402`).
  - Runes — produced only by two specific tile chains (mysterious_ore + dirt;
    pearl + fish) in `src/state.ts:309-331`. No worker hook.

## Tile/variant data model

- `CATEGORIES` (`src/features/tileCollection/data.ts:4`) — the production lines:
  - Farm: `grass, grain, bird, vegetables, fruits, flowers, trees,
    herd_animals, cattle, mounts`
  - Mine: `mine_stone, mine_iron_ore, mine_coal, mine_gem, mine_gold,
    special_dirt`
  - Treasure: `treasure` (pays coins directly, no resource)
  - Water: `fish`
- Each tile in `TILE_TYPES` has a numeric `tier` (0 = common base, up to 3).
  This is the per-variant signal for tier-scaled base counts.

---

## Design

The work splits into six units, each independently testable.

### Unit 1 — Keystone: make income worker-aware

**File:** `src/state.ts` (`CHAIN_COLLECTED`).

Replace the raw `TILES_PER_RESOURCE[key]` lookup with an **effective divisor**
that subtracts the aggregated worker/building reduction and clamps to a
per-line floor:

```
effectiveDivisor(key) = max(lineFloor(key),
                            TILES_PER_RESOURCE[key] − thresholdReduce[key])
```

- `thresholdReduce` comes from `computeAggregatedAbilities(state)` (already
  importable into the reducer; reads only `workers`/`built`/`tileCollection`).
- Compute the aggregate **once per `CHAIN_COLLECTED`** (not per tile) and cache
  on a local; the handler already runs once per collected chain.
- `lineFloor(key)` defaults to 1; premium lines override (see Unit 3).

A small shared helper `effectiveTilesPerResource(state, key)` lives next to the
reducer so tests and any future caller share one implementation. Board-upgrade
`effectiveThresholds` (GameScene) is unchanged — the two maps stay decoupled by
design, but now *both* honour worker reductions.

**Acceptance:** hiring a Farmer measurably reduces flour-per-grain banked
income in a unit test that drives `CHAIN_COLLECTED`.

### Unit 2 — Per-variant tier-scaled base counts

**File:** `src/constants.ts` (`TILES_PER_RESOURCE`).

Replace the flat `{ ...UPGRADE_THRESHOLDS }` seed with a generated map:

```
divisor(variant) = lineBase(category) + tier(variant) × tierStep(category)
```

- `lineBase(category)` = today's per-category value (grass 6, herd 5, fruit 7,
  flowers 10, mounts 10, mine_stone 8, fish 5, …) so **tier-0 income is
  unchanged** (backward compatible).
- `tierStep(category)` default `1`; configurable per line. Result: chicken
  (tier 1) 7, goose (tier 2) 8, dodo (tier 3) 9 — PC2's "turkey 9 vs chicken 7."
- Generated from `TILE_TYPES` so new tiles get a divisor automatically; a guard
  test asserts every tile key has a divisor and that tier-0 equals `lineBase`.

`UPGRADE_THRESHOLDS` (board-upgrade gate) is left as-is to avoid changing tile
discovery pacing; only the income divisor gains tier scaling. (Documented as an
intentional decoupling.)

### Unit 3 — Per-line reduction config ("scale by line")

**File:** `src/features/workers/data.ts` + a new line-config table.

Introduce a `PRODUCTION_LINES` table keyed by category, each entry:

| field | meaning | default |
|---|---|---|
| `lineBase` | tier-0 divisor | current per-category value |
| `tierStep` | divisor added per tier | 1 |
| `step` | tiles reduced per worker hire | 1 |
| `maxCount` | max hires of this line's worker | 10 |
| `floor` | min effective divisor | 1 |

Bulk lines mirror PC2: `grass.step = 2` (Peasant-like), `special_dirt.step = 2`
(Digger-like). Premium lines raise the floor: `flowers.floor = 3`,
`mounts.floor = 3`, `mine_gem.floor = 2`, `mine_gold.floor = 2` so a fully
staffed crew never trivialises high-value resources. The worker's
`threshold_reduce_category` `amount` = the line's `step`; the reducer clamp uses
the line's `floor`.

### Unit 4 — Full worker roster

**Files:** `src/types/catalog/workers.ts` (enum), `src/features/workers/data.ts`
(defs). Registration checklist confirmed minimal: enum + `TYPE_WORKERS` only;
`WORKERS/HIRE`/`FIRE` actions and the `Record<string,number>` state are generic,
and saves auto-init unknown ids to 0.

**4a — Production-line workers (live now).** One `threshold_reduce_category`
worker per production category (~18). Names follow PC2 where they map cleanly
(Peasant→hay, Reaper→grain, Lumberjack→trees, Poultryman→birds, Vegetable
Picker→veg, Fruit Picker→fruit, Herder→herd, Dairywoman→cattle, Wrangler→mounts,
Bee Keeper→flowers, Stone Miner, Iron Miner, Coal Miner, Gem-cutter, Gold Miner,
Digger→dirt, Fisherman→fish). Hire-cost ramps reuse the existing
`coinsStep`/`coinsMult` + `resources` schema, scaled by line value.

**4b — Promotion-chain workers (new mechanic, Unit 5).**
**4c — Coin/Rune workers (new mechanic, Unit 6).**

### Unit 5 — Promotion-chain mechanic + workers

Bring the dead `chainRedirect` channel to life. PC2's promotion chains let a
long chain of one category *also* yield one of the next category's resource
(grain→vegetable, vegetable→fruit, fruit→flower; bird→herd→cattle→mount;
ore→silver→gold; coal→diamond; etc.), and a dedicated worker lowers the count
needed.

- **Aggregation shape (exists):** `chainRedirect[fromCategory] = { toCategory,
  threshold, redirectShare }` where `threshold` scales from `baseThreshold`
  (weight 0) to `minThreshold` (weight 1) — i.e. more hires → lower threshold.
- **New application** in `CHAIN_COLLECTED` (`src/state.ts`): when a chain of
  `fromCategory` reaches `threshold`, award `floor(redirectShare × units)` of
  the `toCategory` resource into inventory (capped, with a floater), in addition
  to the normal product. Implemented in the shared producedResource helper so it
  is unit-testable without Phaser.
- **Workers:** `chain_redirect_category` workers for each promotion step.
  `maxCount`/threshold tuned per line.

**Acceptance:** with N promotion workers hired, a `fromCategory` chain of the
reduced threshold yields the promoted resource in a reducer unit test;
zero hires → no promotion.

### Unit 6 — Coin/Rune worker bonuses + workers

- **Coin workers:** read worker-aggregated `coinBonusFlat`/`coinBonusPerTile`
  in the coin-reward path (`src/state.ts:402`) **in addition to** the existing
  tile effects, so a `coin_bonus_*` worker actually pays out. Coin/"Florist"-
  style workers (flower→coin, mount→coin, etc.) grant flat/per-tile coins on
  the relevant category's chains.
- **Rune workers:** our runes drop from specific tile chains (mysterious_ore +
  dirt; pearl + fish). Faithful adaptation: Rune-Finder workers apply a
  `threshold_reduce` to those rune-producing chains (fewer supporting tiles
  needed per rune), routed through the same effective-divisor clamp as Unit 1.

**Acceptance:** coin worker increases coins banked from a chain in a reducer
test; rune worker lowers the supporting-tile count needed to mint a rune.

### Unit 7 — UI grouping

**File:** `src/features/workers/index.tsx`. The flat `BrowserGrid` becomes
sectioned by board — **Farm / Mine / Water / Crafting** (and a Promotion /
Coin & Rune subsection or badge) — so ~40+ workers stay scannable. Grouping is
derived from each worker's line/category metadata; no per-worker JSX.

### Unit 8 — Permanence & regression tests

- Regression test: hire workers, switch zones via the zone/inventory path,
  assert `state.workers.hired` is unchanged (locks in existing behaviour).
- Coverage for Units 1, 2, 3, 5, 6 acceptance criteria above.
- `npm run action-types:check`, `lint`, `typecheck`, `test`, `build` all green.
- Run `npm run test:visual` if the workers panel rendering changes
  meaningfully; justify any golden diffs.

---

## Risks & mitigations

- **Economy shift.** Tier scaling raises divisors for rare variants; tier-0
  unchanged. Mitigation: tier-0 backward-compat guard test; premium-line floors
  prevent runaway income from stacked workers.
- **Reducer cost.** `computeAggregatedAbilities` per `CHAIN_COLLECTED` — runs
  once per collected chain (already a coarse event); acceptable. Memoise per
  action if profiling shows cost.
- **New mechanics (Units 5–6) touch core chain/coin logic.** Keep all new logic
  in pure, unit-tested `producedResource`/state helpers; guard each behind
  "zero hires → no behavioural change" tests so existing balance is untouched
  until a worker is hired.
- **Wiki drift.** Worker roster + per-line counts are game data the in-app Wiki
  may describe; use the `wiki-content` skill / `data-wiki-fact` injection if any
  wiki page states these numbers.

## Out of scope

- Rebalancing existing resource sell/buy prices.
- Season-end / hazard worker abilities (separate dead channels, not requested).
- Art for new worker icons (reuse existing icon keys / tints initially).

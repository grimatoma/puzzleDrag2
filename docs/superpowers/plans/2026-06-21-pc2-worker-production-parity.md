# PC2-style Worker Production Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hired workers genuinely speed up resource income, give every production line a dedicated worker, scale tile-per-resource cost by variant tier, and add promotion-chain + coin/rune worker mechanics — all without changing tier-0 balance until a worker is hired.

**Architecture:** A single config table (`PRODUCTION_LINES`, keyed by tile category) becomes the source of truth for each line's base divisor, per-tier step, per-hire reduction, floor, and roster metadata. The keystone change routes the existing worker-ability aggregation (`computeAggregatedAbilities().thresholdReduce`) into the income path in `CHAIN_COLLECTED`, clamped to each line's floor. The full worker roster and the promotion/coin/rune workers are generated from that same table plus a names/icons map, so the data stays DRY and new tiles get a divisor automatically.

**Tech Stack:** TypeScript (`.ts`/`.tsx`, `.js` import specifiers), React `useReducer`, Vitest. No Phaser changes required — all new logic lives in pure reducer/helper modules.

---

## Background facts (verified against the code)

- **Income path:** `src/state.ts` `CHAIN_COLLECTED` reads the raw divisor `TILES_PER_RESOURCE[key]` in two places: the main-chain block (`src/state.ts:362-373`) and the cross-collect block (`src/state.ts:386-399`). Both must move to the effective divisor.
- **Aggregation:** `computeAggregatedAbilities(state)` (`src/features/workers/aggregate.ts:153`) returns channels including `thresholdReduce` (keyed by `baseResource`, which equals the chained tile key for an active tile), `chainRedirect` (keyed by `fromCategory`), `coinBonusFlat`, `coinBonusPerTile`. It reads only `state.workers`/buildings/tiles.
- **Existing GameScene parallel:** `src/GameScene.ts:430-440` already does `Math.max(1, v - thresholdReduce[k])` for board upgrades. Unit 1 mirrors this for income but with a per-line floor instead of a hard `1`.
- **Divisor seed:** `TILES_PER_RESOURCE = { ...UPGRADE_THRESHOLDS }` (`src/constants.ts:270`). `UPGRADE_THRESHOLDS` (`src/constants.ts:224-257`) is keyed by tile key. Some keys (e.g. `tile_mine_copper_ore`, `tile_fish_cocoa`) exist in `UPGRADE_THRESHOLDS` but have no `TILE_TYPES` entry — the generator must **preserve** those.
- **Categories:** `CATEGORIES` in `src/features/tileCollection/data.ts:4`. Each `TILE_TYPES` entry has a numeric `tier` (0–3).
- **Worker enum:** `src/types/catalog/workers.ts` (`WorkerTypeId`, 4 members today). Worker defs: `src/features/workers/data.ts` (`TYPE_WORKERS`). Hire/fire actions and `state.workers.hired` are generic; adding a worker = enum member + `TYPE_WORKERS` entry only (saves auto-init unknown ids to 0).
- **Promotion channel is dead:** `chain_redirect_category` aggregates into `chainRedirect` (`src/config/abilitiesAggregate.ts:178-197`) but is never read at runtime.
- **Coin channel partial:** chain coin reward (`src/state.ts:401-410`) reads only the active tile's `effects.coinBonusFlat/PerTile`, never the worker aggregate.
- **Runes:** minted by `isMysteriousChainValid` (mine) and `isPearlChainValid` (fish) gates in `src/state.ts:312-330`; no worker hook.

---

## File structure

- `src/config/productionLines.ts` — **new.** `PRODUCTION_LINES` table + helpers (`lineFloor`, `lineBase`, `lineStep`, `tierStep`, `categoryOfTileKey`). Single source of truth.
- `src/constants.ts` — generate `TILES_PER_RESOURCE` with tier scaling (Unit 2).
- `src/game/effectiveDivisor.ts` — **new.** `effectiveTilesPerResource(state, tileKey)` shared helper (Unit 1).
- `src/game/promotion.ts` — **new.** `PROMOTION_CHAINS` + `computePromotion(agg, fromCategory, units)` pure helper (Unit 5).
- `src/state.ts` — route effective divisor + promotion + worker coin aggregate into `CHAIN_COLLECTED`; rune-support reduction (Units 1, 5, 6).
- `src/types/catalog/workers.ts` — enum members for the new roster (Unit 4).
- `src/features/workers/data.ts` — generate production-line / promotion / coin / rune workers from config (Units 4, 5, 6).
- `src/features/workers/index.tsx` — section the panel by board (Unit 7).
- Tests co-located: `src/config/productionLines.test.ts`, `src/game/effectiveDivisor.test.ts`, `src/game/promotion.test.ts`, `src/constants.divisor.test.ts`, `src/features/workers/roster.test.ts`, and additions to a reducer test for `CHAIN_COLLECTED` income.

---

## Task 1: Production-line config table

**Files:**
- Create: `src/config/productionLines.ts`
- Test: `src/config/productionLines.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/config/productionLines.test.ts
import { describe, it, expect } from "vitest";
import {
  PRODUCTION_LINES, lineBase, tierStep, lineStep, lineFloor, categoryOfTileKey,
} from "./productionLines.js";

describe("PRODUCTION_LINES", () => {
  it("defines every farm/mine/water production category", () => {
    for (const cat of [
      "grass","grain","bird","vegetables","fruits","flowers","trees",
      "herd_animals","cattle","mounts","mine_stone","mine_iron_ore",
      "mine_coal","mine_gem","mine_gold","special_dirt","fish",
    ]) {
      expect(PRODUCTION_LINES[cat], cat).toBeDefined();
    }
  });

  it("keeps PC2 bulk + premium-floor outliers", () => {
    expect(lineStep("grass")).toBe(2);
    expect(lineStep("special_dirt")).toBe(2);
    expect(lineStep("fish")).toBe(1);
    expect(lineFloor("flowers")).toBe(3);
    expect(lineFloor("mounts")).toBe(3);
    expect(lineFloor("mine_gem")).toBe(2);
    expect(lineFloor("mine_gold")).toBe(2);
    expect(lineFloor("grass")).toBe(1);
  });

  it("preserves today's per-category tier-0 divisor as lineBase", () => {
    expect(lineBase("grass")).toBe(6);
    expect(lineBase("grain")).toBe(5);
    expect(lineBase("fruits")).toBe(7);
    expect(lineBase("flowers")).toBe(10);
    expect(lineBase("mounts")).toBe(10);
    expect(lineBase("mine_stone")).toBe(8);
    expect(lineBase("fish")).toBe(5);
    expect(tierStep("grain")).toBe(1);
  });

  it("maps a tile key to its category", () => {
    expect(categoryOfTileKey("tile_grass_grass")).toBe("grass");
    expect(categoryOfTileKey("tile_grain_wheat")).toBe("grain");
    expect(categoryOfTileKey("block")).toBe("mine_stone");
    expect(categoryOfTileKey("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/productionLines.test.ts`
Expected: FAIL — cannot resolve `./productionLines.js`.

- [ ] **Step 3: Write the config module**

```ts
// src/config/productionLines.ts
import { TILE_TYPES } from "../features/tileCollection/data.js";

/** Per-production-line tuning. One entry per tile category that yields a resource. */
export interface ProductionLine {
  /** tier-0 income divisor (tiles per resource). Equals today's per-category value. */
  lineBase: number;
  /** divisor added per variant tier (chicken tier-1 = lineBase + 1, etc.). */
  tierStep: number;
  /** tiles shaved off the divisor per worker hire. */
  step: number;
  /** max hires of this line's worker. */
  maxCount: number;
  /** minimum effective divisor — premium lines floor higher. */
  floor: number;
}

const DEFAULTS = { tierStep: 1, step: 1, maxCount: 10, floor: 1 } as const;
const line = (lineBase: number, over: Partial<ProductionLine> = {}): ProductionLine => ({
  lineBase, ...DEFAULTS, ...over,
});

// lineBase values mirror today's UPGRADE_THRESHOLDS canonical tier-0 tile so
// tier-0 income is unchanged at introduction. step/floor outliers mirror PC2:
// bulk lines (grass=Peasant, special_dirt=Digger) shave 2; premium lines
// (flowers→honey, mounts→horseshoe, gems, gold) floor higher so a fully
// staffed crew never trivialises high-value resources.
export const PRODUCTION_LINES: Record<string, ProductionLine> = {
  grass: line(6, { step: 2 }),
  grain: line(5),
  bird: line(6),
  vegetables: line(6),
  fruits: line(7),
  flowers: line(10, { floor: 3 }),
  trees: line(6),
  herd_animals: line(5),
  cattle: line(6),
  mounts: line(10, { floor: 3 }),
  mine_stone: line(8),
  mine_iron_ore: line(6),
  mine_coal: line(7),
  mine_gem: line(5, { floor: 2 }),
  mine_gold: line(6, { floor: 2 }),
  special_dirt: line(6, { step: 2 }),
  fish: line(5),
};

export function lineBase(category: string): number {
  return PRODUCTION_LINES[category]?.lineBase ?? 6;
}
export function tierStep(category: string): number {
  return PRODUCTION_LINES[category]?.tierStep ?? DEFAULTS.tierStep;
}
export function lineStep(category: string): number {
  return PRODUCTION_LINES[category]?.step ?? DEFAULTS.step;
}
export function lineFloor(category: string): number {
  return PRODUCTION_LINES[category]?.floor ?? DEFAULTS.floor;
}

const CATEGORY_BY_TILE_KEY: Record<string, string> = Object.fromEntries(
  TILE_TYPES.map((t) => [t.id, t.category]),
);

/** Category for a chained tile key (e.g. "block" -> "mine_stone"). Null if unknown. */
export function categoryOfTileKey(tileKey: string): string | null {
  return CATEGORY_BY_TILE_KEY[tileKey] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/productionLines.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/productionLines.ts src/config/productionLines.test.ts
git commit -m "feat(workers): add PRODUCTION_LINES config table"
```

---

## Task 2: Tier-scaled income divisor (Unit 2)

**Files:**
- Modify: `src/constants.ts:270`
- Test: `src/constants.divisor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/constants.divisor.test.ts
import { describe, it, expect } from "vitest";
import { TILES_PER_RESOURCE } from "./constants.js";
import { TILE_TYPES } from "./features/tileCollection/data.js";
import { lineBase, tierStep, PRODUCTION_LINES } from "./config/productionLines.js";

describe("TILES_PER_RESOURCE tier scaling", () => {
  it("gives every tile type a divisor", () => {
    for (const t of TILE_TYPES) {
      expect(TILES_PER_RESOURCE[t.id], t.id).toBeGreaterThan(0);
    }
  });

  it("keeps tier-0 equal to the line base (backward compatible)", () => {
    for (const t of TILE_TYPES) {
      if (t.tier !== 0) continue;
      if (!PRODUCTION_LINES[t.category]) continue;
      expect(TILES_PER_RESOURCE[t.id], t.id).toBe(lineBase(t.category));
    }
  });

  it("scales rarer variants up by tier", () => {
    // chicken (bird tier-1) = 6 + 1, goose (tier-2) = 6 + 2, dodo (tier-3) = 6 + 3
    expect(TILES_PER_RESOURCE.tile_bird_chicken).toBe(lineBase("bird") + 1 * tierStep("bird"));
    expect(TILES_PER_RESOURCE.tile_bird_goose).toBe(lineBase("bird") + 2 * tierStep("bird"));
    expect(TILES_PER_RESOURCE.tile_bird_dodo).toBe(lineBase("bird") + 3 * tierStep("bird"));
  });

  it("preserves legacy keys absent from TILE_TYPES", () => {
    // tile_mine_copper_ore is in UPGRADE_THRESHOLDS but has no TILE_TYPES entry.
    expect(TILES_PER_RESOURCE.tile_mine_copper_ore).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/constants.divisor.test.ts`
Expected: FAIL — `tile_bird_chicken` is currently `6` (flat seed), not `7`.

- [ ] **Step 3: Replace the flat seed with a tier-scaled generator**

In `src/constants.ts`, replace line 270:

```ts
export const TILES_PER_RESOURCE: Record<string, number> = { ...UPGRADE_THRESHOLDS };
```

with:

```ts
// Income divisor, keyed by tile key. Start from UPGRADE_THRESHOLDS (preserves
// legacy keys with no TILE_TYPES entry, e.g. copper/silver/cocoa), then for
// every real tile type override with a tier-scaled value:
//   divisor(variant) = lineBase(category) + tier * tierStep(category)
// tier-0 == lineBase, so tier-0 income is unchanged. New tiles get a divisor
// automatically. See src/config/productionLines.ts. The board-upgrade gate
// (UPGRADE_THRESHOLDS) is intentionally left flat — only income gains tier scaling.
export const TILES_PER_RESOURCE: Record<string, number> = buildTilesPerResource();
```

Add the builder near the bottom of the constants module (after `TILE_FAMILY_RESOURCE`/`RESOURCE_TO_THRESHOLD`, anywhere module-level), importing the config at the top of `src/constants.ts`:

```ts
// top of file, with the other imports
import { TILE_TYPES } from "./features/tileCollection/data.js";
import { lineBase, tierStep, PRODUCTION_LINES } from "./config/productionLines.js";
```

```ts
function buildTilesPerResource(): Record<string, number> {
  const out: Record<string, number> = { ...UPGRADE_THRESHOLDS };
  for (const t of TILE_TYPES) {
    if (!PRODUCTION_LINES[t.category]) continue; // treasure etc. keep legacy/no value
    const tier = Number(t.tier) || 0;
    out[t.id] = lineBase(t.category) + tier * tierStep(t.category);
  }
  return out;
}
```

> **Import-cycle note:** `src/features/tileCollection/data.ts` imports `UPGRADE_THRESHOLDS` from `constants.js`. Importing `TILE_TYPES` back into `constants.ts` creates a cycle. `UPGRADE_THRESHOLDS` is a plain object literal defined *above* line 270 and `TILE_TYPES` is built at module load in `data.ts`; because `buildTilesPerResource()` runs at `constants.ts` module-eval time it needs `TILE_TYPES` populated. If the cycle yields an empty `TILE_TYPES` at eval time (verify in Step 4), break it by moving `buildTilesPerResource` into `src/config/productionLines.ts` as `buildTilesPerResource(UPGRADE_THRESHOLDS)` and calling it from `constants.ts` with the local literal passed in — `productionLines.ts` already imports `TILE_TYPES` and sits lower in the graph. Prefer this safe ordering from the start if Step 4 shows any tier-0 key as `undefined`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/constants.divisor.test.ts`
Expected: PASS. If any divisor is `undefined`, apply the import-cycle fix in the note above and re-run.

- [ ] **Step 5: Run the broader suite for fallout**

Run: `npx vitest run` then `npm run typecheck`
Expected: PASS. Tier-0 unchanged means existing income tests still hold; only rarer-variant income shifts.

- [ ] **Step 6: Commit**

```bash
git add src/constants.ts src/constants.divisor.test.ts
git commit -m "feat(economy): scale income divisor by variant tier"
```

---

## Task 3: Keystone — make income worker-aware (Unit 1)

**Files:**
- Create: `src/game/effectiveDivisor.ts`
- Test: `src/game/effectiveDivisor.test.ts`
- Modify: `src/state.ts:362-399`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/effectiveDivisor.test.ts
import { describe, it, expect } from "vitest";
import { effectiveTilesPerResource } from "./effectiveDivisor.js";
import { TILES_PER_RESOURCE } from "../constants.js";

function stateWith(hired: Record<string, number>) {
  return { workers: { hired }, built: {}, tileCollection: {} } as never;
}

describe("effectiveTilesPerResource", () => {
  it("returns the raw divisor with no workers", () => {
    const s = stateWith({});
    expect(effectiveTilesPerResource(s, "tile_grain_wheat"))
      .toBe(TILES_PER_RESOURCE.tile_grain_wheat);
  });

  it("subtracts the aggregated reduction for a hired worker", () => {
    // one Farmer (grain, amount 1, maxCount 10) => weight 1/10 => reduce ~0.1.
    // floor(divisor) math happens at the call site; here assert it is lower.
    const base = effectiveTilesPerResource(stateWith({}), "tile_grain_wheat");
    const withFarmer = effectiveTilesPerResource(stateWith({ farmer: 10 }), "tile_grain_wheat");
    expect(withFarmer).toBeLessThan(base);
  });

  it("never drops below the line floor", () => {
    // flowers floor is 3; even a fully staffed crew cannot go below it.
    const v = effectiveTilesPerResource(stateWith({ bee_keeper: 10 }), "tile_flower_pansy");
    expect(v).toBeGreaterThanOrEqual(3);
  });
});
```

> Note: `bee_keeper` worker arrives in Task 5; this assertion still holds before then because an unknown hire id contributes nothing and the floor clamp is independent. The first two assertions fully exercise Unit 1.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/effectiveDivisor.test.ts`
Expected: FAIL — cannot resolve `./effectiveDivisor.js`.

- [ ] **Step 3: Write the shared helper**

```ts
// src/game/effectiveDivisor.ts
import { TILES_PER_RESOURCE } from "../constants.js";
import { computeAggregatedAbilities } from "../features/workers/aggregate.js";
import { categoryOfTileKey, lineFloor } from "../config/productionLines.js";

/**
 * Income divisor for a chained tile key, after worker/building reductions,
 * clamped to the line's floor. `thresholdReduce` is keyed by baseResource,
 * which equals the chained tile key for an active tile.
 *
 * Pass a precomputed `agg` (from computeAggregatedAbilities) when looping over
 * many keys in one action to avoid recomputing the aggregate per tile.
 */
export function effectiveTilesPerResource(
  state: Parameters<typeof computeAggregatedAbilities>[0],
  tileKey: string,
  agg?: { thresholdReduce?: Record<string, number> },
): number {
  const base = TILES_PER_RESOURCE[tileKey];
  if (base == null) return Infinity;
  const a = agg ?? computeAggregatedAbilities(state);
  const reduce = a.thresholdReduce?.[tileKey] ?? 0;
  const category = categoryOfTileKey(tileKey);
  const floor = category ? lineFloor(category) : 1;
  return Math.max(floor, base - reduce);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/effectiveDivisor.test.ts`
Expected: PASS.

- [ ] **Step 5: Route the helper into `CHAIN_COLLECTED`**

In `src/state.ts`, add the import near the other game imports:

```ts
import { effectiveTilesPerResource } from "./game/effectiveDivisor.js";
import { computeAggregatedAbilities } from "./features/workers/aggregate.js";
```

Just before the main-chain progress block (above `src/state.ts:361`'s `const progress = ...`), compute the aggregate once:

```ts
// Compute worker/building aggregate once per collected chain; reused by the
// effective income divisor (and promotion/coin hooks below).
const chainAgg = computeAggregatedAbilities(state);
```

In the main-chain block, replace:

```ts
const thresholds = TILES_PER_RESOURCE;
const threshold = thresholds[key] ?? Infinity;
```

with:

```ts
const threshold = effectiveTilesPerResource(state, key, chainAgg);
```

In the cross-collect block, replace:

```ts
const thresholds = TILES_PER_RESOURCE;
for (const [tileKey, count] of Object.entries(crossCollected)) {
  if (!count) continue;
  const rk = (producedResource({ key: tileKey }) ?? tileKey) as ResourceKey;
  const threshold = thresholds[tileKey] ?? Infinity;
```

with:

```ts
for (const [tileKey, count] of Object.entries(crossCollected)) {
  if (!count) continue;
  const rk = (producedResource({ key: tileKey }) ?? tileKey) as ResourceKey;
  const threshold = effectiveTilesPerResource(state, tileKey, chainAgg);
```

- [ ] **Step 6: Write a reducer income test**

Add to `src/state.ts`'s nearest existing reducer test (search for an existing `CHAIN_COLLECTED` test file with `rg -l "CHAIN_COLLECTED" src tests`); if none, create `src/state.chainIncome.test.ts`:

```ts
// src/state.chainIncome.test.ts
import { describe, it, expect } from "vitest";
import { reducer } from "./state.js";
import { initialState } from "./state.js"; // adjust to the real initial-state export

function bankedGrainProgress(hired: Record<string, number>): number {
  let s = { ...initialState(), workers: { hired } } as never;
  // Drive one grain chain of fixed length and read accrued progress+inventory.
  const action = {
    type: "CHAIN_COLLECTED",
    payload: { key: "tile_grain_wheat", resourceKey: "flour", chainLength: 5, gained: 5, value: 1 },
  } as never;
  s = reducer(s, action);
  // Compare flour units banked; more workers => lower divisor => more flour.
  return Number((s as { inventory?: Record<string, number> }).inventory?.flour ?? 0);
}

describe("CHAIN_COLLECTED income is worker-aware", () => {
  it("hiring grain workers banks at least as much flour from the same chain", () => {
    const none = bankedGrainProgress({});
    const staffed = bankedGrainProgress({ farmer: 10 });
    expect(staffed).toBeGreaterThanOrEqual(none);
  });
});
```

> If `reducer`/`initialState` export names differ, adjust to the real exports (check `src/state.ts` exports + `prototype.tsx` usage). The assertion is intentionally `>=` so it is robust to capping; tighten to `>` once you confirm the exact chain length that crosses a unit boundary for the reduced divisor but not the raw one (raw 5, reduced 4 with 10 farmers → length 5 banks 1 vs 1; use `chainLength: 8` to get 2 vs 1 if you want strict `>`).

- [ ] **Step 7: Run tests + typecheck**

Run: `npx vitest run src/game/effectiveDivisor.test.ts src/state.chainIncome.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/effectiveDivisor.ts src/game/effectiveDivisor.test.ts src/state.ts src/state.chainIncome.test.ts
git commit -m "feat(economy): make chain income honor worker reductions"
```

---

## Task 4: Worker enum members for the full roster (Unit 4)

**Files:**
- Modify: `src/types/catalog/workers.ts`

- [ ] **Step 1: Add the new enum members**

Replace the body of the enum in `src/types/catalog/workers.ts`:

```ts
export enum WorkerTypeId {
  // existing
  Baker = "baker",
  Farmer = "farmer",          // grain line
  Lumberjack = "lumberjack",  // trees line
  Miner = "miner",            // mine_stone line
  // new production-line workers
  Peasant = "peasant",            // grass (bulk, step 2)
  Poultryman = "poultryman",      // bird
  VegetablePicker = "vegetable_picker", // vegetables
  FruitPicker = "fruit_picker",   // fruits
  BeeKeeper = "bee_keeper",       // flowers
  Herder = "herder",              // herd_animals
  Dairywoman = "dairywoman",      // cattle
  Wrangler = "wrangler",          // mounts
  IronMiner = "iron_miner",       // mine_iron_ore
  CoalMiner = "coal_miner",       // mine_coal
  GemCutter = "gem_cutter",       // mine_gem
  GoldMiner = "gold_miner",       // mine_gold
  Digger = "digger",              // special_dirt (bulk, step 2)
  Fisherman = "fisherman",        // fish
  // promotion-chain workers (Unit 5)
  Steward = "steward",            // grain -> vegetables
  Greengrocer = "greengrocer",    // vegetables -> fruits
  Perfumer = "perfumer",          // fruits -> flowers
  Rancher = "rancher",            // bird -> herd_animals
  Drover = "drover",              // herd_animals -> cattle
  Equerry = "equerry",            // cattle -> mounts
  Smelter = "smelter",            // mine_iron_ore -> mine_gem
  Assayer = "assayer",            // mine_gem -> mine_gold
  // coin & rune workers (Unit 6)
  TaxCollector = "tax_collector", // flat coins per chain
  Florist = "florist",            // per-tile coins
  RuneSeeker = "rune_seeker",     // lowers rune-support tile requirement
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (enum-only change; `WORKER_TYPE_ID_VALUES` auto-updates).

- [ ] **Step 3: Commit**

```bash
git add src/types/catalog/workers.ts
git commit -m "feat(workers): add enum ids for full roster"
```

---

## Task 5: Generate production-line worker defs (Unit 4)

**Files:**
- Modify: `src/features/workers/data.ts`
- Test: `src/features/workers/roster.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/workers/roster.test.ts
import { describe, it, expect } from "vitest";
import { TYPE_WORKERS, TYPE_WORKER_MAP } from "./data.js";
import { PRODUCTION_LINES, lineStep } from "../../config/productionLines.js";

describe("worker roster", () => {
  it("has exactly one production-line worker per resource category", () => {
    for (const cat of Object.keys(PRODUCTION_LINES)) {
      const workers = TYPE_WORKERS.filter((w) =>
        w.abilities.some(
          (a) => a.id === "threshold_reduce_category" &&
            (a.params as { category?: string })?.category === cat,
        ),
      );
      expect(workers.length, cat).toBe(1);
    }
  });

  it("sets each worker's reduction amount to the line step", () => {
    const peasant = TYPE_WORKER_MAP.peasant;
    expect((peasant.abilities[0].params as { amount: number }).amount).toBe(lineStep("grass"));
    const fisherman = TYPE_WORKER_MAP.fisherman;
    expect((fisherman.abilities[0].params as { amount: number }).amount).toBe(lineStep("fish"));
  });

  it("keeps every worker id unique", () => {
    const ids = TYPE_WORKERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/workers/roster.test.ts`
Expected: FAIL — only 4 workers exist; most categories have 0.

- [ ] **Step 3: Generate the production-line workers**

In `src/features/workers/data.ts`, add imports at the top:

```ts
import { WorkerTypeId } from "../../types/catalog/workers.js";
import { PRODUCTION_LINES, lineStep } from "../../config/productionLines.js";
```

> Note: `data.ts` currently imports `WorkerTypeId` via `catalogKeys.js`. Keep that import; add the direct `productionLines` import.

Below the existing `TYPE_WORKERS` literal, add a generator and merge. First, a metadata map (name/icon/role/flavor/category/cost tuning) for the NEW production-line workers — the existing Farmer/Lumberjack/Miner already cover grain/trees/mine_stone, so the generator skips those categories:

```ts
// Production-line worker presentation + cost tuning. Categories already covered
// by hand-authored workers (grain=Farmer, trees=Lumberjack, mine_stone=Miner)
// are intentionally absent so we don't double-cover a line.
interface LineWorkerMeta {
  id: WorkerTypeId;
  category: string;
  name: string;
  role: string;
  iconKey: string;
  color: string;
  coins: number;
  coinsStep: number;
  costResource: string; // a cheap resource of the line, paid as part of hire
  description: string;
  flavor: string;
}

const LINE_WORKER_META: LineWorkerMeta[] = [
  { id: WorkerTypeId.Peasant, category: "grass", name: "Peasant", role: "Hayward", iconKey: "worker_farmer", color: "#6fa838", coins: 40, coinsStep: 20, costResource: "tile_grass_grass", description: "Each Peasant shaves two tiles off the hay chain.", flavor: "Hands that have bundled hay since before the mill turned." },
  { id: WorkerTypeId.Poultryman, category: "bird", name: "Poultryman", role: "Poultryman", iconKey: "worker_farmer", color: "#d9a85c", coins: 55, coinsStep: 25, costResource: "eggs", description: "Each Poultryman trims a tile off the egg chain.", flavor: "Keeps the coop calm and the nests full." },
  { id: WorkerTypeId.VegetablePicker, category: "vegetables", name: "Vegetable Picker", role: "Picker", iconKey: "worker_farmer", color: "#d97b32", coins: 50, coinsStep: 25, costResource: "tile_veg_carrot", description: "Each Picker trims a tile off the vegetable chain.", flavor: "First to the rows at dawn, basket already half full." },
  { id: WorkerTypeId.FruitPicker, category: "fruits", name: "Fruit Picker", role: "Picker", iconKey: "worker_farmer", color: "#d44b48", coins: 60, coinsStep: 30, costResource: "tile_fruit_apple", description: "Each Picker trims a tile off the fruit chain.", flavor: "Knows which orchard ripens first by the smell of the wind." },
  { id: WorkerTypeId.BeeKeeper, category: "flowers", name: "Bee Keeper", role: "Apiarist", iconKey: "worker_farmer", color: "#d96bb0", coins: 80, coinsStep: 40, costResource: "tile_flower_pansy", description: "Each Bee Keeper trims a tile off the flower-to-honey chain.", flavor: "Unhurried among the hives — the bees have never once stung her." },
  { id: WorkerTypeId.Herder, category: "herd_animals", name: "Herder", role: "Herder", iconKey: "worker_farmer", color: "#c97e7a", coins: 55, coinsStep: 25, costResource: "meat", description: "Each Herder trims a tile off the herd chain.", flavor: "A whistle and a nod, and the whole drove turns." },
  { id: WorkerTypeId.Dairywoman, category: "cattle", name: "Dairywoman", role: "Dairywoman", iconKey: "worker_farmer", color: "#9c6230", coins: 60, coinsStep: 30, costResource: "milk", description: "Each Dairywoman trims a tile off the cattle chain.", flavor: "Up before the cock, pails already scrubbed and waiting." },
  { id: WorkerTypeId.Wrangler, category: "mounts", name: "Wrangler", role: "Wrangler", iconKey: "worker_farmer", color: "#6f86b0", coins: 90, coinsStep: 45, costResource: "horseshoe", description: "Each Wrangler trims a tile off the mount chain.", flavor: "Breaks no horse — befriends it." },
  { id: WorkerTypeId.IronMiner, category: "mine_iron_ore", name: "Iron Miner", role: "Miner", iconKey: "worker_miner", color: "#a3795a", coins: 70, coinsStep: 35, costResource: "tile_mine_iron_ore", description: "Each Iron Miner trims a tile off the ore chain.", flavor: "Reads a vein the way Mira reads a recipe." },
  { id: WorkerTypeId.CoalMiner, category: "mine_coal", name: "Coal Miner", role: "Miner", iconKey: "worker_miner", color: "#4a4f57", coins: 70, coinsStep: 35, costResource: "tile_mine_coal", description: "Each Coal Miner trims a tile off the coal chain.", flavor: "Comes up black to the elbows and grinning." },
  { id: WorkerTypeId.GemCutter, category: "mine_gem", name: "Gem-cutter", role: "Lapidary", iconKey: "worker_miner", color: "#9b59c4", coins: 110, coinsStep: 55, costResource: "tile_mine_gem", description: "Each Gem-cutter trims a tile off the gem chain.", flavor: "One steady tap, and the rough stone gives up its fire." },
  { id: WorkerTypeId.GoldMiner, category: "mine_gold", name: "Gold Miner", role: "Miner", iconKey: "worker_miner", color: "#e8c33a", coins: 120, coinsStep: 60, costResource: "tile_mine_gold", description: "Each Gold Miner trims a tile off the gold chain.", flavor: "Follows the glint deeper than the rest dare." },
  { id: WorkerTypeId.Digger, category: "special_dirt", name: "Digger", role: "Digger", iconKey: "worker_miner", color: "#7a5236", coins: 50, coinsStep: 25, costResource: "tile_special_dirt", description: "Each Digger shaves two tiles off the dirt-clearing work.", flavor: "Moves more earth in a morning than a mule in a day." },
  { id: WorkerTypeId.Fisherman, category: "fish", name: "Fisherman", role: "Fisher", iconKey: "worker_farmer", color: "#3f9cb5", coins: 50, coinsStep: 25, costResource: "tile_fish_sardine", description: "Each Fisherman trims a tile off the fishing chain.", flavor: "Mends his nets by feel, eyes always on the tide." },
];

function productionLineWorkers(): WorkerDef[] {
  return LINE_WORKER_META.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    look: { iconKey: m.iconKey, color: m.color },
    hireCost: {
      coins: m.coins,
      coinsStep: m.coinsStep,
      resources: { [m.costResource]: 2 },
      resourcesStepEvery: 3,
    },
    maxCount: PRODUCTION_LINES[m.category].maxCount,
    abilities: [
      { id: "threshold_reduce_category", params: { category: m.category, amount: lineStep(m.category) } },
    ],
    description: m.description,
    flavor: m.flavor,
  }));
}
```

Then change the export so the literal `TYPE_WORKERS` array is renamed to `BASE_WORKERS` and the final export concatenates. Replace:

```ts
export const TYPE_WORKERS: WorkerDef[] = [
  // ... Farmer, Lumberjack, Miner, Baker ...
];
```

so the literal is named `BASE_WORKERS` (keep all four existing objects unchanged), then after `productionLineWorkers` and the (later) promotion/coin/rune generators add:

```ts
export const TYPE_WORKERS: WorkerDef[] = [
  ...BASE_WORKERS,
  ...productionLineWorkers(),
  // ...promotionWorkers() and coinRuneWorkers() appended in Tasks 6 & 7
];
```

> Keep `TYPE_WORKER_MAP`, `defaultWorkersSlice`, `nextHireCost`, `nextHireResourceCost` exactly as-is — they derive from `TYPE_WORKERS` and need no change.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/workers/roster.test.ts && npm run typecheck`
Expected: PASS — every category now has exactly one line worker.

- [ ] **Step 5: Commit**

```bash
git add src/features/workers/data.ts src/features/workers/roster.test.ts
git commit -m "feat(workers): generate full production-line roster from config"
```

---

## Task 6: Promotion-chain mechanic + workers (Unit 5)

**Files:**
- Create: `src/game/promotion.ts`
- Test: `src/game/promotion.test.ts`
- Modify: `src/features/workers/data.ts`, `src/state.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/promotion.test.ts
import { describe, it, expect } from "vitest";
import { PROMOTION_CHAINS, computePromotion } from "./promotion.js";

describe("computePromotion", () => {
  it("yields nothing when no redirect worker is hired", () => {
    const agg = { chainRedirect: {} };
    expect(computePromotion(agg, "grain", 12)).toBeNull();
  });

  it("awards the next-tier resource once the chain reaches the threshold", () => {
    const agg = { chainRedirect: { grain: { toCategory: "vegetables", threshold: 8, redirectShare: 1 } } };
    const r = computePromotion(agg, "grain", 12);
    expect(r).not.toBeNull();
    expect(r!.toCategory).toBe("vegetables");
    expect(r!.units).toBeGreaterThanOrEqual(1);
  });

  it("awards nothing below the (reduced) threshold", () => {
    const agg = { chainRedirect: { grain: { toCategory: "vegetables", threshold: 8, redirectShare: 1 } } };
    expect(computePromotion(agg, "grain", 5)).toBeNull();
  });

  it("declares a promotion step for each configured line", () => {
    expect(PROMOTION_CHAINS.grain).toBe("vegetables");
    expect(PROMOTION_CHAINS.bird).toBe("herd_animals");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/promotion.test.ts`
Expected: FAIL — cannot resolve `./promotion.js`.

- [ ] **Step 3: Write the promotion helper**

```ts
// src/game/promotion.ts
// Promotion chains (PC2 "long chain of X also yields one Y"). Each entry maps a
// source category to the next category it can promote into. The actual award is
// gated by an aggregated chain_redirect_category worker lowering the threshold.
export const PROMOTION_CHAINS: Record<string, string> = {
  grain: "vegetables",
  vegetables: "fruits",
  fruits: "flowers",
  bird: "herd_animals",
  herd_animals: "cattle",
  cattle: "mounts",
  mine_iron_ore: "mine_gem",
  mine_gem: "mine_gold",
};

export interface PromotionResult {
  toCategory: string;
  /** units of the promoted category's resource to award. */
  units: number;
}

/**
 * Given the aggregated abilities, a chain's source category, and the number of
 * tiles in the chain, return the promotion award (or null). Only fires when a
 * redirect worker is hired for the source category and the chain length reaches
 * the worker-reduced threshold.
 */
export function computePromotion(
  agg: { chainRedirect?: Record<string, { toCategory: string; threshold: number; redirectShare: number }> },
  fromCategory: string,
  chainUnits: number,
): PromotionResult | null {
  const entry = agg.chainRedirect?.[fromCategory];
  if (!entry) return null;
  if (chainUnits < entry.threshold) return null;
  const units = Math.max(1, Math.floor(entry.redirectShare * (chainUnits / entry.threshold)));
  return { toCategory: entry.toCategory, units };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/promotion.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate promotion workers**

In `src/features/workers/data.ts`, add after `productionLineWorkers`:

```ts
import { PROMOTION_CHAINS } from "../../game/promotion.js";

interface PromotionWorkerMeta {
  id: WorkerTypeId;
  fromCategory: string;
  name: string;
  iconKey: string;
  color: string;
  coins: number;
  coinsStep: number;
  baseThreshold: number;
  minThreshold: number;
  description: string;
  flavor: string;
}

const PROMOTION_WORKER_META: PromotionWorkerMeta[] = [
  { id: WorkerTypeId.Steward, fromCategory: "grain", name: "Steward", iconKey: "worker_farmer", color: "#e0bf3e", coins: 120, coinsStep: 60, baseThreshold: 20, minThreshold: 10, description: "Long grain chains also yield a vegetable; each Steward lowers the count needed.", flavor: "Keeps the larder balanced so no harvest goes to waste." },
  { id: WorkerTypeId.Greengrocer, fromCategory: "vegetables", name: "Greengrocer", iconKey: "worker_farmer", color: "#d97b32", coins: 140, coinsStep: 70, baseThreshold: 20, minThreshold: 10, description: "Long vegetable chains also yield a fruit; each Greengrocer lowers the count needed.", flavor: "Trades a turnip for a pear and somehow both leave happy." },
  { id: WorkerTypeId.Perfumer, fromCategory: "fruits", name: "Perfumer", iconKey: "worker_farmer", color: "#d44b48", coins: 160, coinsStep: 80, baseThreshold: 22, minThreshold: 11, description: "Long fruit chains also yield a flower; each Perfumer lowers the count needed.", flavor: "Distils orchard sweetness into something you can wear." },
  { id: WorkerTypeId.Rancher, fromCategory: "bird", name: "Rancher", iconKey: "worker_farmer", color: "#d9a85c", coins: 130, coinsStep: 65, baseThreshold: 20, minThreshold: 10, description: "Long bird chains also yield a herd animal; each Rancher lowers the count needed.", flavor: "From coop to pasture, every animal knows its name." },
  { id: WorkerTypeId.Drover, fromCategory: "herd_animals", name: "Drover", iconKey: "worker_farmer", color: "#c97e7a", coins: 150, coinsStep: 75, baseThreshold: 20, minThreshold: 10, description: "Long herd chains also yield a cow; each Drover lowers the count needed.", flavor: "Walks the long road to market and never loses a head." },
  { id: WorkerTypeId.Equerry, fromCategory: "cattle", name: "Equerry", iconKey: "worker_farmer", color: "#9c6230", coins: 170, coinsStep: 85, baseThreshold: 22, minThreshold: 11, description: "Long cattle chains also yield a mount; each Equerry lowers the count needed.", flavor: "Master of the stable, keeper of the finest tack." },
  { id: WorkerTypeId.Smelter, fromCategory: "mine_iron_ore", name: "Smelter", iconKey: "worker_miner", color: "#a3795a", coins: 160, coinsStep: 80, baseThreshold: 22, minThreshold: 11, description: "Long ore chains also yield a gem; each Smelter lowers the count needed.", flavor: "Coaxes hidden colour out of the dullest rock." },
  { id: WorkerTypeId.Assayer, fromCategory: "mine_gem", name: "Assayer", iconKey: "worker_miner", color: "#9b59c4", coins: 200, coinsStep: 100, baseThreshold: 24, minThreshold: 12, description: "Long gem chains also yield gold; each Assayer lowers the count needed.", flavor: "Weighs every stone twice and is never once wrong." },
];

function promotionWorkers(): WorkerDef[] {
  return PROMOTION_WORKER_META.map((m) => ({
    id: m.id,
    name: m.name,
    role: "Promoter",
    look: { iconKey: m.iconKey, color: m.color },
    hireCost: { coins: m.coins, coinsStep: m.coinsStep },
    maxCount: 10,
    abilities: [
      {
        id: "chain_redirect_category",
        params: {
          fromCategory: m.fromCategory,
          toCategory: PROMOTION_CHAINS[m.fromCategory],
          baseThreshold: m.baseThreshold,
          minThreshold: m.minThreshold,
        },
      },
    ],
    description: m.description,
    flavor: m.flavor,
  }));
}
```

Append `...promotionWorkers()` to the `TYPE_WORKERS` export array.

- [ ] **Step 6: Apply promotion in `CHAIN_COLLECTED`**

In `src/state.ts`, add imports:

```ts
import { computePromotion } from "./game/promotion.js";
import { categoryOfTileKey } from "./config/productionLines.js";
import { TILE_FAMILY_RESOURCE } from "./constants.js"; // if not already imported
```

After the main-chain progress block has banked the normal product (just after `src/state.ts:373`), add:

```ts
// Promotion chains (Unit 5): a long single-category chain also yields one of
// the next category's resource when a redirect worker is hired. Uses the same
// chainAgg computed above; gated entirely on chainRedirect (zero hires => null).
const fromCat = categoryOfTileKey(key);
if (fromCat) {
  const promo = computePromotion(chainAgg, fromCat, chainLenForProgress);
  if (promo) {
    const promotedResource = familyResourceForCategory(promo.toCategory);
    if (promotedResource) {
      addCappedResourceMut(inventory, chainCf, chainFloaters, promotedResource, promo.units, chainCap);
    }
  }
}
```

Add a small local resolver near the top of the reducer module (module scope), mapping a category to its produced resource via the canonical tier-0 tile of that category:

```ts
// Resolve a tile category to the resource its chain produces, via the family
// map. Built once at module load.
import { TILE_TYPES } from "./features/tileCollection/data.js";
const FAMILY_RESOURCE_BY_CATEGORY: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const t of TILE_TYPES) {
    if (out[t.category]) continue;
    const r = producedResource({ key: t.id });
    if (r) out[t.category] = r;
  }
  return out;
})();
function familyResourceForCategory(category: string): string | null {
  return FAMILY_RESOURCE_BY_CATEGORY[category] ?? null;
}
```

> `producedResource` is already imported in `state.ts` (used in the cross-collect block). Reuse it; don't add `TILE_FAMILY_RESOURCE` if `producedResource` resolves the category — drop that import if unused to keep lint clean.

- [ ] **Step 7: Register the new action source if needed**

`chain_redirect_category` is a worker ability, not a new dispatch action, so no `SLICE_PRIMARY_ACTIONS` change is required. Confirm with the check-slice-action skill only if a new action type was introduced (it was not).

- [ ] **Step 8: Add a reducer promotion test**

Append to `src/state.chainIncome.test.ts`:

```ts
describe("CHAIN_COLLECTED promotion", () => {
  it("awards a vegetable from a long grain chain only when a Steward is hired", () => {
    const drive = (hired: Record<string, number>) => {
      let s = { ...initialState(), workers: { hired } } as never;
      s = reducer(s, {
        type: "CHAIN_COLLECTED",
        payload: { key: "tile_grain_wheat", resourceKey: "flour", chainLength: 18, gained: 18, value: 1 },
      } as never);
      return Number((s as { inventory?: Record<string, number> }).inventory?.soup ?? 0);
    };
    expect(drive({})).toBe(0);
    expect(drive({ steward: 10 })).toBeGreaterThan(0);
  });
});
```

> `vegetables` produce `soup` (see `TILE_FAMILY_RESOURCE.veg = "soup"`). With 10 Stewards the threshold drops to 10, so an 18-tile chain promotes.

- [ ] **Step 9: Run tests + typecheck**

Run: `npx vitest run src/game/promotion.test.ts src/state.chainIncome.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/game/promotion.ts src/game/promotion.test.ts src/features/workers/data.ts src/state.ts src/state.chainIncome.test.ts
git commit -m "feat(workers): promotion-chain mechanic and workers"
```

---

## Task 7: Coin & rune workers (Unit 6)

**Files:**
- Modify: `src/features/workers/data.ts`, `src/state.ts`
- Test: `src/state.chainIncome.test.ts` (additions)

- [ ] **Step 1: Write the failing test**

Append to `src/state.chainIncome.test.ts`:

```ts
describe("coin & rune workers", () => {
  it("a coin worker increases coins banked from a chain", () => {
    const coinsFrom = (hired: Record<string, number>) => {
      let s = { ...initialState(), workers: { hired }, coins: 0 } as never;
      s = reducer(s, {
        type: "CHAIN_COLLECTED",
        payload: { key: "tile_grain_wheat", resourceKey: "flour", chainLength: 6, gained: 6, value: 1 },
      } as never);
      return Number((s as { coins?: number }).coins ?? 0);
    };
    expect(coinsFrom({ tax_collector: 10 })).toBeGreaterThan(coinsFrom({}));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state.chainIncome.test.ts -t "coin worker"`
Expected: FAIL — worker coin aggregate is not read in the coin path.

- [ ] **Step 3: Add coin & rune worker defs**

In `src/features/workers/data.ts`, append a generator and merge into `TYPE_WORKERS`:

```ts
function coinRuneWorkers(): WorkerDef[] {
  return [
    {
      id: WorkerTypeId.TaxCollector, name: "Tax Collector", role: "Collector",
      look: { iconKey: "worker_farmer", color: "#f0a83a" },
      hireCost: { coins: 100, coinsStep: 50 }, maxCount: 10,
      abilities: [{ id: "coin_bonus_flat", params: { amount: 2 } }],
      description: "Each Tax Collector adds flat coins to every chain you complete.",
      flavor: "Never smiles, never misses a copper.",
    },
    {
      id: WorkerTypeId.Florist, name: "Florist", role: "Florist",
      look: { iconKey: "worker_farmer", color: "#d96bb0" },
      hireCost: { coins: 120, coinsStep: 60 }, maxCount: 10,
      abilities: [{ id: "coin_bonus_per_tile", params: { amount: 1 } }],
      description: "Each Florist adds a coin per tile to the chains you complete.",
      flavor: "Sells posies at the gate and pockets every petal's worth.",
    },
    {
      id: WorkerTypeId.RuneSeeker, name: "Rune Seeker", role: "Seeker",
      look: { iconKey: "worker_miner", color: "#9b59c4" },
      hireCost: { coins: 200, coinsStep: 100 }, maxCount: 5,
      abilities: [{ id: "rune_support_reduce", params: { amount: 1 } }],
      description: "Each Rune Seeker lowers the supporting tiles needed to mint a rune.",
      flavor: "Hears the hum of buried runes through solid rock.",
    },
  ];
}
```

Append `...coinRuneWorkers()` to `TYPE_WORKERS`.

- [ ] **Step 4: Aggregate the new `rune_support_reduce` channel**

In `src/config/abilitiesAggregate.ts`, add to `emptyChannels()` a field `runeSupportReduce: 0` (near `coinBonusFlat`), and a case in `applyAbilityToChannels`:

```ts
case "rune_support_reduce": {
  const amount = Number(p.amount) || 0;
  if (amount <= 0) break;
  out.runeSupportReduce = (out.runeSupportReduce || 0) + Math.floor(amount * weight);
  break;
}
```

Register `rune_support_reduce` in the ability catalog (`src/types/catalog/abilities.ts`) following the existing entries' shape so the aggregator recognises it (search for `coin_bonus_flat` and mirror its registration).

- [ ] **Step 5: Read the worker coin aggregate in the coin path**

In `src/state.ts`, the coin block at `src/state.ts:401-405` currently reads only tile effects. Add the worker aggregate (already computed as `chainAgg`):

```ts
const chainTileEffects = (TILE_TYPES_MAP[key]?.effects ?? {}) as { coinBonusFlat?: number; coinBonusPerTile?: number };
const hookFlat = (chainTileEffects.coinBonusFlat || 0) + (chainAgg.coinBonusFlat || 0);
const hookPerTile = (chainTileEffects.coinBonusPerTile || 0) + (chainAgg.coinBonusPerTile || 0);
const coinHookBonus = hookFlat + hookPerTile * effectiveChain;
```

- [ ] **Step 6: Apply rune-support reduction to the rune gates**

In `src/state.ts`, the mine rune gate (`src/state.ts:312-318`) and fish pearl gate (`src/state.ts:322-330`) call `isMysteriousChainValid` / `isPearlChainValid`. Pass the reduction so the required supporting-tile count drops (floor 1). Locate those validators (`rg "isMysteriousChainValid|isPearlChainValid" src`) and add an optional `supportReduce` parameter that lowers their internal "≥2 other tiles" requirement to `Math.max(1, 2 - supportReduce)`. At each call site pass `chainAgg.runeSupportReduce ?? 0`. Keep the default parameter `0` so existing callers/tests are unchanged.

> If the validators live in a Phaser-coupled module, add the `supportReduce` parameter to the pure function only; the reducer is the sole caller of the gate in `state.ts`.

- [ ] **Step 7: Run tests + typecheck**

Run: `npx vitest run src/state.chainIncome.test.ts && npm run typecheck`
Expected: PASS, including the coin-worker assertion.

- [ ] **Step 8: Commit**

```bash
git add src/features/workers/data.ts src/state.ts src/config/abilitiesAggregate.ts src/types/catalog/abilities.ts src/state.chainIncome.test.ts
git commit -m "feat(workers): coin and rune worker bonuses"
```

---

## Task 8: Section the workers panel by board (Unit 7)

**Files:**
- Modify: `src/features/workers/index.tsx`

- [ ] **Step 1: Derive a section for each worker**

In `src/features/workers/index.tsx`, add a pure grouping helper above `WorkersPanel`:

```ts
import { categoryOfTileKey } from "../../config/productionLines.js";
import { CATEGORY_TO_SUBCATEGORY } from "../tileCollection/data.js";

type WorkerSection = "Farm" | "Mine" | "Water" | "Crafting" | "Promotion" | "Coin & Rune";

function sectionForWorker(worker: WorkerDef): WorkerSection {
  const ab = worker.abilities?.[0];
  if (!ab) return "Crafting";
  if (ab.id === "chain_redirect_category") return "Promotion";
  if (ab.id === "coin_bonus_flat" || ab.id === "coin_bonus_per_tile" || ab.id === "rune_support_reduce") return "Coin & Rune";
  if (ab.id === "recipe_input_reduce") return "Crafting";
  if (ab.id === "threshold_reduce_category") {
    const cat = String((ab.params as { category?: string })?.category ?? "");
    const sub = (CATEGORY_TO_SUBCATEGORY as Record<string, string>)[cat];
    if (sub === "mining") return "Mine";
    if (sub === "water") return "Water";
    return "Farm";
  }
  return "Crafting";
}

const SECTION_ORDER: WorkerSection[] = ["Farm", "Mine", "Water", "Crafting", "Promotion", "Coin & Rune"];
```

- [ ] **Step 2: Render the browser grid grouped by section**

Replace the single `<BrowserGrid>` in `WorkersPanel` with one grid per non-empty section, each preceded by a label. Group once:

```tsx
const bySection = SECTION_ORDER.map((section) => ({
  section,
  workers: TYPE_WORKERS.filter((w) => sectionForWorker(w) === section),
})).filter((g) => g.workers.length > 0);
```

```tsx
browser={
  <div className="flex flex-col gap-3">
    {bySection.map(({ section, workers }) => (
      <div key={section}>
        <div className="hl-section-label mb-1.5">{section}</div>
        <BrowserGrid min={180}>
          {workers.map((w) => (
            <WorkerBrowserItem
              key={w.id}
              worker={w}
              count={hired[w.id] ?? 0}
              selected={selected?.id === w.id}
              onSelect={() => setSelectedId(w.id)}
            />
          ))}
        </BrowserGrid>
      </div>
    ))}
  </div>
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Visual check**

Run: `npm run test:visual` (only if the workers panel is in a golden). If goldens diff, eyeball them and update with `npm run test:visual:update`, justifying the change (panel now sectioned).

- [ ] **Step 5: Commit**

```bash
git add src/features/workers/index.tsx tests/visual/__goldens__ 2>/dev/null
git commit -m "feat(workers): section the hire panel by board"
```

---

## Task 9: Permanence & regression coverage (Unit 8)

**Files:**
- Test: `src/features/workers/permanence.test.ts`

- [ ] **Step 1: Write the permanence test**

```ts
// src/features/workers/permanence.test.ts
import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../../state.js"; // adjust to real exports

describe("worker permanence across zones", () => {
  it("keeps hired counts when switching zones", () => {
    let s = { ...initialState(), workers: { hired: { farmer: 3, peasant: 2 } } } as never;
    // Switch zones via whatever action the zone/inventory path uses.
    const before = (s as { workers: { hired: Record<string, number> } }).workers.hired;
    s = reducer(s, { type: "SET_VIEW", view: "town" } as never); // a navigation that does not touch workers
    const after = (s as { workers: { hired: Record<string, number> } }).workers.hired;
    expect(after).toEqual(before);
  });
});
```

> Find the real zone-switch action by `rg "activeZone|SET_ZONE|SWITCH_ZONE" src/state.ts src/features/zones`; use that action instead of `SET_VIEW` so the test actually exercises the zone path. The assertion locks in that `state.workers.hired` is root-level and untouched by zone changes.

- [ ] **Step 2: Run test**

Run: `npx vitest run src/features/workers/permanence.test.ts`
Expected: PASS.

- [ ] **Step 3: Full gate**

Run: `npm run lint && npm run typecheck && npm run action-types:check && npx vitest run && npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/workers/permanence.test.ts
git commit -m "test(workers): lock in cross-zone permanence"
```

---

## Task 10: Wiki + docs sync, final verification

**Files:**
- Modify (if any wiki page states worker counts / per-line divisors): `src/balanceManager/content/**/*.html`

- [ ] **Step 1: Check for wiki drift**

Run: `rg -l "worker|tiles per resource|divisor" src/balanceManager/content`
For any page that states a worker roster size or a per-line tile count, use the **wiki-content** skill and prefer `data-wiki-fact` injection over hand-typed numbers. If no page states these, skip.

- [ ] **Step 2: Update the knowledge graph (if present)**

Run: `test -f graphify-out/graph.json && graphify update . || echo "no graph"`

- [ ] **Step 3: Final full verification**

Run: `npm run lint && npm run typecheck && npm run typecheck:tests && npm run action-types:check && npx vitest run && npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit any doc/wiki/graph changes**

```bash
git add -A
git commit -m "docs(workers): sync wiki + graph with worker parity changes"
```

---

## Self-review notes

- **Spec coverage:** Unit 1 → Task 3; Unit 2 → Task 2; Unit 3 → Task 1 (config) consumed by Tasks 3/5; Unit 4 → Tasks 4–5; Unit 5 → Task 6; Unit 6 → Task 7; Unit 7 → Task 8; Unit 8 → Task 9; wiki/risks → Task 10.
- **Type consistency:** `effectiveTilesPerResource(state, key, agg?)`, `computePromotion(agg, fromCategory, units)`, `categoryOfTileKey`, `lineFloor/lineBase/lineStep/tierStep`, `PRODUCTION_LINES` are used with identical signatures everywhere they appear.
- **Backward compatibility:** tier-0 divisors equal `lineBase` (Task 2 guard test); all new mechanics are gated on a worker being hired (zero hires → no behavioural change), so existing balance and tests stay green until the player opts in.
- **Known intentional shifts to call out in the PR:** within a category whose tier-0 tiles historically had mixed divisors (e.g. fish `kelp` was 6, now `lineBase("fish")` = 5), tier-0 normalises to the single line base. Documented as intended.

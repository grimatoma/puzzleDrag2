// Phase 4 — Workers: type-tier hires (Farmer, Lumberjack, Miner, Baker).
// (The original named-individual "apprentice" roster was removed; the
// type-tier workers introduced alongside it are now the worker system.)
import { describe, it, expect } from "vitest";
import { inv } from "../src/testUtils/inventory.js";
import { rootReducer, createInitialState } from "../src/state.js";
import { TYPE_WORKERS, TYPE_WORKER_MAP } from "../src/features/workers/data.js";
import { computeWorkerEffects } from "../src/features/workers/aggregate.js";

function withCoins(coins, villagers = 10) {
  return {
    ...createInitialState(),
    coins,
    villagers,
    inventory: { home: { tile_grass_grass: 100,
      tile_tree_oak: 100,
      tile_mine_stone: 100,
      flour: 100,
      eggs: 100, } },
  };
}

describe("Phase 4 — TYPE_WORKERS data shape", () => {
  it("ships the four base type-tier workers plus 14 production-line workers", () => {
    const ids = new Set(TYPE_WORKERS.map((w) => w.id));
    expect(ids.has("baker")).toBe(true);
    expect(ids.has("farmer")).toBe(true);
    expect(ids.has("lumberjack")).toBe(true);
    expect(ids.has("miner")).toBe(true);
    expect(TYPE_WORKERS.length).toBe(18);
  });

  it("each worker has maxCount >= 10 and a non-zero hireCost", () => {
    for (const w of TYPE_WORKERS) {
      expect(w.maxCount).toBeGreaterThanOrEqual(10);
      expect(w.hireCost.coins).toBeGreaterThan(0);
      expect(Object.keys(w.hireCost.resources || {}).length).toBeGreaterThan(0);
    }
  });

  it("TYPE_WORKER_MAP indexes by id", () => {
    expect(TYPE_WORKER_MAP.farmer.name).toBe("Farmer");
    expect(TYPE_WORKER_MAP.baker.abilities[0].id).toBe("recipe_input_reduce");
  });
});

describe("Phase 4 — fresh state seeds workers slice", () => {
  it("state.workers.hired starts at 0 for every type", () => {
    const s = createInitialState();
    // All 18 workers (4 base + 14 production-line) must be present and seeded to 0.
    // Using toBe(0) without ?? 0 so absence (undefined) fails the assertion.
    for (const w of TYPE_WORKERS) {
      expect(s.workers.hired[w.id]).toBe(0);
    }
  });
});

describe("Phase 4 — WORKERS/HIRE", () => {
  it("hires a Farmer when coins suffice and increments the count", () => {
    const s = withCoins(100);
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(50);
    expect(inv(next).tile_grass_grass).toBe(98);
    expect(next.workers.hired.farmer).toBe(1);
    // Each hire spends one Villager from the housing pool.
    expect(next.villagers).toBe(9);
  });

  it("rejects hire when no Villager is available without debiting coins/resources", () => {
    const s = withCoins(100, 0);
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(100);
    expect(inv(next).tile_grass_grass).toBe(100);
    expect(next.villagers).toBe(0);
    expect(next.workers.hired.farmer).toBe(0);
  });

  it("rejects hire when role resources are short without debiting coins", () => {
    const s = { ...withCoins(100), inventory: { home: { tile_grass_grass: 1 } } };
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(100);
    expect(inv(next).tile_grass_grass).toBe(1);
    expect(next.workers.hired.farmer).toBe(0);
  });

  it("rejects hire when coins are short", () => {
    const s = withCoins(10);
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(10);
    expect(next.workers.hired.farmer).toBe(0);
  });

  it("rejects hire when count is at maxCount", () => {
    let s = withCoins(10000);
    for (let i = 0; i < TYPE_WORKER_MAP.farmer.maxCount; i++) {
      s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    }
    expect(s.workers.hired.farmer).toBe(TYPE_WORKER_MAP.farmer.maxCount);
    const beforeCoins = s.coins;
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(beforeCoins);
    expect(next.workers.hired.farmer).toBe(TYPE_WORKER_MAP.farmer.maxCount);
  });

  it("rejects an unknown worker id", () => {
    const s = withCoins(1000);
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "wizard" } });
    expect(next.coins).toBe(s.coins);
    expect(next.workers).toEqual(s.workers);
  });
});

describe("Phase 4 — WORKERS/FIRE", () => {
  it("decrements hired count, does NOT refund coins, but refunds the Villager", () => {
    let s = withCoins(200);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.workers.hired.farmer).toBe(1);
    expect(s.villagers).toBe(9);
    const coinsAfterHire = s.coins;
    const fired = rootReducer(s, { type: "WORKERS/FIRE", payload: { id: "farmer" } });
    expect(fired.workers.hired.farmer).toBe(0);
    expect(fired.coins).toBe(coinsAfterHire);
    // Firing frees the Villager back into the pool.
    expect(fired.villagers).toBe(10);
  });

  it("is a no-op for the workers slot when the count is already 0", () => {
    const s = withCoins(0);
    const next = rootReducer(s, { type: "WORKERS/FIRE", payload: { id: "farmer" } });
    expect(next.workers).toEqual(s.workers);
    expect(next.coins).toBe(s.coins);
  });
});

describe("Villager currency — Housing Blocks grant Villagers at season end", () => {
  function withBuilt(state, ids) {
    const map = state.mapCurrent ?? "home";
    const builtForMap = { ...(state.built?.[map] ?? {}) };
    for (const id of ids) builtForMap[id] = true;
    return { ...state, built: { ...state.built, [map]: builtForMap } };
  }

  it("fresh state starts with zero Villagers", () => {
    expect(createInitialState().villagers).toBe(0);
  });

  it("each built Housing Block adds 1 Villager when the season closes", () => {
    let s = withBuilt(createInitialState(), ["hearth", "housing", "housing2", "housing3"]);
    expect(s.villagers).toBe(0);
    s = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(s.villagers).toBe(3);
    // Villagers accumulate across seasons.
    s = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(s.villagers).toBe(6);
  });

  it("no Housing Blocks → no Villagers granted at season end", () => {
    let s = withBuilt(createInitialState(), ["hearth"]);
    s = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(s.villagers).toBe(0);
  });

  it("end-to-end: earn a Villager, hire with it, then it is spent", () => {
    let s = withBuilt(createInitialState(), ["hearth", "housing"]);
    s = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(s.villagers).toBe(1);
    s = { ...s, coins: 1000, inventory: { home: { tile_grass_grass: 100 } } };
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.workers.hired.farmer).toBe(1);
    expect(s.villagers).toBe(0);
    // Out of Villagers → the next hire is rejected.
    const blocked = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(blocked.workers.hired.farmer).toBe(1);
  });
});

describe("Phase 4 — Aggregator folds type-workers into the effects channels", () => {
  it("a hired Farmer contributes to thresholdReduce on grain species", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 5 } } });
    // Farmer is threshold_reduce_category on "grain" with amount=1 per hire.
    // 5 hired Farmers → 5 whole-tile reduction per grain species.
    const grainKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tile_grain"));
    expect(grainKeys.length).toBeGreaterThan(0);
    for (const k of grainKeys) {
      expect(out.thresholdReduce[k]).toBe(5);
    }
  });

  it("a hired Lumberjack contributes to thresholdReduce on tree species", () => {
    const out = computeWorkerEffects({ workers: { hired: { lumberjack: 10 } } });
    const treeKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tile_tree"));
    expect(treeKeys.length).toBeGreaterThan(0);
    for (const k of treeKeys) {
      expect(out.thresholdReduce[k]).toBe(10);
    }
  });

  it("a hired Miner contributes to thresholdReduce on stone-mining species", () => {
    const out = computeWorkerEffects({ workers: { hired: { miner: 10 } } });
    // Miner is threshold_reduce_category on "mine_stone" with amount=1 per hire.
    // Regression guard: against the old category "wood" (no such category) the
    // keys list was empty and this worker silently did nothing.
    const stoneKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tile_mine_stone"));
    expect(stoneKeys.length).toBeGreaterThan(0);
    for (const k of stoneKeys) {
      expect(out.thresholdReduce[k]).toBe(10);
    }
  });

  it("a Baker hired to maxCount contributes amount*count to recipeInputReduce", () => {
    const out = computeWorkerEffects({ workers: { hired: { baker: 10 } } });
    // Baker: recipe_input_reduce bread/flour, amount=1 per hire.
    // 10 hired Bakers → 10 raw reduction (crafting/slice.js floors recipe at 1).
    expect(out.recipeInputReduce.bread.flour).toBe(10);
  });

  it("multiple type-workers compose independently on their own channels", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 10, baker: 10 } } });
    const grainHas = Object.keys(out.thresholdReduce).some((k) => k.startsWith("tile_grain"));
    expect(grainHas).toBe(true);
    expect(out.recipeInputReduce.bread.flour).toBe(10);
  });
});

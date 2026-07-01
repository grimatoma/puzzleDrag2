// Phase 4 — Workers: type-tier hires (Farmer, Lumberjack, Miner, Baker).
// (The original named-individual "apprentice" roster was removed; the
// type-tier workers introduced alongside it are now the worker system.)
import { describe, it, expect } from "vitest";
import { inv, patchInventory } from "../../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../../state.js";
import { BUILDINGS } from "../../constants.js";
import { TYPE_WORKERS, TYPE_WORKER_MAP } from "./data.js";
import { computeWorkerEffects } from "./aggregate.js";

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
  it("ships 4 base + 14 production-line + 8 promotion + 3 coin/rune workers", () => {
    const ids = new Set(TYPE_WORKERS.map((w) => w.id));
    expect(ids.has("baker")).toBe(true);
    expect(ids.has("farmer")).toBe(true);
    expect(ids.has("lumberjack")).toBe(true);
    expect(ids.has("miner")).toBe(true);
    expect(ids.has("steward")).toBe(true);
    expect(ids.has("tax_collector")).toBe(true);
    expect(ids.has("rune_seeker")).toBe(true);
    expect(TYPE_WORKERS.length).toBe(29);
  });

  it("each worker is hireable (positive maxCount and coin cost)", () => {
    for (const w of TYPE_WORKERS) {
      expect(w.maxCount, w.id).toBeGreaterThan(0);
      expect(w.hireCost.coins, w.id).toBeGreaterThan(0);
    }
  });

  it("workers that reduce a production line or recipe also carry a resource cost", () => {
    // Promotion (and later coin/rune) workers are coin-only by design; workers
    // that shave a production category or recipe must additionally cost resources.
    const RESOURCE_COST_ABILITIES = new Set(["threshold_reduce_category", "recipe_input_reduce"]);
    for (const w of TYPE_WORKERS) {
      const reducesLineOrRecipe = w.abilities.some((a) => RESOURCE_COST_ABILITIES.has(a.id));
      if (!reducesLineOrRecipe) continue;
      expect(Object.keys(w.hireCost.resources || {}).length, w.id).toBeGreaterThan(0);
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
    // All 26 workers (4 base + 14 production-line + 8 promotion) must be present and seeded to 0.
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

describe("Villager currency — Houses grant Villagers on build (Phase 2)", () => {
  const HOUSE = BUILDINGS.find((b) => b.id === "housing");
  // Stock home so the House's build cost is affordable; build runs at home.
  const stockedHome = () =>
    patchInventory(
      { ...createInitialState(), mapCurrent: "home", activeZone: "home" },
      { plank: 999, bread: 999, eggs: 999 },
      "home",
    );

  it("fresh state starts with zero Villagers", () => {
    expect(createInitialState().villagers).toBe(0);
  });

  it("each House grants a batch of Villagers the moment it's built", () => {
    let s = stockedHome();
    expect(s.villagers).toBe(0);
    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(s.villagers).toBe(3);
    // A second House grants another batch (House is repeatable up to the cap).
    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(s.villagers).toBe(6);
  });

  it("closing a season alone (no House built) grants no Villagers", () => {
    let s = { ...createInitialState() };
    s = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(s.villagers).toBe(0);
  });

  it("end-to-end: build a House to earn Villagers, hire spends one, fire refunds it", () => {
    let s = stockedHome();
    s = rootReducer(s, { type: "BUILD", building: HOUSE });
    expect(s.villagers).toBe(3);
    s = { ...s, coins: 1000, inventory: { ...s.inventory, home: { ...(s.inventory.home ?? {}), tile_grass_grass: 100 } } };
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.workers.hired.farmer).toBe(1);
    expect(s.villagers).toBe(2); // one Villager spent on the hire
    s = rootReducer(s, { type: "WORKERS/FIRE", payload: { id: "farmer" } });
    expect(s.villagers).toBe(3); // firing refunds it
  });

  it("with no Villagers available, a hire is rejected", () => {
    const s = { ...createInitialState(), coins: 1000, villagers: 0, inventory: { home: { tile_grass_grass: 100 } } };
    const blocked = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(blocked.workers?.hired?.farmer ?? 0).toBe(0);
  });
});

describe("Phase 4 — Aggregator folds type-workers into the effects channels", () => {
  it("a hired Farmer contributes to thresholdReduce on grain species", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 5 } } });
    // Farmer is threshold_reduce_category on "grain" with amount=1 per hire, capped at
    // maxCount (zones-1&2: 2 = grain chain 5 − 3). Reduction = min(hired, maxCount) = 2.
    const grainKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tile_grain"));
    expect(grainKeys.length).toBeGreaterThan(0);
    for (const k of grainKeys) {
      expect(out.thresholdReduce[k]).toBe(2);
    }
  });

  it("a hired Lumberjack contributes to thresholdReduce on tree species", () => {
    const out = computeWorkerEffects({ workers: { hired: { lumberjack: 10 } } });
    const treeKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tile_tree"));
    expect(treeKeys.length).toBeGreaterThan(0);
    for (const k of treeKeys) {
      expect(out.thresholdReduce[k]).toBe(3); // capped at maxCount (tree chain 6 − 3)
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
      expect(out.thresholdReduce[k]).toBe(5); // capped at maxCount (stone chain 8 − 3)
    }
  });

  it("a Baker hired to maxCount contributes amount*count to recipeInputReduce", () => {
    const out = computeWorkerEffects({ workers: { hired: { baker: 10 } } });
    // Baker: recipe_input_reduce bread/flour, amount=1 per hire, capped at maxCount (2).
    expect(out.recipeInputReduce.bread.flour).toBe(2);
  });

  it("multiple type-workers compose independently on their own channels", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 10, baker: 10 } } });
    const grainHas = Object.keys(out.thresholdReduce).some((k) => k.startsWith("tile_grain"));
    expect(grainHas).toBe(true);
    expect(out.recipeInputReduce.bread.flour).toBe(2); // Baker capped at maxCount 2
  });
});

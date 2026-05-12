// Phase 4 — Workers: type-tier hires (Farmer, Lumberjack, Miner, Baker).
// (The original named-individual "apprentice" roster was removed; the
// type-tier workers introduced alongside it are now the worker system.)
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../src/state.js";
import { TYPE_WORKERS, TYPE_WORKER_MAP } from "../src/features/workers/data.js";
import { computeWorkerEffects } from "../src/features/workers/aggregate.js";

function withCoins(coins) {
  return { ...createInitialState(), coins };
}

describe("Phase 4 — TYPE_WORKERS data shape", () => {
  it("ships the four expected type-tier workers", () => {
    const ids = TYPE_WORKERS.map((w) => w.id).sort();
    expect(ids).toEqual(["baker", "farmer", "lumberjack", "miner"]);
  });

  it("each worker has maxCount >= 10 and a non-zero hireCost", () => {
    for (const w of TYPE_WORKERS) {
      expect(w.maxCount).toBeGreaterThanOrEqual(10);
      expect(w.hireCost.coins).toBeGreaterThan(0);
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
    expect(s.workers.hired).toEqual({ farmer: 0, lumberjack: 0, miner: 0, baker: 0 });
  });
});

describe("Phase 4 — WORKERS/HIRE", () => {
  it("hires a Farmer when coins suffice and increments the count", () => {
    const s = withCoins(100);
    const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(next.coins).toBe(50);
    expect(next.workers.hired.farmer).toBe(1);
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
  it("decrements hired count and does NOT refund coins", () => {
    let s = withCoins(200);
    s = rootReducer(s, { type: "WORKERS/HIRE", payload: { id: "farmer" } });
    expect(s.workers.hired.farmer).toBe(1);
    const coinsAfterHire = s.coins;
    const fired = rootReducer(s, { type: "WORKERS/FIRE", payload: { id: "farmer" } });
    expect(fired.workers.hired.farmer).toBe(0);
    expect(fired.coins).toBe(coinsAfterHire);
  });

  it("is a no-op for the workers slot when the count is already 0", () => {
    const s = withCoins(0);
    const next = rootReducer(s, { type: "WORKERS/FIRE", payload: { id: "farmer" } });
    expect(next.workers).toEqual(s.workers);
    expect(next.coins).toBe(s.coins);
  });
});

describe("Phase 4 — Aggregator folds type-workers into the effects channels", () => {
  it("a hired Farmer contributes to thresholdReduce on grain species", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 5 } } });
    // Farmer is threshold_reduce_category on "grain". With 5/10 hired,
    // perHireScalar = 0.5, delta = (amount) * 0.5 = 0.5 per grain species.
    const grainKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("grain"));
    expect(grainKeys.length).toBeGreaterThan(0);
    for (const k of grainKeys) {
      expect(out.thresholdReduce[k]).toBeCloseTo(0.5, 6);
    }
  });

  it("a hired Lumberjack contributes to thresholdReduce on tree species", () => {
    const out = computeWorkerEffects({ workers: { hired: { lumberjack: 10 } } });
    const treeKeys = Object.keys(out.thresholdReduce).filter((k) => k.startsWith("tree"));
    expect(treeKeys.length).toBeGreaterThan(0);
    for (const k of treeKeys) {
      expect(out.thresholdReduce[k]).toBeCloseTo(1.0, 6);
    }
  });

  it("a Baker hired to maxCount drops the bread flour cost from 3 to 1", () => {
    const out = computeWorkerEffects({ workers: { hired: { baker: 10 } } });
    // Baker: recipe_input_reduce bread/grain_flour from 3 to 1 at full hire.
    // perHireScalar = 1.0, delta = 2 → recipeInputReduce.bread.grain_flour = 2.
    expect(out.recipeInputReduce.bread.grain_flour).toBeCloseTo(2.0, 6);
  });

  it("multiple type-workers compose independently on their own channels", () => {
    const out = computeWorkerEffects({ workers: { hired: { farmer: 10, baker: 10 } } });
    const grainHas = Object.keys(out.thresholdReduce).some((k) => k.startsWith("grain"));
    expect(grainHas).toBe(true);
    expect(out.recipeInputReduce.bread.grain_flour).toBeCloseTo(2.0, 6);
  });
});

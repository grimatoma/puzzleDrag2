// Phase 34 — Worker recipe-input-reduce effect channel.
//
// Drives the real Baker (TYPE_WORKERS) end-to-end against the crafting
// slice. No vi.mock; the production worker definition shipped in #284
// (Phase 5b) is the system under test.
import { describe, it, expect } from "vitest";
import { computeWorkerEffects } from "../src/features/workers/aggregate.js";
import { reduce as craftingReduce } from "../src/features/crafting/slice.js";
import { TYPE_WORKER_MAP } from "../src/features/workers/data.js";
import { RECIPES } from "../src/constants.js";

const BAKER = TYPE_WORKER_MAP.baker;

function bakeryStateWith(bakers, inv) {
  return {
    coins: 0,
    inventory: { ...inv },
    tools: {},
    built: { bakery: true },
    workers: { hired: { baker: bakers } },
    craftedTotals: {},
  };
}

describe("Phase 34 — recipeInputReduce aggregation (real Baker)", () => {
  it("aggregator output always exposes the recipeInputReduce channel", () => {
    const empty = computeWorkerEffects({ workers: { hired: {} } });
    expect(empty.recipeInputReduce).toEqual({});
  });

  it("0 hires => no reduction", () => {
    const out = computeWorkerEffects({ workers: { hired: { baker: 0 } } });
    expect(out.recipeInputReduce).toEqual({});
  });

  it("Baker effect lives on the bread / grain_flour cell", () => {
    const out = computeWorkerEffects({ workers: { hired: { baker: BAKER.maxCount } } });
    // (from - to) * (count / maxCount) = (3 - 1) * 1.0 = 2.0 at full hire
    expect(out.recipeInputReduce.bread.grain_flour).toBeCloseTo(2.0, 6);
  });
});

describe("Phase 34 — CRAFTING/CRAFT_RECIPE applies the reduction (floored at 1)", () => {
  it("vanilla bread craft (no Bakers) deducts the full 3 flour + 1 egg", () => {
    expect(RECIPES.bread.inputs.grain_flour).toBe(3);
    const s = bakeryStateWith(0, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 3);
    expect(next.inventory.bird_egg).toBe(4);
  });

  it("half the maxCount of Bakers (rounded -1 flour) deducts 2 flour", () => {
    // Baker delta is 2 across maxCount=10 hires. 5 hires -> rounded delta of 1.
    const half = Math.floor(BAKER.maxCount / 2);
    const s = bakeryStateWith(half, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 2);
  });

  it("max Bakers (-2 flour) is floored at 1 remaining flour", () => {
    const s = bakeryStateWith(BAKER.maxCount, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 1);
  });

  it("rejects when reduced inputs exceed inventory", () => {
    // Half hires => 2 flour required. Have only 1 -> rejected.
    const half = Math.floor(BAKER.maxCount / 2);
    const s = bakeryStateWith(half, { grain_flour: 1, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next).toBe(s);
  });
});

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
    // amount * count = 1 * 10 = 10 raw reduction at full hire
    // (crafting/slice.js floors the recipe input at 1)
    expect(out.recipeInputReduce.bread.grain_flour).toBe(1 * BAKER.maxCount);
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

  it("a single Baker (amount=1 per hire) trims one flour off the recipe", () => {
    // 1 Baker → 1 flour reduction → max(1, 3-1) = 2 flour required.
    const s = bakeryStateWith(1, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 2);
  });

  it("two Bakers trim two flour off the recipe", () => {
    // 2 Bakers → 2 flour reduction → max(1, 3-2) = 1 flour required.
    const s = bakeryStateWith(2, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 1);
  });

  it("max Bakers is still floored at 1 remaining flour", () => {
    const s = bakeryStateWith(BAKER.maxCount, { grain_flour: 5, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 1);
  });

  it("rejects when reduced inputs exceed inventory", () => {
    // 0 Bakers => full 3 flour required. Have only 1 -> rejected.
    const s = bakeryStateWith(0, { grain_flour: 1, bird_egg: 5 });
    const next = craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next).toBe(s);
  });
});

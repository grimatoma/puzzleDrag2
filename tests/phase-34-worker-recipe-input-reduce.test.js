// Phase 34 — Worker recipe-input-reduce effect channel.
//
// Pollutes the WORKERS list with a synthetic "test_baker" via vi.mock so
// the aggregator + crafting slice can be exercised end-to-end without
// shipping a balance-affecting worker in production data.
import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("../src/features/apprentices/data.js", async () => {
  const actual = await vi.importActual("../src/features/apprentices/data.js");
  const fixture = {
    id: "test_baker",
    name: "Test Baker",
    role: "Baker",
    icon: "🥖",
    color: "#c89b6a",
    wage: 0,
    hireCost: 0,
    maxCount: 2,
    effect: { type: "recipe_input_reduce", recipe: "bread", input: "grain_flour", from: 3, to: 1 },
    requirement: {},
    description: "[fixture]",
  };
  const next = [...actual.WORKERS, fixture];
  return {
    ...actual,
    WORKERS: next,
    WORKER_MAP: Object.fromEntries(next.map((w) => [w.id, w])),
    APPRENTICES: next,
  };
});

let computeWorkerEffects;
let craftingSlice;
let RECIPES;

beforeAll(async () => {
  ({ computeWorkerEffects } = await import("../src/features/apprentices/aggregate.js"));
  craftingSlice = await import("../src/features/crafting/slice.js");
  ({ RECIPES } = await import("../src/constants.js"));
});

function bakeryStateWith(hired, inv) {
  return {
    coins: 0,
    inventory: { ...inv },
    tools: {},
    built: { bakery: true },
    townsfolk: { hired: { test_baker: hired }, debt: 0, pool: 0 },
    craftedTotals: {},
  };
}

describe("Phase 34 — recipeInputReduce aggregation", () => {
  it("aggregator output always exposes the recipeInputReduce channel", () => {
    const empty = computeWorkerEffects({ townsfolk: { hired: {}, debt: 0 } });
    expect(empty.recipeInputReduce).toEqual({});
  });

  it("0 hires => no reduction", () => {
    const out = computeWorkerEffects({ townsfolk: { hired: { test_baker: 0 }, debt: 0 } });
    expect(out.recipeInputReduce).toEqual({});
  });

  it("1 hire (scalar = 0.5) accumulates a 1.0 partial reduction (delta=2)", () => {
    const out = computeWorkerEffects({ townsfolk: { hired: { test_baker: 1 }, debt: 0 } });
    expect(out.recipeInputReduce.bread.grain_flour).toBeCloseTo(1.0, 6);
  });

  it("2 hires (scalar = 1.0) accumulates the full delta of 2", () => {
    const out = computeWorkerEffects({ townsfolk: { hired: { test_baker: 2 }, debt: 0 } });
    expect(out.recipeInputReduce.bread.grain_flour).toBeCloseTo(2.0, 6);
  });

  it("debt > 0 pauses every effect, including recipe-input-reduce", () => {
    const out = computeWorkerEffects({ townsfolk: { hired: { test_baker: 2 }, debt: 1 } });
    expect(out.recipeInputReduce).toEqual({});
  });
});

describe("Phase 34 — CRAFTING/CRAFT_RECIPE applies the reduction (floored at 1)", () => {
  it("vanilla bread craft (no workers) deducts the full 3 flour + 1 egg", () => {
    const baseInputs = RECIPES.bread.inputs;
    expect(baseInputs.grain_flour).toBe(3);
    const s = bakeryStateWith(0, { grain_flour: 5, bird_egg: 5 });
    const next = craftingSlice.reduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 3);
    expect(next.inventory.bird_egg).toBe(4);
  });

  it("1 baker hired (rounded -1 flour) deducts 2 flour", () => {
    const s = bakeryStateWith(1, { grain_flour: 5, bird_egg: 5 });
    const next = craftingSlice.reduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next.inventory.grain_flour).toBe(5 - 2);
  });

  it("2 bakers hired (-2 flour) is floored at 1 remaining flour", () => {
    const s = bakeryStateWith(2, { grain_flour: 5, bird_egg: 5 });
    const next = craftingSlice.reduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    // Recipe required 3 flour, reduction is 2 -> 1 flour (floor at 1).
    expect(next.inventory.grain_flour).toBe(5 - 1);
  });

  it("rejects when reduced inputs exceed inventory", () => {
    const s = bakeryStateWith(1, { grain_flour: 1, bird_egg: 5 });
    // After 1 baker: needs 2 flour. Have only 1 → rejected.
    const next = craftingSlice.reduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(next).toBe(s);
  });
});

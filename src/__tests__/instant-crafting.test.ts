// Instant crafting — CRAFTING/CRAFT_RECIPE deducts inputs and grants output immediately.
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { reduce as craftingReduce } from "../features/crafting/slice.js";
const RECIPE_KEY = "rec_bread";

// Inventory is keyed per-settlement (Record<zoneId, Inventory>); a fresh state
// is on the "home" zone, so resources live under inventory.home.
function bakeryReady() {
  return {
    ...createInitialState(),
    inventory: { home: { flour: 10, eggs: 5 } },
    built: { bakery: true },
    level: 3,
  };
}

describe("CRAFTING/CRAFT_RECIPE", () => {
  it("deducts inputs and grants the recipe output instantly", () => {
    const s0 = bakeryReady();
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s1.inventory.home?.flour).toBe(7);
    expect(s1.inventory.home?.eggs).toBe(4);
    expect(s1.inventory.home?.bread).toBe(1);
    expect(s1.craftedTotals[RECIPE_KEY]).toBe(1);
  });

  it("is a no-op when the station is not built", () => {
    const s = { ...bakeryReady(), built: {} };
    expect(craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: RECIPE_KEY } })).toBe(s);
  });

  it("is a no-op when inputs are insufficient", () => {
    const s = { ...bakeryReady(), inventory: { home: { flour: 1, eggs: 0 } } };
    expect(craftingReduce(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: RECIPE_KEY } })).toBe(s);
  });

  it("grants tool recipes into tools, not inventory", () => {
    const s0 = {
      ...createInitialState(),
      inventory: { home: { plank: 2 } },
      built: { workshop: true },
      level: 3,
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "rec_rake" });
    expect(s1.tools.rake).toBe(1);
    expect(s1.inventory.home?.plank).toBe(1);
  });

  it("bumps totalCrafted via achievements slice", () => {
    const s0 = bakeryReady();
    const before = s0.totalCrafted;
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: RECIPE_KEY } });
    expect(s1.totalCrafted).toBe(before + 1);
  });

  it("does not leave queue state on fresh saves", () => {
    const s = createInitialState();
    expect("craftQueues" in s).toBe(false);
    expect(s.craftedTotals).toEqual({});
  });
});

import { describe, it, expect } from "vitest";
import { YIELD_MULTIPLIERS, yieldMultiplierFor } from "../features/tileCollection/yieldMultipliers.js";
import { rootReducer, createInitialState } from "../state.js";

describe("yieldMultiplierFor", () => {
  it("returns null for unknown key", () => {
    expect(yieldMultiplierFor("no_such")).toBeNull();
  });

  it("Jackfruit → { multiplier: 2, productKey: 'pie' }", () => {
    expect(yieldMultiplierFor("fruit_jackfruit")).toEqual({ multiplier: 2, productKey: "pie" });
  });

  it("Triceratops → { multiplier: 2, productKey: 'milk' }", () => {
    expect(yieldMultiplierFor("cattle_triceratops")).toEqual({ multiplier: 2, productKey: "milk" });
  });

  it("YIELD_MULTIPLIERS is frozen", () => {
    expect(Object.isFrozen(YIELD_MULTIPLIERS)).toBe(true);
  });
});

describe("CHAIN_COLLECTED with yield multiplier", () => {
  it("Jackfruit chain at threshold doubles the pie credit", () => {
    // fruit_jackfruit threshold is 7 (catalog Fruits → Pie). A chain of 7
    // yields 1 standard upgrade; with the 2× multiplier, inventory gets 2.
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      biomeKey: "farm",
      seasonsCycled: 0, // Spring (no upgrade mult)
      inventory: {},
      grid: null,
    };
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "fruit_jackfruit", gained: 7, chainLength: 7, value: 1, upgrades: 1 },
    });
    expect(s1.inventory.pie).toBe(2);
  });

  it("Triceratops chain doubles the milk credit", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      biomeKey: "farm",
      seasonsCycled: 0,
      inventory: {},
      grid: null,
    };
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "cattle_triceratops", gained: 6, chainLength: 6, value: 1, upgrades: 1 },
    });
    expect(s1.inventory.milk).toBe(2);
  });

  it("a non-multiplier chain (apple) credits standard upgrades", () => {
    const s0 = {
      ...createInitialState(),
      biome: "farm",
      biomeKey: "farm",
      seasonsCycled: 0,
      inventory: {},
      grid: null,
    };
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "fruit_apple", gained: 7, chainLength: 7, value: 1, upgrades: 1 },
    });
    // No multiplier → 1 pie
    expect(s1.inventory.pie).toBe(1);
  });
});

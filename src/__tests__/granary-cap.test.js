import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { currentCap } from "../utils.js";
import { RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "../constants.js";

describe("Phase 4.7 — Granary inventory cap", () => {
  it("base cap is 200, Granary cap is 500", () => {
    expect(RESOURCE_CAP_BASE).toBe(200);
    expect(RESOURCE_CAP_GRANARY).toBe(500);
  });

  it("currentCap reads built.granary", () => {
    const s = createInitialState();
    expect(currentCap(s)).toBe(200);
    expect(currentCap({ ...s, built: { ...s.built, granary: true } })).toBe(500);
  });

  it("CHAIN_COLLECTED clamps at cap and emits one floater", () => {
    const s0 = { ...createInitialState(),
      inventory: { hay: 198 }, seasonStats: { capFloaters: {} } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 10 } } });
    expect(s1.inventory.hay).toBe(200);
    expect(s1.seasonStats.capFloaters.hay).toBe(true);
    expect(s1.floaters?.some(f => /hay stash full/.test(f.text))).toBe(true);
  });

  it("repeat overflow same season emits no second floater", () => {
    const s0 = { ...createInitialState(),
      inventory: { hay: 200 }, seasonStats: { capFloaters: { hay: true } } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 5 } } });
    expect(s1.floaters?.filter(f => /hay stash full/.test(f.text)).length ?? 0)
      .toBe(0);
  });

  it("Market BUY blocks at cap with no debit", () => {
    const s0 = { ...createInitialState(), coins: 1000,
      inventory: { hay: 195 },
      market: { ...createInitialState().market, prices: { hay: { buy: 10, sell: 1 } } } };
    const s1 = rootReducer(s0,
      { type: "BUY_RESOURCE", payload: { key: "hay", qty: 10 } });
    expect(s1.coins).toBe(1000);
    expect(s1.inventory.hay).toBe(195);
  });

  it("Granary build raises cap, allowing further accumulation", () => {
    const s0 = { ...createInitialState(),
      built: { granary: true }, inventory: { hay: 200 },
      seasonStats: { capFloaters: {} } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 50 } } });
    expect(s1.inventory.hay).toBe(250);
  });

  it("save migration clamps overstocked legacy state with no floater", () => {
    const legacy = { ...createInitialState(), inventory: { hay: 999 } };
    const migrated = rootReducer(legacy, { type: "MIGRATE/APPLY_CAPS" });
    expect(migrated.inventory.hay).toBe(200);
    expect(migrated.floaters?.length ?? 0).toBe(0);
  });

  it("currencies and tools are not capped", () => {
    const s0 = { ...createInitialState(), coins: 1500, runes: 800,
      tools: { bomb: 250 } };
    const s1 = rootReducer(s0, { type: "MIGRATE/APPLY_CAPS" });
    expect(s1.coins).toBe(1500);
    expect(s1.runes).toBe(800);
    expect(s1.tools.bomb).toBe(250);
  });
});

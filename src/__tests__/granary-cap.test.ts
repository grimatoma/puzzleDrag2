import { describe, it, expect } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { rootReducer, createInitialState } from "../state.js";
import { currentCap } from "../utils.js";
import { RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "../constants.js";

describe("Phase 4.7 — Granary inventory cap", () => {
  it("base cap is 200, Granary cap is 500", () => {
    expect(RESOURCE_CAP_BASE).toBe(200);
    expect(RESOURCE_CAP_GRANARY).toBe(500);
  });

  it("currentCap reads the active settlement's granary", () => {
    const s = createInitialState();
    expect(currentCap(s)).toBe(200);
    expect(currentCap({ ...s, built: { ...s.built, home: { ...s.built.home, granary: true } } })).toBe(500);
    expect(currentCap({ ...s, built: { ...s.built, granary: true } })).toBe(500);
  });

  it("CHAIN_COLLECTED clamps at cap and emits one floater", () => {
    const s0 = { ...patchInventory(createInitialState(), { hay_bundle: 198 }), seasonStats: { capFloaters: {} } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay_bundle: 10 } } });
    expect(inv(s1).hay_bundle).toBe(200);
    expect(s1.seasonStats.capFloaters.hay_bundle).toBe(true);
    expect(s1.floaters?.some(f => /hay_bundle stash full/.test(f.text))).toBe(true);
  });

  it("repeat overflow same season emits no second floater", () => {
    const s0 = { ...patchInventory(createInitialState(), { hay_bundle: 200 }), seasonStats: { capFloaters: { hay_bundle: true } } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay_bundle: 5 } } });
    expect(s1.floaters?.filter(f => /hay_bundle stash full/.test(f.text)).length ?? 0)
      .toBe(0);
  });

  it("Market BUY blocks at cap with no debit", () => {
    const s0 = { ...patchInventory(createInitialState(), { hay_bundle: 195 }),
      coins: 1000,
      market: { ...createInitialState().market, prices: { hay_bundle: { buy: 10, sell: 1 } } } };
    const s1 = rootReducer(s0,
      { type: "BUY_RESOURCE", payload: { key: "hay_bundle", qty: 10 } });
    expect(s1.coins).toBe(1000);
    expect(inv(s1).hay_bundle).toBe(195);
  });

  it("Granary build raises cap, allowing further accumulation", () => {
    const s0 = patchInventory(
      {
        ...createInitialState(),
        built: { ...createInitialState().built, home: { granary: true } },
        seasonStats: { capFloaters: {} },
      },
      { hay_bundle: 200 },
    );
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay_bundle: 50 } } });
    expect(inv(s1).hay_bundle).toBe(250);
  });

  it("save migration clamps overstocked legacy state with no floater", () => {
    const legacy = patchInventory(createInitialState(), { hay_bundle: 999 });
    const migrated = rootReducer(legacy, { type: "MIGRATE/APPLY_CAPS" });
    expect(inv(migrated).hay_bundle).toBe(200);
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

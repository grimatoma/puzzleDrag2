// Phase 10 — Farm tools, fertilizer, rats, wolves.
// Migrated from src/__tests__/farm-10.1 through farm-10.8 tests.
import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES, RECIPES } from "../src/constants.js";
import { createInitialState, rootReducer } from "../src/state.js";

describe("Phase 10 — Workshop tool recipes", () => {
  it("WORKSHOP_RECIPES exists", () => {
    expect(WORKSHOP_RECIPES).toBeDefined();
  });

  it("rake costs 1 plank", () => {
    expect(WORKSHOP_RECIPES.rake.inputs.plank).toBe(1);
  });

  it("axe costs 1 stone", () => {
    expect(WORKSHOP_RECIPES.axe.inputs.stone).toBe(1);
  });

  it("fertilizer costs 1 hay + 1 dirt", () => {
    expect(WORKSHOP_RECIPES.fertilizer.inputs.hay).toBe(1);
    expect(WORKSHOP_RECIPES.fertilizer.inputs.dirt).toBe(1);
  });
});

describe("Phase 10 — fresh state tools", () => {
  it("fresh state has tools.rake === 0", () => {
    const s = createInitialState();
    expect(s.tools.rake).toBe(0);
  });

  it("fresh state has tools.axe === 0", () => {
    const s = createInitialState();
    expect(s.tools.axe).toBe(0);
  });

  it("fresh state has fertilizerActive === false", () => {
    const s = createInitialState();
    expect(s.fertilizerActive).toBe(false);
  });

  it("fresh state has tools.cat === 0", () => {
    const s = createInitialState();
    expect(s.tools.cat).toBe(0);
  });
});

describe("Phase 10 — CRAFT_TOOL action", () => {
  it("crafts rake when workshop built and plank available", () => {
    const s = {
      ...createInitialState(),
      built: { ...createInitialState().built, workshop: true },
      inventory: { ...createInitialState().inventory, plank: 5 },
    };
    const next = rootReducer(s, { type: "CRAFT_TOOL", id: "rake" });
    expect(next.tools.rake).toBe(1);
    expect(next.inventory.plank).toBe(4);
  });

  it("rejects craft when workshop not built", () => {
    const s = {
      ...createInitialState(),
      inventory: { ...createInitialState().inventory, plank: 5 },
    };
    const next = rootReducer(s, { type: "CRAFT_TOOL", id: "rake" });
    expect(next.tools.rake).toBe(0);
  });
});

describe("Phase 10 — USE_TOOL fertilizer", () => {
  it("fertilizer sets fertilizerActive flag", () => {
    const s = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, fertilizer: 1 },
    };
    const next = rootReducer(s, { type: "USE_TOOL", payload: { id: "fertilizer" } });
    expect(next.fertilizerActive).toBe(true);
    expect(next.tools.fertilizer).toBe(0);
  });
});

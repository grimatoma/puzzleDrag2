/**
 * Phase 10.1 — Priority Farm tools: Rake, Axe, Fertilizer
 * Tests written FIRST (red phase), then implementation makes them green.
 */
import { describe, it, expect } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { createInitialState, rootReducer } from "../state.js";
import { RECIPES, ITEMS } from "../constants.js";
import { applyToolPending } from "../features/farm/tools.js";

// ── Recipe registration ────────────────────────────────────────────────────────

describe("10.1 — RECIPES.tools table", () => {
  it("RECIPES.tools exists", () => {
    expect(RECIPES.tools).toBeDefined();
  });

  it("rake costs 1 plank", () => {
    expect(RECIPES.tools.rake.inputs.plank).toBe(1);
  });

  it("axe costs 1 stone", () => {
    expect(RECIPES.tools.axe.inputs.block).toBe(1);
  });

  it("fertilizer costs 1 hay + 1 dirt", () => {
    expect(RECIPES.tools.fertilizer.inputs.hay_bundle).toBe(1);
    expect(RECIPES.tools.fertilizer.inputs.dirt).toBe(1);
  });

  it("rake is crafted at workshop", () => {
    expect(RECIPES.tools.rake.station).toBe("workshop");
  });

  it("axe is crafted at workshop", () => {
    expect(RECIPES.tools.axe.station).toBe("workshop");
  });

  it("fertilizer is crafted at workshop", () => {
    expect(RECIPES.tools.fertilizer.station).toBe("workshop");
  });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe("10.1 — createInitialState tool counters", () => {
  it("rake starts at 0", () => {
    expect(createInitialState().tools.rake).toBe(0);
  });

  it("axe starts at 0", () => {
    expect(createInitialState().tools.axe).toBe(0);
  });

  it("fertilizer starts at 0", () => {
    expect(createInitialState().tools.fertilizer).toBe(0);
  });

  it("toolPending starts null", () => {
    expect(createInitialState().toolPending).toBeNull();
  });

  it("fillBiasTarget starts unset", () => {
    expect(createInitialState().fillBiasTarget).toBeFalsy();
  });
});

// ── CRAFT_TOOL action ─────────────────────────────────────────────────────────

describe("10.1 — CRAFT_TOOL action", () => {
  function workshopState(overrides: { inventory?: Record<string, number>; [k: string]: unknown } = {}) {
    let s = createInitialState();
    s = { ...s, built: { ...s.built, home: { ...(s.built.home as object), workshop: true } } };
    if (overrides.inventory) s = patchInventory(s, overrides.inventory);
    const { inventory: _omit, ...rest } = overrides;
    return { ...s, ...rest };
  }

  it("crafts rake with 1 plank → tools.rake = 1", () => {
    const s0 = workshopState({ inventory: { plank: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "rake" });
    expect(s1.tools.rake).toBe(1);
  });

  it("crafts rake debits 1 plank", () => {
    const s0 = workshopState({ inventory: { plank: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "rake" });
    expect(inv(s1).plank).toBe(1);
  });

  it("no workshop = no craft (state unchanged)", () => {
    const s0 = createInitialState();
    const s1 = { ...s0, ...patchInventory(s0, { plank: 5 }) };
    const s2 = rootReducer(s1, { type: "CRAFT_TOOL", id: "rake" });
    expect(s2.tools.rake).toBe(0);
    expect(inv(s2).plank).toBe(5);
  });

  it("no plank = no rake (tools.rake stays 0)", () => {
    const s0 = workshopState({ inventory: {} });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "rake" });
    expect(s1.tools.rake).toBe(0);
  });

  it("crafts axe with 1 stone", () => {
    const s0 = workshopState({ inventory: { block: 3 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "axe" });
    expect(s1.tools.axe).toBe(1);
    expect(inv(s1).block).toBe(2);
  });

  it("crafts fertilizer with 1 hay + 1 dirt", () => {
    const s0 = workshopState({ inventory: { hay_bundle: 2, dirt: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "fertilizer" });
    expect(s1.tools.fertilizer).toBe(1);
    expect(inv(s1).hay_bundle).toBe(1);
    expect(inv(s1).dirt).toBe(1);
  });
});

// ── USE_TOOL action — Phase 1 contract (no turn cost) ─────────────────────────

describe("10.1 — USE_TOOL (no turn cost)", () => {
  it("rake armed: tools.rake NOT decremented yet, toolPending = 'rake'", () => {
    // Tap-target tools defer the charge spend to TOOL_FIRED so the displayed
    // count stays accurate while the player picks a target tile.
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, rake: 1 }, turnsUsed: 4 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "rake" });
    expect(s1.tools.rake).toBe(1);
    expect(s1.toolPending).toBe("rake");
    expect(s1.toolPendingPower?.id).toBe("clear_component");
  });

  it("rake TOOL_FIRED: spends the charge and clears connected hay", () => {
    const grid = [
      [{ key: "tile_grass_grass" }, { key: "tile_grass_grass" }, { key: "tile_tree_oak" }],
      [{ key: "tile_grass_grass" }, { key: "tile_fruit_blackberry" }, { key: "tile_grain_wheat" }],
    ];
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, rake: 1 },
      toolPending: "rake",
      toolPendingPower: ITEMS.rake.power,
    };
    const s1 = rootReducer(s0, { type: "TOOL_FIRED", key: "rake", row: 0, col: 0 });
    expect(s1.tools.rake).toBe(0);
    expect(s1.toolPending).toBeNull();
    expect(inv(s1).tile_grass_grass ?? 0).toBe(3);
  });

  it("rake CANCEL_TOOL: clears toolPending without touching count", () => {
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, rake: 1 }, toolPending: "rake" };
    const s1 = rootReducer(s0, { type: "CANCEL_TOOL" });
    expect(s1.tools.rake).toBe(1);
    expect(s1.toolPending).toBeNull();
  });

  it("rake does NOT consume a turn", () => {
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, rake: 1 }, turnsUsed: 4 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "rake" });
    expect(s1.turnsUsed).toBe(4);
  });

  it("axe: instant clear_category sweeps all trees and spends the charge", () => {
    const base = createInitialState();
    const grid = [
      [{ key: "tile_tree_oak" }, { key: "tile_grass_grass" }, { key: "tile_tree_oak" }],
      [{ key: "tile_grass_grass" }, { key: "tile_grass_grass" }, { key: "tile_grass_grass" }],
    ];
    const s0 = { ...base, grid, tools: { ...base.tools, axe: 1 }, turnsUsed: 2 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "axe" });
    expect(s1.toolPending).toBeNull();
    expect(s1.tools.axe).toBe(0);
    expect(s1.turnsUsed).toBe(2);
    expect(inv(s1).tile_tree_oak ?? 0).toBe(2);
    expect(s1.grid.flat().every((t) => t.key !== "tile_tree_oak")).toBe(true);
  });

  it("fertilizer: arms fill bias for the next board fill (fill_bias)", () => {
    const base = createInitialState();
    const s0 = { ...base, tools: { ...base.tools, fertilizer: 1 }, turnsUsed: 4 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "fertilizer" });
    expect(s1.tools.fertilizer).toBe(0);
    expect(s1.fillBiasTarget).toBeTruthy();
    expect(s1.turnsUsed).toBe(4);
  });

  it("fertilizer: fill bias arm disarms when re-used (refund charge)", () => {
    const base = createInitialState();
    const s0 = {
      ...base,
      tools: { ...base.tools, fertilizer: 0 },
      fillBiasTarget: "tile_grain_wheat",
      turnsUsed: 4,
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "fertilizer" });
    expect(s1.fillBiasTarget).toBeFalsy();
    expect(s1.tools.fertilizer).toBe(1);
    expect(s1.turnsUsed).toBe(4);
  });
});

// ── applyToolPending (pure) ───────────────────────────────────────────────────

describe("10.1 — applyToolPending", () => {
  it("clears toolPending without mutating the grid", () => {
    const s0 = { ...createInitialState(), toolPending: "rake" };
    const s2 = applyToolPending(s0);
    expect(s2.toolPending).toBeNull();
    expect(s2.grid).toEqual(s0.grid);
  });
});

/**
 * Phase 10.1 — Priority Farm tools: Rake, Axe, Fertilizer
 * Tests written FIRST (red phase), then implementation makes them green.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { RECIPES } from "../constants.js";
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

  it("fertilizerActive starts false", () => {
    expect(createInitialState().fertilizerActive).toBe(false);
  });
});

// ── CRAFT_TOOL action ─────────────────────────────────────────────────────────

describe("10.1 — CRAFT_TOOL action", () => {
  function workshopState(overrides = {}) {
    const s = createInitialState();
    return {
      ...s,
      built: { ...s.built, workshop: true },
      inventory: { ...s.inventory, ...overrides.inventory },
      ...overrides,
    };
  }

  it("crafts rake with 1 plank → tools.rake = 1", () => {
    const s0 = workshopState({ inventory: { plank: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "rake" });
    expect(s1.tools.rake).toBe(1);
  });

  it("crafts rake debits 1 plank", () => {
    const s0 = workshopState({ inventory: { plank: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "rake" });
    expect(s1.inventory.plank).toBe(1);
  });

  it("no workshop = no craft (state unchanged)", () => {
    const s0 = createInitialState();
    const s1 = { ...s0, inventory: { ...s0.inventory, plank: 5 } };
    const s2 = rootReducer(s1, { type: "CRAFT_TOOL", id: "rake" });
    expect(s2.tools.rake).toBe(0);
    expect(s2.inventory.plank).toBe(5);
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
    expect(s1.inventory.block).toBe(2);
  });

  it("crafts fertilizer with 1 hay + 1 dirt", () => {
    const s0 = workshopState({ inventory: { hay_bundle: 2, dirt: 2 } });
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "fertilizer" });
    expect(s1.tools.fertilizer).toBe(1);
    expect(s1.inventory.hay_bundle).toBe(1);
    expect(s1.inventory.dirt).toBe(1);
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
  });

  it("rake TOOL_FIRED: spends the charge and clears toolPending", () => {
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, rake: 1 }, toolPending: "rake" };
    const s1 = rootReducer(s0, { type: "TOOL_FIRED", key: "rake" });
    expect(s1.tools.rake).toBe(0);
    expect(s1.toolPending).toBeNull();
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

  it("axe armed: toolPending = 'axe' without decrementing count", () => {
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, axe: 1 }, turnsUsed: 2 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "axe" });
    expect(s1.toolPending).toBe("axe");
    expect(s1.tools.axe).toBe(1);
    expect(s1.turnsUsed).toBe(2);
  });

  it("fertilizer: fertilizerActive set to true, no turn cost", () => {
    const s0 = { ...createInitialState(), tools: { ...createInitialState().tools, fertilizer: 1 }, turnsUsed: 4 };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "fertilizer" });
    expect(s1.fertilizerActive).toBe(true);
    expect(s1.tools.fertilizer).toBe(0);
    expect(s1.turnsUsed).toBe(4);
  });

  it("fertilizer: re-using while active disarms and refunds the fertilizer", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, fertilizer: 1 },
      turnsUsed: 4,
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "fertilizer" });
    expect(s1.fertilizerActive).toBe(true);
    expect(s1.tools.fertilizer).toBe(0);
    const s2 = rootReducer(s1, { type: "USE_TOOL", key: "fertilizer" });
    expect(s2.fertilizerActive).toBe(false);
    expect(s2.tools.fertilizer).toBe(1);
    expect(s2.turnsUsed).toBe(4);
  });
});

// ── applyToolPending (pure) ───────────────────────────────────────────────────

describe("10.1 — applyToolPending", () => {
  it("rake collects every hay tile", () => {
    const s0 = createInitialState();
    const s1 = {
      ...s0,
      grid: [
        [{ key: "tile_grass_hay" }, { key: "tile_tree_oak" }, { key: "tile_grass_hay" }],
        [{ key: "tile_grass_hay" }, { key: "tile_fruit_blackberry" }, { key: "tile_grain_wheat" }],
      ],
      inventory: { ...s0.inventory, tile_grass_hay: 0 },
      toolPending: "rake",
    };
    const s2 = applyToolPending(s1);
    expect(s2.inventory.tile_grass_hay).toBe(3);
  });

  it("rake leaves no hay in grid", () => {
    const s0 = createInitialState();
    const s1 = {
      ...s0,
      grid: [
        [{ key: "tile_grass_hay" }, { key: "tile_tree_oak" }, { key: "tile_grass_hay" }],
        [{ key: "tile_grass_hay" }, { key: "tile_fruit_blackberry" }, { key: "tile_grain_wheat" }],
      ],
      inventory: { ...s0.inventory, tile_grass_hay: 0 },
      toolPending: "rake",
    };
    const s2 = applyToolPending(s1);
    expect(s2.grid.flat().every((t) => t.key !== "tile_grass_hay")).toBe(true);
  });

  it("rake clears toolPending", () => {
    const s0 = createInitialState();
    const s1 = {
      ...s0,
      grid: [[{ key: "tile_grass_hay" }]],
      inventory: { ...s0.inventory },
      toolPending: "rake",
    };
    const s2 = applyToolPending(s1);
    expect(s2.toolPending).toBeNull();
  });

  it("axe collects 3 log tiles", () => {
    const s0 = createInitialState();
    const s1 = {
      ...s0,
      grid: [
        [{ key: "tile_tree_oak" }, { key: "tile_grass_hay" }],
        [{ key: "tile_tree_oak" }, { key: "tile_tree_oak" }],
      ],
      inventory: { ...s0.inventory, tile_tree_oak: 0 },
      toolPending: "axe",
    };
    const s2 = applyToolPending(s1);
    expect(s2.inventory.tile_tree_oak).toBe(3);
  });

  it("rake skips rubble-locked tiles", () => {
    const s0 = createInitialState();
    const s1 = {
      ...s0,
      grid: [
        [{ key: "tile_grass_hay", rubble: true }, { key: "tile_grass_hay" }],
      ],
      inventory: { ...s0.inventory, tile_grass_hay: 0 },
      toolPending: "rake",
    };
    const s2 = applyToolPending(s1);
    expect(s2.inventory.tile_grass_hay).toBe(1);
  });
});

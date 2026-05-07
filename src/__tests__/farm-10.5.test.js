/**
 * Phase 10.5 — Cat tool (clears all rats)
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES } from "../constants.js";
import { createInitialState, rootReducer } from "../state.js";

// ── Recipe locked ─────────────────────────────────────────────────────────────

describe("10.5 — WORKSHOP_RECIPES.cat", () => {
  it("cat recipe requires 2 stone", () => {
    expect(WORKSHOP_RECIPES.cat.inputs.stone).toBe(2);
  });

  it("cat recipe requires 1 water", () => {
    expect(WORKSHOP_RECIPES.cat.inputs.water).toBe(1);
  });

  it("cat station is workshop", () => {
    expect(WORKSHOP_RECIPES.cat.station).toBe("workshop");
  });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe("10.5 — tools.cat initial state", () => {
  it("cat starts at 0", () => {
    expect(createInitialState().tools.cat).toBe(0);
  });
});

// ── USE_TOOL cat ──────────────────────────────────────────────────────────────

describe("10.5 — USE_TOOL cat", () => {
  it("cat clears all rats from hazards.rats", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, cat: 1 },
      hazards: { ...createInitialState().hazards, rats: [{ row: 1, col: 1, age: 0 }, { row: 2, col: 2, age: 1 }] },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "cat" } });
    expect(s1.hazards.rats).toEqual([]);
  });

  it("cat is consumed (tools.cat decrements to 0)", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, cat: 1 },
      hazards: { ...createInitialState().hazards, rats: [{ row: 1, col: 1, age: 0 }] },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "cat" } });
    expect(s1.tools.cat).toBe(0);
  });

  it("cat does NOT consume a turn", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, cat: 1 },
      turnsUsed: 3,
      hazards: { ...createInitialState().hazards, rats: [{ row: 1, col: 1, age: 0 }] },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "cat" } });
    expect(s1.turnsUsed).toBe(3);
  });

  it("cat with no rats: refund (tool count unchanged)", () => {
    const s0 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, cat: 1 },
      hazards: { ...createInitialState().hazards, rats: [] },
    };
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "cat" } });
    expect(s1.tools.cat).toBe(1);
  });
});

// ── CRAFT_TOOL cat ────────────────────────────────────────────────────────────

describe("10.5 — CRAFT_TOOL cat", () => {
  it("crafts cat with 2 stone + 1 water", () => {
    const s0 = {
      ...createInitialState(),
      built: { ...createInitialState().built, workshop: true },
      inventory: { ...createInitialState().inventory, stone: 3, water: 2 },
    };
    const s1 = rootReducer(s0, { type: "CRAFT_TOOL", id: "cat" });
    expect(s1.tools.cat).toBe(1);
    expect(s1.inventory.stone).toBe(1);
    expect(s1.inventory.water).toBe(1);
  });
});

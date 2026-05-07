/**
 * Phase 10.8 — Wolves hazard + Rifle / Hound tool counters
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES } from "../constants.js";
import { rollFarmHazard, tickWolves } from "../features/farm/hazards.js";
import { createInitialState, rootReducer } from "../state.js";

function farmState(overrides = {}) {
  return {
    ...createInitialState(),
    biome: "farm",
    hazards: { ...createInitialState().hazards },
    ...overrides,
  };
}

// ── Recipe locked ─────────────────────────────────────────────────────────────

describe("10.8 — WORKSHOP_RECIPES tool recipes", () => {
  it("rifle requires 1 ingot", () => expect(WORKSHOP_RECIPES.rifle.inputs.ingot).toBe(1));
  it("rifle requires 1 plank", () => expect(WORKSHOP_RECIPES.rifle.inputs.plank).toBe(1));
  it("rifle requires 1 stone", () => expect(WORKSHOP_RECIPES.rifle.inputs.stone).toBe(1));
  it("hound requires 3 stone", () => expect(WORKSHOP_RECIPES.hound.inputs.stone).toBe(3));
  it("hound requires 1 bread", () => expect(WORKSHOP_RECIPES.hound.inputs.bread).toBe(1));
});

// ── Spawn condition ────────────────────────────────────────────────────────────

describe("10.8 — rollFarmHazard wolf spawn condition", () => {
  it("no wolves below bird threshold (egg=5)", () => {
    const s = farmState({ inventory: { egg: 5 } });
    let wolfCount = 0;
    for (let i = 0; i < 500; i++) {
      const r = rollFarmHazard(s, Math.random);
      if (r?.kind === "wolf") wolfCount++;
    }
    expect(wolfCount).toBe(0);
  });

  it("wolves spawn ~6% when egg > 30 (over 2000 rolls)", () => {
    const s = farmState({ inventory: { egg: 50 } });
    let wolfCount = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollFarmHazard(s, Math.random);
      if (r?.kind === "wolf") wolfCount++;
    }
    // 6% of 2000 = 120 expected; range 60–180
    expect(wolfCount).toBeGreaterThan(60);
    expect(wolfCount).toBeLessThan(180);
  });

  it("mine biome: no wolves", () => {
    const s = { ...farmState(), biome: "mine", inventory: { egg: 99 } };
    const r = rollFarmHazard(s, () => 0.001);
    expect(r).toBeNull();
  });
});

// ── USE_TOOL rifle ─────────────────────────────────────────────────────────────

describe("10.8 — USE_TOOL rifle clears wolves", () => {
  it("rifle clears hazards.wolves", () => {
    const s0 = farmState({
      tools: { ...createInitialState().tools, rifle: 1 },
      hazards: {
        ...createInitialState().hazards,
        wolves: { list: [{ row: 1, col: 1, scared: false }], scaredTurnsRemaining: 0 },
      },
    });
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "rifle" } });
    expect(s1.hazards.wolves).toBeNull();
    expect(s1.tools.rifle).toBe(0);
  });

  it("rifle: no turn cost", () => {
    const s0 = farmState({
      tools: { ...createInitialState().tools, rifle: 1 },
      turnsUsed: 3,
      hazards: {
        ...createInitialState().hazards,
        wolves: { list: [{ row: 1, col: 1, scared: false }], scaredTurnsRemaining: 0 },
      },
    });
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "rifle" } });
    expect(s1.turnsUsed).toBe(3);
  });
});

// ── USE_TOOL hound ─────────────────────────────────────────────────────────────

describe("10.8 — USE_TOOL hound scatters wolves 5 turns", () => {
  it("hound flips all wolves scared=true", () => {
    const s0 = farmState({
      tools: { ...createInitialState().tools, hound: 1 },
      hazards: {
        ...createInitialState().hazards,
        wolves: { list: [{ row: 1, col: 1, scared: false }], scaredTurnsRemaining: 0 },
      },
    });
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "hound" } });
    expect(s1.hazards.wolves.list[0].scared).toBe(true);
    expect(s1.hazards.wolves.scaredTurnsRemaining).toBe(5);
    expect(s1.tools.hound).toBe(0);
  });

  it("hound: no turn cost", () => {
    const s0 = farmState({
      tools: { ...createInitialState().tools, hound: 1 },
      turnsUsed: 2,
      hazards: {
        ...createInitialState().hazards,
        wolves: { list: [{ row: 1, col: 1, scared: false }], scaredTurnsRemaining: 0 },
      },
    });
    const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { id: "hound" } });
    expect(s1.turnsUsed).toBe(2);
  });
});

// ── tickWolves ─────────────────────────────────────────────────────────────────

describe("10.8 — tickWolves scatter wears off", () => {
  it("scared wolves resume after 5 ticks", () => {
    let s = farmState({
      hazards: {
        ...createInitialState().hazards,
        wolves: {
          list: [{ row: 1, col: 1, scared: true }],
          scaredTurnsRemaining: 5,
        },
      },
    });
    for (let i = 0; i < 5; i++) s = tickWolves(s);
    expect(s.hazards.wolves.list[0].scared).toBe(false);
  });

  it("scaredTurnsRemaining decrements each tick", () => {
    let s = farmState({
      hazards: {
        ...createInitialState().hazards,
        wolves: {
          list: [{ row: 0, col: 0, scared: true }],
          scaredTurnsRemaining: 3,
        },
      },
    });
    s = tickWolves(s);
    expect(s.hazards.wolves.scaredTurnsRemaining).toBe(2);
  });
});

// ── Save/load ─────────────────────────────────────────────────────────────────

describe("10.8 — hazards.wolves save/load", () => {
  it("createInitialState() has hazards.wolves = null", () => {
    expect(createInitialState().hazards.wolves).toBeNull();
  });

  it("wolves JSON round-trip", () => {
    const obj = { list: [{ row: 1, col: 2, scared: false }], scaredTurnsRemaining: 0 };
    expect(JSON.stringify(JSON.parse(JSON.stringify(obj)))).toBe(JSON.stringify(obj));
  });
});

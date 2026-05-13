/**
 * QA Pass 4 — Fix 1: SWITCH_BIOME / ENTER_MINE keep state.biome in sync
 *
 * C-01: both reducers were only updating biomeKey, leaving state.biome as "farm"
 * so rollFarmHazard kept spawning hazards during mine sessions.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { rollFarmHazard } from "../features/farm/hazards.js";

function makeGrid(rows = 4, cols = 4) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: "grass_hay" })),
  );
}

describe("QA-Pass4 Fix1 — SWITCH_BIOME syncs state.biome", () => {
  it("SWITCH_BIOME farm→mine sets state.biome to 'mine'", () => {
    const s0 = { ...createInitialState(), mapCurrent: "quarry", activeZone: "quarry", biomeKey: "farm", biome: "farm", level: 2 };
    const s1 = rootReducer(s0, { type: "SWITCH_BIOME", payload: { biome: "mine" } });
    expect(s1.biome).toBe("mine");
    expect(s1.biomeKey).toBe("mine");
  });

  it("SWITCH_BIOME mine→farm sets state.biome to 'farm'", () => {
    const s0 = { ...createInitialState(), mapCurrent: "quarry", activeZone: "quarry", biomeKey: "mine", biome: "mine", level: 2 };
    const s1 = rootReducer(s0, { type: "SWITCH_BIOME", payload: { biome: "farm" } });
    expect(s1.biome).toBe("farm");
    expect(s1.biomeKey).toBe("farm");
  });

  it("after SWITCH_BIOME to mine, rollFarmHazard returns null (no farm hazards)", () => {
    const s0 = {
      ...createInitialState(),
      mapCurrent: "quarry",
      activeZone: "quarry",
      biomeKey: "farm",
      biome: "farm",
      level: 2,
      hazards: { ...createInitialState().hazards, fire: null, rats: [] },
      grid: makeGrid(),
    };
    const s1 = rootReducer(s0, { type: "SWITCH_BIOME", payload: { biome: "mine" } });
    // After switching to mine, fire/wolf hazards must not roll
    for (let i = 0; i < 200; i++) {
      const r = rollFarmHazard({ ...s1, grid: makeGrid() }, () => 0.001);
      expect(r).toBeNull();
    }
  });
});

describe("QA-Pass4 Fix1 — ENTER_MINE syncs state.biome", () => {
  it("ENTER_MINE standard sets state.biome to 'mine'", () => {
    const s0 = {
      ...createInitialState(),
      mapCurrent: "quarry",
      activeZone: "quarry",
      biomeKey: "farm",
      biome: "farm",
      story: { flags: { mine_unlocked: true } },
      inventory: { ...createInitialState().inventory, supplies: 5 },
    };
    const s1 = rootReducer(s0, { type: "ENTER_MINE", payload: { mode: "standard" } });
    expect(s1.biome).toBe("mine");
    expect(s1.biomeKey).toBe("mine");
  });

  it("ENTER_MINE premium sets state.biome to 'mine'", () => {
    const s0 = {
      ...createInitialState(),
      mapCurrent: "quarry",
      activeZone: "quarry",
      biomeKey: "farm",
      biome: "farm",
      story: { flags: { mine_unlocked: true } },
      runes: 5,
    };
    const s1 = rootReducer(s0, { type: "ENTER_MINE", payload: { mode: "premium" } });
    expect(s1.biome).toBe("mine");
    expect(s1.biomeKey).toBe("mine");
  });
});

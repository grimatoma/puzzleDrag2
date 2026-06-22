/**
 * Permanence regression (Unit 8): hired worker counts live at the root of
 * GameState (state.workers.hired) and are global — switching the board (biome)
 * or travelling to another zone must NOT change them.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../../state.js";

function hiredState() {
  const base = createInitialState();
  return {
    ...base,
    level: 2,
    mapCurrent: "quarry",
    activeZone: "quarry",
    biomeKey: "farm",
    biome: "farm",
    workers: { hired: { ...base.workers.hired, farmer: 5, peasant: 3, steward: 2, tax_collector: 1, rune_seeker: 1 } },
  } as ReturnType<typeof createInitialState>;
}

describe("worker permanence across navigation", () => {
  it("SWITCH_BIOME (farm→mine) leaves hired counts unchanged", () => {
    const s0 = hiredState();
    const before = { ...s0.workers.hired };
    const s1 = rootReducer(s0, { type: "SWITCH_BIOME", payload: { biome: "mine" } } as never);
    expect(s1.biome).toBe("mine"); // sanity: the switch actually happened
    expect(s1.workers.hired).toEqual(before);
  });

  it("CARTO/TRAVEL to another zone leaves hired counts unchanged", () => {
    const s0 = hiredState();
    const before = { ...s0.workers.hired };
    // Whether the travel is accepted or rejected, hired counts must be untouched.
    const s1 = rootReducer(s0, { type: "CARTO/TRAVEL", nodeId: "meadow" } as never);
    expect(s1.workers.hired).toEqual(before);
  });

  it("hired counts are seeded for every worker type and survive a board switch", () => {
    const s0 = hiredState();
    const s1 = rootReducer(s0, { type: "SWITCH_BIOME", payload: { biome: "mine" } } as never);
    // every worker id present (no key dropped) and the specific hires preserved
    expect(Object.keys(s1.workers.hired).length).toBe(Object.keys(s0.workers.hired).length);
    expect(s1.workers.hired.farmer).toBe(5);
    expect(s1.workers.hired.steward).toBe(2);
    expect(s1.workers.hired.rune_seeker).toBe(1);
  });
});

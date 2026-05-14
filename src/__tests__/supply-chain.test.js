import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

function readyMineState(over = {}) {
  const s0 = initialState();
  return {
    ...s0,
    level: 5,
    mapCurrent: "quarry",
    activeZone: "quarry",
    biomeKey: "farm",
    biome: "farm",
    inventory: { ...s0.inventory, supplies: 5 },
    story: { ...s0.story, flags: { ...s0.story.flags, mine_unlocked: true } },
    settlements: {
      ...s0.settlements,
      quarry: { founded: true, biome: "tundra" },
    },
    ...over,
  };
}

describe("3.2 — Supply chain (grain → supplies → expedition rations)", () => {
  it("supplies start at 0 in initial state", () => {
    const s0 = initialState();
    expect(s0.inventory.supplies).toBe(0);
  });

  it("CONVERT_TO_SUPPLY: 3 grain → 1 supply (qty=2 → 6 grain, 2 supplies)", () => {
    const s0 = initialState();
    const s1 = { ...s0, inventory: { ...s0.inventory, grain: 9 } };
    const s2 = gameReducer(s1, { type: "CONVERT_TO_SUPPLY", payload: { qty: 2 } });
    expect(s2.inventory.grain).toBe(3);
    expect(s2.inventory.supplies).toBe(2);
  });

  it("CONVERT_TO_SUPPLY: insufficient grain → no-op", () => {
    const s0 = initialState();
    const poor = { ...s0, inventory: { ...s0.inventory, grain: 2, supplies: 0 } };
    const same = gameReducer(poor, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
    expect(same.inventory.grain).toBe(2);
    expect(same.inventory.supplies).toBe(0);
  });

  it("EXPEDITION/DEPART: blocked before the quarry settlement is founded", () => {
    const blocked = gameReducer(
      readyMineState({
        settlements: { ...initialState().settlements, quarry: { founded: false, biome: "tundra" } },
      }),
      { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { supplies: 5 } } },
    );
    expect(blocked.biomeKey).toBe("farm");
  });

  it("EXPEDITION/DEPART: blocked with fewer than the minimum supply turns", () => {
    const blocked = gameReducer(
      readyMineState({ inventory: { ...initialState().inventory, supplies: 2 } }),
      { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { supplies: 2 } } },
    );
    expect(blocked.biomeKey).toBe("farm");
  });

  it("EXPEDITION/DEPART: succeeds with 3+ supply rations", () => {
    const entered = gameReducer(
      readyMineState({ inventory: { ...initialState().inventory, supplies: 4 } }),
      { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { supplies: 3 } } },
    );
    expect(entered.biomeKey).toBe("mine");
    expect(entered.inventory.supplies).toBe(1);
  });
});

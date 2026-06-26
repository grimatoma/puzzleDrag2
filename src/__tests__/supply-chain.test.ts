import { describe, it, expect, beforeEach } from "vitest";
import { inv, patchInventory, withInv } from "../testUtils/inventory.js";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

function readyMineState(over = {}) {
  const s0 = initialState();
  const base = {
    ...s0,
    level: 5,
    mapCurrent: "quarry",
    activeZone: "quarry",
    biomeKey: "farm",
    biome: "farm",
    story: { ...s0.story, flags: { ...s0.story.flags, mine_unlocked: true } },
    settlements: {
      ...s0.settlements,
      quarry: { founded: true, biome: "tundra" },
    },
  };
  return { ...base, ...patchInventory(base, { supplies: 5 }, "quarry"), ...over };
}

describe("3.2 — Supply chain (grain → supplies → expedition rations)", () => {
  it("supplies start at 0 in initial state", () => {
    const s0 = initialState();
    expect(inv(s0).supplies).toBe(0);
  });

  it("CONVERT_TO_SUPPLY: 3 flour → 1 supply (qty=2 → 6 flour, 2 supplies)", () => {
    const s0 = initialState();
    const s1 = { ...s0, ...patchInventory(s0, { flour: 9 }) };
    const s2 = gameReducer(s1, { type: "CONVERT_TO_SUPPLY", payload: { qty: 2 } });
    expect(inv(s2).flour).toBe(3);
    expect(inv(s2).supplies).toBe(2);
  });

  it("CONVERT_TO_SUPPLY: insufficient flour → no-op", () => {
    const s0 = initialState();
    const poor = { ...s0, ...patchInventory(s0, { flour: 2, supplies: 0 }) };
    const same = gameReducer(poor, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
    expect(inv(same).flour).toBe(2);
    expect(inv(same).supplies).toBe(0);
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
      readyMineState({ inventory: { ...initialState().inventory, quarry: { supplies: 2 } } }),
      { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { supplies: 2 } } },
    );
    expect(blocked.biomeKey).toBe("farm");
  });

  it("EXPEDITION/DEPART: succeeds with a full food pack (any food is a ration now)", () => {
    // "Supplies" is gone — pack any food. 6 bread × 2 turns = 12 = MIN_EXPEDITION_TURNS.
    const entered = gameReducer(
      withInv(readyMineState(), { bread: 6 }, "quarry"),
      { type: "EXPEDITION/DEPART", payload: { biomeKey: "mine", supply: { bread: 6 } } },
    );
    expect(entered.biomeKey).toBe("mine");
    expect(inv(entered).bread ?? 0).toBe(0);
  });
});

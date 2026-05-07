import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("3.2 — Supply chain (grain → supplies → Mine entry)", () => {
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

  it("ENTER_MINE standard: blocked without mine_unlocked flag", () => {
    const s0 = initialState();
    const noUnlock = {
      ...s0,
      inventory: { ...s0.inventory, supplies: 5 },
      story: { flags: {} },
      biomeKey: "farm",
    };
    const blocked = gameReducer(noUnlock, { type: "ENTER_MINE", payload: { mode: "standard" } });
    expect(blocked.biomeKey).toBe("farm");
  });

  it("ENTER_MINE standard: blocked with <3 supplies", () => {
    const s0 = initialState();
    const noSupply = {
      ...s0,
      inventory: { ...s0.inventory, supplies: 2 },
      story: { flags: { mine_unlocked: true } },
      biomeKey: "farm",
    };
    const blocked = gameReducer(noSupply, { type: "ENTER_MINE", payload: { mode: "standard" } });
    expect(blocked.biomeKey).toBe("farm");
  });

  it("ENTER_MINE standard: succeeds with 3+ supplies and mine_unlocked", () => {
    const s0 = initialState();
    const ready = {
      ...s0,
      inventory: { ...s0.inventory, supplies: 4 },
      story: { flags: { mine_unlocked: true } },
      biomeKey: "farm",
    };
    const entered = gameReducer(ready, { type: "ENTER_MINE", payload: { mode: "standard" } });
    expect(entered.biomeKey).toBe("mine");
    expect(entered.inventory.supplies).toBe(1);
  });
});

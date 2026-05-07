// Phase 3 — Economy: market drift, runes, daily streak, supply chain.
// Migrated from market.test.js, runes.test.js, daily-streak.test.js, supply-chain.test.js.
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../src/state.js";
import { MARKET_PRICES } from "../src/constants.js";

describe("Phase 3 — market prices defined", () => {
  it("hay has buy price", () => expect(MARKET_PRICES.hay.buy).toBeGreaterThan(0));
  it("wheat has sell price", () => expect(MARKET_PRICES.wheat.sell).toBeGreaterThan(0));
  it("all base resources covered", () => {
    const keys = ["hay", "wheat", "grain", "log", "plank", "berry", "stone", "ore", "coal"];
    for (const k of keys) {
      expect(MARKET_PRICES[k], `${k} missing`).toBeDefined();
    }
  });
});

describe("Phase 3 — runes in fresh state", () => {
  it("fresh state runes === 0", () => {
    const s = createInitialState();
    expect(s.runes).toBe(0);
  });

  it("GRANT_RUNES adds runes", () => {
    const s = createInitialState();
    const next = rootReducer(s, { type: "GRANT_RUNES", payload: { amount: 3 } });
    expect(next.runes).toBe(3);
  });
});

describe("Phase 3 — daily streak in fresh state", () => {
  it("fresh state has dailyStreak", () => {
    const s = createInitialState();
    expect(s.dailyStreak).toBeDefined();
  });

  it("LOGIN_TICK on new day increments streak", () => {
    const s = { ...createInitialState(), dailyStreak: { lastClaimedDate: null, currentDay: 0 } };
    const next = rootReducer(s, { type: "LOGIN_TICK", payload: { today: "2025-01-01" } });
    expect(next.dailyStreak.currentDay).toBe(1);
    expect(next.dailyStreak.lastClaimedDate).toBe("2025-01-01");
  });

  it("LOGIN_TICK is idempotent same day", () => {
    const s = { ...createInitialState(), dailyStreak: { lastClaimedDate: "2025-01-01", currentDay: 1 } };
    const next = rootReducer(s, { type: "LOGIN_TICK", payload: { today: "2025-01-01" } });
    expect(next.dailyStreak.currentDay).toBe(1);
  });
});

describe("Phase 3 — supply chain (CONVERT_TO_SUPPLY)", () => {
  it("converts 3 grain to 1 supply", () => {
    const s = { ...createInitialState(), inventory: { grain: 9 } };
    const next = rootReducer(s, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
    expect(next.inventory.grain).toBe(6);
    expect(next.inventory.supplies).toBe(1);
  });

  it("rejects conversion when grain < 3", () => {
    const s = { ...createInitialState(), inventory: { grain: 2 } };
    const next = rootReducer(s, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
    expect(next).toBe(s);
  });
});

/**
 * QA Pass 3 — QUESTS/CLAIM_ALMANAC uses canonical almanac/data.js shape.
 * Asserts tier 5 claim grants startingExtraScythe structural reward.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";

function freshStateWithAlmanac(xp, level, claimed = {}) {
  return {
    ...createInitialState(),
    almanac: { xp, level, claimed: { 1: false, 2: false, 3: false, 4: false, 5: false, ...claimed } },
    almanacXp: xp, // keep legacy field in sync
    almanacClaimed: Object.entries(claimed).filter(([, v]) => v).map(([k]) => Number(k)),
    coins: 0,
  };
}

describe("QA Pass 3 — QUESTS/CLAIM_ALMANAC canonical shape", () => {
  it("tier 5 claim grants startingExtraScythe (structural reward)", () => {
    const s = freshStateWithAlmanac(750, 5, { 1: true, 2: true, 3: true, 4: true, 5: false });
    const next = rootReducer(s, { type: "QUESTS/CLAIM_ALMANAC", tier: 5 });
    expect(next.tools?.startingExtraScythe).toBe(true);
    expect(next.almanacClaimed).toContain(5);
  });

  it("tier 1 claim grants 50 coins from canonical data", () => {
    const s = freshStateWithAlmanac(150, 2);
    const next = rootReducer(s, { type: "QUESTS/CLAIM_ALMANAC", tier: 1 });
    expect(next.coins).toBe(50);
    expect(next.almanacClaimed).toContain(1);
  });

  it("cannot double-claim tier 1", () => {
    const s = freshStateWithAlmanac(150, 2, { 1: true });
    const next = rootReducer(s, { type: "QUESTS/CLAIM_ALMANAC", tier: 1 });
    // State should be unchanged (no extra coins)
    expect(next.coins).toBe(s.coins);
  });
});

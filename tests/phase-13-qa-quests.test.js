/**
 * QA Batch 2 — Fix 4: deterministic 6-slot quests from features/quests/data.js
 */
import { describe, it, expect } from "vitest";
import { rollQuests } from "../src/features/quests/data.js";
import { createInitialState, rootReducer } from "../src/state.js";

function fresh() {
  global.localStorage?.clear?.();
  return createInitialState();
}

describe("Fix 4 — deterministic 6-slot quests", () => {
  it("fresh state has exactly 6 quests in state.quests", () => {
    const s = fresh();
    expect(Array.isArray(s.quests)).toBe(true);
    expect(s.quests.length).toBe(6);
  });

  it("same saveSeed + year + season always produces same 6 quests", () => {
    const q1 = rollQuests("fixed-seed-42", 1, "spring");
    const q2 = rollQuests("fixed-seed-42", 1, "spring");
    expect(JSON.stringify(q1)).toBe(JSON.stringify(q2));
  });

  it("different season produces different quests", () => {
    const q1 = rollQuests("fixed-seed-42", 1, "spring");
    const q2 = rollQuests("fixed-seed-42", 1, "summer");
    expect(JSON.stringify(q1)).not.toBe(JSON.stringify(q2));
  });

  it("CLOSE_SEASON re-rolls state.quests", () => {
    const s = fresh();
    const before = JSON.stringify(s.quests);
    const next = rootReducer(s, { type: "CLOSE_SEASON" });
    // Quests should be re-rolled (different set for the next season)
    expect(Array.isArray(next.quests)).toBe(true);
    expect(next.quests.length).toBe(6);
    // Different season means different quests (with overwhelmingly high probability)
    expect(JSON.stringify(next.quests)).not.toBe(before);
  });

  it("CHAIN_COLLECTED ticks collect quests in state.quests", () => {
    const s = {
      ...fresh(),
      quests: [{
        id: "q1", template: "collect_hay", category: "collect", key: "hay",
        target: 30, progress: 0, claimed: false, reward: { coins: 60, xp: 20 },
      }],
    };
    const next = rootReducer(s, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 10, upgrades: 0, value: 1, chainLength: 5, noTurn: false },
    });
    expect(next.quests[0].progress).toBe(10);
  });

  it("CLAIM_QUEST marks quest claimed in state.quests", () => {
    const s = {
      ...fresh(),
      quests: [{
        id: "qclaim1", template: "collect_hay", category: "collect", key: "hay",
        target: 10, progress: 10, claimed: false, reward: { coins: 50, xp: 20 },
      }],
    };
    const next = rootReducer(s, { type: "QUESTS/CLAIM_QUEST", id: "qclaim1" });
    expect(next.quests[0].claimed).toBe(true);
  });
});

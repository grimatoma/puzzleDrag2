// Coverage fillins for src/features/quests/slice.js. Pre-PR coverage
// flagged the slice at 83% statements with branches missing across
// QUESTS/CLAIM_QUEST (legacy + new), QUESTS/PROGRESS_QUEST, the
// CHAIN_COLLECTED multi-progress path, and CRAFTING / CLOSE_SEASON.

import { describe, it, expect } from "vitest";
import { reduce as questReduce, seedQuestIdSeq } from "../features/quests/slice.js";

const baseState = (over = {}) => ({
  dailies: [],
  quests: [],
  almanacXp: 0,
  almanacClaimed: [],
  inventory: {},
  ...over,
});

describe("quests slice — coverage gaps", () => {
  it("QUESTS/ROLL_DAILIES rolls fresh dailies and increments dailyDay", () => {
    const s0 = baseState({ dailyDay: 5 });
    const s1 = questReduce(s0, { type: "QUESTS/ROLL_DAILIES" });
    expect(s1.dailyDay).toBe(6);
    expect(Array.isArray(s1.dailies)).toBe(true);
  });

  it("QUESTS/PROGRESS_QUEST bumps progress on matching key", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/PROGRESS_QUEST", key: "harvest", amount: 4 });
    expect(s1.dailies[0].progress).toBe(4);
    expect(s1.dailies[0].done).toBe(false);
  });

  it("QUESTS/PROGRESS_QUEST sets done when target hit", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 8, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/PROGRESS_QUEST", key: "harvest", amount: 5 });
    expect(s1.dailies[0].progress).toBe(10); // clamped to target
    expect(s1.dailies[0].done).toBe(true);
  });

  it("QUESTS/PROGRESS_QUEST is a no-op on already-claimed quests", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 10, done: true, claimed: true, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/PROGRESS_QUEST", key: "harvest", amount: 4 });
    expect(s1.dailies[0]).toBe(s0.dailies[0]); // unchanged ref
  });

  it("QUESTS/CLAIM_QUEST (legacy) credits coins on a done & unclaimed daily", () => {
    const s0 = baseState({
      coins: 0,
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 5, done: true, claimed: false, reward: { coins: 75 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/CLAIM_QUEST", id: "q1" });
    expect(s1.coins).toBe(75);
    expect(s1.dailies[0].claimed).toBe(true);
  });

  it("QUESTS/CLAIM_QUEST is a no-op when the daily is not done", () => {
    const s0 = baseState({
      coins: 0,
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 0, done: false, claimed: false, reward: { coins: 75 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/CLAIM_QUEST", id: "q1" });
    expect(s1).toBe(s0);
  });

  it("QUESTS/CLAIM_QUEST is a no-op when the id is unknown", () => {
    const s0 = baseState();
    const s1 = questReduce(s0, { type: "QUESTS/CLAIM_QUEST", id: "no_such" });
    expect(s1).toBe(s0);
  });

  it("QUESTS/CLAIM_QUEST routes legacy almanacXp into the canonical almanac slice", () => {
    const s0 = baseState({
      coins: 0,
      almanac: { xp: 0, level: 1, claimed: {} },
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 5, done: true, claimed: false, reward: { coins: 50, almanacXp: 30 } },
      ],
    });
    const s1 = questReduce(s0, { type: "QUESTS/CLAIM_QUEST", id: "q1" });
    expect(s1.coins).toBe(50);
    expect(s1.almanacXp).toBe(30);
    // canonical almanac.xp should reflect the awarded XP (path branch)
    expect((s1.almanac?.xp ?? 0)).toBeGreaterThanOrEqual(30);
  });

  it("CHAIN_COLLECTED progresses 'harvest' and 'chain5' on long chains", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 100, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
        { id: "q2", key: "chain5", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 4, chainLength: 7, key: "grass_hay", value: 2 },
    });
    expect(s1.dailies[0].progress).toBe(4);
    expect(s1.dailies[1].progress).toBe(1); // chain5 ticked
  });

  it("CHAIN_COLLECTED progresses 'coins' daily by floor(gained*value/2)", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "coins", target: 100, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 6, chainLength: 4, key: "grass_hay", value: 3 },
    });
    // floor(6 * 3 / 2) = 9
    expect(s1.dailies[0].progress).toBe(9);
  });

  it("TURN_IN_ORDER ticks 'deliver' daily and ignores when order missing", () => {
    const s0 = baseState({
      orders: [{ id: 1, key: "grass_hay", need: 5 }],
      inventory: { grass_hay: 5 },
      dailies: [
        { id: "q1", key: "deliver", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "TURN_IN_ORDER", id: 1 });
    expect(s1.dailies[0].progress).toBe(1);

    const s2 = questReduce(s0, { type: "TURN_IN_ORDER", id: 999 });
    expect(s2).toBe(s0);
  });

  it("BUILD ticks the 'build' daily", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "build", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "BUILD" });
    expect(s1.dailies[0].progress).toBe(1);
  });

  it("CRAFTING/CRAFT_RECIPE ticks the 'craft' daily", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "craft", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: "bread" } });
    expect(s1.dailies[0].progress).toBe(1);
  });

  it("CLOSE_SEASON re-rolls dailies and bumps dailyDay", () => {
    const s0 = baseState({ dailyDay: 9 });
    const s1 = questReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.dailyDay).toBe(10);
    expect(Array.isArray(s1.dailies)).toBe(true);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(questReduce(s0, { type: "NOPE" })).toBe(s0);
  });

  it("seedQuestIdSeq advances the internal counter past saved ids without throwing", () => {
    expect(() => seedQuestIdSeq([{ id: "q42" }, { id: "q7" }])).not.toThrow();
    expect(() => seedQuestIdSeq(undefined)).not.toThrow();
  });
});

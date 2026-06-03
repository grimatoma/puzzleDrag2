// Coverage fillins for src/features/quests/slice.js. Pre-PR coverage
// flagged the slice at 83% statements with branches missing across
// QUESTS/CLAIM_QUEST (legacy + new), QUESTS/PROGRESS_QUEST, the
// CHAIN_COLLECTED multi-progress path, and CRAFTING / CLOSE_SEASON.

import { describe, it, expect } from "vitest";
import type { Action, GameState } from "../types/state.js";
import { patchInventory } from "../testUtils/inventory.js";
import { reduce as questReduce, seedQuestIdSeq } from "../features/quests/slice.js";
import { mergeTestState, testAction } from "../testUtils/testState.js";

type DailyRow = {
  id: string;
  key: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  reward: Record<string, unknown>;
};

function dailiesOf(state: GameState): DailyRow[] {
  return (state.dailies as DailyRow[]) ?? [];
}

describe("quests slice — coverage gaps", () => {
  const baseState = (over: Record<string, unknown> = {}) =>
    mergeTestState({
      dailies: [],
      quests: [],
      almanacXp: 0,
      almanacClaimed: [],
      inventory: {},
      ...over,
    });

  it("QUESTS/PROGRESS_QUEST bumps progress on matching key", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/PROGRESS_QUEST",
      key: "harvest",
      amount: 4,
    } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(4);
    expect(dailiesOf(s1)[0].done).toBe(false);
  });

  it("QUESTS/PROGRESS_QUEST sets done when target hit", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 8, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/PROGRESS_QUEST",
      key: "harvest",
      amount: 5,
    } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(10); // clamped to target
    expect(dailiesOf(s1)[0].done).toBe(true);
  });

  it("QUESTS/PROGRESS_QUEST is a no-op on already-claimed quests", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "harvest", target: 10, progress: 10, done: true, claimed: true, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/PROGRESS_QUEST",
      key: "harvest",
      amount: 4,
    } as Action);
    expect(dailiesOf(s1)[0]).toBe(dailiesOf(s0)[0]); // unchanged ref
  });

  it("QUESTS/CLAIM_QUEST (legacy) credits coins on a done & unclaimed daily", () => {
    const s0 = baseState({
      coins: 0,
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 5, done: true, claimed: false, reward: { coins: 75 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/CLAIM_QUEST",
      id: "q1",
    } as Action);
    expect(s1.coins).toBe(75);
    expect(dailiesOf(s1)[0].claimed).toBe(true);
  });

  it("QUESTS/CLAIM_QUEST is a no-op when the daily is not done", () => {
    const s0 = baseState({
      coins: 0,
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 0, done: false, claimed: false, reward: { coins: 75 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/CLAIM_QUEST",
      id: "q1",
    } as Action);
    expect(s1).toBe(s0);
  });

  it("QUESTS/CLAIM_QUEST is a no-op when the id is unknown", () => {
    const s0 = baseState();
    const s1 = questReduce(s0, {
      type: "QUESTS/CLAIM_QUEST",
      id: "no_such",
    } as Action);
    expect(s1).toBe(s0);
  });

  it("QUESTS/CLAIM_QUEST awards fixed almanac XP for legacy dailies", () => {
    const s0 = baseState({
      coins: 0,
      almanac: { xp: 0, level: 1, claimed: {} },
      dailies: [
        { id: "q1", key: "harvest", target: 5, progress: 5, done: true, claimed: false, reward: { coins: 50, almanacXp: 30 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "QUESTS/CLAIM_QUEST",
      id: "q1",
    } as Action);
    expect(s1.coins).toBe(50);
    expect(s1.almanac?.xp ?? 0).toBe(20);
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
      payload: { gained: 4, chainLength: 7, key: "tile_grass_hay", value: 2 },
    } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(4);
    expect(dailiesOf(s1)[1].progress).toBe(1); // chain5 ticked
  });

  it("CHAIN_COLLECTED progresses 'coins' daily by floor(gained*value/2)", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "coins", target: 100, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 6, chainLength: 4, key: "tile_grass_hay", value: 3 },
    } as Action);
    // floor(6 * 3 / 2) = 9
    expect(dailiesOf(s1)[0].progress).toBe(9);
  });

  it("TURN_IN_ORDER ticks 'deliver' daily and ignores when order missing", () => {
    const s0 = patchInventory(baseState({
      orders: [{ id: 1, key: "tile_grass_hay", need: 5 }],
      dailies: [
        { id: "q1", key: "deliver", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    }), { tile_grass_hay: 5 });
    const s1 = questReduce(s0, {
      type: "TURN_IN_ORDER",
      id: 1,
    } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(1);

    const s2 = questReduce(s0, {
      type: "TURN_IN_ORDER",
      id: 999,
    } as Action);
    expect(s2).toBe(s0);
  });

  it("BUILD ticks the 'build' daily", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "build", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, { type: "BUILD" } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(1);
  });

  it("CRAFTING/CRAFT_RECIPE ticks the 'craft' daily", () => {
    const s0 = baseState({
      dailies: [
        { id: "q1", key: "craft", target: 3, progress: 0, done: false, claimed: false, reward: { coins: 50 } },
      ],
    });
    const s1 = questReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "bread" },
    } as Action);
    expect(dailiesOf(s1)[0].progress).toBe(1);
  });

  it("CLOSE_SEASON re-rolls dailies and bumps dailyDay", () => {
    const s0 = baseState({ dailyDay: 9 });
    const s1 = questReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.dailyDay).toBe(10);
    expect(Array.isArray(dailiesOf(s1))).toBe(true);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(questReduce(s0, testAction({ type: "NOPE" }))).toBe(s0);
  });

  it("seedQuestIdSeq advances the internal counter past saved ids without throwing", () => {
    expect(() =>
      seedQuestIdSeq([{ id: "q42" }, { id: "q7" }] as Parameters<typeof seedQuestIdSeq>[0]),
    ).not.toThrow();
    expect(() => seedQuestIdSeq(undefined)).not.toThrow();
  });
});

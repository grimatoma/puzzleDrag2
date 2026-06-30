// Quest-completion notifications: a global toast fires the moment a
// deterministic quest crosses from in-progress to done, and the Quests-tab
// badge counts finished-but-unclaimed commissions.

import { describe, it, expect } from "vitest";
import type { Action, GameState } from "../types/state.js";
import type { Quest } from "../features/quests/data.js";
import { reduce as questReduce } from "../features/quests/slice.js";
import { claimableQuestCount } from "../features/quests/data.js";
import { patchInventory } from "../testUtils/inventory.js";
import { mergeTestState } from "../testUtils/testState.js";

function quest(over: Partial<Quest> = {}): Quest {
  return {
    id: "Q1",
    template: "collect_hay",
    category: "collect",
    key: "tile_grass_grass",
    target: 5,
    progress: 4,
    claimed: false,
    reward: { coins: 30, xp: 20 },
    ...over,
  };
}

const base = (over: Record<string, unknown> = {}): GameState =>
  mergeTestState({ dailies: [], quests: [], toasts: [], ...over });

describe("quest completion → global toast", () => {
  it("pushes a 'Quest complete!' toast when a collect quest crosses its target", () => {
    const s0 = base({ quests: [quest({ progress: 4, target: 5 })] });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 1, chainLength: 1, key: "tile_grass_grass", value: 1 },
    } as Action);

    expect(s1.quests[0].progress).toBe(5);
    expect(s1.toasts).toHaveLength(1);
    expect(s1.toasts[0].title).toBe("Quest complete!");
    expect(s1.toasts[0].message).toContain("Collect"); // template label "Collect 5 grass"
    expect(s1.toasts[0].icon).toBe("quest_book");
    expect(s1.toasts[0].tone).toBe("gold");
  });

  it("does not toast when the quest advances but is not yet done", () => {
    const s0 = base({ quests: [quest({ progress: 1, target: 5 })] });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 1, chainLength: 1, key: "tile_grass_grass", value: 1 },
    } as Action);
    expect(s1.quests[0].progress).toBe(2);
    expect(s1.toasts).toHaveLength(0);
  });

  it("does not re-toast a quest that was already complete before the action", () => {
    const s0 = base({ quests: [quest({ progress: 5, target: 5 })] });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 1, chainLength: 1, key: "tile_grass_grass", value: 1 },
    } as Action);
    expect(s1.toasts).toHaveLength(0);
  });

  it("does not toast a quest whose reward is already claimed", () => {
    const s0 = base({ quests: [quest({ progress: 4, target: 5, claimed: true })] });
    const s1 = questReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { gained: 1, chainLength: 1, key: "tile_grass_grass", value: 1 },
    } as Action);
    expect(s1.toasts).toHaveLength(0);
  });

  it("toasts an order quest completing via TURN_IN_ORDER", () => {
    const s0 = patchInventory(
      base({
        orders: [{ id: 1, key: "tile_grass_grass", need: 5 }],
        quests: [quest({ id: "Q2", template: "deliver_any", category: "order", key: undefined, progress: 0, target: 1 })],
      }),
      { tile_grass_grass: 5 },
    );
    const s1 = questReduce(s0, { type: "TURN_IN_ORDER", id: 1 } as Action);
    expect(s1.quests[0].progress).toBe(1);
    expect(s1.toasts).toHaveLength(1);
    expect(s1.toasts[0].title).toBe("Quest complete!");
  });

  it("toasts a craft quest completing via CRAFTING/CRAFT_RECIPE", () => {
    const s0 = base({
      quests: [quest({ id: "Q3", template: "craft_bread", category: "craft", key: undefined, item: "bread", progress: 0, target: 1 })],
    });
    const s1 = questReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "bread" },
    } as Action);
    expect(s1.quests[0].progress).toBe(1);
    expect(s1.toasts).toHaveLength(1);
  });
});

describe("claimableQuestCount — Quests-tab badge", () => {
  it("counts finished, unclaimed deterministic quests", () => {
    const state = base({
      quests: [
        quest({ id: "a", progress: 5, target: 5, claimed: false }), // ready
        quest({ id: "b", progress: 5, target: 5, claimed: true }), // claimed, ignored
        quest({ id: "c", progress: 2, target: 5, claimed: false }), // in progress, ignored
      ],
    });
    expect(claimableQuestCount(state)).toBe(1);
  });

  it("falls back to legacy dailies when there are no deterministic quests", () => {
    const state = base({
      quests: [],
      dailies: [
        { id: "d1", key: "harvest", target: 5, progress: 5, done: true, claimed: false, reward: { coins: 1 } },
        { id: "d2", key: "harvest", target: 5, progress: 5, done: true, claimed: true, reward: { coins: 1 } },
      ],
    });
    expect(claimableQuestCount(state)).toBe(1);
  });

  it("returns 0 when nothing is claimable", () => {
    const state = base({ quests: [quest({ progress: 1, target: 5 })] });
    expect(claimableQuestCount(state)).toBe(0);
  });
});

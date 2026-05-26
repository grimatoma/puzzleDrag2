import { describe, it, expect } from "vitest";
import type { Action } from "../types/state.js";
import { BOSSES } from "../features/bosses/data.js";
import { reduce as bossReduce } from "../features/boss/slice.js";
import { mergeTestState } from "../testUtils/testState.js";

function bossOf(state: { boss?: unknown | null }) {
  return state.boss as Record<string, unknown> | null;
}

const baseState = (over: Record<string, unknown> = {}) =>
  mergeTestState({
    boss: null,
    bossPending: false,
    bossMinimized: false,
    bossesDefeated: 0,
    _bossSeasonCount: 0,
    _bossResolvedThisSeason: false,
    inventory: {},
    modal: null,
    ...over,
  });

describe("Storm boss (fish biome)", () => {
  it("Storm exists in BOSSES with the expected shape", () => {
    const storm = BOSSES.find((b) => b.id === "storm");
    expect(storm).toBeDefined();
    expect(storm!.season).toBe("summer");
    expect(storm!.target).toEqual({ resource: "fish_fillet", amount: 6 });
    expect(storm!.modifier?.type).toBe("min_chain");
    expect(storm!.modifier?.params?.length).toBe(4);
  });

  it("BOSS/TRIGGER 'storm' produces a fish-fillet target with minChain 4", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "storm" } as Action);
    expect(bossOf(s1)?.key).toBe("storm");
    expect(bossOf(s1)?.resource).toBe("fish_fillet");
    expect(bossOf(s1)?.targetCount).toBe(6);
    expect(bossOf(s1)?.minChain).toBe(4);
    expect(s1.modal).toBe("boss");
  });

  it("CHAIN_COLLECTED of fish_fillet bumps Storm progress", () => {
    const s0 = baseState({
      boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 1, turnsLeft: 5, minChain: 4 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "fish_fillet", gained: 2, key: "fish_fillet" },
    } as Action);
    expect(bossOf(s1)?.progress).toBe(3);
  });

  it("CHAIN_COLLECTED that hits Storm target auto-resolves a win", () => {
    const s0 = baseState({
      boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 5, turnsLeft: 5, minChain: 4 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "fish_fillet", gained: 2, key: "fish_fillet" },
    } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
    expect(s1.coins).toBeGreaterThan(0);
  });
});

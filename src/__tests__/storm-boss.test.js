import { describe, it, expect } from "vitest";
import { BOSSES } from "../features/bosses/data.js";
import { reduce as bossReduce } from "../features/boss/slice.js";

const baseState = (over = {}) => ({
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
    expect(storm.season).toBe("summer");
    expect(storm.target).toEqual({ resource: "fish_fillet", amount: 6 });
    expect(storm.modifier?.type).toBe("min_chain");
    expect(storm.modifier?.params?.length).toBe(4);
  });

  it("BOSS/TRIGGER 'storm' produces a fish-fillet target with minChain 4", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "storm" });
    expect(s1.boss?.key).toBe("storm");
    expect(s1.boss?.resource).toBe("fish_fillet");
    expect(s1.boss?.targetCount).toBe(6);
    expect(s1.boss?.minChain).toBe(4);
    expect(s1.modal).toBe("boss");
  });

  it("CHAIN_COLLECTED of fish_fillet bumps Storm progress", () => {
    const s0 = baseState({
      boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 1, turnsLeft: 5, minChain: 4 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "fish_fillet", gained: 2, key: "fish_fillet" },
    });
    expect(s1.boss.progress).toBe(3);
  });

  it("CHAIN_COLLECTED that hits Storm target auto-resolves a win", () => {
    const s0 = baseState({
      boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 5, turnsLeft: 5, minChain: 4 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "fish_fillet", gained: 2, key: "fish_fillet" },
    });
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
    expect(s1.coins).toBeGreaterThan(0);
  });

  it("year rotation includes Storm so the season-clock will eventually trigger it", () => {
    // Year 6 (seasonCount 24 → yearIndex 5) cycles back through; Storm is the 6th entry,
    // so seasonCount === 24 maps to yearIndex 5 → Storm.
    const s0 = baseState({ _bossSeasonCount: 23, _bossResolvedThisSeason: false });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1._bossSeasonCount).toBe(24);
    expect(s1.boss?.key).toBe("storm");
  });
});

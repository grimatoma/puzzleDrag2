import { describe, it, expect } from "vitest";
import type { Action } from "../types/state.js";
import { reduce as achReduce } from "../features/achievements/slice.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";
import { mergeTestState } from "../testUtils/testState.js";

const baseAchievements = () => ({
  counters: {
    chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
    festival_won: 0, distinct_resources_chained: 0,
    distinct_buildings_built: 0, supplies_converted: 0,
    fish_chained: 0, mine_chained: 0,
  },
  unlocked: Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, false])),
  seenResources: {},
  seenBuildings: {},
});

const baseState = (over: Record<string, unknown> = {}) =>
  mergeTestState({
    achievements: baseAchievements(),
    ...over,
  });

describe("mine-themed achievements", () => {
  it("registers first_strike / deep_digger / mine_master", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain("first_strike");
    expect(ids).toContain("deep_digger");
    expect(ids).toContain("mine_master");
  });

  it("CHAIN_COLLECTED on a mine_* key bumps mine_chained by gained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_mine_stone", gained: 4, chainLength: 4, upgrades: 0 },
    } as Action);
    expect(s1.achievements.counters.mine_chained).toBe(4);
  });

  it("CHAIN_COLLECTED on a non-mine key does NOT bump mine_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_grass_grass", gained: 10, chainLength: 10, upgrades: 0 },
    } as Action);
    expect(s1.achievements.counters.mine_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on every mine_* species credits the same counter", () => {
    let s = baseState();
    const mineKeys = ["tile_mine_stone", "tile_mine_iron_ore", "tile_mine_copper_ore", "tile_mine_coal", "tile_mine_gem", "tile_mine_gold"];
    for (const key of mineKeys) {
      s = achReduce(s, {
        type: "CHAIN_COLLECTED",
        payload: { key, gained: 3, chainLength: 3, upgrades: 0 },
      } as Action);
    }
    expect(s.achievements.counters.mine_chained).toBe(3 * mineKeys.length);
  });

  it("zero-gain chain does NOT bump mine_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_mine_stone", gained: 0, chainLength: 4, upgrades: 0 },
    } as Action);
    expect(s1.achievements.counters.mine_chained).toBe(0);
  });

  it("threshold values match: first_strike 1 / deep_digger 50 / mine_master 200", () => {
    const fs = ACHIEVEMENTS.find((a) => a.id === "first_strike");
    const dd = ACHIEVEMENTS.find((a) => a.id === "deep_digger");
    const mm = ACHIEVEMENTS.find((a) => a.id === "mine_master");
    expect(fs?.threshold).toBe(1);
    expect(dd?.threshold).toBe(50);
    expect(mm?.threshold).toBe(200);
    expect(fs?.counter).toBe("mine_chained");
    expect(dd?.counter).toBe("mine_chained");
    expect(mm?.counter).toBe("mine_chained");
  });

  it("crossing first_strike threshold unlocks the achievement and grants its coin reward", () => {
    const s0 = baseState({ coins: 0 });
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_mine_stone", gained: 1, chainLength: 1, upgrades: 0 },
    } as Action);
    expect(s1.achievements.unlocked.first_strike).toBe(true);
    // First chain also unlocks first_steps + naturalist could fire — total
    // coins is just verified to include first_strike's 25◉.
    expect(s1.coins).toBeGreaterThanOrEqual(25);
  });
});

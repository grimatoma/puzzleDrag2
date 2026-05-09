import { describe, it, expect } from "vitest";
import { reduce as achReduce, initial as achInitial } from "../features/achievements/slice.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

const baseAchievements = () => ({
  counters: {
    chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
    festival_won: 0, distinct_resources_chained: 0,
    distinct_buildings_built: 0, supplies_converted: 0,
    fish_chained: 0,
    cattle_chained: 0, mount_chained: 0, tree_chained: 0, bird_chained: 0,
  },
  unlocked: Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, false])),
  seenResources: {},
  seenBuildings: {},
});

const baseState = (over = {}) => ({
  ...achInitial,
  achievements: baseAchievements(),
  ...over,
});

describe("cattle / mount / tree / bird achievements", () => {
  it("registers dairyman / stable_hand / forester / fowler", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain("dairyman");
    expect(ids).toContain("stable_hand");
    expect(ids).toContain("forester");
    expect(ids).toContain("fowler");
  });

  it("CHAIN_COLLECTED on cattle_* bumps cattle_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "cattle_cow", gained: 6, chainLength: 6, upgrades: 0 },
    });
    expect(s1.achievements.counters.cattle_chained).toBe(6);
  });

  it("CHAIN_COLLECTED on mount_* bumps mount_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "mount_horse", gained: 4, chainLength: 4, upgrades: 0 },
    });
    expect(s1.achievements.counters.mount_chained).toBe(4);
  });

  it("CHAIN_COLLECTED on tree_* bumps tree_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tree_oak", gained: 5, chainLength: 5, upgrades: 0 },
    });
    expect(s1.achievements.counters.tree_chained).toBe(5);
  });

  it("CHAIN_COLLECTED on bird_* bumps bird_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "bird_egg", gained: 6, chainLength: 6, upgrades: 0 },
    });
    expect(s1.achievements.counters.bird_chained).toBe(6);
  });

  it("CHAIN_COLLECTED on grass_hay touches none of the four new counters", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 6, chainLength: 6, upgrades: 0 },
    });
    expect(s1.achievements.counters.cattle_chained).toBe(0);
    expect(s1.achievements.counters.mount_chained).toBe(0);
    expect(s1.achievements.counters.tree_chained).toBe(0);
    expect(s1.achievements.counters.bird_chained).toBe(0);
  });

  it("threshold values: dairyman/stable_hand 30, forester/fowler 50", () => {
    expect(ACHIEVEMENTS.find((a) => a.id === "dairyman").threshold).toBe(30);
    expect(ACHIEVEMENTS.find((a) => a.id === "stable_hand").threshold).toBe(30);
    expect(ACHIEVEMENTS.find((a) => a.id === "forester").threshold).toBe(50);
    expect(ACHIEVEMENTS.find((a) => a.id === "fowler").threshold).toBe(50);
  });
});

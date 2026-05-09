import { describe, it, expect } from "vitest";
import { reduce as achReduce, initial as achInitial } from "../features/achievements/slice.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

const baseAchievements = () => ({
  counters: {
    chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
    festival_won: 0, distinct_resources_chained: 0,
    distinct_buildings_built: 0, supplies_converted: 0,
    fish_chained: 0,
    veg_chained: 0, fruit_chained: 0, flower_chained: 0, herd_chained: 0,
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

describe("per-category achievements", () => {
  it("registers veg_patron / orchard_friend / pollinator / herder", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain("veg_patron");
    expect(ids).toContain("orchard_friend");
    expect(ids).toContain("pollinator");
    expect(ids).toContain("herder");
  });

  it("CHAIN_COLLECTED on veg_* bumps veg_chained only", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "veg_carrot", gained: 5, chainLength: 5, upgrades: 0 },
    });
    expect(s1.achievements.counters.veg_chained).toBe(5);
    expect(s1.achievements.counters.fruit_chained).toBe(0);
    expect(s1.achievements.counters.flower_chained).toBe(0);
    expect(s1.achievements.counters.herd_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on fruit_* bumps fruit_chained only", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "fruit_apple", gained: 7, chainLength: 7, upgrades: 0 },
    });
    expect(s1.achievements.counters.fruit_chained).toBe(7);
    expect(s1.achievements.counters.veg_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on flower_* bumps flower_chained only", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "flower_pansy", gained: 10, chainLength: 10, upgrades: 0 },
    });
    expect(s1.achievements.counters.flower_chained).toBe(10);
    expect(s1.achievements.counters.veg_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on herd_* bumps herd_chained only", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "herd_pig", gained: 4, chainLength: 4, upgrades: 0 },
    });
    expect(s1.achievements.counters.herd_chained).toBe(4);
    expect(s1.achievements.counters.veg_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on grass_hay touches none of the new counters", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 6, chainLength: 6, upgrades: 0 },
    });
    expect(s1.achievements.counters.veg_chained).toBe(0);
    expect(s1.achievements.counters.fruit_chained).toBe(0);
    expect(s1.achievements.counters.flower_chained).toBe(0);
    expect(s1.achievements.counters.herd_chained).toBe(0);
  });

  it("threshold values: veg/fruit 50, flower/herd 30", () => {
    expect(ACHIEVEMENTS.find((a) => a.id === "veg_patron").threshold).toBe(50);
    expect(ACHIEVEMENTS.find((a) => a.id === "orchard_friend").threshold).toBe(50);
    expect(ACHIEVEMENTS.find((a) => a.id === "pollinator").threshold).toBe(30);
    expect(ACHIEVEMENTS.find((a) => a.id === "herder").threshold).toBe(30);
  });

  it("crossing pollinator threshold unlocks the achievement", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "flower_pansy", gained: 30, chainLength: 30, upgrades: 0 },
    });
    expect(s1.achievements.unlocked.pollinator).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { reduce as achReduce, initial as achInitial } from "../features/achievements/slice.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

const baseAchievements = () => ({
  counters: {
    chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
    festival_won: 0, distinct_resources_chained: 0,
    distinct_buildings_built: 0, supplies_converted: 0,
    fish_chained: 0,
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

describe("fish-themed achievements", () => {
  it("registers first_catch / tide_runner / master_angler", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain("first_catch");
    expect(ids).toContain("tide_runner");
    expect(ids).toContain("master_angler");
  });

  it("CHAIN_COLLECTED on a fish key bumps fish_chained by gained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "fish_sardine", gained: 4, chainLength: 4, upgrades: 0 },
    });
    expect(s1.achievements.counters.fish_chained).toBe(4);
  });

  it("CHAIN_COLLECTED on a non-fish key does NOT bump fish_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 10, chainLength: 10, upgrades: 0 },
    });
    expect(s1.achievements.counters.fish_chained).toBe(0);
  });

  it("CHAIN_COLLECTED on every fish_* species credits the same counter", () => {
    let s = baseState();
    for (const key of ["fish_sardine", "fish_mackerel", "fish_clam", "fish_oyster", "fish_kelp"]) {
      s = achReduce(s, {
        type: "CHAIN_COLLECTED",
        payload: { key, gained: 3, chainLength: 3, upgrades: 0 },
      });
    }
    expect(s.achievements.counters.fish_chained).toBe(3 * 5);
  });

  it("zero-gain chain (e.g. winter short-chain) does NOT bump fish_chained", () => {
    const s0 = baseState();
    const s1 = achReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "fish_sardine", gained: 0, chainLength: 4, upgrades: 0 },
    });
    expect(s1.achievements.counters.fish_chained).toBe(0);
  });

  it("master_angler threshold is 200, tide_runner 50, first_catch 1", () => {
    const fc = ACHIEVEMENTS.find((a) => a.id === "first_catch");
    const tr = ACHIEVEMENTS.find((a) => a.id === "tide_runner");
    const ma = ACHIEVEMENTS.find((a) => a.id === "master_angler");
    expect(fc.threshold).toBe(1);
    expect(tr.threshold).toBe(50);
    expect(ma.threshold).toBe(200);
    expect(fc.counter).toBe("fish_chained");
    expect(tr.counter).toBe("fish_chained");
    expect(ma.counter).toBe("fish_chained");
  });
});

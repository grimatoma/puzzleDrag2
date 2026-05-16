import { describe, it, expect } from "vitest";
import {
  computeAchievementTracks, totalAchievementCoins, toolAwardCount,
} from "../balanceManager/achievementTracks.js";

describe("computeAchievementTracks", () => {
  it("groups achievements by their counter id", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "a", counter: "chains", threshold: 1, reward: { coins: 25 } },
      { id: "b", counter: "chains", threshold: 10, reward: { coins: 50 } },
      { id: "c", counter: "orders", threshold: 5, reward: { coins: 30 } },
    ]});
    expect(out.map((t) => t.counter)).toEqual(["chains", "orders"]);
    expect(out[0].achievements).toHaveLength(2);
    expect(out[1].achievements).toHaveLength(1);
  });

  it("sorts each track by threshold ascending", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "z", counter: "x", threshold: 100 },
      { id: "a", counter: "x", threshold: 1 },
      { id: "m", counter: "x", threshold: 10 },
    ]});
    expect(out[0].achievements.map((a) => a.id)).toEqual(["a", "m", "z"]);
  });

  it("detects geometric progression (≥3 milestones, each ≥2× previous)", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "a", counter: "x", threshold: 1 },
      { id: "b", counter: "x", threshold: 10 },
      { id: "c", counter: "x", threshold: 100 },
    ]});
    expect(out[0].isGeometric).toBe(true);
  });

  it("does not flag a linear ramp as geometric", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "a", counter: "x", threshold: 10 },
      { id: "b", counter: "x", threshold: 15 },
      { id: "c", counter: "x", threshold: 20 },
    ]});
    expect(out[0].isGeometric).toBe(false);
  });

  it("captures min and max thresholds", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "a", counter: "x", threshold: 5 },
      { id: "b", counter: "x", threshold: 25 },
    ]});
    expect(out[0].minThreshold).toBe(5);
    expect(out[0].maxThreshold).toBe(25);
  });

  it("summarises rewards (coins + tools) into a single string", () => {
    const out = computeAchievementTracks({ achievements: [
      { id: "a", counter: "x", threshold: 1, reward: { coins: 200, tools: { magic_wand: 1 } } },
    ]});
    expect(out[0].achievements[0].summary).toMatch(/200◉/);
    expect(out[0].achievements[0].summary).toMatch(/magic_wand/);
  });

  it("works against the live catalog", () => {
    const tracks = computeAchievementTracks();
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((t) => t.achievements.length >= 1)).toBe(true);
  });
});

describe("totalAchievementCoins / toolAwardCount", () => {
  it("sums coin rewards across achievements", () => {
    const total = totalAchievementCoins({ achievements: [
      { reward: { coins: 25 } }, { reward: { coins: 50 } }, { reward: { tools: { magic_wand: 1 } } },
    ]});
    expect(total).toBe(75);
  });

  it("counts achievements that award a tool", () => {
    const n = toolAwardCount({ achievements: [
      { reward: { coins: 10 } },
      { reward: { tools: { magic_wand: 1 } } },
      { reward: { tools: { magic_seed: 1 } } },
    ]});
    expect(n).toBe(2);
  });

  it("returns 0 for empty / missing rewards", () => {
    expect(totalAchievementCoins({ achievements: [] })).toBe(0);
    expect(toolAwardCount({ achievements: [{ reward: null }] })).toBe(0);
  });

  it("works against the live catalog without crashing", () => {
    expect(totalAchievementCoins()).toBeGreaterThan(0);
    expect(toolAwardCount()).toBeGreaterThan(0);
  });
});

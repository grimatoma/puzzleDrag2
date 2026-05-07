/**
 * Phase 7.3 — Achievement counters wired to live game events
 * Tests run RED first; implementation in src/features/achievements/data.js
 */
import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, tickAchievement } from "../features/achievements/data.js";
import { createInitialState } from "../state.js";

function freshState() {
  global.localStorage.clear();
  return createInitialState();
}

// ── 7.3.1 ACHIEVEMENTS manifest ───────────────────────────────────────────────
describe("7.3 ACHIEVEMENTS manifest", () => {
  it("has at least 10 achievements", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
  });

  it("every achievement has id, name, counter, threshold > 0", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.counter).toBeTruthy();
      expect(a.threshold).toBeGreaterThan(0);
    }
  });

  it("first_steps unlocks at 1 chain", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "first_steps");
    expect(a).toBeDefined();
    expect(a.threshold).toBe(1);
    expect(a.counter).toBe("chains_committed");
  });

  it("champion unlocks at 4 bosses", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "champion");
    expect(a).toBeDefined();
    expect(a.threshold).toBe(4);
    expect(a.counter).toBe("bosses_defeated");
  });

  it("true_keeper tracks festival_won", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "true_keeper");
    expect(a).toBeDefined();
    expect(a.counter).toBe("festival_won");
  });
});

// ── 7.3.2 Fresh state ─────────────────────────────────────────────────────────
describe("7.3 initialState achievements", () => {
  it("all counters are 0 on fresh state", () => {
    const s = freshState();
    expect(s.achievements.counters.chains_committed).toBe(0);
    expect(s.achievements.counters.orders_fulfilled).toBe(0);
    expect(s.achievements.counters.bosses_defeated).toBe(0);
    expect(s.achievements.counters.festival_won).toBe(0);
    expect(s.achievements.counters.distinct_resources_chained).toBe(0);
    expect(s.achievements.counters.distinct_buildings_built).toBe(0);
    expect(s.achievements.counters.supplies_converted).toBe(0);
  });

  it("no achievements unlocked on fresh state", () => {
    const s = freshState();
    const vals = Object.values(s.achievements.unlocked);
    expect(vals.every((v) => v === false)).toBe(true);
  });

  it("seenResources and seenBuildings are empty on fresh state", () => {
    const s = freshState();
    expect(Object.keys(s.achievements.seenResources).length).toBe(0);
    expect(Object.keys(s.achievements.seenBuildings).length).toBe(0);
  });
});

// ── 7.3.3 tickAchievement — basic counter ─────────────────────────────────────
describe("7.3 tickAchievement basic counter", () => {
  it("first chain commit increments counter and unlocks first_steps", () => {
    const s = freshState();
    const r = tickAchievement(s, "chains_committed");
    expect(r.newState.achievements.counters.chains_committed).toBe(1);
    expect(r.newState.achievements.unlocked.first_steps).toBe(true);
    expect(r.unlocked).toContain("first_steps");
  });

  it("is pure — original state unchanged", () => {
    const s = freshState();
    tickAchievement(s, "chains_committed");
    expect(s.achievements.counters.chains_committed).toBe(0);
  });

  it("second chain ticks counter but fires no new unlock (idempotent)", () => {
    const s = freshState();
    const r1 = tickAchievement(s, "chains_committed");
    const r2 = tickAchievement(r1.newState, "chains_committed");
    expect(r2.newState.achievements.counters.chains_committed).toBe(2);
    expect(r2.unlocked.length).toBe(0);
    expect(r2.newState.achievements.unlocked.first_steps).toBe(true);
  });

  it("tick with value=0 fires no unlocks", () => {
    const s = freshState();
    const r = tickAchievement(s, "chains_committed", 0);
    expect(r.unlocked.length).toBe(0);
  });
});

// ── 7.3.4 distinct_resources_chained ─────────────────────────────────────────
describe("7.3 distinct_resources_chained", () => {
  it("first chain of hay increments distinct counter", () => {
    const s = freshState();
    const r = tickAchievement(s, "distinct_resources_chained", 1, "grass_hay");
    expect(r.newState.achievements.counters.distinct_resources_chained).toBe(1);
    expect(r.newState.achievements.seenResources.grass_hay).toBe(true);
  });

  it("second chain of same resource does NOT increment distinct counter", () => {
    const s = freshState();
    const r1 = tickAchievement(s, "distinct_resources_chained", 1, "grass_hay");
    const r2 = tickAchievement(r1.newState, "distinct_resources_chained", 1, "grass_hay");
    expect(r2.newState.achievements.counters.distinct_resources_chained).toBe(1);
    expect(r2.unlocked.length).toBe(0);
  });

  it("chaining a new resource (wheat) after hay increments to 2", () => {
    const s = freshState();
    const r1 = tickAchievement(s, "distinct_resources_chained", 1, "grass_hay");
    const r2 = tickAchievement(r1.newState, "distinct_resources_chained", 1, "grain_wheat");
    expect(r2.newState.achievements.counters.distinct_resources_chained).toBe(2);
  });
});

// ── 7.3.5 distinct_buildings_built ────────────────────────────────────────────
describe("7.3 distinct_buildings_built", () => {
  it("first build of a new building increments counter", () => {
    const s = freshState();
    const r = tickAchievement(s, "distinct_buildings_built", 1, "bakery");
    expect(r.newState.achievements.counters.distinct_buildings_built).toBe(1);
  });

  it("building the same building again does NOT increment counter", () => {
    const s = freshState();
    const r1 = tickAchievement(s, "distinct_buildings_built", 1, "bakery");
    const r2 = tickAchievement(r1.newState, "distinct_buildings_built", 1, "bakery");
    expect(r2.newState.achievements.counters.distinct_buildings_built).toBe(1);
  });
});

// ── 7.3.6 champion achievement ────────────────────────────────────────────────
describe("7.3 champion achievement (threshold 4)", () => {
  it("still locked at 3 bosses defeated", () => {
    let s = freshState();
    for (let i = 0; i < 3; i++) s = tickAchievement(s, "bosses_defeated").newState;
    expect(s.achievements.unlocked.champion).toBe(false);
  });

  it("unlocks at 4th boss defeat", () => {
    let s = freshState();
    for (let i = 0; i < 3; i++) s = tickAchievement(s, "bosses_defeated").newState;
    const r = tickAchievement(s, "bosses_defeated");
    expect(r.newState.achievements.unlocked.champion).toBe(true);
    expect(r.unlocked).toContain("champion");
  });

  it("5th boss defeat does NOT re-fire champion unlock", () => {
    let s = freshState();
    for (let i = 0; i < 4; i++) s = tickAchievement(s, "bosses_defeated").newState;
    const r = tickAchievement(s, "bosses_defeated");
    expect(r.unlocked.length).toBe(0);
  });
});

// ── 7.3.7 festival_won / true_keeper ──────────────────────────────────────────
describe("7.3 festival_won and true_keeper", () => {
  it("first festival win increments counter and unlocks true_keeper", () => {
    const s = freshState();
    const r = tickAchievement(s, "festival_won");
    expect(r.newState.achievements.counters.festival_won).toBe(1);
    expect(r.newState.achievements.unlocked.true_keeper).toBe(true);
    expect(r.unlocked).toContain("true_keeper");
  });
});

// ── 7.3.8 supplies_converted ─────────────────────────────────────────────────
describe("7.3 supplies_converted", () => {
  it("increments by value amount", () => {
    const s = freshState();
    const r = tickAchievement(s, "supplies_converted", 5);
    expect(r.newState.achievements.counters.supplies_converted).toBe(5);
  });
});

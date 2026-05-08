// Boss slice coverage fillins. Pre-PR coverage: 62% statement.
// Targets the BOSS_META branches, BOSS/* lifecycle actions,
// CHAIN_COLLECTED + weather bonus paths, CRAFTING/CRAFT_RECIPE for
// ember_drake, and CLOSE_SEASON's boss / weather scheduling.

import { describe, it, expect } from "vitest";
import { reduce as bossReduce } from "../features/boss/slice.js";

const baseState = (over = {}) => ({
  boss: null,
  bossPending: false,
  bossMinimized: false,
  weather: null,
  weatherTurnsLeft: 0,
  bossesDefeated: 0,
  _bossSeasonCount: 0,
  _bossResolvedThisSeason: false,
  inventory: {},
  modal: null,
  ...over,
});

describe("boss slice — lifecycle actions", () => {
  it("BOSS/TRIGGER with explicit key spawns the matching boss", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "ember_drake" });
    expect(s1.boss?.key).toBe("ember_drake");
    expect(s1.boss?.resource).toBe("mine_ingot");
    expect(s1.boss?.targetCount).toBe(3);
    expect(s1.modal).toBe("boss");
    expect(s1.bossMinimized).toBe(false);
  });

  it("BOSS/TRIGGER with no key falls back to year-rotation default", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER" });
    expect(s1.boss?.key).toBeTruthy();
  });

  it("BOSS/TRIGGER with unknown key is a no-op", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "not_a_boss" });
    expect(s1).toBe(s0);
  });

  it("BOSS/MINIMIZE hides the modal but keeps the boss running", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/MINIMIZE" });
    expect(s1.bossMinimized).toBe(true);
    expect(s1.modal).toBeNull();
    expect(s1.boss?.key).toBe("frostmaw");
  });

  it("BOSS/EXPAND restores the modal", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, bossMinimized: true });
    const s1 = bossReduce(s0, { type: "BOSS/EXPAND" });
    expect(s1.bossMinimized).toBe(false);
    expect(s1.modal).toBe("boss");
  });

  it("BOSS/CLOSE acts as a soft-minimize", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/CLOSE" });
    expect(s1.bossMinimized).toBe(true);
    expect(s1.modal).toBeNull();
  });

  it("BOSS/REJECT clears the boss and shows a 'fades' bubble", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/REJECT" });
    expect(s1.boss).toBeNull();
    expect(s1.modal).toBeNull();
    expect(s1.bubble?.text).toMatch(/fades/);
  });

  it("BOSS/REJECT without an active boss is a no-op", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/REJECT" });
    expect(s1).toBe(s0);
  });
});

describe("boss slice — RESOLVE (win / loss)", () => {
  const withBoss = (over = {}) =>
    baseState({
      boss: {
        key: "frostmaw",
        resource: "wood_log",
        targetCount: 30,
        progress: 30,
        turnsLeft: 5,
      },
      modal: "boss",
      ...over,
    });

  it("BOSS/RESOLVE won: clears boss, awards coins, increments bossesDefeated", () => {
    const s0 = withBoss({ coins: 100, bossesDefeated: 1 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: true });
    expect(s1.boss).toBeNull();
    expect(s1.modal).toBeNull();
    expect(s1.bossesDefeated).toBe(2);
    expect(s1.coins).toBeGreaterThan(100);
    expect(s1.bubble?.text).toMatch(/Victory/);
  });

  it("BOSS/RESOLVE won credits runes if the bossDef carries them", () => {
    // bossRewardFn may return runes; our progress=target guarantees the
    // rewards path. Sanity-check that runes is a number ≥ baseline.
    const s0 = withBoss({ runes: 2 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: true });
    expect(typeof s1.runes).toBe("number");
    expect(s1.runes).toBeGreaterThanOrEqual(2);
  });

  it("BOSS/RESOLVE lost: clears boss, no coin reward, 'fades' bubble", () => {
    const s0 = withBoss({ coins: 100 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: false });
    expect(s1.boss).toBeNull();
    expect(s1.coins).toBe(100);
    expect(s1.bossesDefeated).toBe(0);
    expect(s1.bubble?.text).toMatch(/fades/);
  });

  it("BOSS/RESOLVE flips _bossResolvedThisSeason", () => {
    const s0 = withBoss();
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: false });
    expect(s1._bossResolvedThisSeason).toBe(true);
  });
});

describe("boss slice — CHAIN_COLLECTED progress + auto-resolve", () => {
  it("CHAIN_COLLECTED matching the boss resource bumps progress", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "wood_log", gained: 4, key: "wood_log" },
    });
    expect(s1.boss.progress).toBe(9);
  });

  it("CHAIN_COLLECTED with mismatching resource does not bump progress", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "berry", gained: 4, key: "berry" },
    });
    expect(s1.boss.progress).toBe(5);
  });

  it("CHAIN_COLLECTED that hits target auto-resolves with a win", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 10, progress: 7, turnsLeft: 5 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "wood_log", gained: 4, key: "wood_log" },
    });
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
    expect(s1.coins).toBeGreaterThan(0);
  });

  it("CHAIN_COLLECTED with no boss + active rain weather doubles berry yield", () => {
    const s0 = baseState({
      weather: { key: "rain", description: "" },
      weatherTurnsLeft: 3,
      inventory: { berry: 0 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "berry", gained: 4 },
    });
    // Rain doubles berry: bonus = +4 added to inventory[berry]
    expect(s1.inventory.berry).toBe(4);
    // weatherTurnsLeft decremented by 1
    expect(s1.weatherTurnsLeft).toBe(2);
  });

  it("CHAIN_COLLECTED with active harvest_moon adds an upgrade tier to the chain product", () => {
    const s0 = baseState({
      weather: { key: "harvest_moon", description: "" },
      weatherTurnsLeft: 3,
      inventory: {},
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 3 },
    });
    // hay's next is grain_wheat — harvest moon grants +1 upgrade tile
    expect(s1.inventory.grain_wheat ?? 0).toBeGreaterThan(0);
  });

  it("CHAIN_COLLECTED decrements weatherTurnsLeft and clears weather at 0", () => {
    const s0 = baseState({
      weather: { key: "drought", description: "" },
      weatherTurnsLeft: 1,
    });
    const s1 = bossReduce(s0, { type: "CHAIN_COLLECTED", payload: { key: "anything", gained: 1 } });
    expect(s1.weatherTurnsLeft).toBe(0);
    expect(s1.weather).toBeNull();
  });
});

describe("boss slice — CRAFTING/CRAFT_RECIPE (ember_drake ingot path)", () => {
  it("crafting an ingot recipe bumps ember_drake progress by 1", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "mine_ingot", targetCount: 3, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" }, // any forge recipe whose output is mine_ingot
    });
    expect(s1.boss.progress).toBe(1);
  });

  it("crafting a non-ingot recipe is ignored", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "mine_ingot", targetCount: 3, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "bread" }, // bakery — output is the recipe key, not mine_ingot
    });
    expect(s1.boss.progress).toBe(0);
  });

  it("crafting that hits ember_drake target auto-resolves with a win", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "mine_ingot", targetCount: 3, progress: 2, turnsLeft: 5 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" },
    });
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
  });

  it("crafting on a non-ember_drake boss is ignored", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" },
    });
    expect(s1).toBe(s0);
  });
});

describe("boss slice — CLOSE_SEASON scheduling", () => {
  it("CLOSE_SEASON decrements an active boss's turnsLeft", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.boss.turnsLeft).toBe(4);
  });

  it("CLOSE_SEASON resolves a boss that runs out of turns short of target", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 5, turnsLeft: 1 },
    });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(0); // lost
  });

  it("CLOSE_SEASON every 4th season triggers the next year's boss", () => {
    const s0 = baseState({ _bossSeasonCount: 3 }); // → 4 after tick
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.boss?.key).toBeTruthy();
    expect(s1._bossSeasonCount).toBe(4);
  });

  it("CLOSE_SEASON with _bossResolvedThisSeason set skips the schedule and resets the flag", () => {
    const s0 = baseState({ _bossSeasonCount: 3, _bossResolvedThisSeason: true });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.boss).toBeNull();
    expect(s1._bossResolvedThisSeason).toBe(false);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(bossReduce(s0, { type: "NOPE" })).toBe(s0);
  });
});

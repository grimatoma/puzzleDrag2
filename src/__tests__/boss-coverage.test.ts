// Boss slice coverage fillins. Pre-PR coverage: 62% statement.
// Targets the BOSS_META branches, BOSS/* lifecycle actions,
// CHAIN_COLLECTED progress, CRAFTING/CRAFT_RECIPE for ember_drake,
// and CLOSE_SEASON's boss scheduling.

import { describe, it, expect } from "vitest";
import type { Action } from "../types/state.js";
import { reduce as bossReduce } from "../features/boss/slice.js";
import { mergeTestState, testAction } from "../testUtils/testState.js";

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

describe("boss slice — lifecycle actions", () => {
  it("BOSS/TRIGGER with explicit key spawns the matching boss", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "ember_drake" } as Action);
    expect(bossOf(s1)?.key).toBe("ember_drake");
    expect(bossOf(s1)?.resource).toBe("iron_bar");
    expect(bossOf(s1)?.targetCount).toBe(3);
    expect(s1.modal).toBe("boss");
    expect(s1.bossMinimized).toBe(false);
  });

  it("BOSS/TRIGGER with no key falls back to year-rotation default", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER" } as Action);
    expect(bossOf(s1)?.key).toBeTruthy();
  });

  it("BOSS/TRIGGER with unknown key is a no-op", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/TRIGGER", bossKey: "not_a_boss" } as Action);
    expect(s1).toBe(s0);
  });

  it("BOSS/MINIMIZE hides the modal but keeps the boss running", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/MINIMIZE" } as Action);
    expect(s1.bossMinimized).toBe(true);
    expect(s1.modal).toBeNull();
    expect(bossOf(s1)?.key).toBe("frostmaw");
  });

  it("BOSS/EXPAND restores the modal", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, bossMinimized: true });
    const s1 = bossReduce(s0, { type: "BOSS/EXPAND" } as Action);
    expect(s1.bossMinimized).toBe(false);
    expect(s1.modal).toBe("boss");
  });

  it("BOSS/CLOSE acts as a soft-minimize", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/CLOSE" } as Action);
    expect(s1.bossMinimized).toBe(true);
    expect(s1.modal).toBeNull();
  });

  it("BOSS/REJECT clears the boss and shows a 'fades' bubble", () => {
    const s0 = baseState({ boss: { key: "frostmaw" }, modal: "boss" });
    const s1 = bossReduce(s0, { type: "BOSS/REJECT" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.modal).toBeNull();
    expect(s1.bubble?.text).toMatch(/fades/);
  });

  it("BOSS/REJECT without an active boss is a no-op", () => {
    const s0 = baseState();
    const s1 = bossReduce(s0, { type: "BOSS/REJECT" } as Action);
    expect(s1).toBe(s0);
  });
});

describe("boss slice — RESOLVE (win / loss)", () => {
  const withBoss = (over: Record<string, unknown> = {}) =>
    baseState({
      boss: {
        key: "frostmaw",
        resource: "tile_tree_oak",
        targetCount: 30,
        progress: 30,
        turnsLeft: 5,
      },
      modal: "boss",
      ...over,
    });

  it("BOSS/RESOLVE strips frozen/rubble/hidden flags from the grid", () => {
    const grid = [[{ key: "tile_grass_grass", frozen: true, rubble: true }]];
    const s0 = withBoss({ grid, progress: 5, targetCount: 30 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: false } as Action);
    expect(s1.boss).toBeNull();
    expect((s1.grid as Array<Array<Record<string, unknown>>>)[0][0].frozen).toBeUndefined();
    expect((s1.grid as Array<Array<Record<string, unknown>>>)[0][0].rubble).toBeUndefined();
  });

  it("BOSS/RESOLVE won: clears boss, awards coins, increments bossesDefeated", () => {
    const s0 = withBoss({ coins: 100, bossesDefeated: 1 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: true } as Action);
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
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: true } as Action);
    expect(typeof s1.runes).toBe("number");
    expect(s1.runes).toBeGreaterThanOrEqual(2);
  });

  it("BOSS/RESOLVE lost: clears boss, no coin reward, 'fades' bubble", () => {
    const s0 = withBoss({ coins: 100 });
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: false } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.coins).toBe(100);
    expect(s1.bossesDefeated).toBe(0);
    expect(s1.bubble?.text).toMatch(/fades/);
  });

  it("BOSS/RESOLVE flips _bossResolvedThisSeason", () => {
    const s0 = withBoss();
    const s1 = bossReduce(s0, { type: "BOSS/RESOLVE", won: false } as Action);
    expect(s1._bossResolvedThisSeason).toBe(true);
  });
});

describe("boss slice — CHAIN_COLLECTED progress + auto-resolve", () => {
  it("CHAIN_COLLECTED matching the boss resource bumps progress", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "tile_tree_oak", gained: 4, key: "tile_tree_oak" },
    } as Action);
    expect(bossOf(s1)?.progress).toBe(9);
  });

  it("CHAIN_COLLECTED with mismatching resource does not bump progress", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "berry", gained: 4, key: "berry" },
    } as Action);
    expect(bossOf(s1)?.progress).toBe(5);
  });

  it("CHAIN_COLLECTED that hits target auto-resolves with a win", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 10, progress: 7, turnsLeft: 5 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { resource: "tile_tree_oak", gained: 4, key: "tile_tree_oak" },
    } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
    expect(s1.coins).toBeGreaterThan(0);
  });

  it("CHAIN_COLLECTED with no boss is a passive copy", () => {
    const s0 = baseState({ inventory: { berry: 0 } });
    const s1 = bossReduce(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "berry", gained: 4 },
    } as Action);
    expect(s1.inventory.berry).toBe(0);
    expect(s1.boss).toBeNull();
  });
});

describe("boss slice — CRAFTING/CRAFT_RECIPE (ember_drake ingot path)", () => {
  it("crafting an ingot recipe bumps ember_drake progress by 1", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "iron_bar", targetCount: 3, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" }, // any forge recipe whose output is iron_bar
    } as Action);
    expect(bossOf(s1)?.progress).toBe(1);
  });

  it("crafting a non-ingot recipe is ignored", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "iron_bar", targetCount: 3, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "bread" }, // bakery — output is the recipe key, not iron_bar
    } as Action);
    expect(bossOf(s1)?.progress).toBe(0);
  });

  it("crafting that hits ember_drake target auto-resolves with a win", () => {
    const s0 = baseState({
      boss: { key: "ember_drake", resource: "iron_bar", targetCount: 3, progress: 2, turnsLeft: 5 },
      coins: 0,
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" },
    } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(1);
  });

  it("crafting on a non-ember_drake boss is ignored", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 0, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      payload: { key: "iron_hinge" },
    } as Action);
    expect(s1).toBe(s0);
  });
});

describe("boss slice — CLOSE_SEASON scheduling", () => {
  it("CLOSE_SEASON decrements an active boss's turnsLeft", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 5, turnsLeft: 5 },
    });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(bossOf(s1)?.turnsLeft).toBe(4);
  });

  it("CLOSE_SEASON resolves a boss that runs out of turns short of target", () => {
    const s0 = baseState({
      boss: { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 5, turnsLeft: 1 },
    });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.bossesDefeated).toBe(0); // lost
  });

  it("CLOSE_SEASON does NOT spawn an audit boss without the frostmaw_active flag", () => {
    const s0 = baseState({ _bossSeasonCount: 3, lastAuditBossAt: 1 });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1._bossSeasonCount).toBe(4);
  });

  it("CLOSE_SEASON does not arm the old audit clock when frostmaw_active is set", () => {
    const s0 = baseState({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: 0 });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(0);
  });

  it("CLOSE_SEASON no longer spawns audit bosses once the old cooldown elapsed", () => {
    const s0 = baseState({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: 1, auditBossSeq: 0 });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.auditBossSeq).toBe(0);
    expect(s1.lastAuditBossAt).toBe(1);
  });

  it("CLOSE_SEASON with _bossResolvedThisSeason set skips the schedule and resets the flag", () => {
    const s0 = baseState({ _bossSeasonCount: 3, _bossResolvedThisSeason: true });
    const s1 = bossReduce(s0, { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1._bossResolvedThisSeason).toBe(false);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(bossReduce(s0, testAction({ type: "NOPE" }))).toBe(s0);
  });
});

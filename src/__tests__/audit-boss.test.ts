// Legacy audit-boss cadence is deferred. Keeper Trials now own boss cadence;
// manual BOSS/TRIGGER remains available for debug/testing.
import { describe, it, expect, beforeEach } from "vitest";
import type { Action } from "../types/state.js";
import { reduce as bossReduce, initial as bossInitial } from "../features/boss/slice.js";
import { gameReducer, createInitialState } from "../state.js";
import { mergeTestState } from "../testUtils/testState.js";

function bossOf(state: { boss?: unknown | null }) {
  return state.boss as Record<string, unknown> | null;
}

beforeEach(() => global.localStorage.clear());

describe("boss slice — audit cooldown state", () => {
  it("ships lastAuditBossAt=0 / auditBossSeq=0 in the initial slice", () => {
    expect(bossInitial.lastAuditBossAt).toBe(0);
    expect(bossInitial.auditBossSeq).toBe(0);
  });

  const base = (over: Record<string, unknown> = {}) =>
    mergeTestState({
      boss: null,
      bossPending: false,
      bossMinimized: false,
      bossesDefeated: 0,
      _bossSeasonCount: 0,
      _bossResolvedThisSeason: false,
      lastAuditBossAt: 0,
      auditBossSeq: 0,
      inventory: {},
      modal: null,
      story: { flags: {} },
      ...over,
    });

  it("does nothing when the frostmaw_active flag is unset", () => {
    const s1 = bossReduce(base({ lastAuditBossAt: 1 }), { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(1); // untouched
  });

  it("does not arm the old audit clock when the legacy flag is set", () => {
    const s1 = bossReduce(base({ story: { flags: { frostmaw_active: true } } }), { type: "CLOSE_SEASON" } as Action);
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(0);
  });

  it("does not fire while an old audit timestamp is present", () => {
    const recent = Date.now() - 1000;
    const s1 = bossReduce(
      base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: recent }),
      { type: "CLOSE_SEASON" } as Action,
    );
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(recent); // untouched
  });

  it("does not spawn rotation bosses from CLOSE_SEASON anymore", () => {
    const old = 1;
    const s1 = bossReduce(
      base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: old, auditBossSeq: 0 }),
      { type: "CLOSE_SEASON" } as Action,
    );
    expect(s1.boss).toBeNull();
    expect(s1.auditBossSeq).toBe(0);
    expect(s1.lastAuditBossAt).toBe(old);
  });

  it("does not fire if a boss is already active", () => {
    const old = 1;
    const active = { key: "frostmaw", resource: "tile_tree_oak", targetCount: 30, progress: 1, turnsLeft: 5 };
    const s1 = bossReduce(
      base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: old, boss: active }),
      { type: "CLOSE_SEASON" } as Action,
    );
    // turnsLeft decremented (the boss-turn path), but no new boss spawn / clock reset.
    expect(bossOf(s1)?.key).toBe("frostmaw");
    expect(bossOf(s1)?.turnsLeft).toBe(4);
    expect(s1.lastAuditBossAt).toBe(old);
  });
});

describe("audit boss through the full reducer", () => {
  it("CLOSE_SEASON with frostmaw_active no longer spawns the audit boss", () => {
    const base = createInitialState();
    const flags = (base.story as { flags?: Record<string, boolean> }).flags ?? {};
    let s = mergeTestState(base, {
      story: { ...base.story, flags: { ...flags, frostmaw_active: true } },
      lastAuditBossAt: 1,
      auditBossSeq: 0,
    });
    s = gameReducer(s, { type: "CLOSE_SEASON" } as Action);
    expect(s.boss).toBeNull();
    expect(s.auditBossSeq).toBe(0);
  });

  it("a fresh game (no frostmaw_active) does not spawn audit bosses across many seasons", () => {
    let s = createInitialState();
    for (let i = 0; i < 12; i++) s = gameReducer(s, { type: "CLOSE_SEASON" } as Action);
    expect(s.boss).toBeNull();
  });
});

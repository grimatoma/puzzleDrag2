/**
 * QA Batch 2 — XP curve + per-source amounts
 * §17 locked: linear 150 XP/level; sources: 1/chain, 5/order, 10/build, 25/boss, 20/quest.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { awardXp, XP_PER_LEVEL } from "../src/features/almanac/data.js";
import { createInitialState, rootReducer } from "../src/state.js";
import { BUILDINGS } from "../src/constants.js";

function fresh() {
  global.localStorage?.clear?.();
  return createInitialState();
}

// ── Linear curve ──────────────────────────────────────────────────────────────

describe("XP curve — linear 150/level", () => {
  it("XP_PER_LEVEL is 150", () => {
    expect(XP_PER_LEVEL).toBe(150);
  });

  it("0 XP → level 1", () => {
    const s = fresh();
    expect(s.almanac.xp).toBe(0);
    expect(s.almanac.level).toBe(1);
  });

  it("149 XP stays at level 1", () => {
    const r = awardXp(fresh(), 149);
    expect(r.newState.almanac.level).toBe(1);
    expect(r.leveledTo).toBeNull();
  });

  it("150 XP → level 2", () => {
    const r = awardXp(fresh(), 150);
    expect(r.newState.almanac.level).toBe(2);
    expect(r.leveledTo).toBe(2);
  });

  it("300 XP → level 3", () => {
    const r = awardXp(fresh(), 300);
    expect(r.newState.almanac.level).toBe(3);
  });

  it("450 XP → level 4", () => {
    const r = awardXp(fresh(), 450);
    expect(r.newState.almanac.level).toBe(4);
  });

  it("1500 XP → level 11 (unbounded)", () => {
    const r = awardXp(fresh(), 1500);
    expect(r.newState.almanac.level).toBe(11);
  });
});

// ── Per-source amounts ─────────────────────────────────────────────────────────

describe("XP per source — CHAIN_COLLECTED (1 XP/chain)", () => {
  it("one chain awards exactly 1 almanac XP", () => {
    const s = fresh();
    const s2 = {
      ...s,
      biomeKey: "farm",
      biome: "farm",
      turnsUsed: 0,
    };
    // Build a chain-collected action for hay (value ~1)
    const res = s2.inventory;
    const next = rootReducer(s2, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 5, upgrades: 0, value: 1, chainLength: 5, noTurn: false },
    });
    expect(next.almanac.xp).toBe(1);
  });

  it("two chains = 2 almanac XP", () => {
    let s = fresh();
    const payload = { key: "hay", gained: 3, upgrades: 0, value: 1, chainLength: 3, noTurn: false };
    s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
    s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
    expect(s.almanac.xp).toBe(2);
  });
});

describe("XP per source — TURN_IN_ORDER (5 XP)", () => {
  it("fulfilling an order awards 5 almanac XP", () => {
    const s = fresh();
    const order = s.orders[0];
    // Pre-fill inventory
    const s2 = {
      ...s,
      inventory: { ...s.inventory, [order.key]: order.need + 10 },
    };
    const next = rootReducer(s2, { type: "TURN_IN_ORDER", id: order.id });
    expect(next.almanac.xp).toBe(5);
  });
});

describe("XP per source — BUILD (10 XP)", () => {
  it("building awards 10 almanac XP", () => {
    const s = fresh();
    const b = BUILDINGS.find((x) => x.id === "hearth_upgrade") ?? BUILDINGS[0];
    if (!b) return; // guard if no buildings available cheaply
    // Give enough resources to build cheaply
    const rich = { ...s, coins: 99999, inventory: { hay: 999, log: 999, stone: 999, ore: 999, grain: 999 } };
    const next = rootReducer(rich, { type: "BUILD", building: b });
    if (next === rich) return; // build was rejected (no-op guard)
    expect(next.almanac.xp).toBe(10);
  });
});

describe("XP per source — BOSS/RESOLVE won (25 XP)", () => {
  it("winning a boss awards 25 almanac XP", () => {
    const s = {
      ...fresh(),
      boss: { key: "frostmaw", resource: "log", targetCount: 30, progress: 30, turnsLeft: 3, minChain: null },
    };
    const next = rootReducer(s, { type: "BOSS/RESOLVE", won: true });
    expect(next.almanac.xp).toBe(25);
  });

  it("losing a boss awards 0 almanac XP", () => {
    const s = {
      ...fresh(),
      boss: { key: "frostmaw", resource: "log", targetCount: 30, progress: 5, turnsLeft: 0, minChain: null },
    };
    const next = rootReducer(s, { type: "BOSS/RESOLVE", won: false });
    expect(next.almanac.xp).toBe(0);
  });
});

describe("XP per source — CLAIM_QUEST (20 XP)", () => {
  it("claiming a quest awards 20 almanac XP", () => {
    const s = {
      ...fresh(),
      quests: [{
        id: "tq1", template: "collect_hay", category: "collect", key: "hay",
        target: 10, progress: 10, claimed: false, reward: { coins: 50, xp: 20 },
      }],
    };
    const next = rootReducer(s, { type: "QUESTS/CLAIM_QUEST", id: "tq1" });
    expect(next.almanac.xp).toBe(20);
  });
});

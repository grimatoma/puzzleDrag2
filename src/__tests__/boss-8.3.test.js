import { describe, it, expect } from "vitest";
import {
  BOSS_WINDOW_TURNS,
  spawnBoss,
  tickBossTurn,
} from "../features/bosses/data.js";
import { createInitialState } from "../state.js";

describe("8.3 — 1-season boss window", () => {
  it("BOSS_WINDOW_TURNS === 10 (§18 locked)", () => {
    expect(BOSS_WINDOW_TURNS).toBe(10);
  });

  it("spawnBoss: populates all canonical fields + modifierState", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    expect(s.boss.id).toBe("frostmaw");
    expect(s.boss.season).toBe("winter");
    expect(s.boss.year).toBe(1);
    expect(s.boss.turnsRemaining).toBe(10);
    expect(s.boss.progress).toBe(0);
    expect(s.boss.target.resource).toBe("wood_log");
    expect(s.boss.target.amount).toBe(30);
    expect(s.boss.modifierState.frozenColumns?.length).toBe(2);
    expect(s.story.flags.frostmaw_active).toBe(true);
  });

  it("tick: turnsRemaining decrements from 10 to 9, not resolved", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    const t = tickBossTurn(s);
    expect(t.boss.turnsRemaining).toBe(9);
    expect(t.boss).not.toBeNull();
  });

  it("turn 10 with progress < target: boss cleared (failed)", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    const s2 = { ...s, boss: { ...s.boss, turnsRemaining: 1, progress: 12 } };
    const r2 = tickBossTurn(s2);
    expect(r2.boss).toBeNull();
    expect(r2.coins).toBe(s2.coins);
    expect(r2.story.flags.frostmaw_defeated).not.toBe(true);
    expect(r2.story.flags.frostmaw_active).toBe(false);
  });

  it("cross target before turn 10: resolves immediately as defeated", () => {
    let s = createInitialState();
    s.year = 1;
    s.coins = 0;
    s = spawnBoss(s, "frostmaw", 1);
    const s3 = { ...s, year: 1, coins: 0, boss: { ...s.boss, turnsRemaining: 5, progress: 30 } };
    const r3 = tickBossTurn(s3);
    expect(r3.boss).toBeNull();
    expect(r3.coins).toBe(200);
    expect(r3.story.flags.frostmaw_defeated).toBe(true);
  });

  it("save/load round-trip preserves all canonical fields", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    const loaded = JSON.parse(JSON.stringify(s.boss));
    expect(loaded.id).toBe("frostmaw");
    expect(loaded.turnsRemaining).toBe(10);
    expect(loaded.target.amount).toBe(30);
    expect(Array.isArray(loaded.modifierState.frozenColumns)).toBe(true);
  });

  it("cannot spawn second boss while one is active (no-op)", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    const before = JSON.stringify(s.boss);
    expect(JSON.stringify(spawnBoss(s, "ember_drake", 1).boss)).toBe(before);
  });

  it("0 turnsRemaining forces resolve — no carry-over", () => {
    let s = createInitialState();
    s.year = 1;
    s = spawnBoss(s, "frostmaw", 1);
    const s5 = { ...s, boss: { ...s.boss, turnsRemaining: 0, progress: 5 } };
    expect(tickBossTurn(s5).boss).toBeNull();
  });
});

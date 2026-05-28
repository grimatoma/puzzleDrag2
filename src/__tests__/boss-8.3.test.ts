import { describe, it, expect } from "vitest";
import type { GameState } from "../types/state.js";
import type { BossInstance } from "../features/bosses/data.js";
import {
  BOSS_WINDOW_TURNS,
  spawnBoss,
  tickBossTurn,
} from "../features/bosses/data.js";
import { mergeTestState } from "../testUtils/testState.js";

function dataBoss(state: GameState): BossInstance | null {
  return state.boss as BossInstance | null;
}

describe("8.3 — 1-season boss window", () => {
  it("BOSS_WINDOW_TURNS === 10 (§18 locked)", () => {
    expect(BOSS_WINDOW_TURNS).toBe(10);
  });

  it("spawnBoss: populates all canonical fields + modifierState", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const b = dataBoss(s)!;
    expect(b.id).toBe("frostmaw");
    expect(b.season).toBe("winter");
    expect(b.year).toBe(1);
    expect(b.turnsRemaining).toBe(10);
    expect(b.progress).toBe(0);
    expect(b.target.resource).toBe("tile_tree_oak");
    expect(b.target.amount).toBe(30);
    expect((b.modifierState as { frozenColumns?: number[] }).frozenColumns?.length).toBe(2);
    expect(((s.story as { flags?: Record<string, boolean> }).flags ?? {}).frostmaw_active).toBe(true);
  });

  it("tick: turnsRemaining decrements from 10 to 9, not resolved", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const t = tickBossTurn(s);
    expect(dataBoss(t)!.turnsRemaining).toBe(9);
    expect(t.boss).not.toBeNull();
  });

  it("turn 10 with progress < target: boss cleared (failed)", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const b0 = dataBoss(s)!;
    const s2 = mergeTestState(s, { boss: { ...b0, turnsRemaining: 1, progress: 12 } });
    const r2 = tickBossTurn(s2);
    expect(r2.boss).toBeNull();
    expect(r2.coins).toBe(s2.coins);
    expect(((r2.story as { flags?: Record<string, boolean> }).flags ?? {}).frostmaw_defeated).not.toBe(true);
    expect(((r2.story as { flags?: Record<string, boolean> }).flags ?? {}).frostmaw_active).toBe(false);
  });

  it("cross target before turn 10: resolves immediately as defeated", () => {
    let s = mergeTestState({ year: 1, coins: 0 });
    s = spawnBoss(s, "frostmaw", 1);
    const b0 = dataBoss(s)!;
    const s3 = mergeTestState(s, { year: 1, coins: 0, boss: { ...b0, turnsRemaining: 5, progress: 30 } });
    const r3 = tickBossTurn(s3);
    expect(r3.boss).toBeNull();
    expect(r3.coins).toBe(200);
    expect(((r3.story as { flags?: Record<string, boolean> }).flags ?? {}).frostmaw_defeated).toBe(true);
  });

  it("save/load round-trip preserves all canonical fields", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const loaded = JSON.parse(JSON.stringify(dataBoss(s))) as BossInstance;
    expect(loaded.id).toBe("frostmaw");
    expect(loaded.turnsRemaining).toBe(10);
    expect(loaded.target.amount).toBe(30);
    expect(Array.isArray((loaded.modifierState as { frozenColumns?: unknown }).frozenColumns)).toBe(true);
  });

  it("cannot spawn second boss while one is active (no-op)", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const before = JSON.stringify(dataBoss(s));
    expect(JSON.stringify(dataBoss(spawnBoss(s, "ember_drake", 1)))).toBe(before);
  });

  it("0 turnsRemaining forces resolve — no carry-over", () => {
    let s = mergeTestState({ year: 1 });
    s = spawnBoss(s, "frostmaw", 1);
    const b0 = dataBoss(s)!;
    const s5 = mergeTestState(s, { boss: { ...b0, turnsRemaining: 0, progress: 5 } });
    expect(tickBossTurn(s5).boss).toBeNull();
  });
});

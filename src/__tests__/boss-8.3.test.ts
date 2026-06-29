import { describe, it, expect } from "vitest";
import type { GameState } from "../types/state.js";
import type { BossInstance } from "../features/bosses/data.js";
import {
  BOSS_WINDOW_TURNS,
  spawnBoss,
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

  // NOTE: the per-turn boss resolution (decrement / fail-at-window / cross-target
  // defeat / forced resolve) was historically tested here against the standalone
  // tickBossTurn() helper, a dead parallel implementation never called in
  // production. That helper was removed (health review #17); the live path lives
  // in features/boss/slice.ts (BOSS/RESOLVE + turn progress) and is covered by
  // audit-boss / boss-coverage / storm-boss / reducers tests.

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

});

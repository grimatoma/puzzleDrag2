import { describe, it, expect } from "vitest";
import {
  spawnMysteriousOre,
  tickMysteriousOre,
  isMysteriousChainValid,
} from "../features/mine/mysterious_ore.js";
import { createInitialState, rootReducer as reduce } from "../state.js";

function makeGrid(rows = 6, cols = 6, key = "stone") {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key })),
  );
}

describe("Phase 9.2 — Mysterious Ore", () => {
  // ── Spawn shape ────────────────────────────────────────────────────────────
  it("mysteriousOre row is integer and within grid bounds", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    const rng = (() => {
      let i = 0;
      const seq = [0.4, 0.2];
      return () => seq[i++ % 2];
    })();
    s = spawnMysteriousOre(s, rng);
    expect(s.mysteriousOre).toBeTruthy();
    expect(Number.isInteger(s.mysteriousOre.row)).toBe(true);
    expect(s.mysteriousOre.row).toBeGreaterThanOrEqual(0);
    expect(s.mysteriousOre.row).toBeLessThan(s.grid.length);
  });

  it("col in grid bounds", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    const rng = (() => {
      let i = 0;
      const seq = [0.4, 0.2];
      return () => seq[i++ % 2];
    })();
    s = spawnMysteriousOre(s, rng);
    expect(s.mysteriousOre.col).toBeGreaterThanOrEqual(0);
    expect(s.mysteriousOre.col).toBeLessThan(s.grid[0].length);
  });

  it("5-turn countdown locked on spawn", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    expect(s.mysteriousOre.turnsRemaining).toBe(5);
  });

  it("second spawn while one active is no-op", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    const before = JSON.stringify(s.mysteriousOre);
    s = spawnMysteriousOre(s, () => 0.9);
    expect(JSON.stringify(s.mysteriousOre)).toBe(before);
  });

  it("spawn in Farm biome is no-op", () => {
    let s = createInitialState();
    s = { ...s, biome: "farm", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    expect(s.mysteriousOre).toBeNull();
  });

  // ── Tick countdown ─────────────────────────────────────────────────────────
  it("tick decrements from 5 to 4", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    let t = tickMysteriousOre(s);
    expect(t.mysteriousOre.turnsRemaining).toBe(4);
  });

  it("tick from 4 down to 1", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    let t = tickMysteriousOre(s);
    for (let i = 0; i < 3; i++) t = tickMysteriousOre(t);
    expect(t.mysteriousOre.turnsRemaining).toBe(1);
  });

  it("tick at 1 → expire: ore cleared, no rune", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid(), runes: 0 };
    s = spawnMysteriousOre(s, () => 0.4);
    // Tick down to 1
    let t = s;
    for (let i = 0; i < 4; i++) t = tickMysteriousOre(t);
    expect(t.mysteriousOre.turnsRemaining).toBe(1);
    const expired = tickMysteriousOre(t);
    expect(expired.mysteriousOre).toBeNull();
    expect(expired.runes ?? 0).toBe(t.runes ?? 0);
    expect(expired.grid[t.mysteriousOre.row][t.mysteriousOre.col].key).toBe("dirt");
  });

  // ── Chain validation ───────────────────────────────────────────────────────
  const ore = { key: "mysterious_ore", row: 2, col: 3 };
  const d1 = { key: "dirt", row: 2, col: 4 };
  const d2 = { key: "dirt", row: 2, col: 5 };
  const stone = { key: "stone", row: 2, col: 6 };

  it("ore alone fails", () => {
    expect(isMysteriousChainValid([ore])).toBe(false);
  });

  it("ore + 1 dirt fails", () => {
    expect(isMysteriousChainValid([ore, d1])).toBe(false);
  });

  it("ore + 2 dirt passes", () => {
    expect(isMysteriousChainValid([ore, d1, d2])).toBe(true);
  });

  it("ore + 2 dirt + extra still passes", () => {
    expect(isMysteriousChainValid([ore, d1, d2, stone])).toBe(true);
  });

  it("no ore in chain → false", () => {
    expect(isMysteriousChainValid([d1, d2, stone])).toBe(false);
  });

  // ── COMMIT_CHAIN via reducer ───────────────────────────────────────────────
  it("valid mysterious capture awards exactly 1 rune and clears ore", () => {
    let c = createInitialState();
    c = { ...c, biome: "mine", runes: 0, grid: makeGrid() };
    c = { ...c, mysteriousOre: { row: 2, col: 3, turnsRemaining: 3 } };
    c = reduce(c, { type: "COMMIT_CHAIN", chain: [ore, d1, d2] });
    expect(c.runes).toBe(1);
    expect(c.mysteriousOre).toBeNull();
  });

  it("ore + only 1 dirt chain is rejected (no-op)", () => {
    let r = createInitialState();
    r = { ...r, biome: "mine", grid: makeGrid() };
    r = { ...r, mysteriousOre: { row: 2, col: 3, turnsRemaining: 4 } };
    const after = reduce(r, { type: "COMMIT_CHAIN", chain: [ore, d1], rejected: true });
    // Countdown should NOT change on rejection
    expect(after.mysteriousOre?.turnsRemaining).toBe(4);
  });

  // ── Save/load round-trip ───────────────────────────────────────────────────
  it("mysteriousOre serialises cleanly", () => {
    let s = createInitialState();
    s = { ...s, biome: "mine", grid: makeGrid() };
    s = spawnMysteriousOre(s, () => 0.4);
    const json = JSON.stringify(s.mysteriousOre);
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
  });

  // ── SET_BIOME to farm clears mysteriousOre ─────────────────────────────────
  it("switching biome to farm clears mysteriousOre", () => {
    let s = createInitialState();
    s = {
      ...s,
      biome: "mine",
      turnsUsed: 0,
      grid: makeGrid(),
      mysteriousOre: { row: 2, col: 3, turnsRemaining: 3 },
    };
    s = reduce(s, { type: "SET_BIOME", id: "farm" });
    expect(s.mysteriousOre).toBeNull();
  });
});

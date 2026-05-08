import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import {
  TIDE_PERIOD,
  HIGH_TIDE_POOL,
  LOW_TIDE_POOL,
} from "../features/fish/slice.js";
import { BIOMES } from "../constants.js";

function makeFishGrid(rows = 3, cols = 4) {
  // Build a small grid of resource-bearing cells. We use fish_oyster
  // because it's not in either tide pool, so we can detect mutation.
  const oyster = BIOMES.fish.resources.find((r) => r.key === "fish_oyster");
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: oyster.key, res: oyster })),
  );
}

function fishStateOnBoard(overrides = {}) {
  return {
    ...createInitialState(),
    biomeKey: "fish",
    biome: "fish",
    grid: makeFishGrid(),
    ...overrides,
  };
}

describe("fish biome tide cycle", () => {
  it("initial tide state is high, tideTurn 0", () => {
    const s = createInitialState();
    expect(s.fish).toEqual({ tide: "high", tideTurn: 0 });
  });

  it("END_TURN on fish biome ticks tideTurn", () => {
    const s = fishStateOnBoard();
    const s1 = rootReducer(s, { type: "END_TURN" });
    expect(s1.fish.tide).toBe("high");
    expect(s1.fish.tideTurn).toBe(1);
  });

  it("END_TURN off the fish biome does NOT tick tideTurn", () => {
    const s = { ...createInitialState(), biomeKey: "farm", biome: "farm" };
    const s1 = rootReducer(s, { type: "END_TURN" });
    expect(s1.fish.tideTurn).toBe(0);
  });

  it(`tide flips after ${TIDE_PERIOD} END_TURNs and bottom row is mutated`, () => {
    let s = fishStateOnBoard();
    const oysterRow = s.grid[s.grid.length - 1].map((c) => c.key);
    expect(oysterRow.every((k) => k === "fish_oyster")).toBe(true);
    for (let i = 0; i < TIDE_PERIOD; i++) {
      s = rootReducer(s, { type: "END_TURN" });
    }
    expect(s.fish.tide).toBe("low");
    expect(s.fish.tideTurn).toBe(0);
    const newBottom = s.grid[s.grid.length - 1].map((c) => c.key);
    // Bottom row got new keys drawn from LOW_TIDE_POOL
    for (const k of newBottom) {
      expect(LOW_TIDE_POOL).toContain(k);
    }
    // Surface tile pool keys should NOT appear in the low-tide row
    for (const k of newBottom) {
      expect(HIGH_TIDE_POOL.includes(k) && !LOW_TIDE_POOL.includes(k)).toBe(false);
    }
  });

  it("a flip back to high fills bottom row from HIGH_TIDE_POOL", () => {
    let s = fishStateOnBoard({ fish: { tide: "low", tideTurn: TIDE_PERIOD - 1 } });
    s = rootReducer(s, { type: "END_TURN" });
    expect(s.fish.tide).toBe("high");
    const newBottom = s.grid[s.grid.length - 1].map((c) => c.key);
    for (const k of newBottom) {
      expect(HIGH_TIDE_POOL).toContain(k);
    }
  });

  it("rows above the bottom row are untouched on flip", () => {
    let s = fishStateOnBoard({ fish: { tide: "high", tideTurn: TIDE_PERIOD - 1 } });
    const beforeUpper = s.grid.slice(0, -1).map((row) => row.map((c) => c.key));
    s = rootReducer(s, { type: "END_TURN" });
    const afterUpper = s.grid.slice(0, -1).map((row) => row.map((c) => c.key));
    expect(afterUpper).toEqual(beforeUpper);
  });

  it("FISH/FORCE_TIDE_FLIP debug action flips immediately", () => {
    const s = fishStateOnBoard();
    const s1 = rootReducer(s, { type: "FISH/FORCE_TIDE_FLIP" });
    expect(s1.fish.tide).toBe("low");
    expect(s1.fish.tideTurn).toBe(0);
  });

  it("flip with empty grid is a no-op for grid mutation but still updates tide", () => {
    let s = fishStateOnBoard({ grid: [], fish: { tide: "high", tideTurn: TIDE_PERIOD - 1 } });
    s = rootReducer(s, { type: "END_TURN" });
    expect(s.fish.tide).toBe("low");
    expect(s.grid).toEqual([]);
  });

  it("flip surfaces a 'tide changed' bubble", () => {
    let s = fishStateOnBoard({ fish: { tide: "high", tideTurn: TIDE_PERIOD - 1 } });
    s = rootReducer(s, { type: "END_TURN" });
    expect(s.bubble?.text).toMatch(/[Tt]ide/);
  });
});

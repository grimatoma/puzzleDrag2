import { describe, it, expect } from "vitest";
import {
  attractsRats,
  countAttractsRatTiles,
  effectiveRatSpawnRate,
  ATTRACT_RATE_BONUS,
} from "../features/farm/attractsRats.js";
import { rollRatSpawn } from "../features/farm/rats.js";

const makeGrid = (keys) =>
  keys.map((row) => row.map((k) => (k == null ? null : { key: k })));

describe("attractsRats helper module", () => {
  it("attractsRats: known keys", () => {
    expect(attractsRats("tile_grain_manna")).toBe(true);
    expect(attractsRats("tile_fruit_jackfruit")).toBe(true);
  });

  it("attractsRats: unknown / wrong key", () => {
    expect(attractsRats("tile_grass_hay")).toBe(false);
    expect(attractsRats("anything")).toBe(false);
    expect(attractsRats(undefined)).toBe(false);
  });

  it("countAttractsRatTiles handles null grid / empty rows", () => {
    expect(countAttractsRatTiles(null)).toBe(0);
    expect(countAttractsRatTiles(undefined)).toBe(0);
    expect(countAttractsRatTiles([])).toBe(0);
    expect(countAttractsRatTiles([[null, null]])).toBe(0);
  });

  it("countAttractsRatTiles tallies attract tiles", () => {
    const g = makeGrid([
      ["tile_grass_hay", "tile_grain_manna"],
      ["tile_fruit_jackfruit", "berry"],
    ]);
    expect(countAttractsRatTiles(g)).toBe(2);
  });

  it("effectiveRatSpawnRate: no attract tiles → base rate", () => {
    expect(effectiveRatSpawnRate(0.1, [])).toBe(0.1);
  });

  it("effectiveRatSpawnRate: bumps by ATTRACT_RATE_BONUS per tile", () => {
    const g = makeGrid([["tile_grain_manna", "tile_fruit_jackfruit", "tile_grass_hay"]]);
    expect(effectiveRatSpawnRate(0.1, g)).toBeCloseTo(0.1 + 2 * ATTRACT_RATE_BONUS);
  });

  it("effectiveRatSpawnRate: caps at 1.0", () => {
    const g = makeGrid([
      ["tile_grain_manna", "tile_grain_manna", "tile_grain_manna"],
      ["tile_grain_manna", "tile_grain_manna", "tile_grain_manna"],
    ]); // 6 tiles × 0.05 = 0.30, plus base 0.99 → 1.29 capped to 1.0
    expect(effectiveRatSpawnRate(0.99, g)).toBe(1.0);
  });
});

describe("rollRatSpawn integration with attracts_rats", () => {
  // Deterministic state with both spawn-threshold prerequisites met.
  const baseState = (grid) => ({
    biome: "farm",
    inventory: { home: { tile_grass_hay: 100, tile_grain_wheat: 100 } },
    hazards: { rats: [] },
    grid,
  });

  it("base rate (10%) — rng 0.99 → no spawn on plain board", () => {
    const grid = makeGrid([["tile_grass_hay", "tile_grain_wheat"]]);
    const r = rollRatSpawn(baseState(grid), () => 0.99);
    expect(r).toBeNull();
  });

  it("with two attract tiles, rate is 0.20 — rng 0.15 spawns", () => {
    const grid = makeGrid([
      ["tile_grain_manna", "tile_fruit_jackfruit"],
      ["tile_grass_hay",  "tile_grain_wheat"],
    ]);
    let i = 0;
    const seq = [0.15, 0.5, 0.5, 0.5];
    const rng = () => seq[(i++) % seq.length];
    const r = rollRatSpawn(baseState(grid), rng);
    expect(r).not.toBeNull();
  });

  it("with two attract tiles, rng > effective rate still rejects", () => {
    const grid = makeGrid([
      ["tile_grain_manna", "tile_fruit_jackfruit"],
    ]);
    // 0.10 base + 0.10 attract = 0.20 effective → rng 0.99 rejects.
    const r = rollRatSpawn(baseState(grid), () => 0.99);
    expect(r).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { effectiveTilesPerResource } from "./effectiveDivisor.js";
import { TILES_PER_RESOURCE } from "../constants.js";

function stateWith(hired: Record<string, number>) {
  return { workers: { hired }, built: {}, tileCollection: {} } as never;
}

describe("effectiveTilesPerResource", () => {
  it("returns the raw divisor with no workers", () => {
    expect(effectiveTilesPerResource(stateWith({}), "tile_grain_wheat"))
      .toBe(TILES_PER_RESOURCE.tile_grain_wheat);
  });

  it("subtracts the aggregated reduction for a hired worker", () => {
    const base = effectiveTilesPerResource(stateWith({}), "tile_grain_wheat");
    const withFarmer = effectiveTilesPerResource(stateWith({ farmer: 10 }), "tile_grain_wheat");
    expect(withFarmer).toBeLessThan(base);
  });

  it("never drops below the line floor", () => {
    const v = effectiveTilesPerResource(stateWith({ bee_keeper: 10 }), "tile_flower_pansy");
    expect(v).toBeGreaterThanOrEqual(3); // flowers floor is 3
  });
});

import { describe, it, expect } from "vitest";
import { mergeOverrides } from "../config/balance/load.js";

// The balance.json override-apply pipeline was removed (the canonical constants
// are the single source of truth). `mergeOverrides` survives as the helper that
// merges an optional localStorage editor draft over the empty committed baseline
// for the Story Editor / Dev Panel wiki.
describe("Dev Panel — override merge layer", () => {
  it("mergeOverrides shallow-merges nested objects", () => {
    const a = { upgradeThresholds: { tile_grass_grass: 6 }, resources: {} };
    const b = { upgradeThresholds: { tile_grain_wheat: 4 }, recipes: { bread: { coins: 200 } } };
    const out = mergeOverrides(a, b);
    expect(out.upgradeThresholds).toEqual({ tile_grass_grass: 6, tile_grain_wheat: 4 });
    expect(out.recipes).toEqual({ bread: { coins: 200 } });
    expect(out.resources).toEqual({});
  });
});

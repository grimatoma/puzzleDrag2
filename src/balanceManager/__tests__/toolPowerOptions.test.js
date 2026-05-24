import { describe, it, expect } from "vitest";
import { ITEMS } from "../../constants.js";
import { tileKeyOptions, resourceKeyOptions } from "../shared.jsx";

describe("tileKeyOptions", () => {
  it("returns only tile-kind entries", () => {
    const opts = tileKeyOptions();
    const values = opts.map((o) => o.value).filter(Boolean);
    expect(values.length).toBeGreaterThan(0);
    // Every returned key must be kind:"tile" in ITEMS
    for (const k of values) {
      expect(ITEMS[k]?.kind).toBe("tile");
    }
    // Known tile key is present
    expect(values).toContain("tile_grass_hay");
    // Known resource key is absent
    expect(values).not.toContain("bread");
    expect(values).not.toContain("flour");
  });
});

describe("resourceKeyOptions", () => {
  it("returns no tile-kind entries", () => {
    const opts = resourceKeyOptions();
    const values = opts.map((o) => o.value).filter(Boolean);
    expect(values.length).toBeGreaterThan(0);
    // No returned key may be kind:"tile"
    for (const k of values) {
      expect(ITEMS[k]?.kind).not.toBe("tile");
    }
    // Known tile key is absent
    expect(values).not.toContain("tile_grass_hay");
  });
});

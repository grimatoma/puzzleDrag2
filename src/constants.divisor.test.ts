import { describe, it, expect } from "vitest";
import { TILES_PER_RESOURCE } from "./constants.js";
import { TILE_TYPES } from "./features/tileCollection/data.js";
import { lineBase, tierStep, PRODUCTION_LINES } from "./config/productionLines.js";

describe("TILES_PER_RESOURCE tier scaling", () => {
  it("gives every tile type a divisor", () => {
    for (const t of TILE_TYPES) {
      expect(TILES_PER_RESOURCE[t.id], t.id).toBeGreaterThan(0);
    }
  });

  it("keeps tier-0 equal to the line base (backward compatible)", () => {
    for (const t of TILE_TYPES) {
      if (t.tier !== 0) continue;
      if (!PRODUCTION_LINES[t.category]) continue;
      expect(TILES_PER_RESOURCE[t.id], t.id).toBe(lineBase(t.category));
    }
  });

  it("scales rarer variants up by tier", () => {
    expect(TILES_PER_RESOURCE.tile_bird_chicken).toBe(lineBase("bird") + 1 * tierStep("bird"));
    expect(TILES_PER_RESOURCE.tile_bird_goose).toBe(lineBase("bird") + 2 * tierStep("bird"));
    expect(TILES_PER_RESOURCE.tile_bird_dodo).toBe(lineBase("bird") + 3 * tierStep("bird"));
  });

  it("preserves legacy keys absent from TILE_TYPES", () => {
    expect(TILES_PER_RESOURCE.tile_mine_copper_ore).toBe(6);
  });
});

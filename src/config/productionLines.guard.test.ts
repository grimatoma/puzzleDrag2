import { describe, it, expect } from "vitest";
import { PRODUCTION_LINES } from "./productionLines.js";
import { UPGRADE_THRESHOLDS } from "./upgradeThresholds.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";

// Guard against silent single-source-of-truth drift.
//
// `PRODUCTION_LINES[cat].lineBase` is documented (productionLines.ts) to mirror
// the canonical tier-0 tile's `UPGRADE_THRESHOLDS` divisor so tier-0 income and
// board-tier upgrade pacing stay coupled. Nothing enforced that — this test
// turns a future mismatch into a CI failure instead of a balance surprise.
const thresholds = UPGRADE_THRESHOLDS as Record<string, number>;

// Categories whose tier-0 income divisor currently differs from the tile's
// board-upgrade threshold. `fish` lineBase is 5 while tile_fish_* thresholds are
// 6; reconciling them is a balance call, so it's left as-is and pinned here.
// A NEW divergence — or a future reconciliation — will trip this test and force
// a deliberate edit to this list.
const KNOWN_DIVERGENCES = ["fish"];

describe("PRODUCTION_LINES.lineBase mirrors UPGRADE_THRESHOLDS tier-0 divisors", () => {
  it("only the known-exception categories diverge from their tier-0 threshold", () => {
    const diverging: string[] = [];
    for (const [category, line] of Object.entries(PRODUCTION_LINES)) {
      // Tier-0 tiles of this category that carry an explicit threshold. Some
      // categories legitimately start above tier 0 (e.g. birds) and have no
      // tier-0 entry to mirror — nothing to drift against, so skip them.
      const tier0Tiles = TILE_TYPES.filter(
        (t) => t.category === category && t.tier === 0 && t.id in thresholds,
      );
      if (tier0Tiles.length === 0) continue;
      if (tier0Tiles.some((t) => thresholds[t.id] !== line.lineBase)) {
        diverging.push(category);
      }
    }
    expect(diverging.sort()).toEqual([...KNOWN_DIVERGENCES].sort());
  });
});

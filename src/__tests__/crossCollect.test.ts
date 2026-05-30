import { describe, it, expect } from "vitest";
import {
  CROSS_COLLECT_PAIRINGS,
  findCrossCollectTargets,
  buildCrossCollectedCredits,
} from "../game/crossCollect.js";
import { rootReducer } from "../state.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";
import { createBaseState } from "./helpers/baseState.js";

/**
 * Build a ROWSxCOLS grid of loose cells from a 2D array of tile keys
 * (null/undefined → empty cell). Cells expose `.key` (the GameScene path uses
 * `.res.key`, exercised separately below).
 */
function gridFromKeys(rows: Array<Array<string | null>>): Array<Array<{ key: string } | null>> {
  return rows.map((r) => r.map((k) => (k ? { key: k } : null)));
}

// Canonical tile keys per category (from src/features/tileCollection/data.ts).
const GRASS = "tile_grass_hay";       // category: grass
const GRAIN = "tile_grain_wheat";     // category: grain (partner of grass)
const FRUIT = "tile_fruit_apple";     // category: fruits
const TREE = "tile_tree_oak";         // category: trees (partner of fruits)
const VEG = "tile_veg_carrot";        // category: vegetables (no pairing? -> herd_animals)
const HERD = "tile_herd_pig";         // category: herd_animals (partner of vegetables)
const FISH = "tile_fish_sardine";     // category: fish (no pairing)

describe("CROSS_COLLECT_PAIRINGS", () => {
  it("is bidirectional for every documented pair", () => {
    for (const [a, b] of Object.entries(CROSS_COLLECT_PAIRINGS)) {
      expect(CROSS_COLLECT_PAIRINGS[b]).toBe(a);
    }
  });
  it("includes the four documented pairs", () => {
    expect(CROSS_COLLECT_PAIRINGS.grass).toBe("grain");
    expect(CROSS_COLLECT_PAIRINGS.grain).toBe("grass");
    expect(CROSS_COLLECT_PAIRINGS.fruits).toBe("trees");
    expect(CROSS_COLLECT_PAIRINGS.trees).toBe("fruits");
    expect(CROSS_COLLECT_PAIRINGS.vegetables).toBe("herd_animals");
    expect(CROSS_COLLECT_PAIRINGS.herd_animals).toBe("vegetables");
    expect(CROSS_COLLECT_PAIRINGS.cattle).toBe("mounts");
    expect(CROSS_COLLECT_PAIRINGS.mounts).toBe("cattle");
  });
});

describe("findCrossCollectTargets", () => {
  it("(a) collects grain tiles orthogonally adjacent to a grass chain", () => {
    // Row 0: grass grass grain
    // Row 1: grain .     .
    const grid = gridFromKeys([
      [GRASS, GRASS, GRAIN],
      [GRAIN, null, null],
    ]);
    const path = [
      { row: 0, col: 0, key: GRASS },
      { row: 0, col: 1, key: GRASS },
    ];
    const targets = findCrossCollectTargets(grid, path);
    const coords = targets.map((t) => `${t.row},${t.col}`).sort();
    // grain at (0,2) touches (0,1); grain at (1,0) touches (0,0).
    expect(coords).toEqual(["0,2", "1,0"]);
    expect(targets.every((t) => t.key === GRAIN)).toBe(true);
  });

  it("(b) excludes adjacent non-partner tiles", () => {
    // Fruit (non-partner of grass) sits adjacent to the grass chain.
    const grid = gridFromKeys([
      [GRASS, GRASS, FRUIT],
      [FISH, null, null],
    ]);
    const path = [
      { row: 0, col: 0, key: GRASS },
      { row: 0, col: 1, key: GRASS },
    ];
    expect(findCrossCollectTargets(grid, path)).toEqual([]);
  });

  it("(c) excludes diagonal-only partner tiles", () => {
    // Grain at (1,1) is only diagonal to grass chain cell (0,0).
    const grid = gridFromKeys([
      [GRASS, null],
      [null, GRAIN],
    ]);
    const path = [{ row: 0, col: 0, key: GRASS }];
    expect(findCrossCollectTargets(grid, path)).toEqual([]);
  });

  it("(d) dedupes a partner that touches two chain cells", () => {
    // Grain at (1,1) is below both grass (0,1) and right of grass (1,0).
    const grid = gridFromKeys([
      [null, GRASS, null],
      [GRASS, GRAIN, null],
    ]);
    const path = [
      { row: 0, col: 1, key: GRASS },
      { row: 1, col: 0, key: GRASS },
    ];
    const targets = findCrossCollectTargets(grid, path);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ row: 1, col: 1, key: GRAIN });
  });

  it("(e) returns [] when the chain category has no pairing", () => {
    // Fish has no partner; adjacent fish/other tiles must not cross-collect.
    const grid = gridFromKeys([
      [FISH, FISH, GRAIN],
      [GRASS, null, null],
    ]);
    const path = [
      { row: 0, col: 0, key: FISH },
      { row: 0, col: 1, key: FISH },
    ];
    expect(findCrossCollectTargets(grid, path)).toEqual([]);
  });

  it("skips hazard-locked partner cells", () => {
    const grid: Array<Array<({ key: string; frozen?: boolean }) | null>> = [
      [{ key: GRASS }, { key: GRAIN, frozen: true }],
      [{ key: GRAIN }, null],
    ];
    const path = [{ row: 0, col: 0, key: GRASS }];
    const targets = findCrossCollectTargets(grid, path);
    // (0,1) grain is frozen → skipped; (1,0) grain is collected.
    expect(targets.map((t) => `${t.row},${t.col}`)).toEqual(["1,0"]);
  });

  it("reads tile keys from .res.key cells (GameScene shape)", () => {
    const grid: Array<Array<{ res: { key: string } } | null>> = [
      [{ res: { key: GRASS } }, { res: { key: GRAIN } }],
      [null, null],
    ];
    const path = [{ row: 0, col: 0, key: GRASS }];
    const targets = findCrossCollectTargets(grid, path);
    expect(targets.map((t) => `${t.row},${t.col}`)).toEqual(["0,1"]);
  });

  it("excludes a chain cell even if it is a partner-category neighbour", () => {
    // A grain cell that is part of the path must not be re-collected.
    const grid = gridFromKeys([
      [GRASS, GRAIN, GRAIN],
    ]);
    const path = [
      { row: 0, col: 0, key: GRASS },
      { row: 0, col: 1, key: GRAIN },
    ];
    const targets = findCrossCollectTargets(grid, path);
    // (0,1) is in path → excluded; (0,2) grain touches (0,1) → collected.
    expect(targets.map((t) => `${t.row},${t.col}`)).toEqual(["0,2"]);
  });
});

describe("buildCrossCollectedCredits", () => {
  it("credits +1 per partner, keyed by produced resource", () => {
    const credits = buildCrossCollectedCredits([
      { row: 0, col: 2, key: GRAIN },
      { row: 1, col: 0, key: GRAIN },
      { row: 0, col: 0, key: TREE },
    ]);
    // GRAIN appears twice, TREE once. Keys resolve via producedResource (fallback to tile key).
    const total = Object.values(credits).reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });

  it("returns {} for no targets", () => {
    expect(buildCrossCollectedCredits([])).toEqual({});
  });

  // touch unused vars to keep them meaningful in case of future edits
  it("category constants are distinct", () => {
    expect(new Set([GRASS, GRAIN, FRUIT, TREE, VEG, HERD, FISH]).size).toBe(7);
  });
});

/**
 * Reducer-level integration: CHAIN_COLLECTED with a TILE-KEYED `crossCollected`
 * map must credit each partner through the SAME fractional-progress + threshold
 * path as the main chain. This is the regression guard for the bug where the
 * payload was keyed by produced resource and the reducer's
 * UPGRADE_THRESHOLDS[resourceKey] lookup missed (→ fell back to 1), minting a
 * whole unit per partner tile instead of 1/threshold.
 *
 * GRAIN tile (tile_grain_wheat) produces `flour` at threshold 5. We drive the
 * main chain with a DIFFERENT resource (hay) so the partner accrual is isolated.
 */
describe("CHAIN_COLLECTED — cross-collect credits at the partner tile's threshold", () => {
  const GRAIN_THRESH = (UPGRADE_THRESHOLDS as Record<string, number>)[GRAIN];

  it("honors the tile-keyed threshold (NOT 1): below threshold accrues, no mint", () => {
    // Sanity: grain's real threshold is > 1 (so threshold-1 would be a clear bug).
    expect(GRAIN_THRESH).toBeGreaterThan(1);

    const base = createBaseState();
    // Main chain credits hay; cross-collect credits 3 grain tiles (< threshold 5).
    const s1 = rootReducer(base, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: GRASS,
        gained: 3,
        chainLength: 3,
        upgrades: 0,
        value: 1,
        resourceKey: "hay_bundle",
        crossCollected: { [GRAIN]: 3 },
      },
    });

    // 3 < 5 → flour progress accrues, NO flour minted. (If the bug were present,
    // threshold would fall back to 1 and mint 3 flour immediately.)
    expect(s1.resourceProgress?.flour).toBe(3);
    expect(s1.inventory.flour ?? 0).toBe(0);

    // A second dispatch of 3 more grain pushes total to 6 → crosses threshold 5
    // exactly once: mint 1 flour, carry 1.
    const s2 = rootReducer(s1, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: GRASS,
        gained: 3,
        chainLength: 3,
        upgrades: 0,
        value: 1,
        resourceKey: "hay_bundle",
        crossCollected: { [GRAIN]: 3 },
      },
    });
    expect(s2.inventory.flour ?? 0).toBe(1);
    expect(s2.resourceProgress?.flour).toBe(6 % GRAIN_THRESH);
  });

  it("a partner count >= threshold mints the right whole-unit count", () => {
    const base = createBaseState();
    // 11 grain with threshold 5 → floor(11/5) = 2 flour minted, carry 1.
    const s1 = rootReducer(base, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: GRASS,
        gained: 3,
        chainLength: 3,
        upgrades: 0,
        value: 1,
        resourceKey: "hay_bundle",
        crossCollected: { [GRAIN]: 11 },
      },
    });
    expect(s1.inventory.flour ?? 0).toBe(Math.floor(11 / GRAIN_THRESH));
    expect(s1.resourceProgress?.flour).toBe(11 % GRAIN_THRESH);
  });
});

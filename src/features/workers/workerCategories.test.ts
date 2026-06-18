// Guard: every type-worker that reduces a tile-category threshold must point
// at a category that actually exists in the tile catalog. A bug shipped where
// the Miner's `threshold_reduce_category` named "wood" — a resource family, not
// a board-tile category — so `speciesByCategory["wood"]` was empty and hiring
// Miners did nothing. These tests make a dead category fail fast at the source.

import { describe, it, expect } from "vitest";
import { TYPE_WORKERS } from "./data.js";
import { computeWorkerEffects } from "./aggregate.js";
import { TILE_TYPES_BY_CATEGORY } from "../tileCollection/data.js";

/** Every (worker, ability) pair whose ability is threshold_reduce_category. */
const CATEGORY_REDUCERS = TYPE_WORKERS.flatMap((w) =>
  (w.abilities ?? [])
    .filter((a) => a.id === "threshold_reduce_category")
    .map((a) => ({ worker: w, category: String((a.params as { category?: unknown })?.category ?? "") })),
);

describe("TYPE_WORKERS threshold_reduce_category categories are real", () => {
  it("at least one type-worker uses threshold_reduce_category", () => {
    // Sanity: if the worker roster changes shape, the assertions below would
    // vacuously pass — keep this guard so the suite stays meaningful.
    expect(CATEGORY_REDUCERS.length).toBeGreaterThan(0);
  });

  for (const { worker, category } of CATEGORY_REDUCERS) {
    it(`${worker.name} targets a category that exists in TILE_TYPES_BY_CATEGORY`, () => {
      expect(category).not.toBe("");
      expect(Object.prototype.hasOwnProperty.call(TILE_TYPES_BY_CATEGORY, category)).toBe(true);
    });

    it(`${worker.name}'s category "${category}" resolves to at least one tile species`, () => {
      const species = TILE_TYPES_BY_CATEGORY[category] ?? [];
      expect(species.length).toBeGreaterThan(0);
      // The aggregator fans out over each species' baseResource — make sure the
      // category has resolvable targets, not just empty placeholder rows.
      expect(species.some((s) => Boolean(s.baseResource))).toBe(true);
    });

    it(`hiring ${worker.name} to maxCount produces a non-empty thresholdReduce effect`, () => {
      const out = computeWorkerEffects({ workers: { hired: { [worker.id]: worker.maxCount } } });
      const reduced = Object.values(out.thresholdReduce).filter((v) => v > 0);
      expect(reduced.length).toBeGreaterThan(0);
    });
  }
});

describe("Miner reduces the stone-and-block mine chain (regression)", () => {
  it("targets the mine_stone category", () => {
    const miner = TYPE_WORKERS.find((w) => w.id === "miner");
    const ability = miner?.abilities.find((a) => a.id === "threshold_reduce_category");
    expect((ability?.params as { category?: unknown })?.category).toBe("mine_stone");
  });

  it("a hired Miner shaves the stone tile's threshold", () => {
    const out = computeWorkerEffects({ workers: { hired: { miner: 5 } } });
    // mine_stone holds the stone → block chain; 5 hires → 5 whole-tile cut.
    expect(out.thresholdReduce.tile_mine_stone).toBe(5);
    expect(out.thresholdReduce.block).toBe(5);
  });
});

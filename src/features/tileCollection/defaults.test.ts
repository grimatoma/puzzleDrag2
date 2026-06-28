import { describe, it, expect } from "vitest";
import { TILE_TYPES, CATEGORIES } from "./data.js";

interface TileDef {
  id: string;
  category: string;
  discovery?: { method?: string };
  abilities?: ReadonlyArray<unknown>;
  effects?: Record<string, unknown>;
}

/**
 * Progression invariant: the player starts with exactly ONE tile unlocked per
 * IN-SCOPE category, and earns the rest through buildings / chain-goals / daily / zones.
 * `defaultTileCollectionSlice` (src/state/helpers.ts) seeds `discovered` from
 * `discovery.method === "default"` and makes the FIRST default per category the
 * active one — so more than one default in a category silently strands the extras.
 *
 * Zones-1&2 scope: the flowers / cattle / mounts / fish / deep-mine / treasure
 * categories are UNLINKED (their starter tiles flipped off `default` to a deferred
 * building), so they intentionally have zero defaults until those zones re-open.
 */
describe("tile starting defaults", () => {
  const tiles = TILE_TYPES as ReadonlyArray<TileDef>;
  const UNLINKED_CATEGORIES = new Set(["flowers", "cattle", "mounts", "fish", "mine_gem", "mine_gold", "treasure"]);

  const defaultsByCategory = new Map<string, string[]>();
  for (const t of tiles) {
    if (t.discovery?.method !== "default") continue;
    const list = defaultsByCategory.get(t.category) ?? [];
    list.push(t.id);
    defaultsByCategory.set(t.category, list);
  }

  it("every in-scope category has exactly one default tile; unlinked ones have none", () => {
    for (const category of CATEGORIES as readonly string[]) {
      const defaults = defaultsByCategory.get(category) ?? [];
      const want = UNLINKED_CATEGORIES.has(category) ? 0 : 1;
      expect(
        defaults.length,
        `category "${category}" should have ${want} default tile(s), got: [${defaults.join(", ")}]`,
      ).toBe(want);
    }
  });

  it("no default starting tile carries a power (abilities/effects)", () => {
    // A brand-new game seeds its active board tiles from the `default`-discovery
    // tiles, so those must be plain — a fresh first-time player should not start
    // with any tile powers (e.g. free-move / coin-bonus abilities).
    for (const t of tiles) {
      if (t.discovery?.method !== "default") continue;
      const abilities = t.abilities ?? [];
      expect(
        abilities.length,
        `default tile "${t.id}" must have no abilities, got: ${JSON.stringify(abilities)}`,
      ).toBe(0);
      const effectKeys = Object.keys(t.effects ?? {});
      expect(
        effectKeys.length,
        `default tile "${t.id}" must have no effects, got: [${effectKeys.join(", ")}]`,
      ).toBe(0);
    }
  });

  it("no default tile belongs to an unknown category", () => {
    const known = new Set(CATEGORIES as readonly string[]);
    for (const category of defaultsByCategory.keys()) {
      expect(known.has(category), `default tiles in unknown category "${category}"`).toBe(true);
    }
  });
});

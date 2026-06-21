import { describe, it, expect } from "vitest";
import { TILE_TYPES, CATEGORIES } from "./data.js";

interface TileDef {
  id: string;
  category: string;
  discovery?: { method?: string };
}

/**
 * Progression invariant: the player starts with exactly ONE tile unlocked per
 * category, and earns the rest through buildings / chain-goals / daily / zones.
 * `defaultTileCollectionSlice` (src/state/helpers.ts) seeds `discovered` from
 * `discovery.method === "default"` and makes the FIRST default per category the
 * active one — so more than one default in a category silently strands the
 * extras (they're discovered but never auto-activated), and zero defaults leaves
 * a category with no starting tile at all. This test pins that to exactly one.
 */
describe("tile starting defaults", () => {
  const tiles = TILE_TYPES as ReadonlyArray<TileDef>;

  const defaultsByCategory = new Map<string, string[]>();
  for (const t of tiles) {
    if (t.discovery?.method !== "default") continue;
    const list = defaultsByCategory.get(t.category) ?? [];
    list.push(t.id);
    defaultsByCategory.set(t.category, list);
  }

  it("every category has exactly one default-unlocked tile", () => {
    for (const category of CATEGORIES as readonly string[]) {
      const defaults = defaultsByCategory.get(category) ?? [];
      expect(
        defaults.length,
        `category "${category}" should have exactly one default tile, got: [${defaults.join(", ")}]`,
      ).toBe(1);
    }
  });

  it("no default tile belongs to an unknown category", () => {
    const known = new Set(CATEGORIES as readonly string[]);
    for (const category of defaultsByCategory.keys()) {
      expect(known.has(category), `default tiles in unknown category "${category}"`).toBe(true);
    }
  });
});

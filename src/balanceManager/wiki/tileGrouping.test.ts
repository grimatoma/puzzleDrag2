/**
 * tileGrouping.test.ts — unit suite for the pure tile-grouping helper.
 *
 * Uses real tile ids from TILE_TYPES_MAP plus one bogus key, and asserts:
 *  - sub-category band order is farm → mining → water → uncategorized
 *  - the "hazards" band never appears (it carries no tile categories)
 *  - categories land under the correct band (vegetables/fruits → Farm,
 *    mine_* → Mining, fish → Water, unknown → Uncategorized)
 *  - empty categories are skipped
 *  - input/entry order is preserved within a category
 */

import { describe, it, expect } from "vitest";
import { groupTileEntries, type TileSubCategoryGroup } from "./tileGrouping.js";
import type { WikiEntry } from "./EntryGrid.jsx";

function entry(key: string): WikiEntry {
  return { key, name: key };
}

function findSub(groups: TileSubCategoryGroup[], sub: string) {
  return groups.find((g) => g.sub === sub);
}

describe("groupTileEntries", () => {
  const entries: WikiEntry[] = [
    entry("tile_veg_carrot"),
    entry("tile_veg_eggplant"),
    entry("tile_fruit_apple"),
    entry("tile_mine_stone"),
    entry("tile_mine_iron_ore"),
    entry("tile_fish_sardine"),
    entry("not_a_tile"),
  ];

  it("orders bands farm → mining → water → uncategorized", () => {
    const groups = groupTileEntries(entries);
    expect(groups.map((g) => g.sub)).toEqual([
      "farm",
      "mining",
      "water",
      "uncategorized",
    ]);
  });

  it("never emits a 'hazards' band", () => {
    const groups = groupTileEntries(entries);
    expect(groups.some((g) => g.sub === "hazards")).toBe(false);
  });

  it("places vegetables and fruits under Farm", () => {
    const farm = findSub(groupTileEntries(entries), "farm");
    expect(farm).toBeDefined();
    const cats = farm!.categories.map((c) => c.category);
    expect(cats).toContain("vegetables");
    expect(cats).toContain("fruits");
  });

  it("places mine_* categories under Mining", () => {
    const mining = findSub(groupTileEntries(entries), "mining");
    expect(mining).toBeDefined();
    const cats = mining!.categories.map((c) => c.category);
    expect(cats).toContain("mine_stone");
    expect(cats).toContain("mine_iron_ore");
  });

  it("places fish under Water", () => {
    const water = findSub(groupTileEntries(entries), "water");
    expect(water).toBeDefined();
    expect(water!.categories.map((c) => c.category)).toContain("fish");
  });

  it("places the unknown key under Uncategorized", () => {
    const unc = findSub(groupTileEntries(entries), "uncategorized");
    expect(unc).toBeDefined();
    const allKeys = unc!.categories.flatMap((c) => c.entries.map((e) => e.key));
    expect(allKeys).toContain("not_a_tile");
  });

  it("skips empty categories (no zero-entry category groups)", () => {
    for (const sub of groupTileEntries(entries)) {
      for (const cat of sub.categories) {
        expect(cat.entries.length).toBeGreaterThan(0);
      }
    }
  });

  it("skips bands whose categories are all empty", () => {
    // Only a fish entry → only the Water band should appear.
    const groups = groupTileEntries([entry("tile_fish_sardine")]);
    expect(groups.map((g) => g.sub)).toEqual(["water"]);
  });

  it("preserves entry order within a category", () => {
    const farm = findSub(groupTileEntries(entries), "farm");
    const veg = farm!.categories.find((c) => c.category === "vegetables");
    expect(veg!.entries.map((e) => e.key)).toEqual([
      "tile_veg_carrot",
      "tile_veg_eggplant",
    ]);
  });

  it("humanizes category labels (strips the mine_ prefix)", () => {
    const mining = findSub(groupTileEntries(entries), "mining");
    const ore = mining!.categories.find((c) => c.category === "mine_iron_ore");
    expect(ore!.label).toBe("Iron Ore");
    const stone = mining!.categories.find((c) => c.category === "mine_stone");
    expect(stone!.label).toBe("Stone");
  });

  it("attaches the sub-category label and icon", () => {
    const farm = findSub(groupTileEntries(entries), "farm");
    expect(farm!.label).toBe("Farm");
    expect(farm!.icon).toBe("🌾");
  });

  it("returns an empty array for empty input", () => {
    expect(groupTileEntries([])).toEqual([]);
  });
});

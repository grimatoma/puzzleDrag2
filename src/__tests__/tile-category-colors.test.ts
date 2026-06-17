import { describe, it, expect } from "vitest";
import {
  ITEMS,
  TILE_CATEGORY_COLORS,
  tileCategory,
  tileBackgroundColor,
} from "../constants.js";

describe("tile category background colors", () => {
  it("extracts the category from a tile key", () => {
    expect(tileCategory("tile_grass_meadow")).toBe("grass");
    expect(tileCategory("tile_mine_iron_ore")).toBe("mine");
    expect(tileCategory("tile_fish_clam")).toBe("fish");
    expect(tileCategory("tile_coin_golden")).toBe("coin");
    expect(tileCategory("flour")).toBeNull();
  });

  it("gives every tile in a category the same background color", () => {
    const byCategory = new Map<string, Set<number>>();
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      const cat = tileCategory(key);
      if (!cat || !(cat in TILE_CATEGORY_COLORS)) continue;
      const color = tileBackgroundColor({ key, look: (def as { look?: { color?: number } }).look });
      expect(color, `${key} uses its category color`).toBe(TILE_CATEGORY_COLORS[cat]);
      if (!byCategory.has(cat)) byCategory.set(cat, new Set());
      byCategory.get(cat)!.add(color);
    }
    for (const [cat, colors] of byCategory) {
      expect(colors.size, `${cat} resolves to exactly one background color`).toBe(1);
    }
  });

  it("every board tile resolves to a registered category color", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      const cat = tileCategory(key);
      expect(cat, `${key} has a category`).not.toBeNull();
      expect(TILE_CATEGORY_COLORS, `${key} category "${cat}" has a color`).toHaveProperty(cat as string);
    }
  });

  it("category colors are distinct from one another", () => {
    const colors = Object.values(TILE_CATEGORY_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("falls back to look.color for non-tile keys", () => {
    expect(tileBackgroundColor({ key: "flour", look: { color: 0x123456 } })).toBe(0x123456);
    expect(tileBackgroundColor({ look: { color: 0xabcdef } })).toBe(0xabcdef);
  });
});

import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";
import {
  CATEGORY_OF,
  TILE_CATEGORY_COLORS,
  tileBackgroundColor,
} from "../features/tileCollection/data.js";

describe("tile category background colors", () => {
  it("resolves a board tile to its canonical category color", () => {
    expect(tileBackgroundColor({ key: "tile_grass_meadow", look: { color: 0x111111 } }))
      .toBe(TILE_CATEGORY_COLORS.grass);
    // bird_clover/bird_melon are catalogued under flowers/fruits, not bird —
    // the color must follow the real category, not the key prefix.
    expect(tileBackgroundColor({ key: "tile_bird_clover" })).toBe(TILE_CATEGORY_COLORS.flowers);
    expect(tileBackgroundColor({ key: "tile_bird_melon" })).toBe(TILE_CATEGORY_COLORS.fruits);
  });

  it("gives each mine ore category a distinct color (they co-occur on the board)", () => {
    const ores = ["mine_stone", "mine_iron_ore", "mine_coal", "mine_gem", "mine_gold"];
    const colors = ores.map((c) => TILE_CATEGORY_COLORS[c]);
    expect(new Set(colors).size, "mine ore colors are mutually distinct").toBe(ores.length);
  });

  it("every catalogued tile category has a registered color", () => {
    for (const cat of new Set(Object.values(CATEGORY_OF))) {
      expect(TILE_CATEGORY_COLORS, `category "${cat}" has a color`).toHaveProperty(cat as string);
    }
  });

  it("all category colors are mutually distinct", () => {
    const colors = Object.values(TILE_CATEGORY_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("every board tile in the catalog resolves to its category color", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      const cat = (CATEGORY_OF as Record<string, string | undefined>)[key];
      if (!cat) continue; // e.g. copper ore — intentionally falls back to look.color
      expect(tileBackgroundColor({ key, look: (def as { look?: { color?: number } }).look }))
        .toBe(TILE_CATEGORY_COLORS[cat]);
    }
  });

  it("falls back to look.color for keys outside the catalog", () => {
    expect(tileBackgroundColor({ key: "flour", look: { color: 0x123456 } })).toBe(0x123456);
    expect(tileBackgroundColor({ key: "tile_mine_copper_ore", look: { color: 0xabcdef } })).toBe(0xabcdef);
    expect(tileBackgroundColor({ look: { color: 0xfeedee } })).toBe(0xfeedee);
  });
});

import { describe, it, expect } from "vitest";
import { producedResource } from "./producedResource.js";
import { TILE_TYPES_MAP } from "../features/tileCollection/data.js";

describe("producedResource", () => {
  describe("family default (override > family > null)", () => {
    it("resolves the family-default resource per category", () => {
      expect(producedResource({ key: "tile_grass_grass" })).toBe("hay_bundle");
      expect(producedResource({ key: "tile_grain_wheat" })).toBe("flour");
      expect(producedResource({ key: "tile_tree_oak" })).toBe("plank");
      expect(producedResource({ key: "tile_veg_carrot" })).toBe("soup");
      expect(producedResource({ key: "tile_fish_sardine" })).toBe("fish_fillet");
    });

    it("honors compound-family longest-match (mine_iron_ore beats mine)", () => {
      expect(producedResource({ key: "tile_mine_iron_ore" })).toBe("iron_bar");
      expect(producedResource({ key: "tile_mine_stone" })).toBe("block");
      // fish_clam beats fish
      expect(producedResource({ key: "tile_fish_clam" })).toBe("sea_shells");
    });
  });

  describe("per-tile override wins over family default", () => {
    it("returns effects.producesResource when present", () => {
      const key = "tile_grass_grass"; // family default = hay_bundle
      const original = TILE_TYPES_MAP[key].effects;
      TILE_TYPES_MAP[key].effects = { ...original, producesResource: "wool" };
      try {
        expect(producedResource({ key })).toBe("wool");
      } finally {
        TILE_TYPES_MAP[key].effects = original;
      }
    });
  });

  describe("returns null", () => {
    it("for tiles in TILES_WITH_CUSTOM_OUTPUT", () => {
      expect(producedResource({ key: "tile_special_dirt" })).toBeNull();
      expect(producedResource({ key: "tile_special_giant_pearl" })).toBeNull();
    });

    it("for an unknown / family-less key", () => {
      expect(producedResource({ key: "tile_unknown_thing" })).toBeNull();
      expect(producedResource({ key: "not_a_tile" })).toBeNull();
    });

    it("for keyless / null / undefined input", () => {
      expect(producedResource({})).toBeNull();
      expect(producedResource(null)).toBeNull();
      expect(producedResource(undefined)).toBeNull();
      expect(producedResource({ key: "" })).toBeNull();
    });
  });
});

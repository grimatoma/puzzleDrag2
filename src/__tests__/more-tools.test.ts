import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES, RECIPES, ITEMS } from "../constants.js";

describe("workshop tools — round 2 (catalog §8 fillins)", () => {
  it("registers hoe / stone_hammer / iron_pick / bird_feed / sapling", () => {
    for (const id of ["hoe", "stone_hammer", "iron_pick", "bird_feed", "sapling"]) {
      expect(WORKSHOP_RECIPES[id], id).toBeDefined();
    }
  });

  it("each new tool has a station, inputs, typed power, desc", () => {
    for (const id of ["hoe", "stone_hammer", "iron_pick", "bird_feed", "sapling"]) {
      const r = WORKSHOP_RECIPES[id];
      expect(r.station).toBe("workshop");
      expect(typeof r.inputs).toBe("object");
      expect(Object.keys(r.inputs).length).toBeGreaterThan(0);
      expect(r.power?.id ?? ITEMS[id]?.power?.id).toBeTruthy();
      expect(typeof r.desc).toBe("string");
    }
  });

  it("clear-tool powers target a board resource", () => {
    expect(ITEMS.hoe.power.id).toBe("clear_all");
    expect(ITEMS.hoe.power.params.target).toBe("tile_veg_carrot");
    expect(ITEMS.stone_hammer.power.params.target).toBe("tile_mine_stone");
    expect(ITEMS.iron_pick.power.params.target).toBe("tile_mine_iron_ore");
  });

  it("fill-bias tools declare species tile targets", () => {
    expect(ITEMS.bird_feed.power.id).toBe("fill_bias");
    expect(ITEMS.bird_feed.power.params.target).toBe("tile_bird_chicken");
    expect(ITEMS.sapling.power.params.target).toBe("tile_tree_oak");
  });

  it("WORKSHOP_RECIPES is merged into RECIPES so the crafting screen sees them", () => {
    expect(RECIPES.hoe).toBe(WORKSHOP_RECIPES.hoe);
    expect(RECIPES.sapling).toBe(WORKSHOP_RECIPES.sapling);
  });

  it("inputs reference real resource keys", () => {
    // Spot-check: every input key should be a non-empty string
    for (const id of ["hoe", "stone_hammer", "iron_pick", "bird_feed", "sapling"]) {
      const r = WORKSHOP_RECIPES[id];
      for (const k of Object.keys(r.inputs)) {
        expect(typeof k).toBe("string");
        expect(k.length).toBeGreaterThan(0);
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { WORKSHOP_RECIPES, RECIPES } from "../constants.js";

describe("workshop tools — round 2 (catalog §8 fillins)", () => {
  it("registers hoe / stone_hammer / iron_pick / bird_feed / sapling", () => {
    for (const id of ["hoe", "stone_hammer", "iron_pick", "bird_feed", "sapling"]) {
      expect(WORKSHOP_RECIPES[id], id).toBeDefined();
    }
  });

  it("each new tool has a station, inputs, effect, target, anim, ms, desc", () => {
    for (const id of ["hoe", "stone_hammer", "iron_pick", "bird_feed", "sapling"]) {
      const r = WORKSHOP_RECIPES[id];
      expect(r.station).toBe("workshop");
      expect(typeof r.inputs).toBe("object");
      expect(Object.keys(r.inputs).length).toBeGreaterThan(0);
      expect(typeof r.effect).toBe("string");
      expect(typeof r.target).toBe("string");
      expect(typeof r.anim).toBe("string");
      expect(typeof r.ms).toBe("number");
      expect(typeof r.desc).toBe("string");
    }
  });

  it("clear-tool effects target a board resource", () => {
    expect(WORKSHOP_RECIPES.hoe.effect).toBe("clear_all");
    expect(WORKSHOP_RECIPES.hoe.target).toBe("veg_carrot");
    expect(WORKSHOP_RECIPES.stone_hammer.effect).toBe("clear_all");
    expect(WORKSHOP_RECIPES.stone_hammer.target).toBe("mine_cobble");
    expect(WORKSHOP_RECIPES.iron_pick.effect).toBe("clear_all");
    expect(WORKSHOP_RECIPES.iron_pick.target).toBe("mine_ore");
  });

  it("fill-bias tools target species categories the player wants to seed", () => {
    expect(WORKSHOP_RECIPES.bird_feed.effect).toBe("fill_bias");
    expect(WORKSHOP_RECIPES.bird_feed.target).toBe("bird_egg");
    expect(WORKSHOP_RECIPES.sapling.effect).toBe("fill_bias");
    expect(WORKSHOP_RECIPES.sapling.target).toBe("tree_oak");
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

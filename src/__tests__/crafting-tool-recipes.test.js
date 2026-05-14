/**
 * Regression — CRAFTING/CRAFT_RECIPE must route tool recipes (water_pump,
 * explosives) into state.tools, not state.inventory.
 *
 * Bug found in deep code review: the crafting slice unconditionally
 * incremented `state.inventory[recipeKey]` for every recipe. Recipes whose
 * intent is a usable tool (recipe.tool defined) silently became un-usable
 * inventory items, so the player paid the inputs and got nothing playable.
 */
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { RECIPES } from "../constants.js";

describe("CRAFTING/CRAFT_RECIPE — tool-output recipes", () => {
  it("water_pump recipe has a tool field (sanity)", () => {
    expect(RECIPES.water_pump.tool).toBe("water_pump");
  });

  it("explosives recipe has a tool field (sanity)", () => {
    expect(RECIPES.explosives.tool).toBe("explosives");
  });

  it("crafting water_pump credits state.tools, not inventory", () => {
    const s0 = {
      ...createInitialState(),
      built: { workshop: true },
      inventory: { wood_plank: 2, mine_stone: 2 },
    };
    const before = (s0.tools?.water_pump ?? 0);
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "water_pump" });
    expect(s1.tools.water_pump).toBe(before + 1);
    // And it must NOT have been added to inventory under the recipe key.
    expect(s1.inventory.water_pump ?? 0).toBe(0);
    // Inputs were debited.
    expect(s1.inventory.wood_plank).toBe(1);
    expect(s1.inventory.mine_stone).toBe(1);
  });

  it("crafting explosives credits state.tools, not inventory", () => {
    const s0 = {
      ...createInitialState(),
      built: { workshop: true },
      inventory: { grass_hay: 2, mine_dirt: 2 },
    };
    const before = (s0.tools?.explosives ?? 0);
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "explosives" });
    expect(s1.tools.explosives).toBe(before + 1);
    expect(s1.inventory.explosives ?? 0).toBe(0);
    expect(s1.inventory.grass_hay).toBe(1);
    expect(s1.inventory.mine_dirt).toBe(1);
  });

  it("non-tool recipes still go to inventory (control)", () => {
    const s0 = {
      ...createInitialState(),
      built: { bakery: true },
      inventory: { grain_flour: 6, bird_egg: 2 },
    };
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "bread" });
    expect(s1.inventory.bread).toBe(1);
    // Tools dictionary should be untouched (no `bread` key sneaks in).
    expect(s1.tools.bread).toBeUndefined();
  });

  it("rejected craft (missing inputs) does not credit tools or debit inventory", () => {
    const s0 = {
      ...createInitialState(),
      built: { workshop: true },
      inventory: { wood_plank: 0, mine_stone: 0 },
      totalCrafted: 0,
    };
    const beforeTools = s0.tools?.water_pump ?? 0;
    const s1 = rootReducer(s0, { type: "CRAFTING/CRAFT_RECIPE", recipeKey: "water_pump" });
    expect(s1.tools.water_pump ?? 0).toBe(beforeTools);
    expect(s1.totalCrafted ?? 0).toBe(0);
  });
});

// Expedition rations (zones-1&2 scope, scope doc §12): any food is a ration. Each
// food is SELF-DESCRIBING — it carries `food: { rationTurns }` on its ITEMS entry,
// and EXPEDITION_FOOD_TURNS is DERIVED from those entries. Turns scale by processing
// tier (raw 1 / staple 2 / rich 3 / dense ration 4) + building modifiers (Larder /
// Smokehouse / Mining Camp / Pier).
import { describe, it, expect } from "vitest";
import { EXPEDITION_FOOD_TURNS, ITEMS } from "../constants.js";
import { tagsForItemKey } from "../features/inventory/tags.js";
import {
  isExpeditionFood,
  expeditionTurnsForFood,
  expeditionTurnsFromSupply,
} from "../features/zones/data.js";

describe("EXPEDITION_FOOD_TURNS", () => {
  it("scores foods by processing tier (raw 1 / staple 2 / rich 3 / dense 4)", () => {
    expect(EXPEDITION_FOOD_TURNS).toMatchObject({
      tile_fruit_apple: 1, eggs: 1, soup: 1, pie: 1, jam: 1, meat: 1, // raw produce
      bread: 2, preserve: 2,                                          // crafted staple
      harvestpie: 3, cured_meat: 3,                                   // rich crafted
      supplies: 4, iron_ration: 4,                                    // dense rations
    });
  });

  it("is derived from each item's food.rationTurns", () => {
    const fromItems = Object.fromEntries(
      Object.entries(ITEMS)
        .filter(([, entry]) => (entry as { food?: { rationTurns: number } }).food != null)
        .map(([key, entry]) => [key, (entry as { food: { rationTurns: number } }).food.rationTurns]),
    );
    expect(EXPEDITION_FOOD_TURNS).toEqual(fromItems);
    // Every ration key has a positive turn value and a matching item definition.
    for (const [key, turns] of Object.entries(EXPEDITION_FOOD_TURNS)) {
      expect(turns).toBeGreaterThan(0);
      expect((ITEMS[key as keyof typeof ITEMS] as { food?: { rationTurns: number } }).food?.rationTurns).toBe(turns);
    }
  });

  it("tags every ration item as FOOD in the inventory (incl. supplies)", () => {
    expect(tagsForItemKey("supplies")).toContain("food");
    expect(tagsForItemKey("supplies")).not.toContain("cargo");
    expect(tagsForItemKey("bread")).toContain("food");
    expect(tagsForItemKey("tile_mine_stone")).not.toContain("food");
  });
});

describe("isExpeditionFood", () => {
  it("recognises rations, rejects raw resources", () => {
    expect(isExpeditionFood("bread")).toBe(true);
    expect(isExpeditionFood("tile_fruit_apple")).toBe(true);
    expect(isExpeditionFood("cured_meat")).toBe(true);
    expect(isExpeditionFood("tile_mine_stone")).toBe(false);
    expect(isExpeditionFood("nope")).toBe(false);
  });
});

describe("expeditionTurnsForFood", () => {
  const noBuildings = { built: {} };

  it("returns the base turn value with no buildings", () => {
    expect(expeditionTurnsForFood(noBuildings, "tile_fruit_apple", "home")).toBe(1); // raw
    expect(expeditionTurnsForFood(noBuildings, "bread", "home")).toBe(2);            // staple
    expect(expeditionTurnsForFood(noBuildings, "cured_meat", "home")).toBe(3);       // rich
  });

  it("returns 0 for a non-food key", () => {
    expect(expeditionTurnsForFood(noBuildings, "tile_mine_stone", "home")).toBe(0);
  });

  it("Larder adds +1 to every food at that zone", () => {
    const s = { built: { home: { larder: true } } };
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(3);      // 2 + 1
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(4); // 3 + 1
  });

  it("Smokehouse adds +1 only to meat-based foods", () => {
    const s = { built: { home: { smokehouse: true } } };
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(4); // 3 + 1
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(2);      // unchanged
  });

  it("Larder + Smokehouse stack on meat", () => {
    const s = { built: { home: { larder: true, smokehouse: true } } };
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(5); // 3 + 1 + 1
  });

  it("Mining Camp adds +1 to all food at any zone with a mine board (Town 2)", () => {
    // meadow is the farm+mining Town 2 (has a mine board); home is pure farm.
    const s = { built: { meadow: { mining_camp: true }, home: { mining_camp: true } } };
    expect(expeditionTurnsForFood(s, "bread", "meadow")).toBe(3); // 2 + mining camp 1
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(2);   // no mine board → ignored
  });

  it("defaults the zone to state.mapCurrent", () => {
    const s = { mapCurrent: "home", built: { home: { larder: true } } };
    expect(expeditionTurnsForFood(s, "bread")).toBe(3); // 2 + 1
  });
});

describe("expeditionTurnsFromSupply", () => {
  it("sums per-food turns × counts", () => {
    const s = { built: {} };
    expect(expeditionTurnsFromSupply(s, { bread: 3, cured_meat: 2 }, "home")).toBe(3 * 2 + 2 * 3);
  });
  it("respects building bonuses", () => {
    const s = { built: { home: { larder: true } } };
    expect(expeditionTurnsFromSupply(s, { bread: 3, cured_meat: 2 }, "home")).toBe(3 * 3 + 2 * 4);
  });
  it("ignores non-food entries in the supply", () => {
    const s = { built: {} };
    expect(expeditionTurnsFromSupply(s, { bread: 2, tile_mine_stone: 99 }, "home")).toBe(4);
  });
});

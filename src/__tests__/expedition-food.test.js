// Phase 5c — expedition rations: the §VI food→turns config + the building
// modifiers (Larder / Smokehouse / Mining Camp / Pier).
import { describe, it, expect } from "vitest";
import { EXPEDITION_FOOD_TURNS } from "../constants.js";
import {
  isExpeditionFood,
  expeditionTurnsForFood,
  expeditionTurnsFromSupply,
} from "../features/zones/data.js";

describe("EXPEDITION_FOOD_TURNS", () => {
  it("matches the master doc §VI table", () => {
    expect(EXPEDITION_FOOD_TURNS).toMatchObject({
      fruit_apple: 1, bread: 1, cured_meat: 2, festival_loaf: 2, wedding_pie: 3, iron_ration: 4,
    });
  });
});

describe("isExpeditionFood", () => {
  it("recognises rations, rejects raw resources", () => {
    expect(isExpeditionFood("bread")).toBe(true);
    expect(isExpeditionFood("fruit_apple")).toBe(true);
    expect(isExpeditionFood("iron_ration")).toBe(true);
    expect(isExpeditionFood("mine_stone")).toBe(false);
    expect(isExpeditionFood("nope")).toBe(false);
  });
});

describe("expeditionTurnsForFood", () => {
  const noBuildings = { built: {} };

  it("returns the base turn value with no buildings", () => {
    expect(expeditionTurnsForFood(noBuildings, "bread", "home")).toBe(1);
    expect(expeditionTurnsForFood(noBuildings, "fruit_apple", "home")).toBe(1);
    expect(expeditionTurnsForFood(noBuildings, "cured_meat", "home")).toBe(2);
    expect(expeditionTurnsForFood(noBuildings, "wedding_pie", "home")).toBe(3);
    expect(expeditionTurnsForFood(noBuildings, "iron_ration", "home")).toBe(4);
  });

  it("returns 0 for a non-food key", () => {
    expect(expeditionTurnsForFood(noBuildings, "mine_stone", "home")).toBe(0);
  });

  it("Larder adds +1 to every food at that zone", () => {
    const s = { built: { home: { larder: true } } };
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(2);
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(3);
  });

  it("Smokehouse adds +1 only to meat-based foods", () => {
    const s = { built: { home: { smokehouse: true } } };
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(3); // 2 + 1
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(1);      // unchanged
  });

  it("Larder + Smokehouse stack on meat", () => {
    const s = { built: { home: { larder: true, smokehouse: true } } };
    expect(expeditionTurnsForFood(s, "cured_meat", "home")).toBe(4); // 2 + 1 + 1
  });

  it("Mining Camp adds +1 to all food, but only at a mine settlement", () => {
    const s = { built: { quarry: { mining_camp: true }, home: { mining_camp: true } } };
    expect(expeditionTurnsForFood(s, "bread", "quarry")).toBe(2); // mine zone → applies
    expect(expeditionTurnsForFood(s, "bread", "home")).toBe(1);   // farm zone → ignored
  });

  it("Pier (harbor_dock) adds +1 to all food at a harbor settlement", () => {
    const s = { built: { harbor: { harbor_dock: true } } };
    expect(expeditionTurnsForFood(s, "bread", "harbor")).toBe(2);
  });

  it("defaults the zone to state.mapCurrent", () => {
    const s = { mapCurrent: "home", built: { home: { larder: true } } };
    expect(expeditionTurnsForFood(s, "bread")).toBe(2);
  });
});

describe("expeditionTurnsFromSupply", () => {
  it("sums per-food turns × counts", () => {
    const s = { built: {} };
    expect(expeditionTurnsFromSupply(s, { bread: 3, cured_meat: 2 }, "home")).toBe(3 * 1 + 2 * 2);
  });
  it("respects building bonuses", () => {
    const s = { built: { home: { larder: true } } };
    expect(expeditionTurnsFromSupply(s, { bread: 3, cured_meat: 2 }, "home")).toBe(3 * 2 + 2 * 3);
  });
  it("ignores non-food entries in the supply", () => {
    const s = { built: {} };
    expect(expeditionTurnsFromSupply(s, { bread: 2, mine_stone: 99 }, "home")).toBe(2);
  });
});

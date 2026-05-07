/**
 * Phase 10.9 — Pre-existing crafting recipe coverage backfill.
 *
 * 8 recipes already in src/constants.js:
 *   Bread Loaf, Honey Roll, Harvest Pie, Preserve Jar, Berry Tincture,
 *   Iron Hinge, Cobble Path, Iron Lantern
 *
 * No implementation changes — these tests close the §11 coverage gap.
 */
import { describe, it, expect } from "vitest";
import { RECIPES } from "../constants.js";
import { createInitialState, rootReducer, sellPriceFor } from "../state.js";

const PREEXISTING = [
  "bread",
  "honeyroll",
  "harvestpie",
  "preserve",
  "tincture",
  "hinge",
  "cobblepath",
  "lantern",
];

describe("Pre-existing crafting recipes — §11 spec backfill", () => {
  for (const id of PREEXISTING) {
    const recipe = RECIPES[id];

    it(`${id} is registered with non-empty inputs`, () => {
      expect(recipe).toBeDefined();
      expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
    });

    it(`${id} lives in a §11-named station (bakery / larder / forge)`, () => {
      expect(["bakery", "larder", "forge"]).toContain(recipe.station);
    });

    it(`${id} sell price is ~10% of buy (§10 asymmetry)`, () => {
      expect(sellPriceFor(id)).toBe(Math.round(recipe.coins * 0.1));
    });

    it(`${id} successful craft debits inputs and credits +1 output`, () => {
      // Build a state with the station built and double-stock all inputs in inventory
      const s = createInitialState();
      const stocked = {
        ...s,
        built: { ...s.built, [recipe.station]: true },
        inventory: { ...s.inventory },
      };
      for (const [input, qty] of Object.entries(recipe.inputs)) {
        stocked.inventory[input] = qty * 2;
      }
      const before = stocked.inventory[id] ?? 0;
      const after = rootReducer(stocked, {
        type: "CRAFTING/CRAFT_RECIPE",
        payload: { key: id },
      });
      // Output item incremented in inventory
      expect(after.inventory[id]).toBe(before + 1);
      // Inputs debited
      for (const [input, qty] of Object.entries(recipe.inputs)) {
        expect(after.inventory[input]).toBe(qty * 2 - qty);
      }
    });

    it(`${id} is no-op when inputs missing`, () => {
      const empty = createInitialState();
      const emptyBuilt = {
        ...empty,
        built: { ...empty.built, [recipe.station]: true },
      };
      // Inventory has no inputs
      const afterEmpty = rootReducer(emptyBuilt, {
        type: "CRAFTING/CRAFT_RECIPE",
        payload: { key: id },
      });
      // Output should not have been added
      expect(afterEmpty.inventory[id] ?? 0).toBe(empty.inventory[id] ?? 0);
    });
  }
});

// ── Additional coverage: Phase 10.3 late-game recipes ─────────────────────────

const LATE_GAME = ["iron_frame", "stonework", "gem_crown", "gold_ring"];

describe("Phase 10.3 late-game forge recipes — §11 spec", () => {
  for (const id of LATE_GAME) {
    const recipe = RECIPES[id];

    it(`${id} is registered`, () => {
      expect(recipe).toBeDefined();
      expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
    });

    it(`${id} lives at forge station`, () => {
      expect(recipe.station).toBe("forge");
    });

    it(`${id} sell price = Math.round(coins * 0.1)`, () => {
      expect(sellPriceFor(id)).toBe(Math.round(recipe.coins * 0.1));
    });
  }
});

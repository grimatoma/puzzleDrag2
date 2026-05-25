import { describe, expect, it } from "vitest";
import { filterAbilityCatalog } from "../balanceManager/abilityPicker.js";

const CATALOG = [
  {
    id: "coin_bonus_flat",
    name: "Coin Bonus",
    desc: "Adds coins after a completed order.",
  },
  {
    id: "harvest_speed",
    name: "Quick Harvest",
    desc: "Speeds up crop collection.",
  },
  {
    id: "rat_ward",
    name: "Pest Ward",
    desc: "Keeps dangerous pests away.",
  },
];

describe("filterAbilityCatalog", () => {
  it("returns the original catalog for an empty query", () => {
    expect(filterAbilityCatalog(CATALOG, "")).toBe(CATALOG);
    expect(filterAbilityCatalog(CATALOG, "   ")).toBe(CATALOG);
  });

  it("matches ability ids case-insensitively", () => {
    expect(filterAbilityCatalog(CATALOG, "COIN_BONUS")).toEqual([CATALOG[0]]);
  });

  it("matches display names case-insensitively", () => {
    expect(filterAbilityCatalog(CATALOG, "quick")).toEqual([CATALOG[1]]);
  });

  it("matches descriptions case-insensitively", () => {
    expect(filterAbilityCatalog(CATALOG, "dangerous")).toEqual([CATALOG[2]]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterAbilityCatalog(CATALOG, "alchemy")).toEqual([]);
  });
});

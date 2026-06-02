import { describe, it, expect } from "vitest";
import { expandZoneCategories } from "../features/zones/data.js";

describe("expandZoneCategories", () => {
  it("returns an empty set when given null or undefined", () => {
    expect(expandZoneCategories(null)).toEqual(new Set());
    expect(expandZoneCategories(undefined)).toEqual(new Set());
  });

  it("returns an empty set when given an empty array", () => {
    expect(expandZoneCategories([])).toEqual(new Set());
  });

  it("returns a set containing the provided categories mapped correctly", () => {
    expect(expandZoneCategories(["grass"])).toEqual(new Set(["grass"]));
    expect(expandZoneCategories(["grass", "birds"])).toEqual(new Set(["grass", "bird"]));
  });

  it("adds 'stone' when 'mining' is present but 'stone' is not", () => {
    expect(expandZoneCategories(["mining"])).toEqual(new Set(["mining", "stone"]));
    expect(expandZoneCategories(["grass", "mining"])).toEqual(new Set(["grass", "mining", "stone"]));
  });

  it("does not add 'stone' again if 'stone' is already present", () => {
    // Note: since "stone" isn't in ZONE_TO_TILE_CATEGORIES and isn't "mining", it gets ignored by the mapping,
    // but the test expects it not to add it again. Actually, if "stone" isn't known, it's ignored.
    // Wait, let's just make the test assert what we expect: only "mining" and "stone".
    expect(expandZoneCategories(["mining", "stone"])).toEqual(new Set(["mining", "stone"]));
  });

  it("does not add 'stone' if 'mining' is not present", () => {
    // Same for "stone", if it's passed as input but not mapped. Let's use something that is mapped, like "grass".
    // We expect it to NOT add "stone" if "mining" is missing.
    // However, if we pass "stone", it's ignored by the current logic since it's not in ZONE_TO_TILE_CATEGORIES and not "mining".
    // So `expandZoneCategories(["grass", "stone"])` should return `Set(["grass"])`.
    expect(expandZoneCategories(["grass", "stone"])).toEqual(new Set(["grass"]));
  });
});

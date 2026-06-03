// src/__tests__/progression-config.test.ts
import { describe, it, expect } from "vitest";
import { zoneBuildingIds, zoneBoardKinds } from "../config/progression/derive.js";
import { ZONES } from "../features/zones/data.js";

describe("derive helpers", () => {
  it("zoneBuildingIds returns the zone's buildable ids", () => {
    const home = zoneBuildingIds("home");
    expect(Array.isArray(home)).toBe(true);
    // 'home' (the farm) must exist as a zone
    expect(ZONES["home"]).toBeTruthy();
  });
  it("zoneBoardKinds lists enabled board kinds", () => {
    expect(zoneBoardKinds("home")).toContain("farm");
  });
  it("unknown zone yields empty, not a throw", () => {
    expect(zoneBuildingIds("nope_zone")).toEqual([]);
    expect(zoneBoardKinds("nope_zone")).toEqual([]);
  });
});

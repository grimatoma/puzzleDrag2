import { describe, it, expect } from "vitest";
import { RESOURCE_TO_THRESHOLD } from "../constants.js";

describe("RESOURCE_TO_THRESHOLD", () => {
  it("is non-empty", () => {
    expect(Object.keys(RESOURCE_TO_THRESHOLD).length).toBeGreaterThan(0);
  });

  it("includes hay_bundle with threshold 6 (grass family)", () => {
    expect(RESOURCE_TO_THRESHOLD["hay_bundle"]).toBe(6);
  });

  it("includes eggs with threshold 6 (bird family)", () => {
    expect(RESOURCE_TO_THRESHOLD["eggs"]).toBe(6);
  });

  it("includes soup with threshold 6 (veg family)", () => {
    expect(RESOURCE_TO_THRESHOLD["soup"]).toBe(6);
  });

  it("includes flour with threshold 5 (grain family — wheat threshold)", () => {
    expect(RESOURCE_TO_THRESHOLD["flour"]).toBe(5);
  });

  it("includes iron_bar with threshold 6 (mine_iron_ore family)", () => {
    expect(RESOURCE_TO_THRESHOLD["iron_bar"]).toBe(6);
  });

  it("includes fish_fillet with threshold 5 (fish family — sardine threshold)", () => {
    expect(RESOURCE_TO_THRESHOLD["fish_fillet"]).toBe(5);
  });
});

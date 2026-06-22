/**
 * Pearl rune gate: the optional `supportReduce` (from Rune Seeker workers)
 * lowers the required fish count, floored at 1.
 * REQUIRED_FISH_IN_CHAIN = 2.
 */
import { describe, it, expect } from "vitest";
import { isPearlChainValid, REQUIRED_FISH_IN_CHAIN, PEARL_KEY } from "./pearl.js";

describe("isPearlChainValid with supportReduce", () => {
  const pearlOneFish = [{ key: PEARL_KEY }, { key: "tile_fish_sardine" }];

  it("requires REQUIRED_FISH_IN_CHAIN other fish with no reduction", () => {
    expect(REQUIRED_FISH_IN_CHAIN).toBe(2);
    expect(isPearlChainValid(pearlOneFish, 0)).toBe(false); // 1 < 2
  });

  it("a Rune Seeker (reduce 1) lets a single fish tile mint the pearl rune", () => {
    expect(isPearlChainValid(pearlOneFish, 1)).toBe(true);
  });

  it("never drops the requirement below 1 supporting tile", () => {
    const pearlNoFish = [{ key: PEARL_KEY }];
    expect(isPearlChainValid(pearlNoFish, 5)).toBe(false);
  });
});

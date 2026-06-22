/**
 * Mysterious-ore rune gate: the optional `supportReduce` (from Rune Seeker
 * workers) lowers the required dirt count, floored at 1.
 * REQUIRED_DIRT_IN_CHAIN = 2.
 */
import { describe, it, expect } from "vitest";
import { isMysteriousChainValid, REQUIRED_DIRT_IN_CHAIN } from "./mysterious_ore.js";

describe("isMysteriousChainValid with supportReduce", () => {
  const oreOneDirt = [{ key: "mysterious_ore" }, { key: "tile_special_dirt" }];

  it("requires REQUIRED_DIRT_IN_CHAIN dirt with no reduction", () => {
    expect(REQUIRED_DIRT_IN_CHAIN).toBe(2);
    expect(isMysteriousChainValid(oreOneDirt, 0)).toBe(false); // 1 < 2
  });

  it("a Rune Seeker (reduce 1) lets a single dirt tile mint the rune", () => {
    expect(isMysteriousChainValid(oreOneDirt, 1)).toBe(true); // 1 >= max(1, 2-1)=1
  });

  it("never drops the requirement below 1 supporting tile", () => {
    const oreNoDirt = [{ key: "mysterious_ore" }];
    expect(isMysteriousChainValid(oreNoDirt, 5)).toBe(false); // 0 < max(1, 2-5)=1
  });
});

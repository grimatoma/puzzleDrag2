/**
 * Rune Seeker support-reduction: the rune-mint gates accept an optional
 * `supportReduce` that lowers the required supporting-tile count, floored at 1.
 *
 * REQUIRED_DIRT_IN_CHAIN = REQUIRED_FISH_IN_CHAIN = 2.
 */
import { describe, it, expect } from "vitest";
import { isMysteriousChainValid, REQUIRED_DIRT_IN_CHAIN } from "./mine/mysterious_ore.js";
import { isPearlChainValid, REQUIRED_FISH_IN_CHAIN, PEARL_KEY } from "./fish/pearl.js";

describe("isMysteriousChainValid with supportReduce", () => {
  // ore + exactly 1 dirt
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

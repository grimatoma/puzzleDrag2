import { describe, it, expect } from "vitest";
import {
  PRODUCTION_LINES, lineBase, tierStep, lineStep, lineFloor, categoryOfTileKey,
} from "./productionLines.js";

describe("PRODUCTION_LINES", () => {
  it("defines every farm/mine/water production category", () => {
    for (const cat of [
      "grass","grain","bird","vegetables","fruits","flowers","trees",
      "herd_animals","cattle","mounts","mine_stone","mine_iron_ore",
      "mine_coal","mine_gem","mine_gold","special_dirt","fish",
    ]) {
      expect(PRODUCTION_LINES[cat], cat).toBeDefined();
    }
  });

  it("keeps PC2 bulk + premium-floor outliers", () => {
    expect(lineStep("grass")).toBe(2);
    expect(lineStep("special_dirt")).toBe(2);
    expect(lineStep("fish")).toBe(1);
    expect(lineFloor("flowers")).toBe(3);
    expect(lineFloor("mounts")).toBe(3);
    expect(lineFloor("mine_gem")).toBe(2);
    expect(lineFloor("mine_gold")).toBe(2);
    expect(lineFloor("grass")).toBe(1);
  });

  it("preserves today's per-category tier-0 divisor as lineBase", () => {
    expect(lineBase("grass")).toBe(6);
    expect(lineBase("grain")).toBe(5);
    expect(lineBase("fruits")).toBe(7);
    expect(lineBase("flowers")).toBe(10);
    expect(lineBase("mounts")).toBe(10);
    expect(lineBase("mine_stone")).toBe(8);
    expect(lineBase("fish")).toBe(5);
    expect(tierStep("grain")).toBe(1);
  });

  it("maps a tile key to its category", () => {
    expect(categoryOfTileKey("tile_grass_grass")).toBe("grass");
    expect(categoryOfTileKey("tile_grain_wheat")).toBe("grain");
    expect(categoryOfTileKey("block")).toBe("mine_stone");
    expect(categoryOfTileKey("nope")).toBeNull();
  });
});

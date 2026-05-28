import { describe, it, expect } from "vitest";
import { SEASONS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

describe("season icons wired", () => {
  it("each season uses its season_<name> icon and the key is registered", () => {
    const expected = ["season_spring", "season_summer", "season_autumn", "season_winter"];
    SEASONS.forEach((s, i) => {
      expect(s.iconKey).toBe(expected[i]);
      expect(ICON_REGISTRY[expected[i]]).toBeDefined();
    });
  });
});

describe("achievement icons wired", () => {
  it("every achievement has icon === ach_<id> and the key is registered", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon, a.id).toBe(`ach_${a.id}`);
      expect(ICON_REGISTRY[`ach_${a.id}`], a.id).toBeDefined();
    }
  });
});

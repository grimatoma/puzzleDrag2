import { describe, it, expect } from "vitest";
import { TOOL_POWERS, itemsWithToolPower } from "../toolPowers.js";
import { BOARD_ANIMATIONS } from "../boardAnimations.js";
import { TOOL_POWER_BOARD_ANIMATION } from "../toolPowerBoardAnimation.js";

describe("toolPowers animation catalog", () => {
  it("every power id has board animation metadata", () => {
    for (const power of TOOL_POWERS) {
      expect(TOOL_POWER_BOARD_ANIMATION[power.id], power.id).toBeDefined();
      expect(power.animation?.summary, power.id).toBeTruthy();
      expect(Array.isArray(power.animation?.variants), power.id).toBe(true);
    }
  });

  it("references only known board presets", () => {
    const known = new Set(Object.keys(BOARD_ANIMATIONS));
    for (const power of TOOL_POWERS) {
      const presets = [
        power.animation?.boardPreset,
        ...(power.animation?.variants ?? []).map((v) => v.boardPreset),
      ].filter(Boolean);
      for (const name of presets) {
        expect(known.has(name), `${power.id} → ${name}`).toBe(true);
      }
    }
  });

  it("itemsWithToolPower groups tools by power.id", () => {
    const clearCategory = itemsWithToolPower("clear_category").map((i) => i.key);
    expect(clearCategory).toContain("bird_cage");
    expect(clearCategory).toContain("fruit_picker");
    expect(clearCategory).toContain("hoe");

    const clearAll = itemsWithToolPower("clear_all").map((i) => i.key);
    expect(clearAll.length).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { ZONES } from "../features/zones/data.js";
import {
  formatDropWeight,
  zoneInfoCategories,
  boardKindLabels,
  upgradeTargetLabel,
} from "../features/zones/zoneInfoFormat.js";

describe("zoneInfoFormat", () => {
  it("formats drop weights as whole-number percents", () => {
    expect(formatDropWeight(0.38)).toBe("38%");
    expect(formatDropWeight(0)).toBe("—");
    expect(formatDropWeight(undefined)).toBe("—");
  });

  it("lists farm board kinds for home", () => {
    expect(boardKindLabels(ZONES.home)).toEqual(["Farm"]);
  });

  it("includes season-drop categories for temperate farm zones", () => {
    const cats = zoneInfoCategories(ZONES.home);
    expect(cats).toContain("grass");
    expect(cats).toContain("grain");
  });

  it("labels gold upgrade targets", () => {
    expect(upgradeTargetLabel("gold")).toBe("Gold tile (board)");
  });
});

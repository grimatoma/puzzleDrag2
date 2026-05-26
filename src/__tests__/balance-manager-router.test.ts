import { describe, it, expect } from "vitest";
import { parseHash, buildHash } from "../balanceManager/router.js";

const TAB_IDS = [
  "tiles", "zones", "resources", "recipes", "buildings", "workers", "icons", "export",
];

describe("balanceManager.router.parseHash", () => {
  it("returns null for an empty hash", () => {
    expect(parseHash("", TAB_IDS)).toEqual({ tab: null, focus: null });
    expect(parseHash("#", TAB_IDS)).toEqual({ tab: null, focus: null });
    expect(parseHash("#/", TAB_IDS)).toEqual({ tab: null, focus: null });
  });

  it("parses a known tab id", () => {
    expect(parseHash("#/recipes", TAB_IDS)).toEqual({ tab: "recipes", focus: null });
    expect(parseHash("#/zones", TAB_IDS)).toEqual({ tab: "zones", focus: null });
  });

  it("returns null for unknown tabs", () => {
    expect(parseHash("#/notARealTab", TAB_IDS)).toEqual({ tab: null, focus: null });
  });

  it("parses an optional focus segment after the tab", () => {
    expect(parseHash("#/recipes/bread", TAB_IDS)).toEqual({ tab: "recipes", focus: "bread" });
  });

  it("decodes percent-encoded segments", () => {
    expect(parseHash("#/" + encodeURIComponent("recipes"), TAB_IDS)).toEqual({ tab: "recipes", focus: null });
    expect(parseHash("#/recipes/" + encodeURIComponent("rec_bread"), TAB_IDS)).toEqual({
      tab: "recipes", focus: "rec_bread",
    });
  });

  it("returns null when validTabs is missing or empty", () => {
    expect(parseHash("#/recipes", [])).toEqual({ tab: null, focus: null });
    expect(parseHash("#/recipes", undefined)).toEqual({ tab: null, focus: null });
  });
});

describe("balanceManager.router.buildHash", () => {
  it("emits the default for a missing tab", () => {
    expect(buildHash({})).toBe("#/");
    expect(buildHash({ tab: null })).toBe("#/");
  });

  it("encodes the tab segment", () => {
    expect(buildHash({ tab: "recipes" })).toBe("#/recipes");
    expect(buildHash({ tab: "zones" })).toBe("#/zones");
  });

  it("round-trips with parseHash for every supported tab", () => {
    for (const tab of TAB_IDS) {
      expect(parseHash(buildHash({ tab }), TAB_IDS)).toEqual({ tab, focus: null });
    }
  });

  it("round-trips tab + focus", () => {
    const route = { tab: "recipes", focus: "rec_bread" };
    expect(parseHash(buildHash(route), TAB_IDS)).toEqual(route);
    expect(buildHash(route)).toBe("#/recipes/rec_bread");
  });
});

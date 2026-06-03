import { describe, it, expect } from "vitest";
import { parseHash, initialWikiRoute } from "./router.js";
import { NARRATIVE_PAGES } from "./wiki/wikiNav.js";

const VALID = ["tiles", "resources", "page"];

describe("initialWikiRoute — wiki landing default", () => {
  it("lands on the Overview narrative page for an empty hash (the `/b/` front door)", () => {
    const landing = initialWikiRoute(parseHash("", VALID));
    expect(landing).toEqual({ tab: "page", focus: "overview" });
  });

  it("lands on Overview for an unknown/garbage hash", () => {
    expect(initialWikiRoute(parseHash("#/not-a-real-tab", VALID))).toEqual({ tab: "page", focus: "overview" });
    expect(initialWikiRoute(parseHash("#garbage", VALID))).toEqual({ tab: "page", focus: "overview" });
  });

  it("passes a valid concept hash through unchanged", () => {
    expect(initialWikiRoute(parseHash("#/resources", VALID))).toEqual({ tab: "resources", focus: null });
    expect(initialWikiRoute(parseHash("#/resources/bread", VALID))).toEqual({ tab: "resources", focus: "bread" });
  });

  it("honours an explicit narrative page focus", () => {
    expect(initialWikiRoute(parseHash("#/page/story", VALID))).toEqual({ tab: "page", focus: "story" });
  });

  it("'overview' is a real narrative page slug (the default can't dangle)", () => {
    expect(NARRATIVE_PAGES.some((p) => p.slug === "overview")).toBe(true);
  });
});

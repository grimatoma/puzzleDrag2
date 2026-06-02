// Pin the Dev Panel hash-router grammar for wiki routes.
// These tests document the contract that the wiki shell (and any future
// wiki tab/focus navigation) depends on.  They must pass against the
// EXISTING router with NO code change to router.ts.

import { describe, it, expect } from "vitest";
import { parseHash, buildHash } from "../router.js";

const VALID = ["recipes", "buildings", "zones", "page", "icons", "animationsDemo"] as const;

describe("Dev Panel router – wiki hash grammar", () => {
  it("1. category route: #/<tab> parses to { tab, focus: null }", () => {
    expect(parseHash("#/recipes", VALID)).toEqual({ tab: "recipes", focus: null });
  });

  it("2. article route: #/<tab>/<focus> preserves the colon in the focus segment", () => {
    // The focus value arrives un-encoded in the literal hash string here.
    // parseHash decodes each segment with decodeURIComponent; ':' is not
    // percent-encoded in this input so it passes through unchanged.
    expect(parseHash("#/recipes/recipes:rec_bread", VALID)).toEqual({
      tab: "recipes",
      focus: "recipes:rec_bread",
    });
  });

  it("3. narrative page route: #/page/<slug> parses correctly", () => {
    expect(parseHash("#/page/overview", VALID)).toEqual({ tab: "page", focus: "overview" });
  });

  it("4. unknown tab: returns { tab: null, focus: null }", () => {
    expect(parseHash("#/bogus", VALID)).toEqual({ tab: null, focus: null });
  });

  it("5. round-trip: buildHash → parseHash preserves focus containing a colon", () => {
    // buildHash encodes ':' as '%3A'; parseHash decodes it back.
    const hash = buildHash({ tab: "recipes", focus: "recipes:rec_bread" });
    expect(parseHash(hash, VALID)).toEqual({ tab: "recipes", focus: "recipes:rec_bread" });
  });

  it("6a. empty string: returns { tab: null, focus: null }", () => {
    expect(parseHash("", VALID)).toEqual({ tab: null, focus: null });
  });

  it("6b. bare '#/' hash: returns { tab: null, focus: null }", () => {
    expect(parseHash("#/", VALID)).toEqual({ tab: null, focus: null });
  });
});

import { describe, it, expect } from "vitest";
import { SEASONAL_MANIFEST } from "virtual:seasonal-subjects";

// Half-state guard: a subject that ships ANY season-transition clip must also
// ship all four season idles. Otherwise the engine plays a real transition
// animation and then snaps back to the Summer idle for the seasons whose idle
// is missing — a visibly inconsistent half-generated state.
//
// This invariant flagged `tile_veg_eggplant` and `tile_grass_meadow`, which
// shipped `idle-summer.png` + the 3 `trans-*.png` but none of the spring/
// autumn/winter idles. Resolving them (strip the transitions back to the
// summer-only baseline, or complete the idles) makes this pass.
const ALL_IDLES = ["idle-spring.png", "idle-summer.png", "idle-autumn.png", "idle-winter.png"];

describe("Seasonal subjects never ship transitions without all four idles", () => {
  it("has at least the known complete subjects in the manifest", () => {
    // Sanity: the manifest resolved and is non-trivial.
    expect(Object.keys(SEASONAL_MANIFEST).length).toBeGreaterThan(0);
  });

  for (const [key, files] of Object.entries(SEASONAL_MANIFEST)) {
    const hasTransition = files.some((f) => f.startsWith("trans-"));
    if (!hasTransition) continue;
    it(`${key} ships all four idles because it has transitions`, () => {
      const missing = ALL_IDLES.filter((idle) => !files.includes(idle));
      expect(missing).toEqual([]);
    });
  }
});

// L2 — Season dressings (the four "dressings" applied on top of every category).
//
// Identity (silhouette, pad, footprint, position) stays constant across the year;
// ONLY the fields below change. These are carried IN FULL into every season edit so
// each API call gets the complete season spec, not a one-word hint — the thin
// one-liner deltas were a primary cause of generation drift.
//
// Source of truth: reference/docs/seasonal-tile-system/index.html  -> #roadmap-seasons (the
// 4-dressing table) and #layers (L2 season defs).

export const SEASONS = {
  spring: {
    light: "soft, cool, bright early-spring light",
    pad: "the round ground pad is fresh new spring-green grass with a little dew",
    palette: "a fresh, lightly-desaturated pastel palette",
    overlays: "a few tiny blossoms and pale petals resting on the pad's grass, inside its outline (none on the margin)",
  },
  summer: {
    light: "warm midday light",
    pad: "the round ground pad is lush, deep-green grass",
    palette: "the richest, most saturated palette of the year (the style anchor)",
    overlays: "no fallen debris — everything at peak health",
  },
  autumn: {
    light: "low, warm, golden late-afternoon light",
    pad: "the round ground pad is amber-tan grass",
    palette: "a gold, orange and rust palette",
    overlays: "the first few fallen leaves resting on the pad, inside its outline (none on the margin)",
  },
  winter: {
    light: "pale, cool, blue-shadowed winter light",
    pad: "clean white snow covering the round pad, keeping the pad's exact same outline (no snow spreading onto the transparent margin)",
    palette: "a desaturated, cool palette with soft blue shadows",
    overlays: "frost and little caps of snow on the pad",
  },
};

// Forward order of the year. A farming run ends at winter — there is no winter->spring
// transition.
export const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];

/** One compact sentence describing a season's ground+light+palette, for an edit prompt. */
export function seasonDressing(season) {
  const s = SEASONS[season];
  return `${s.pad}; ${s.overlays}; ${s.light}; ${s.palette}`;
}

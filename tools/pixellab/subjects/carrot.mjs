// Carrot — PRODUCE/vegetable (ripeness arc, footprint constant). THIN config; prompts
// composed from the `produce-veg` playbook. Roadmap summer base: "a single large orange
// carrot with a leafy green top".
export default {
  subject: "carrot",
  tileKey: "tile_veg_carrot", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,

  // Slanted on purpose: a carrot's long tapered form fights an upright pose in a square
  // tile, so it lies on the tile's diagonal (tip lower-left, feathery top upper-right) —
  // bigger, more detailed, and reads like a harvested carrot at rest. The slant is part
  // of the identity and is locked across every season edit (same rotation/footprint).
  identity:
    "a single large bright-orange carrot with a feathery green leafy top, lying at a natural diagonal slant across the pad (the pointed tip toward the lower-left and the feathery green top toward the upper-right), scaled to fill the tile on its diagonal",

  overrides: {
    item: "slanted carrot",
    springAccent: "small pale blossom",
  },

  paletteLock:
    "keep the carrot bright orange with a green leafy top — ripeness shows in surface and shade, not a hue change",

  // Snow transitions overshoot to a white burst; a fixed seed + the gentler autumn->winter
  // text tames it. Idle spring/winter are packed STATIC (cool-season idles bloom white).
  seeds: { "autumn-winter": 11 },
};

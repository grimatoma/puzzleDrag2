// Tile keys whose hand-drawn VECTOR seasonal art (per-season draw + idle anim +
// forward season transitions) takes precedence over any baked PNG anchor of the
// same key. These are the all-vector showcase tiles.
//
// Standalone with NO imports so both the vector registry (`seasonalTiles.ts`) and
// the baked-art manifest (`seasonalArt.ts`) can read it without an import cycle.
// The baked controller filters these keys out of its manifest, so their
// summer-anchor PNGs are simply ignored at runtime — the files stay on disk
// (intentional, for an A/B against the pixel route) but never render.
export const VECTOR_PREFER_KEYS: ReadonlySet<string> = new Set<string>([
  // pilot trio
  "tile_tree_oak",
  "tile_flower_pansy",
  "tile_fruit_apple",
  // ten-tile expansion (grain · fruit · veg · flower · tree · livestock)
  "tile_grain_corn",
  "tile_fruit_pear",
  "tile_fruit_lemon",
  "tile_veg_pepper",
  "tile_veg_mushroom",
  "tile_veg_beet",
  "tile_flower_heather",
  "tile_flower_water_lily",
  "tile_tree_birch",
  "tile_herd_sheep",
]);

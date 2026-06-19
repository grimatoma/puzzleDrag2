// Tile keys whose hand-drawn VECTOR seasonal art (per-season draw + idle anim +
// forward season transitions) takes precedence over any baked PNG anchor of the
// same key. These are the all-vector showcase tiles (oak / pansy / apple).
//
// Standalone with NO imports so both the vector registry (`seasonalTiles.ts`) and
// the baked-art manifest (`seasonalArt.ts`) can read it without an import cycle.
// The baked controller filters these keys out of its manifest, so their
// summer-anchor PNGs are simply ignored at runtime — the files stay on disk
// (intentional, for an A/B against the pixel route) but never render.
export const VECTOR_PREFER_KEYS: ReadonlySet<string> = new Set<string>([
  "tile_tree_oak",
  "tile_flower_pansy",
  "tile_fruit_apple",
]);

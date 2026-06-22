// Birch — DECIDUOUS TREE. THIN config: identity + locks + the per-subject overrides
// that tune the shared `tree-deciduous` playbook. Every per-state prompt (summer
// generate, each season edit, each transition, each idle) is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ — run `… prompts` to dump the full set
// to reference/docs/seasonal-tile-system/prompts/birch.md for review.
//
// Generated and shipped at 128px (no decimate — the set is 128 going forward).
export default {
  subject: "birch",
  tileKey: "tile_tree_birch", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-deciduous",
  size: 128,

  // One-line identity for the generated Summer anchor (style = the two canonical anchors).
  identity:
    "a slender upright birch tree with a light, airy, delicate green canopy and a slim white black-flecked trunk",

  // Tune the deciduous playbook for the birch.
  overrides: {
    foliage: "light airy canopy",
    autumnColor: "brilliant golden yellow",
    springAccent: "tiny white and pale-pink blossom flecks",
    trunkNote: "slim white black-flecked",
    branchNote: "slender pale birch",
    idleChar: "a fine birch-leaf shimmer and flutter with the trunk dead-anchored, not a heavy sway",
  },

  // The white birch trunk is the thing the season light most wants to wrongly tint.
  paletteLock: "the trunk stays white with fine black flecks — never tint it gold, grey or blue",

  // Glow/overshoot on the autumn->bare-mound shed was clean at this seed on the willow.
  seeds: { "autumn-baremound": 42 },
};

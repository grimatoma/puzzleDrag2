// Willow — DECIDUOUS TREE. VALIDATED + shipped (PR #1161); kept as a thin config so the
// composer is proven to reproduce the prompts that already work. Summer anchor exists,
// so this won't regenerate — `… prompts` dumps the composed edit/transition/idle set to
// compare against the shipped willow prompts in the design doc.
export default {
  subject: "willow",
  tileKey: "tile_tree_willow", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-deciduous",
  size: 128,
  summer: { existing: "docs/seasonal-tile-system/assets/willow-summer.png" },

  identity:
    "a willow tree with a very full, dense, leafy weeping canopy and a short sturdy brown trunk",

  overrides: {
    foliage: "full dense weeping canopy",
    autumnColor: "gold and amber",
    springAccent: "pink and white blossom flecks",
    trunkNote: "short sturdy brown",
    branchNote: "slender drooping brown",
    idleChar: "the long drooping fronds sway pendulously, more than the trunk",
  },

  paletteLock: "the short brown trunk stays anchored and unchanged",
  seeds: { "autumn-baremound": 42 },
};

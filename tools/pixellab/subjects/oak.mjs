// oak — tree-deciduous. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "oak",
  tileKey: "tile_tree_oak", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-deciduous",
  size: 128,
  identity:
    "a broad oak tree with a rounded dense leafy canopy and a thick sturdy brown trunk",

  overrides: {
    "foliage": "rounded dense canopy",
    "autumnColor": "deep orange and russet",
    "springAccent": "pale green-gold catkin flecks",
    "trunkNote": "thick sturdy brown",
    "branchNote": "thick brown",
    "idleChar": "a broad heavy canopy sway, the trunk dead-anchored"
  },

  paletteLock: "the thick brown trunk stays anchored and unchanged",

  seeds: {"autumn-baremound":42},
};

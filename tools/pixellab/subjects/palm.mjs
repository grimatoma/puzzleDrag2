// palm — tree-evergreen. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "palm",
  tileKey: "tile_tree_palm", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-evergreen",
  size: 128,
  identity:
    "a palm tree with a curved slender trunk and a crown of long arching green fronds",

  overrides: {
    "idleChar": "the long fronds dip and sway and settle"
  },
};

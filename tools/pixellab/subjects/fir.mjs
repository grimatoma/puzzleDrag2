// fir — tree-evergreen. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "fir",
  tileKey: "tile_tree_fir", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-evergreen",
  size: 128,
  identity:
    "a tall conical fir tree with layered dark-green needled boughs and a straight trunk",

  overrides: {
    "idleChar": "a slow bough dip and settle"
  },
};

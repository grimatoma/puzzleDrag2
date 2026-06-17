// cypress — tree-evergreen. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "cypress",
  tileKey: "tile_tree_cypress", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "tree-evergreen",
  size: 128,
  identity:
    "a tall narrow cypress, a dense columnar spire of dark-green foliage on a straight trunk",

  overrides: {
    "idleChar": "a slight columnar sway and settle"
  },
};

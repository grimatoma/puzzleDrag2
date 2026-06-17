// pansy — flower. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pansy",
  tileKey: "tile_flower_pansy", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "flower",
  size: 128,
  identity:
    "a small cluster of purple-and-yellow pansy blooms with green foliage",

  overrides: {},
};

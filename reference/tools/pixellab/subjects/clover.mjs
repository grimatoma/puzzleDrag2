// clover — grass. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "clover",
  tileKey: "tile_bird_clover", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grass",
  size: 128,
  identity:
    "a small sprig of lucky bright-green four-leaf clover",

  overrides: {},
};

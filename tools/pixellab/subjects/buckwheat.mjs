// buckwheat — grain. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "buckwheat",
  tileKey: "tile_grain_buckwheat", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grain",
  size: 128,
  identity:
    "a cluster of slender buckwheat stalks topped with small white flower heads",

  overrides: {},
};

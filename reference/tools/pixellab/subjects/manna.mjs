// manna — grain. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "manna",
  tileKey: "tile_grain_manna", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grain",
  size: 128,
  identity:
    "a stand of pale wispy manna grass with soft feathery seed plumes",

  overrides: {},
};

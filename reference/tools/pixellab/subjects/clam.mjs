// clam — aquatic. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "clam",
  tileKey: "tile_fish_clam", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "aquatic",
  size: 128,
  identity:
    "a ridged tan clam shell, slightly open",

  overrides: {},

  paletteLock: "keep the clam shell tan",
};

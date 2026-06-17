// alpaca — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "alpaca",
  tileKey: "tile_herd_alpaca", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a fluffy tan alpaca with a long neck, standing",

  overrides: {
    "coat": "a thicker fleece"
  },

  paletteLock: "keep the alpaca tan",
};

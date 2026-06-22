// lemon — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "lemon",
  tileKey: "tile_fruit_lemon", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single bright-yellow lemon with a small green leaf",

  overrides: {
    "item": "lemon"
  },

  paletteLock: "keep the lemon bright yellow",
};

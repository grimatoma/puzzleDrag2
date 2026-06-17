// apple — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "apple",
  tileKey: "tile_fruit_apple", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single round red apple with a small green leaf and a short stem",

  overrides: {
    "item": "apple"
  },

  paletteLock: "keep the apple red with a green leaf",
};

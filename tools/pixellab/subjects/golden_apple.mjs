// golden_apple — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "golden_apple",
  tileKey: "tile_fruit_golden_apple", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single radiant golden apple with a gold-tinted leaf",

  overrides: {
    "item": "golden apple"
  },

  paletteLock: "keep the apple a rich metallic gold",
};

// pepper — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pepper",
  tileKey: "tile_veg_pepper", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single glossy red bell pepper with a green stem",

  overrides: {
    "item": "bell pepper"
  },

  paletteLock: "keep the pepper glossy red with a green stem",
};

// cucumber — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "cucumber",
  tileKey: "tile_veg_cucumber", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single long green ridged cucumber",

  overrides: {
    "item": "cucumber"
  },

  paletteLock: "keep the cucumber green",
};

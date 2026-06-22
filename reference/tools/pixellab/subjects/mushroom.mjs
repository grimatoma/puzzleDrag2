// mushroom — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "mushroom",
  tileKey: "tile_veg_mushroom", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single large red-capped white-spotted mushroom with a pale stem",

  overrides: {
    "item": "mushroom"
  },

  paletteLock: "keep the cap red with white spots and the stem pale",
};

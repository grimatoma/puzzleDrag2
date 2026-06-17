// melon — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "melon",
  tileKey: "tile_bird_melon", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single round green-striped watermelon",

  overrides: {
    "item": "watermelon"
  },

  paletteLock: "keep the watermelon green-striped",
};

// beet — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "beet",
  tileKey: "tile_veg_beet", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single deep-red beet with crinkled red-veined green leaves",

  overrides: {
    "item": "beet"
  },

  paletteLock: "keep the beet deep red with red-veined greens",
};

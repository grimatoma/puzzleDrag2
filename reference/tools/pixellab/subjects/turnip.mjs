// turnip — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "turnip",
  tileKey: "tile_veg_turnip", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single round white-and-purple turnip with a tuft of leafy green tops",

  overrides: {
    "item": "turnip"
  },

  paletteLock: "keep the turnip white and purple — ripeness shows in surface and shade, not hue",
};

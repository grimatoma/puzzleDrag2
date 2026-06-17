// squash — produce-veg. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "squash",
  tileKey: "tile_veg_squash", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  identity:
    "a single plump ribbed yellow squash",

  overrides: {
    "item": "squash"
  },

  paletteLock: "keep the squash yellow",
};

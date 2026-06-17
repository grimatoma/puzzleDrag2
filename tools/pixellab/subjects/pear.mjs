// pear — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pear",
  tileKey: "tile_fruit_pear", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single green-gold pear with a short stem and a leaf",

  overrides: {
    "item": "pear"
  },

  paletteLock: "keep the pear green-gold",
};

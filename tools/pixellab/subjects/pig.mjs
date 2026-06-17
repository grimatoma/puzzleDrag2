// pig — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pig",
  tileKey: "tile_herd_pig", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a plump pink pig standing",

  overrides: {
    "coat": "a slightly bristlier coat"
  },

  paletteLock: "keep the pig pink",
};

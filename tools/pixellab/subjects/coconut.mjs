// coconut — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "coconut",
  tileKey: "tile_fruit_coconut", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single brown husked coconut",

  overrides: {
    "item": "coconut"
  },

  paletteLock: "keep the coconut brown and husked",
};

// blackberry — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "blackberry",
  tileKey: "tile_fruit_blackberry", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a cluster of dark glossy blackberries on a thorny green sprig",

  overrides: {
    "item": "blackberry cluster"
  },

  paletteLock: "keep the berries dark glossy purple-black",
};

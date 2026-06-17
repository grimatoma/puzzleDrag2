// water_lily — flower. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "water_lily",
  tileKey: "tile_flower_water_lily", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "flower",
  size: 128,
  identity:
    "a pink water-lily blossom resting among flat green lily pads",

  overrides: {},
};

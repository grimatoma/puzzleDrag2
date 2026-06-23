// pig_in_disguise — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pig_in_disguise",
  tileKey: "tile_bird_pig_in_disguise", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a pink pig wearing a feathered bird costume and a beak mask, standing",

  overrides: {},

  paletteLock: "keep the pig pink and its feather costume as drawn",
};

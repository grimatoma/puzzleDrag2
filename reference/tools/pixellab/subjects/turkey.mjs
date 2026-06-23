// turkey — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "turkey",
  tileKey: "tile_bird_turkey", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a brown turkey with a fanned tail and a red wattle, standing",

  overrides: {},

  paletteLock: "keep the turkey brown with a red wattle",
};

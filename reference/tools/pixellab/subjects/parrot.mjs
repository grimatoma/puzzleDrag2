// parrot — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "parrot",
  tileKey: "tile_bird_parrot", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a bright red-and-green parrot with a hooked beak, perched",

  overrides: {},

  paletteLock: "keep the parrot vivid red and green",
};

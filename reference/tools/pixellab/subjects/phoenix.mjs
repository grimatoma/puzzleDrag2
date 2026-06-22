// phoenix — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "phoenix",
  tileKey: "tile_bird_phoenix", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a fiery orange-and-gold phoenix with flame-tipped tail feathers, standing",

  overrides: {},

  paletteLock: "keep the phoenix fiery orange and gold",
};

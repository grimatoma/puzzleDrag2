// dodo — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "dodo",
  tileKey: "tile_bird_dodo", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a round grey-brown dodo with a big hooked beak and tiny wings, standing",

  overrides: {},

  paletteLock: "keep the dodo grey-brown",
};

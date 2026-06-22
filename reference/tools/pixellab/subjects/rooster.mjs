// rooster — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "rooster",
  tileKey: "tile_bird_rooster", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a proud rooster with a red comb, golden-brown body and arched dark tail feathers, standing",

  overrides: {},

  paletteLock: "keep the rooster's red comb, golden-brown body and dark tail",
};

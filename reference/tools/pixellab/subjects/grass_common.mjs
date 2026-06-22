// grass_common — grass. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "grass_common",
  tileKey: "tile_grass_grass", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grass",
  size: 128,
  identity:
    "a rounded tussock of ordinary green grass blades mounding up from the pad",

  overrides: {},
};

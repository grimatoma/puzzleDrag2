// kelp — aquatic. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "kelp",
  tileKey: "tile_fish_kelp", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "aquatic",
  size: 128,
  identity:
    "a frond of green-brown kelp",

  overrides: {},

  paletteLock: "keep the kelp green-brown",
};

// mackerel — aquatic. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "mackerel",
  tileKey: "tile_fish_mackerel", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "aquatic",
  size: 128,
  identity:
    "a striped blue-green mackerel",

  overrides: {},

  paletteLock: "keep the mackerel blue-green striped",
};

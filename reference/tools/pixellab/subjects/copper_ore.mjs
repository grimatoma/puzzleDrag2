// copper_ore — mineral. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "copper_ore",
  tileKey: "tile_mine_copper_ore", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "mineral",
  size: 128,
  identity:
    "a grey rock veined with green-blue copper ore",

  overrides: {},

  paletteLock: "keep the green-blue copper veins",
};

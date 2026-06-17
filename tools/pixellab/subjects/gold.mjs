// gold — mineral. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "gold",
  tileKey: "tile_mine_gold", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "mineral",
  size: 128,
  identity:
    "a grey rock veined with bright gold",

  overrides: {},

  paletteLock: "keep the gold veins bright",
};

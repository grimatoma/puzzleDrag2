// golden_coin — special. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "golden_coin",
  tileKey: "tile_coin_golden", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "special",
  size: 128,
  identity:
    "a single bright gold coin standing on edge",

  overrides: {},

  paletteLock: "keep the coin bright gold",
};

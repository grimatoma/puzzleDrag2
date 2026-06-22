// gem — mineral. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "gem",
  tileKey: "tile_mine_gem", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "mineral",
  size: 128,
  identity:
    "a faceted bright-blue gem set in grey rock",

  overrides: {},

  paletteLock: "keep the gem bright blue",
};

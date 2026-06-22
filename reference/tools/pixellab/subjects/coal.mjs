// coal — mineral. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "coal",
  tileKey: "tile_mine_coal", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "mineral",
  size: 128,
  identity:
    "a chunk of black glossy coal",

  overrides: {},

  paletteLock: "keep the coal black and glossy",
};

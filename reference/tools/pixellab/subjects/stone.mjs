// stone — mineral. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "stone",
  tileKey: "tile_mine_stone", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "mineral",
  size: 128,
  identity:
    "a rough grey stone boulder",

  overrides: {},

  paletteLock: "keep the stone grey",
};

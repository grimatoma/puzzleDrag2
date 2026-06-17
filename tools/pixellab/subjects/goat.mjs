// goat — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "goat",
  tileKey: "tile_herd_goat", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a white-and-brown goat with small horns, standing",

  overrides: {},

  paletteLock: "keep the goat white and brown",
};

// warthog — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "warthog",
  tileKey: "tile_herd_warthog", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a grey warthog with facial warts and upward-curving tusks, standing",

  overrides: {},

  paletteLock: "keep the warthog grey",
};

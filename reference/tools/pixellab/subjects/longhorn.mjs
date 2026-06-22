// longhorn — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "longhorn",
  tileKey: "tile_cattle_longhorn", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a tan longhorn steer with very wide horns, standing",

  overrides: {},

  paletteLock: "keep the longhorn tan with wide horns",
};

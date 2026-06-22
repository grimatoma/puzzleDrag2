// wheat — grain. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "wheat",
  tileKey: "tile_grain_wheat", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grain",
  size: 128,
  identity:
    "a sheaf of tall golden wheat stalks with bearded seed heads",

  overrides: {},
};

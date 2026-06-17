// rice — grain. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "rice",
  tileKey: "tile_grain_rice", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grain",
  size: 128,
  identity:
    "a clump of green rice stalks with drooping golden grain heads",

  overrides: {},
};

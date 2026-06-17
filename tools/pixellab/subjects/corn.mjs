// corn — grain. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "corn",
  tileKey: "tile_grain_corn", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grain",
  size: 128,
  identity:
    "a pair of tall green corn stalks with broad leaves and a ripe yellow cob",

  overrides: {},
};

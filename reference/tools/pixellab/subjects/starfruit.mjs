// starfruit — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "starfruit",
  tileKey: "tile_fruit_starfruit", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single ridged yellow starfruit with one cross-cut star slice showing",

  overrides: {
    "item": "starfruit"
  },

  paletteLock: "keep the starfruit yellow",
};

// spiky_grass — grass. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "spiky_grass",
  tileKey: "tile_grass_spiky", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grass",
  size: 128,
  identity:
    "a clump of stiff upright spiky blue-green grass blades",

  overrides: {},
};

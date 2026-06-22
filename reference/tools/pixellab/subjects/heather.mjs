// heather — grass. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "heather",
  tileKey: "tile_grass_heather", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "grass",
  size: 128,
  identity:
    "a low spreading mound of heather studded with tiny purple flower spikes",

  overrides: {},
};

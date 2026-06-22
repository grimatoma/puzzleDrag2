// dirt — special. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "dirt",
  tileKey: "tile_special_dirt", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "special",
  size: 128,
  identity:
    "a low mound of dark fertile tilled soil",

  overrides: {},
};

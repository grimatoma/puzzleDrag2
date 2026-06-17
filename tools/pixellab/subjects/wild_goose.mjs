// wild_goose — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "wild_goose",
  tileKey: "tile_bird_wild_goose", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a grey-brown wild goose with a black neck, standing",

  overrides: {},

  paletteLock: "keep the goose grey-brown with a black neck",
};

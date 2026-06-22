// goose — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "goose",
  tileKey: "tile_bird_goose", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a plump white domestic goose with an orange bill, standing",

  overrides: {},

  paletteLock: "keep the goose white with an orange bill — never tint the bird",
};

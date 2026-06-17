// horse — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "horse",
  tileKey: "tile_mount_horse", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a brown horse with a flowing dark mane and tail, standing",

  overrides: {},

  paletteLock: "keep the horse brown with a dark mane",
};

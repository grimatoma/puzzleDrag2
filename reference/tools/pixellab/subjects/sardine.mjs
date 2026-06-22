// sardine — aquatic. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "sardine",
  tileKey: "tile_fish_sardine", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "aquatic",
  size: 128,
  identity:
    "a small silvery sardine",

  overrides: {},

  paletteLock: "keep the sardine silver",
};

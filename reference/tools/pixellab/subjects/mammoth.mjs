// mammoth — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "mammoth",
  tileKey: "tile_mount_mammoth", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a shaggy brown woolly mammoth with long curved tusks, standing",

  overrides: {
    "coat": "an even shaggier coat"
  },

  paletteLock: "keep the mammoth shaggy brown",
};

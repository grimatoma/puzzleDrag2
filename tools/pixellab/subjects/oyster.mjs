// oyster — aquatic. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "oyster",
  tileKey: "tile_fish_oyster", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "aquatic",
  size: 128,
  identity:
    "a rough grey oyster shell open with a pale pearl glimpsed inside",

  overrides: {},

  paletteLock: "keep the oyster grey with a pale pearl",
};

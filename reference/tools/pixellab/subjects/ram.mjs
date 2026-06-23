// ram — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "ram",
  tileKey: "tile_herd_ram", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a sturdy woolly ram with thick curled horns, standing",

  overrides: {
    "coat": "a thicker fleece"
  },

  paletteLock: "keep the ram's wool and curled horns",
};

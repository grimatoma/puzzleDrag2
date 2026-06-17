// triceratops — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "triceratops",
  tileKey: "tile_cattle_triceratops", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a green triceratops with three horns and a bony neck frill, standing",

  overrides: {},

  paletteLock: "keep the triceratops green",
};

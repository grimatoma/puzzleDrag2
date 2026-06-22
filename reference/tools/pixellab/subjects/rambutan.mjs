// rambutan — produce-fruit. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "rambutan",
  tileKey: "tile_fruit_rambutan", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-fruit",
  size: 128,
  identity:
    "a single red rambutan covered in soft hairy spines",

  overrides: {
    "item": "rambutan"
  },

  paletteLock: "keep the rambutan red with soft spines",
};

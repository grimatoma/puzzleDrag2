// pheasant — bird. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "pheasant",
  tileKey: "tile_bird_pheasant", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "bird",
  size: 128,
  identity:
    "a plump long-tailed pheasant with coppery-brown plumage and a green head, standing",

  overrides: {},

  paletteLock: "keep the pheasant's coppery-brown body and green head",
};

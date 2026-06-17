// moose — herd. THIN config; every per-state prompt is COMPOSED from the
// meta-prompt layers in tools/pixellab/prompts/ (run `run_subject.mjs … prompts` to dump
// the full set). Identity = the design-doc summer base; overrides tune the playbook.
export default {
  subject: "moose",
  tileKey: "tile_mount_moose", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "herd",
  size: 128,
  identity:
    "a large dark-brown moose with broad flat antlers, standing",

  overrides: {},

  paletteLock: "keep the moose dark brown",
};

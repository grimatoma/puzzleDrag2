// Eggplant — PRODUCE/vegetable (ripeness arc, footprint constant). VALIDATED + shipped;
// thin config for reproduction.
export default {
  subject: "eggplant",
  tileKey: "tile_veg_eggplant", // engine folder: public/seasonal-tiles/<tileKey>/
  category: "produce-veg",
  size: 128,
  summer: { existing: "docs/seasonal-tile-system/assets/eggplant-summer.png" },

  identity:
    "a single large glossy deep-purple eggplant with a green calyx top, scaled to fill the tile",

  overrides: {
    item: "eggplant",
    springAccent: "small pale blossom",
  },

  // Ripeness lives in colour/surface; the calyx and the deep-purple identity hold.
  paletteLock: "keep the green calyx green and the deep-purple identity — ripeness shows in surface and shade, not a hue change",
};

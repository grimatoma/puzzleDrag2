// Curated non-story reads of story flags. The Flags tab derives story/beat
// references directly; this map covers guards in reducers and UI that are not
// visible from the registry or beat data.
export const FLAG_READS = Object.freeze({
  festival_announced:   [{ where: "src/story.js", note: "act3_win trigger guard" }, { where: "src/ui/Hud.jsx", note: "festival larder progress HUD" }],
  isWon:                [{ where: "src/ui/Hud.jsx", note: "win banner + sandbox affordances" }],
  mine_unlocked:        [{ where: "src/state.js", note: "gates mine-only actions" }],
  frostmaw_active:      [{ where: "src/features/bosses/Gallery.jsx", note: "legacy boss gallery state" }],
});

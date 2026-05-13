// Curated non-story reads of story flags. The Flags tab derives story/beat
// references directly; this map covers guards in reducers and UI that are not
// visible from the registry or beat data.
export const FLAG_READS = Object.freeze({
  festival_announced:   [{ where: "src/story.js", note: "act3_win trigger guard" }, { where: "src/ui/Hud.jsx", note: "festival larder progress HUD" }],
  isWon:                [{ where: "src/ui/Hud.jsx", note: "win banner + sandbox affordances" }],
  mine_unlocked:        [{ where: "src/state.js", note: "gates mine-only actions" }],
  keeper_choice_made:   [{ where: "src/features/boss/slice.js", note: "post-Frostmaw audit-boss flavour" }],
  keeper_path_coexist:  [{ where: "src/features/boss/slice.js", note: "Coexist audit-boss line" }],
  keeper_path_driveout: [{ where: "src/features/boss/slice.js", note: "Drive-out audit-boss line" }],
  frostmaw_active:      [{ where: "src/features/boss/slice.js", note: "audit-boss cadence gate" }, { where: "src/features/bosses/Gallery.jsx", note: "boss gallery state" }],
});

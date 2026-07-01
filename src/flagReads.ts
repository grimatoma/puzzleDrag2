// Curated non-story reads of story flags. The Flags tab derives story/beat
// references directly; this map covers guards in reducers and UI that are not
// visible from the registry or beat data.
//
// Checklist when adding a beat flag: register the read site here, use
// canEnterBiome() for biome gates (not raw level checks), and add a test if
// the flag gates gameplay.
export const FLAG_READS = Object.freeze({
  hearth_lit:           [{ where: "src/features/npcs/dialog.ts", note: "Wren reactive town dialog gate" }],
  first_order:          [{ where: "src/features/npcs/dialog.ts", note: "Tomas reactive town dialog gate" }],
  granary_built:        [{ where: "src/features/npcs/dialog.ts", note: "Wren reactive town dialog gate" }],
  festival_announced:   [{ where: "src/story.ts", note: "act3_win trigger guard" }, { where: "src/config/progression/factSnapshot.ts", note: "surfaced as flag.festival_announced fact for beat gating" }],
  isWon:                [{ where: "src/config/progression/factSnapshot.ts", note: "surfaced as flag.isWon fact for beat/UI gating" }],
  mine_unlocked:        [{ where: "src/config/progression/factSnapshot.ts", note: "surfaced as flag.mine_unlocked fact; gates mine biome + side beats" }],
  frostmaw_active:      [{ where: "src/features/bosses/Gallery.tsx", note: "boss gallery reads flags[`${boss.id}_active`]" }],
});

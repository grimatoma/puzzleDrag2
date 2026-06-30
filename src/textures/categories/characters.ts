// Character portraits — the live, canonical art for the full cast.
//
// This module used to hold 15 bespoke canvas draws (5 named NPCs, 6 bosses, and 4
// generic worker silhouettes that all 29 worker types collapsed onto). It now
// re-exports the "Decorative Detail Vector" redesign (concept board style #20),
// which ports the board's parametric SVG system to canvas and covers the entire
// cast on its canonical keys:
//
//   • 29 `worker_<WorkerTypeId>` keys — every worker type has its own portrait
//   • 5  `char_<npc>` keys (char_mira / char_tomas / char_bram / char_liss / char_wren)
//   • 6  `boss_<id>` keys (boss_frostmaw … boss_storm)
//
// The previous-generation alternates remain registered separately under the `_v2`
// keys (see `charactersV2.ts`); only the art on these canonical keys changed.
//
// See `charactersVector.ts` for the renderer, the verbatim board generators, and
// the data rows.

export { CHARACTER_ICONS as ICONS } from "./charactersVector.js";

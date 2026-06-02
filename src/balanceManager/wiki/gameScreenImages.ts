/**
 * gameScreenImages.ts — static screenshots of named visual-testing scenarios,
 * used by the wiki to illustrate game screens without booting a live game.
 *
 * These PNGs are captured by `tools/capture-wiki-screens.mjs` (which drives the
 * same `?visual=<id>` scenarios the visual-regression suite uses) and committed
 * under `assets/game-screens/`. To refresh them after a UI change, re-run that
 * tool against a dev server and commit the updated PNGs.
 *
 * Authored wiki content references a scenario by id via
 * `<div data-game-visual="<id>">`; `HtmlBody` renders the matching image here.
 * Only scenarios that actually appear in content need an entry.
 */
import boardFarmIdle from "./assets/game-screens/board-farm-idle.png";
import boardSeasonWinterWheel from "./assets/game-screens/board-season-winter-wheel.png";
import craftingBakery from "./assets/game-screens/crafting-bakery.png";
import mapCurrentHome from "./assets/game-screens/map-current-home.png";
import townHomeBuiltOut from "./assets/game-screens/town-home-built-out.png";
import townsfolkBosses from "./assets/game-screens/townsfolk-bosses.png";

/** Scenario id → static screenshot URL (Vite-resolved). */
const GAME_SCREEN_IMAGES: Record<string, string> = {
  "board-farm-idle": boardFarmIdle,
  "board-season-winter-wheel": boardSeasonWinterWheel,
  "crafting-bakery": craftingBakery,
  "map-current-home": mapCurrentHome,
  "town-home-built-out": townHomeBuiltOut,
  "townsfolk-bosses": townsfolkBosses,
};

/** Resolved URL for a scenario's screenshot, or `undefined` if none is bundled. */
export function gameScreenImageFor(scenarioId: string): string | undefined {
  return GAME_SCREEN_IMAGES[scenarioId];
}

/** Scenario ids that have a committed screenshot. */
export const GAME_SCREEN_IMAGE_IDS = Object.keys(GAME_SCREEN_IMAGES);

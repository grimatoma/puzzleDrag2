// Dev-Panel-only concept icon batches.
//
// These 20 "concept" category modules are decorative icon art that surfaces
// ONLY in the Dev Panel's Icons tab (`src/balanceManager/tabs/IconsTab.tsx`).
// They are NOT referenced by any in-game catalog (verified against the
// icon-audit catalogs: ITEMS / RECIPES / TOOL_CATALOG / TYPE_WORKERS /
// ABILITIES / SEASONS / BOSSES / DECORATIONS / BUILDINGS costs), and the only
// dynamic-prefix key family among them, `bld_*`, is consumed exclusively by the
// wiki (`src/balanceManager/wiki/EntityVisual.tsx`), which also lives in the
// Dev Panel bundle.
//
// They are deliberately kept OUT of the always-loaded `ICON_REGISTRY` (and thus
// the `/` game bundle) so their large object-literal draw code (~17k lines of
// category source) only loads when the Dev Panel Icons tab mounts. See health
// review #10 / OPT-5.
//
// Spread order mirrors the legacy in-registry order; `archivedIcons` (legacy_*
// draws) stays last so it can never accidentally override an active key.

import type { IconRegistryDictionary } from "./iconRegistry.js";

import { ICONS as G_GEMS } from "./categories/gems.js";
import { ICONS as G_WEATHER } from "./categories/weather.js";
import { ICONS as G_DISHES } from "./categories/dishes.js";
import { ICONS as G_REEF } from "./categories/reef.js";
import { ICONS as G_CRITTERS } from "./categories/critters.js";
import { ICONS as G_ARCANE } from "./categories/arcane.js";
// NOTE: `cozyDecor` and `nature` are deliberately NOT here — they are real
// in-game draws (consumed by `src/ui/town/tiles/manifest.ts` for town props),
// so they stay in the base ICON_REGISTRY.
import { ICONS as G_CELESTIAL } from "./categories/celestial.js";
import { ICONS as G_ORES } from "./categories/ores.js";
import { ICONS as G_PETS } from "./categories/pets.js";
import { ICONS as G_TREASURE } from "./categories/treasure.js";
import { ICONS as G_DRINKS } from "./categories/drinks.js";
import { ICONS as G_FURNITURE } from "./categories/furniture.js";
import { ICONS as G_INSTRUMENTS } from "./categories/instruments.js";
import { ICONS as G_FESTIVE } from "./categories/festive.js";
import { ICONS as G_CROPS } from "./categories/crops.js";
import { ICONS as G_WORKSHOP_TOOLS } from "./categories/workshopTools.js";
import { ICONS as G_WEAPONS } from "./categories/weapons.js";
import { ICONS as G_SPELLS } from "./categories/spells.js";
import { ICONS as G_BUILDINGS } from "./categories/buildings.js";
import { ICONS as G_ARCHIVED } from "./categories/archivedIcons.js";

/** Concept-only icon draws, merged for the Dev Panel Icons tab. */
export const CONCEPT_ICON_BATCHES: Readonly<IconRegistryDictionary> = Object.freeze({
  ...G_GEMS,
  ...G_WEATHER,
  ...G_DISHES,
  ...G_REEF,
  ...G_CRITTERS,
  ...G_ARCANE,
  ...G_CELESTIAL,
  ...G_ORES,
  ...G_PETS,
  ...G_TREASURE,
  ...G_DRINKS,
  ...G_FURNITURE,
  ...G_INSTRUMENTS,
  ...G_FESTIVE,
  ...G_CROPS,
  ...G_WORKSHOP_TOOLS,
  ...G_WEAPONS,
  ...G_SPELLS,
  ...G_BUILDINGS,
  // Archived legacy draws (`legacy_<key>`) — render in the Icons tab, never
  // used in-game. Last so they can never override an active key.
  ...G_ARCHIVED,
});

/** Stable set of concept-only icon keys (used for Dev Panel usage badging). */
export const CONCEPT_ICON_KEYS: ReadonlySet<string> = new Set(Object.keys(CONCEPT_ICON_BATCHES));

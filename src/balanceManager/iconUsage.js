// Icon usage index — "which icons are actually wired into the game?"
//
// Mirrors `itemReferences.js` in spirit: walks the static data catalogs that
// reference icon keys (resource items, recipes, abilities, workers, seasons,
// tool catalog, etc.) and produces a `Set<iconKey>` of every key the game
// actually uses. The Balance Manager's Icons tab cross-references this set
// against the icon registries to badge "unused" entries.
//
// Covers both the canvas registry (`src/textures/iconRegistry.js`) and the
// SVG registry (`src/ui/icons/index.jsx`) since both can be unused.

import { ITEMS, RECIPES, BUILDINGS, SEASONS } from "../constants.js";
import { ABILITIES } from "../config/abilities.js";
import { TYPE_WORKERS } from "../features/workers/data.js";
import { TOOL_CATALOG } from "../ui/toolRegistry.js";
import { BOSSES } from "../features/bosses/data.js";
import { DECORATIONS } from "../features/decorations/data.js";

// Hard-coded list of icon keys referenced by JSX literals (e.g. ui_lock in
// Town.jsx:362), rich-text placeholders (e.g. [icon:ui_star] in NPC bubbles),
// and other spots that don't appear in the structured data above. Update
// this list when adding a new always-used UI/rich-text icon — otherwise it
// would show as "Unused" in the Icons tab even though the game references it.
const HARDCODED_USAGE = [
  // Town.jsx, Modals.jsx, HUD chips — explicit JSX iconKey literals.
  "ui_lock", "ui_enter", "ui_cancel", "ui_build", "ui_pin", "ui_settings",
  "ui_clipboard", "ui_home", "ui_trophy", "ui_shop", "ui_inventory", "ui_map",
  "ui_people", "ui_puzzle", "ui_portal", "ui_star", "ui_warning", "ui_water",
  "ui_scale", "ui_devtools", "ui_heart", "ui_farmer",
  // RichText [icon:X] embeds in state.js / story.js / feature slices.
  "ui_build", "ui_star", "ui_warning",
  "berry", "fish_pearl", "grass_hay",
];

/**
 * Build the set of icon keys the game uses today, scanning every catalog
 * that references one. Returns `Set<string>` keyed by icon key.
 *
 * The returned set treats the two registries (canvas + SVG) as one address
 * space: a `design.tile.grass` key and a canvas `grass_hay` key both appear
 * as plain strings if referenced.
 */
export function getUsedIconKeys() {
  const used = new Set();
  const add = (key) => {
    if (typeof key === "string" && key.length > 0) used.add(key);
  };

  // Resource items — every item key in ITEMS doubles as an icon key (e.g.
  // ITEMS.grass_hay is rendered via the `grass_hay` icon).
  for (const key of Object.keys(ITEMS || {})) add(key);

  // Recipes — outputs and inputs both reference item keys, which are icons.
  for (const recipe of Object.values(RECIPES || {})) {
    if (typeof recipe?.item === "string") add(recipe.item);
    for (const inputKey of Object.keys(recipe?.inputs || {})) add(inputKey);
  }

  // Buildings — cost keys reference resource items (already in ITEMS, but
  // include for safety). Building IDs themselves are NOT icon keys today —
  // buildings render on the Town map with a `color` field, not an icon.
  for (const b of Object.values(BUILDINGS || {})) {
    for (const costKey of Object.keys(b?.cost || {})) {
      if (costKey === "coins" || costKey === "runes" || costKey === "embers" ||
          costKey === "coreIngots" || costKey === "gems") continue;
      add(costKey);
    }
  }

  // Bosses — registry uses `boss_<id>` (e.g. boss_frostmaw → BOSSES[0].id is
  // "frostmaw"). When a boss has no `boss_<id>` icon registered the game
  // shows "?", so each boss id → boss_<id> is a usage.
  for (const boss of BOSSES || []) {
    if (typeof boss?.id === "string") add(`boss_${boss.id}`);
  }

  // Decorations — registry uses `decor_<id>`.
  for (const decor of Object.values(DECORATIONS || {})) {
    if (typeof decor?.id === "string") add(`decor_${decor.id}`);
  }

  // Abilities — most carry an explicit iconKey.
  for (const ability of ABILITIES || []) add(ability?.iconKey);

  // Type-workers — farmer, lumberjack, miner, baker each carry iconKey.
  for (const worker of TYPE_WORKERS || []) add(worker?.iconKey);

  // Seasons (spring/summer/autumn/winter) — currently all share ui_star.
  for (const season of SEASONS || []) add(season?.iconKey);

  // Tool catalog — every tool has an iconKey pointing at a resource icon.
  for (const tool of TOOL_CATALOG || []) add(tool?.iconKey);

  // Hardcoded fallback list for icons referenced in JSX/rich-text only.
  for (const key of HARDCODED_USAGE) add(key);

  return used;
}

/**
 * Membership check for a single icon key. Convenience wrapper so callers
 * can be `if (isIconUsed(key))` instead of building the full set each time.
 * Internally builds the set once and caches it for the lifetime of the
 * module (the catalogs it pulls from are static at runtime).
 */
let _cachedSet = null;
export function isIconUsed(key) {
  if (_cachedSet === null) _cachedSet = getUsedIconKeys();
  return _cachedSet.has(key);
}

/** For tests only — clears the memoised set so the next call re-scans. */
export function _resetIconUsageCacheForTests() {
  _cachedSet = null;
}

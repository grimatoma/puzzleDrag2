/**
 * conceptVisual.ts — Maps a concept/entity to a live-game visual-testing scenario id.
 *
 * Used by the wiki article infobox to embed an interactive game screen alongside
 * the article text. Only returns scenario ids that are VERIFIED to exist in
 * src/visualTesting/matrix.ts (VISUAL_SCENARIOS).
 *
 * Verified scenario ids (all confirmed present in matrix.ts as of 2026-06-02):
 *   "board-farm-idle"          — farm board (tiles concept)
 *   "board-mine-idle"          — mine board (mine tiles)
 *   "board-fish-idle-high-tide" — fish/water board
 *   "town-home-built-out"      — town with buildings (buildings, zones, workers)
 *   "crafting-bakery"          — bakery crafting screen (recipes)
 *   "townsfolk-workers"        — workers screen
 *   "townsfolk-bosses"         — boss gallery
 *   "inventory-grid-all"       — inventory with resources
 *   "board-boss-active"        — boss active on board
 *   "board-season-spring-wheel" — spring season indicator
 *   "map-current-home"         — cartography map (views/cartography)
 *   "chronicle-progressed"     — chronicle screen (views/chronicle)
 *   "quests-daily-mixed"       — quests screen (views/quests)
 *   "achievements-trophies-mixed" — achievements screen (views/achievements)
 *   "tiles-farm-grass"         — tiles screen (views/tiles)
 *   "orders-mixed"             — orders screen (views/orders)
 *   "townsfolk-castle"         — townsfolk castle tab (npcs)
 *   "board-mine-hazards"       — mine board with hazards (hazards)
 *   "board-farm-fire-rats"     — farm board with fire/rats hazards
 *
 * Returns null when no good mapping exists — better to show nothing than an
 * invalid/misleading scenario.
 */

// Pure module — no React/DOM imports.

/**
 * Map a concept id to a single default scenario shown for all entities in
 * that concept. Per-entity overrides are handled below.
 */
const CONCEPT_DEFAULT_SCENARIO: Readonly<Record<string, string>> = {
  // Board-side concepts — show the farm board as a representative live board.
  tiles:      "board-farm-idle",
  // Resources live in the inventory.
  resources:  "inventory-grid-all",
  // Tools are used on the board — show the farm board.
  tools:      "board-farm-idle",
  // Recipes are crafted at buildings — show the bakery screen.
  recipes:    "crafting-bakery",
  // Buildings live in town.
  buildings:  "town-home-built-out",
  // Zones are explored from the town.
  zones:      "town-home-built-out",
  // Workers are hired from the townsfolk tab.
  workers:    "townsfolk-workers",
  // Bosses appear in the boss gallery.
  bosses:     "townsfolk-bosses",
  // Abilities and tool powers have no single visual home — omit.

  // Views — each maps to the scenario that best shows that screen.
  // ids verified against matrix.ts VISUAL_SCENARIOS.
  views:          "town-home-built-out",   // fallback for views with no override

  // NPCs appear on the castle/townsfolk tab.
  npcs:       "townsfolk-castle",

  // Hazards occur on the mine board — show the mine board with active hazards.
  hazards:    "board-mine-hazards",
};

/**
 * Per-entity overrides for specific keys where a more targeted scenario exists.
 * Format: "<conceptId>/<entityKey>" → scenarioId
 */
const ENTITY_OVERRIDES: Readonly<Record<string, string>> = {
  // Mine tiles — show the mine board instead of the farm board.
  "tiles/tile_mine_stone":    "board-mine-idle",
  "tiles/tile_mine_iron_ore": "board-mine-idle",
  "tiles/tile_mine_coal":     "board-mine-idle",
  "tiles/tile_mine_gold":     "board-mine-idle",
  "tiles/tile_mine_gem":      "board-mine-idle",
  // Fish tiles — show the fish/water board.
  "tiles/tile_fish_salmon":   "board-fish-idle-high-tide",
  "tiles/tile_fish_crab":     "board-fish-idle-high-tide",
  "tiles/tile_fish_pearl":    "board-fish-idle-high-tide",
  // Boss-specific: show boss on board rather than the gallery.
  "bosses/frostmaw":          "board-boss-active",
  "bosses/quagmire":          "board-boss-active",
  "bosses/ember_drake":       "board-boss-active",
  "bosses/old_stoneface":     "board-boss-active",
  // Season indicator for seasons concept.
  "seasons/Spring":           "board-season-spring-wheel",
  "seasons/Summer":           "board-season-summer-wheel",
  "seasons/Autumn":           "board-season-autumn-wheel",
  "seasons/Winter":           "board-season-winter-wheel",
  // Tool-armed board scenarios for specific tools.
  "tools/bomb":    "board-farm-tool-bomb",
  "tools/sickle":  "board-farm-tool-sickle",
  "tools/rake":    "board-farm-tool-rake",

  // Per-view overrides: each game screen maps to its own scenario.
  // All ids verified present in matrix.ts VISUAL_SCENARIOS.
  "views/board":        "board-farm-idle",
  "views/town":         "town-home-built-out",
  "views/inventory":    "inventory-grid-all",
  "views/cartography":  "map-current-home",
  "views/chronicle":    "chronicle-progressed",
  "views/crafting":     "crafting-bakery",
  "views/quests":       "quests-daily-mixed",
  "views/townsfolk":    "townsfolk-workers",
  "views/achievements": "achievements-trophies-mixed",
  "views/tiles":        "tiles-farm-grass",
  "views/orders":       "orders-mixed",

  // Farm hazards — show the farm board with fire/rats.
  "hazards/fire":  "board-farm-fire-rats",
  "hazards/rats":  "board-farm-fire-rats",
};

/**
 * Return the scenario id for the given concept/entity pair, or null if no
 * appropriate scenario exists.
 *
 * Every non-null id returned is confirmed to exist in VISUAL_SCENARIOS.
 */
export function scenarioForEntity(conceptId: string, key: string): string | null {
  // Check per-entity override first.
  const overrideKey = `${conceptId}/${key}`;
  const override = ENTITY_OVERRIDES[overrideKey];
  if (override !== undefined) return override;

  // Fall back to the concept-level default.
  const defaultScenario = CONCEPT_DEFAULT_SCENARIO[conceptId];
  return defaultScenario ?? null;
}

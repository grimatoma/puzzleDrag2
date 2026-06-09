class_name ZoneConfig
extends Node
## Thin COMPATIBILITY SHIM over CartographyConfig — the single source of truth for the per-NODE
## farm/mine/fish board templates (TEMPERATE_FARM, ORCHARD_FARM, MINE_*, FISH_HARBOR). The zone
## board data used to be DUPLICATED here in a ZONES const; that copy is gone. The board-template
## helpers below now FORWARD to CartographyConfig (the world-map node id IS the zone id), so there
## is exactly one place where a board template lives.
##
## This shim still exists for two reasons:
##   1. A stable, zone-keyed API surface (has_zone / base_turns / entry_cost / eligible_categories /
##      season_drops / upgrade_target) that the rest of the port + the suites call. Each is a static
##      forwarder to the matching CartographyConfig node helper.
##   2. It OWNS the SEASON_POOL_MODS data (the T13 additive per-season spawn deltas, ported from
##      React src/constants.ts) — that is NOT cartography data, so it stays here.
##
## A stateless `class_name` global (NOT an autoload), mirroring Constants / CartographyConfig:
## every value is a `const` and every helper is `static`, so it's reachable as
## `ZoneConfig.base_turns("home")` WITHOUT an instance — which matters for headless tests,
## which run before a scene tree exists.

## The upgrade-target sentinel meaning "no upgrade tile — coins instead" (React GOLD).
const GOLD: String = "gold"

## The default/home zone id. Callers that have no explicit zone (a home-only game that never
## travels off home) pass this; CartographyConfig's "home" node owns the actual board template.
const HOME_ZONE: String = "home"

## The always-available home-zone STAPLE seeds — the two staples a Town-1 game always provides
## regardless of which buildings are placed, kept here so both GameState seed sites agree on one
## list rather than inlining the literals:
##   • HOME_STAPLE_RESOURCES — the producible staple RESOURCES that seed orderable_resources
##     (hay_bundle ← grass, flour ← grain). Buildings append their produced resource after these.
##   • HOME_BASE_CATEGORIES — the staple CATEGORIES that seed active_categories (grass, grain).
##     Placed spawners append their category after these.
## These mirror Constants.STAPLE_TILES (Tile.GRASS/Tile.WHEAT): grass→hay_bundle, grain→flour.
const HOME_STAPLE_RESOURCES: Array = ["hay_bundle", "flour"]
const HOME_BASE_CATEGORIES: Array = ["grass", "grain"]

# ── helpers (thin static forwarders to CartographyConfig; node id == zone id) ──

## True when `zone_id` names a real cartography node (forwards to CartographyConfig.has_node).
static func has_zone(zone_id: String) -> bool:
	return CartographyConfig.has_node(zone_id)

## The season-cycle turn budget for `zone_id`'s board (React baseTurns). 0 for an unknown zone /
## a non-board node (Constants.season_index treats a non-positive budget as "always Spring").
static func base_turns(zone_id: String) -> int:
	return CartographyConfig.base_turns(zone_id)

## The coin cost to ENTER / START a bounded run at `zone_id` (React MAP_NODES[].entryCost.coins).
## 0 for a zone with no entry cost / an unknown zone.
static func entry_cost(zone_id: String) -> int:
	return CartographyConfig.entry_cost(zone_id)

## The ELIGIBLE base-spawn categories for `zone_id`'s farm board — the KEYS of its upgrade map, in
## declaration order. These are the only categories that may base-spawn on the board. Returns a
## fresh Array; [] for a non-farm / unknown zone.
static func eligible_categories(zone_id: String) -> Array:
	return CartographyConfig.eligible_categories(zone_id)

## The season-drop weights for `zone_id` in season `season_name` ("Spring"…"Winter"): a fresh COPY
## of { godot-category → weight }. {} for an unknown zone or season. Mutating the result never
## corrupts the const template.
static func season_drops(zone_id: String, season_name: String) -> Dictionary:
	return CartographyConfig.season_drops(zone_id, season_name)

## The upgrade-target category for `source_cat` in `zone_id`'s farm board: the godot target
## category, the GOLD sentinel ("no upgrade tile / coins"), or "" when `source_cat` is not an
## eligible (upgradeable) category for the zone.
static func upgrade_target(zone_id: String, source_cat: String) -> String:
	return CartographyConfig.upgrade_target(zone_id, source_cat)

# ── T13 — SEASON_POOL_MODS (additive spawn deltas) ────────────────────────────
## Additive per-season spawn deltas applied ON TOP of seasonDrops, mirroring React's
## SEASON_POOL_MODS (src/constants.ts:1123-1128) and applySeasonPoolMods
## (src/features/farm/poolMath.ts:16-31).
##
## Each entry is:  season_name → { "tile_string_key": delta_int }
##   delta > 0 → add that many EXTRA slots of that tile to the pool (push N copies).
##   delta < 0 → remove up to |delta| slots (but NEVER the last — keeps count ≥ 1 per tile).
##
## These are tile STRING KEYS (matching Constants.TILE_KEY_TO_TILE), not category names —
## they map to specific variants, faithfully mirroring the React table.
##
## Scope: FARM pool only (applied by GameState.active_tile_pool after the base weighting).
## Keys outside the current active pool are silently skipped (can't add an off-zone tile).
const SEASON_POOL_MODS: Dictionary = {
	"Spring": { "tile_fruit_blackberry": 1 },
	"Summer": { "tile_grain_wheat":      1 },
	"Autumn": { "tile_tree_oak":         2 },
	"Winter": { "tile_mine_stone":       1, "tile_grass_grass": -1 },
}

## Return the additive deltas for `season_name` (a fresh copy; {} for an unknown season).
## Keys are tile string keys (tile_grass_grass, …); values are signed integers.
static func season_pool_mods(season_name: String) -> Dictionary:
	return SEASON_POOL_MODS.get(season_name, {}).duplicate()

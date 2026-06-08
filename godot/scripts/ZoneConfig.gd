class_name ZoneConfig
extends Node
## Pure data for the per-ZONE farm board template — the season-weighted, zone-restricted
## base-spawn rules + the upgrade map. A MINIMAL ADDITIVE port of the React game's
## `src/features/cartography/data.ts` farm board instance (boards.farm), trimmed to the
## ONE zone the Godot port actually plays today: the home village ("home", the farm board).
##
## This is the data layer behind two things:
##   1. WHICH tile categories may BASE-SPAWN on the farm board (the upgradeMap KEYS — the
##      "eligible" categories). The home zone is grass/grain/trees/birds/veg/fruit ONLY;
##      flower/herd/cattle/mount are NOT eligible base spawns (so PANSY/PIG/COW/HORSE never
##      base-spawn on the home farm — they exist as catalog tiles but the pool excludes them).
##   2. HOW HEAVILY each eligible category spawns IN EACH SEASON (seasonDrops). The farm
##      cycles Spring→Summer→Autumn→Winter over its turn budget (Constants.season_index);
##      GameState.active_tile_pool() reads season_drops() for the current season to build a
##      season-weighted refill pool.
##
## upgradeMap (carried for the FOLLOW-UP upgrade-tile-spawn milestone, NOT consumed yet by
## the board fill): the category an eligible category UPGRADES TO when a chain crosses its
## threshold. "gold" is the sentinel meaning "no upgrade tile / coins" (the React GOLD).
##
## DEFERRED (NOT modelled here, by design): the other React farm templates (orchard, …),
## multi-zone farm play, entry costs, danger lists, building lists — see CartographyConfig
## for the trimmed world-map port. Only "home" is needed this milestone.
##
## A stateless `class_name` global (NOT an autoload), mirroring Constants / CartographyConfig:
## every value is a `const` and every helper is `static`, so it's reachable as
## `ZoneConfig.base_turns("home")` WITHOUT an instance — which matters for headless tests,
## which run before a scene tree exists.

## The upgrade-target sentinel meaning "no upgrade tile — coins instead" (React GOLD).
const GOLD: String = "gold"

## The per-zone farm board templates, keyed by zone id. Only "home" is ported (the only
## farm the Godot port plays). Fields mirror the React FarmBoardInstance:
##   base_turns   — the season-cycle turn budget (React baseTurns; 10 for the home zone).
##   upgrade_map  — source godot-category → target godot-category (or GOLD). Its KEYS are the
##                  zone's ELIGIBLE base-spawn categories.
##   season_drops — per season-name → { godot-category → weight }. Weight 0 means excluded;
##                  a positive weight is the category's relative spawn share that season.
## Categories use the GODOT category ids (Constants.CATEGORY values): grass/grain/trees/
## birds/veg/fruit/flower/herd/cattle/mount. (React uses vegetables/fruits/herd_animals/
## mounts; this template is already translated to the godot ids.)
const ZONES := {
	"home": {
		"base_turns": 10,
		# Entry cost for a bounded "Start Farming" run (React ZONES[].entryCost). The
		# home zone costs 50 coins to start a farm run. React FARM/ENTER falls back to
		# 50 when the field is absent (`zone.entryCost?.coins ?? 50`); we make it explicit.
		"entry_cost": {"coins": 50},
		"upgrade_map": {
			"grass":  "birds",
			"grain":  "veg",
			"trees":  "birds",
			"birds":  "herd",
			"veg":    "fruit",
			"fruit":  GOLD,
		},
		"season_drops": {
			"Spring": {
				"grass": 0.38, "grain": 0.20, "trees": 0.20,
				"birds": 0.05, "veg": 0.13, "fruit": 0.04,
				"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
			},
			"Summer": {
				"grass": 0.12, "grain": 0.38, "trees": 0.10,
				"birds": 0.15, "veg": 0.21, "fruit": 0.04,
				"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
			},
			"Autumn": {
				"grass": 0.10, "grain": 0.15, "trees": 0.42,
				"birds": 0.15, "veg": 0.15, "fruit": 0.03,
				"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
			},
			"Winter": {
				"grass": 0.05, "grain": 0.05, "trees": 0.73,
				"birds": 0.10, "veg": 0.05, "fruit": 0.02,
				"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
			},
		},
	},
}

## The default/home zone id — the only farm the port plays. Callers that have no explicit
## zone (the single-settlement port) pass this.
const HOME_ZONE: String = "home"

# ── helpers (pure, usable + testable without a scene tree) ─────────────────────

## True when `zone_id` names a real ported zone template.
static func has_zone(zone_id: String) -> bool:
	return ZONES.has(zone_id)

## The full template dict for `zone_id`, or {} for an unknown zone.
static func zone(zone_id: String) -> Dictionary:
	return ZONES.get(zone_id, {})

## The season-cycle turn budget for `zone_id` (React baseTurns). 0 for an unknown zone
## (Constants.season_index treats a non-positive budget as "always Spring").
static func base_turns(zone_id: String) -> int:
	return int(zone(zone_id).get("base_turns", 0))

## The coin cost to START a bounded farm run at `zone_id` (React ZONES[].entryCost.coins).
## Reads entry_cost.coins; defaults to 0 for a zone with no entry cost / an unknown zone.
static func entry_cost(zone_id: String) -> int:
	var ec: Dictionary = zone(zone_id).get("entry_cost", {})
	return int(ec.get("coins", 0))

## The ELIGIBLE base-spawn categories for `zone_id` — the KEYS of the upgrade map, in
## declaration order. These are the only categories that may base-spawn on the board (the
## home zone: grass/grain/trees/birds/veg/fruit). Returns a fresh Array; [] for an unknown
## zone.
static func eligible_categories(zone_id: String) -> Array:
	var out: Array = []
	var um: Dictionary = zone(zone_id).get("upgrade_map", {})
	for k in um.keys():
		out.append(String(k))
	return out

## The season-drop weights for `zone_id` in season `season_name` ("Spring"…"Winter"):
## a fresh COPY of { godot-category → weight }. {} for an unknown zone or season. Mutating
## the result never corrupts the const template.
static func season_drops(zone_id: String, season_name: String) -> Dictionary:
	var sd: Dictionary = zone(zone_id).get("season_drops", {})
	var row: Dictionary = sd.get(season_name, {})
	return row.duplicate()

## The upgrade-target category for `source_cat` in `zone_id`: the godot target category, the
## GOLD sentinel ("no upgrade tile / coins"), or "" when `source_cat` is not an eligible
## (upgradeable) category for the zone. Carried for the follow-up upgrade-tile milestone.
static func upgrade_target(zone_id: String, source_cat: String) -> String:
	var um: Dictionary = zone(zone_id).get("upgrade_map", {})
	return String(um.get(source_cat, ""))

class_name BuildingConfig
extends Node
## Town-1 spawner-building catalog — the "building-gated category spawners" from
## the locked Direction spec. Beyond a town's two STAPLE tiles (grass → hay_bundle,
## wheat/grain → flour), every other tile CATEGORY appears in the board refill pool
## only because a spawner building put it there. Plots are scarce (Settlement /
## TownConfig), so which categories you can chain is a placement decision: build a
## Lumber Camp and trees start spawning; demolish it and they stop.
##
## Direction spec — "building-gated category spawners" (Town 1 economy graph):
##   Building      Unlock   Cost                     Adds      Tile       Resource
##   Lumber Camp   Hamlet   hay_bundle 8, flour 4    trees     OAK        plank
##   Coop          Village  plank 6, flour 6         birds     PHEASANT   eggs
##   Garden        Village  plank 6, hay_bundle 10   veg       CARROT     soup
##
## Buildings come in two KINDS (the `kind` field):
##   "spawner" — the three above; adds a tile CATEGORY to the board refill pool.
##   "refiner" — the Bakery; consumes no plot category, instead it unlocks a
##               RecipeConfig station that REFINES raw goods into a refined good
##               (Direction: "raw goods refine at buildings"). A refiner has NO
##               tile/category, so it must never contribute to the board pool.
##
## Direction spec — refiner (M3c):
##   Building   Unlock    Cost                 Kind      Output
##   Bakery     Village   plank 8, flour 6     refiner   bread (RecipeConfig)
##
## Costs are PC2-aligned FIRST-PASS values — chosen so the whole Town-1 ladder is
## deadlock-free (every cost references resources producible at or below the tier
## it unlocks at). They are tunable: edit BUILDINGS.
##
## Registered as a `class_name` global (like Constants / TownConfig) so its consts
## and helpers are reachable WITHOUT a live autoload — headless tests run before
## the scene tree exists.

# ── Building ids ──────────────────────────────────────────────────────────────
const LUMBER_CAMP: String = "lumber_camp"
const COOP: String = "coop"
const GARDEN: String = "garden"
const BAKERY: String = "bakery"

## Building catalog keyed by id. Each entry:
##   name:        String  — display name
##   kind:        String  — "spawner" (adds a board category) | "refiner" (a
##                          RecipeConfig station; no tile/category)
##   unlock_tier: int     — minimum settlement tier to build (TownConfig tier int)
##   cost:        Dictionary — resource_key:String -> int, paid from inventory
##   category:    String  — the tile category this building adds to the pool
##                          ("" for refiners — they add no category)
##   tile:        int     — representative Constants.Tile that spawns once built
##                          (Constants.EMPTY for refiners — they spawn no tile)
##   resource:    String  — resource produced (spawner: the tile family's resource;
##                          refiner: the refined good its recipes output)
##   desc:        String  — one-line player-facing description
const BUILDINGS: Dictionary = {
	LUMBER_CAMP: {
		"name": "Lumber Camp",
		"kind": "spawner",
		"unlock_tier": TownConfig.TIER_HAMLET,
		"cost": {"hay_bundle": 8, "flour": 4},
		"category": "trees",
		"tile": Constants.Tile.OAK,
		"resource": "plank",
		"desc": "Adds tree tiles to the board — chain them for planks.",
	},
	COOP: {
		"name": "Coop",
		"kind": "spawner",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 6, "flour": 6},
		"category": "birds",
		"tile": Constants.Tile.PHEASANT,
		"resource": "eggs",
		"desc": "Adds bird tiles to the board — chain them for eggs.",
	},
	GARDEN: {
		"name": "Garden",
		"kind": "spawner",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 6, "hay_bundle": 10},
		"category": "veg",
		"tile": Constants.Tile.CARROT,
		"resource": "soup",
		"desc": "Adds vegetable tiles to the board — chain them for soup.",
	},
	BAKERY: {
		"name": "Bakery",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 8, "flour": 6},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "bread",
		"desc": "Refines flour + eggs into bread.",
	},
}

## Stable display / iteration order for the SPAWNER buildings only (the three that
## gate a board category). Refiners (Bakery) are NOT here — they add no category.
const SPAWNER_IDS: Array = [LUMBER_CAMP, COOP, GARDEN]

## Stable display / iteration order for EVERY buildable id (spawners + refiners).
## available_at_tier iterates this, so the Bakery is offered alongside the spawners.
const ALL_BUILD_IDS: Array = [LUMBER_CAMP, COOP, GARDEN, BAKERY]

# ── Static helpers (usable without an instance) ──────────────────────────────

## True when `id` names a real spawner building.
static func is_building(id: String) -> bool:
	return BUILDINGS.has(id)

static func building_name(id: String) -> String:
	if not is_building(id):
		return ""
	return String(BUILDINGS[id].get("name", ""))

## Cost dictionary to build `id` (a COPY, so callers can't mutate the const).
static func building_cost(id: String) -> Dictionary:
	if not is_building(id):
		return {}
	var cost: Dictionary = BUILDINGS[id].get("cost", {})
	return cost.duplicate()

## Minimum settlement tier required to build `id` (0 for unknown ids).
static func unlock_tier(id: String) -> int:
	if not is_building(id):
		return 0
	return int(BUILDINGS[id].get("unlock_tier", 0))

static func building_category(id: String) -> String:
	if not is_building(id):
		return ""
	return String(BUILDINGS[id].get("category", ""))

## Representative Constants.Tile spawned once `id` is built (Constants.EMPTY for
## unknown ids).
static func building_tile(id: String) -> int:
	if not is_building(id):
		return Constants.EMPTY
	return int(BUILDINGS[id].get("tile", Constants.EMPTY))

static func building_resource(id: String) -> String:
	if not is_building(id):
		return ""
	return String(BUILDINGS[id].get("resource", ""))

## Kind of `id`: "spawner" | "refiner" | "" (unknown / unset).
static func building_kind(id: String) -> String:
	if not is_building(id):
		return ""
	return String(BUILDINGS[id].get("kind", ""))

## True when `id` is a board-category SPAWNER (Lumber Camp / Coop / Garden).
static func is_spawner(id: String) -> bool:
	return building_kind(id) == "spawner"

## True when `id` is a recipe-station REFINER (Bakery).
static func is_refiner(id: String) -> bool:
	return building_kind(id) == "refiner"

## Buildable ids (spawners AND refiners) whose unlock_tier is at or below `tier`,
## in stable display order (ALL_BUILD_IDS) — so the Bakery is offered too.
static func available_at_tier(tier: int) -> Array:
	var out: Array = []
	for id in ALL_BUILD_IDS:
		if unlock_tier(id) <= tier:
			out.append(id)
	return out

class_name RecipeConfig
extends RefCounted
## Refining recipes — the "raw goods refine at buildings" loop from the locked
## Direction spec. A recipe consumes raw inventory inputs at a STATION building
## (a BuildingConfig id) and produces a refined good. M3c ships one recipe: the
## Bakery refines flour + eggs into bread.
##
## Direction spec — "raw goods refine at buildings, and the refined economy is
## spent to grow the town." The first refiner is the Bakery (RecipeConfig.BREAD).
##
## Mirrors the React `RECIPES` map (src/constants — rec_bread: flour 3 + eggs 1 →
## 1 bread, station Bakery). Quantities are PC2-aligned FIRST-PASS values and are
## tunable: edit RECIPES.
##
## Registered as a `class_name` global (like BuildingConfig / Constants) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

# ── Recipe ids ────────────────────────────────────────────────────────────────
const BREAD: String = "bread"
## M3f — the Kitchen recipe: refines farm food into `supplies`, the intermediate
## spent as mine turns (GameState.enter_mine converts supplies → turns).
const SUPPLIES: String = "supplies"

## Recipe catalog keyed by recipe id. Each entry:
##   name:    String      — display name
##   station: String      — BuildingConfig id whose building must be built to craft
##   inputs:  Dictionary  — resource_key:String -> int, consumed from inventory
##   output:  String      — resource key produced
##   qty:     int         — units of `output` produced per craft
##   desc:    String      — one-line player-facing description
const RECIPES: Dictionary = {
	BREAD: {
		"name": "Bread",
		"station": BuildingConfig.BAKERY,
		"inputs": {"flour": 3, "eggs": 1},
		"output": "bread",
		"qty": 1,
		"desc": "3 flour + 1 eggs → 1 bread (Bakery).",
	},
	SUPPLIES: {
		"name": "Supplies",
		"station": BuildingConfig.KITCHEN,
		"inputs": {"bread": 1, "flour": 2},
		"output": "supplies",
		"qty": 1,
		"desc": "1 bread + 2 flour → 1 supplies (Kitchen).",
	},
}

## Stable display / iteration order for the recipes.
const RECIPE_IDS: Array = [BREAD, SUPPLIES]

# ── Static helpers (usable without an instance) ──────────────────────────────

## True when `id` names a real recipe.
static func is_recipe(id: String) -> bool:
	return RECIPES.has(id)

static func recipe_name(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("name", ""))

## Inputs consumed by `id` (a COPY, so callers can't mutate the const).
static func recipe_inputs(id: String) -> Dictionary:
	if not is_recipe(id):
		return {}
	var inputs: Dictionary = RECIPES[id].get("inputs", {})
	return inputs.duplicate()

static func recipe_output(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("output", ""))

static func recipe_qty(id: String) -> int:
	if not is_recipe(id):
		return 0
	return int(RECIPES[id].get("qty", 0))

## BuildingConfig id of the station that crafts `id` ("" for unknown ids).
static func recipe_station(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("station", ""))

## Recipe ids whose station == `building_id`, in stable order (empty for unknown
## or station-less buildings).
static func recipes_for_station(building_id: String) -> Array:
	var out: Array = []
	for id in RECIPE_IDS:
		if recipe_station(id) == building_id:
			out.append(id)
	return out

class_name BuildingConfig
extends RefCounted
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
## M3f — the Kitchen refiner: packs farm food into `supplies`, the intermediate
## spent as mine turns on an expedition. Unlocks at Town tier (TIER_TOWN).
const KITCHEN: String = "kitchen"
## M3h — the Town-3 rats hazard buildings. A THIRD kind, "hazard": neither a
## board-pool spawner nor a recipe refiner, so they never touch the pool/recipe
## paths. Both unlock at City (TIER_CITY) but GameState.can_build ALSO gates them on
## rats_enabled() (town2_complete) — you can't build a Ratcatcher before Town 2 is
## done and rats appear. Ratcatcher shoos rats off the board as a free move; Master
## Ratcatcher makes grass chains also clear rats adjacent to the chain.
const RATCATCHER: String = "ratcatcher"
const MASTER_RATCATCHER: String = "master_ratcatcher"
## A placed Ratcatcher grants this many free "shoo" moves per run (the "5 free moves/year"
## from the Direction; the port has no year/season calendar, so it's a flat per-run budget
## the player spends down). The runtime spent-count lives on GameState (ratcatcher_charges_used);
## only this tuning CONST lives here, with the building it belongs to.
const RATCATCHER_CHARGES: int = 5
## T15 — the four NEW crafting-STATION refiners that complete the React six-station
## crafting catalog (Bakery + Kitchen already exist above). Like Bakery/Kitchen they
## are kind "refiner": no board category, no tile — they exist solely to unlock a
## RecipeConfig station. Each gates behind a settlement tier whose resources its recipes
## need (deadlock-free), and its OWN cost references only resources producible at/below
## that tier:
##   Workshop   — TOOLS (rake / axe / rifle / drill / …). Direction: "Workshop + farm
##                tools" unlocks at Town (TIER_TOWN). The in-game source of craftable tools.
##   Larder     — preserved GOODS (preserve / tincture / chowder). React lv 2 (early).
##                Village-tier (jam comes from blackberry, a Garden-era farm good).
##   Forge      — metal/stone GOODS (iron_hinge / lantern / goldring / …). React lv 8.
##                Town-tier (its recipes need iron_bar / coke / gold_bar — mine goods).
##   Smokehouse — cured GOODS (cured_meat from meat + coke). Town-tier (coke is a mine good).
const WORKSHOP: String = "workshop"
const LARDER: String = "larder"
const FORGE: String = "forge"
const SMOKEHOUSE: String = "smokehouse"

## T17/T21 — the ~30 ABILITY-BEARING buildings ported from the React BUILDINGS catalog
## (src/constants.ts:760-903). A FOURTH kind, "landmark": neither a board-pool spawner nor a
## recipe refiner nor a rats hazard, so is_spawner / is_refiner / is_hazard_building all return
## false and they never touch the pool / recipe / rats paths. Each carries an `abilities` Array
## (the AbilityConfig instances) that GameState.compute_ability_channels folds into the unified
## channels. PORT MAPPING: ids + abilities are brought VERBATIM from React; React's player-LEVEL
## gating (`lv`) is DROPPED in favour of the port's TIER/PLOT model (a sensible `unlock_tier`
## per building) and INVENTORY-paid `cost` referencing resources producible at/below that tier
## (deadlock-free). React buildings with NO abilities (flavour: Hearth, Inn, Larder, Forge,
## Caravan Post, Brewery, harbor/decorative landmarks) are NOT ported — the port has no use for a
## buildable that does nothing, and the wiki/achievements layer doesn't need them yet. The Magic
## Portal stays a GameState special-case (coins+runes, see GameState.build_portal), NOT a
## BuildingConfig entry. Bakery/Kitchen already exist above as refiners and keep their React
## abilities=[] (none). The React Mill's recipe_input_reduce is ported as its OWN landmark below.
const MILL: String = "mill"
const GRANARY: String = "granary"
const MINING_CAMP: String = "mining_camp"
const POWDER_STORE: String = "powder_store"
const HOUSING: String = "housing"
const HOUSING2: String = "housing2"
const HOUSING3: String = "housing3"
const SILO: String = "silo"
const BARN: String = "barn"
const SAWMILL: String = "sawmill"
const STABLE: String = "stable"
const APIARY: String = "apiary"
const CHAPEL: String = "chapel"
const OBSERVATORY: String = "observatory"

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
##   abilities:   Array   — AbilityConfig instances ({id, params, trigger?}) this building
##                          contributes to the unified channels when BUILT (weight 1). [] for the
##                          spawner/refiner/hazard buildings that carry no ability. Ported VERBATIM
##                          from the React BUILDINGS `abilities` arrays (src/constants.ts).
##   shape:       String  — the art family drawn for this building on the spatial village
##                          map: a TownArtConfig art id (VillageScreen renders
##                          TownArtConfig.texture_for(shape) on the plot); "house" is the
##                          generic fallback. Owned here (per-building art attribute) and
##                          read via BuildingConfig.shape_of(id).
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
		"abilities": [],
		"shape": "lumber",
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
		"abilities": [],
		"shape": "coop",
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
		"abilities": [],
		"shape": "garden",
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
		"abilities": [],
		"shape": "cookhouse",
	},
	KITCHEN: {
		"name": "Kitchen",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"plank": 8, "flour": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "supplies",
		"desc": "Packs farm food into supplies for mine expeditions.",
		"abilities": [],
		"shape": "cookhouse",
	},
	# ── T15 crafting-station refiners (Workshop / Larder / Forge / Smokehouse) ──────
	# kind "refiner" (like Bakery/Kitchen): no category, no tile — each only unlocks a
	# RecipeConfig station. `resource` names the family of goods/tools it crafts (for the
	# build picker blurb). Costs are deadlock-free at the unlock tier.
	WORKSHOP: {
		"name": "Workshop",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_TOWN,
		# Plank + block + iron_bar are all producible by Town (Lumber Camp planks, mine
		# blocks/iron from the Town-2 expedition feeding the shared inventory).
		"cost": {"plank": 12, "block": 8, "iron_bar": 2},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "tools",
		"desc": "Crafts farm + mine TOOLS (rake, axe, rifle, drill, and more).",
		"abilities": [],
		"shape": "workshop",
	},
	LARDER: {
		"name": "Larder",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		# Planks (Lumber Camp at Hamlet) + farm staples — payable at Village.
		"cost": {"plank": 6, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "preserve",
		"desc": "Preserves and bottles the harvest — jars, tinctures, and chowder.",
		"abilities": [],
		"shape": "cellar",
	},
	FORGE: {
		"name": "Forge",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_TOWN,
		# Block + iron_bar (mine goods available once Town's expedition is running).
		"cost": {"block": 12, "iron_bar": 4},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "iron_hinge",
		"desc": "Smiths metal and stone goods — hinges, lanterns, rings, and crowns.",
		"abilities": [],
		"shape": "forge",
	},
	SMOKEHOUSE: {
		"name": "Smokehouse",
		"kind": "refiner",
		"unlock_tier": TownConfig.TIER_TOWN,
		# Plank + block — Town-tier, deadlock-free (its cured_meat recipe needs coke,
		# a mine good, but the BUILDING cost itself stays on cheap producible goods).
		"cost": {"plank": 10, "block": 6},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "cured_meat",
		"desc": "Salts and smokes meat into long-lasting cured rations.",
		"abilities": [],
		"shape": "smokehut",
	},
	# M3h — Town-3 rats hazard buildings (kind "hazard"): no category, no tile, no
	# resource, so is_spawner / is_refiner both return false and they never feed the
	# board pool or a recipe station. can_build additionally gates them on rats being
	# enabled (town2_complete) — see GameState.
	RATCATCHER: {
		"name": "Ratcatcher",
		"kind": "hazard",
		"unlock_tier": TownConfig.TIER_CITY,
		"cost": {"plank": 6, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Shoo rats off the board as a free move (no turn spent).",
		"abilities": [],
		"shape": "hut",
	},
	MASTER_RATCATCHER: {
		"name": "Master Ratcatcher",
		"kind": "hazard",
		"unlock_tier": TownConfig.TIER_CITY,
		"cost": {"plank": 10, "eggs": 6, "hay_bundle": 12},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Grass chains also clear rats adjacent to the chain.",
		"abilities": [],
		"shape": "hut",
	},
	# ── T17/T21 ability-bearing LANDMARKS (React BUILDINGS, src/constants.ts:760-903) ──
	# kind "landmark": no board category, no recipe station, no rats path. cost is INVENTORY-paid
	# and deadlock-free at the chosen unlock_tier; abilities are VERBATIM from React.
	MILL: {
		# React mill (constants.ts:762): recipe_input_reduce rec_bread/flour/1. Port remaps the
		# recipe id to RecipeConfig.BREAD (the port's bread recipe) — same input (flour), same -1.
		# Stacks ADDITIVELY with the Baker worker on the same recipe_input_reduce channel (React
		# has both). Hamlet-tier (flour staple always producible).
		"name": "Mill",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_HAMLET,
		"cost": {"flour": 6, "hay_bundle": 6},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Grinds harvest goods — reduces the flour needed to bake bread by 1.",
		"abilities": [
			{"id": "recipe_input_reduce", "params": {"recipe": RecipeConfig.BREAD, "input": "flour", "amount": 1}},
		],
		"shape": "mill",
	},
	GRANARY: {
		# React granary (constants.ts:766): turn_budget_bonus +1 AND inventory_cap_bonus +300.
		"name": "Granary",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_HAMLET,
		"cost": {"hay_bundle": 10, "flour": 4},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Keeps the harvest safe — +1 farm turn and +300 to the inventory cap.",
		"abilities": [
			{"id": "turn_budget_bonus", "params": {"amount": 1}},
			{"id": "inventory_cap_bonus", "params": {"amount": 300}},
		],
		"shape": "rotunda",
	},
	MINING_CAMP: {
		# React mining_camp (constants.ts:782): turn_budget_bonus +1 (React applied it to the MINE
		# expedition budget; the port has a single turn_budget channel read by farm_run_turn_budget,
		# so it boosts the farm run here — faithful to the channel, simplified target).
		"name": "Mining Camp",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"plank": 10, "block": 4},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Adds +1 turn when departing on an expedition.",
		"abilities": [
			{"id": "turn_budget_bonus", "params": {"amount": 1}},
		],
		"shape": "mine",
	},
	POWDER_STORE: {
		# React powder_store (constants.ts:801): grant_tool bomb ×2 at season end.
		"name": "Powder Store",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"block": 8, "plank": 6},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Stockpiles powder — produces 2 Bombs at the end of every season.",
		"abilities": [
			{"id": "grant_tool", "params": {"tool": "bomb", "amount": 2}, "trigger": "season_end"},
		],
		"shape": "bunker",
	},
	HOUSING: {
		# React housing (constants.ts:806): worker_pool_step +1 at season end.
		"name": "Housing Block",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 8, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Lodging for hired hands — adds 1 to the hiring pool each season.",
		"abilities": [
			{"id": "worker_pool_step", "params": {"amount": 1}, "trigger": "season_end"},
		],
		"shape": "cottage",
	},
	HOUSING2: {
		# React housing2 (constants.ts:813): worker_pool_step +1.
		"name": "Housing Block",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 8, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Lodging for hired hands — adds 1 to the hiring pool each season.",
		"abilities": [
			{"id": "worker_pool_step", "params": {"amount": 1}, "trigger": "season_end"},
		],
		"shape": "cottage",
	},
	HOUSING3: {
		# React housing3 (constants.ts:820): worker_pool_step +1.
		"name": "Housing Block",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 8, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Lodging for hired hands — adds 1 to the hiring pool each season.",
		"abilities": [
			{"id": "worker_pool_step", "params": {"amount": 1}, "trigger": "season_end"},
		],
		"shape": "cottage",
	},
	SILO: {
		# React silo (constants.ts:828): preserve_board farm at session end.
		"name": "Silo",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 8, "hay_bundle": 6},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Grain store — preserves the tile layout between sessions on the Farm.",
		"abilities": [
			{"id": "preserve_board", "params": {"biome": "farm"}, "trigger": "session_end"},
		],
		"shape": "silo",
	},
	BARN: {
		# React barn (constants.ts:835): preserve_board mine at session end.
		"name": "Barn",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"plank": 10, "block": 5},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Ore shed — preserves the tile layout between sessions in the Mine.",
		"abilities": [
			{"id": "preserve_board", "params": {"biome": "mine"}, "trigger": "session_end"},
		],
		"shape": "barn",
	},
	SAWMILL: {
		# React sawmill (constants.ts:870): bonus_yield tile_tree_oak +1 (extra plank per oak chain).
		"name": "Sawmill",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 10, "block": 4},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Water-driven sawmill — chaining oaks yields an extra plank.",
		"abilities": [
			{"id": "bonus_yield", "params": {"target": "tile_tree_oak", "amount": 1}},
		],
		"shape": "sawmill",
	},
	STABLE: {
		# React stable (constants.ts:879): bonus_yield tile_mount_horse +1 (extra horseshoe).
		"name": "Stable",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"plank": 12, "hay_bundle": 10},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Snug stable — chaining horses yields an extra horseshoe.",
		"abilities": [
			{"id": "bonus_yield", "params": {"target": "tile_mount_horse", "amount": 1}},
		],
		"shape": "stable",
	},
	APIARY: {
		# React apiary (constants.ts:884): bonus_yield tile_flower_pansy +1 (extra honey).
		"name": "Apiary",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_VILLAGE,
		"cost": {"plank": 6, "hay_bundle": 8},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Bee skeps among the flowers — chaining pansies yields extra honey.",
		"abilities": [
			{"id": "bonus_yield", "params": {"target": "tile_flower_pansy", "amount": 1}},
		],
		"shape": "skep",
	},
	CHAPEL: {
		# React chapel (constants.ts:889): season_bonus coins +50 at season end.
		"name": "Chapel",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_TOWN,
		"cost": {"plank": 10, "block": 10},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Stone chapel — tithes add 50 coins at season's end.",
		"abilities": [
			{"id": "season_bonus", "params": {"resource": "coins", "amount": 50}, "trigger": "season_end"},
		],
		"shape": "chapel",
	},
	OBSERVATORY: {
		# React observatory (constants.ts:898): threshold_reduce_category mine_gem -1. Port remaps
		# the React "mine_gem" category to the port's gem category (Constants.category_of(GEM)=="gem"),
		# exactly as WorkerConfig remapped React categories to the port's. Gem chains upgrade one
		# step sooner. City-tier (gems + iron_bar are deep-mine goods).
		"name": "Observatory",
		"kind": "landmark",
		"unlock_tier": TownConfig.TIER_CITY,
		"cost": {"block": 12, "iron_bar": 4},
		"category": "",
		"tile": Constants.EMPTY,
		"resource": "",
		"desc": "Brass telescope charts the seams — gem chains upgrade one step sooner.",
		"abilities": [
			{"id": "threshold_reduce_category", "params": {"category": "gem", "amount": 1}},
		],
		"shape": "observatory",
	},
}

## Stable display / iteration order for the SPAWNER buildings only (the three that
## gate a board category). Refiners (Bakery) are NOT here — they add no category.
const SPAWNER_IDS: Array = [LUMBER_CAMP, COOP, GARDEN]

## Stable display / iteration order for EVERY buildable id (spawners + refiners +
## hazard buildings). available_at_tier iterates this, so the Bakery and the rats
## buildings are offered alongside the spawners (the rats buildings only once City
## is reached AND rats are enabled — the rats-enabled gate lives in GameState).
const ALL_BUILD_IDS: Array = [
	LUMBER_CAMP, COOP, GARDEN, BAKERY, KITCHEN, RATCATCHER, MASTER_RATCATCHER,
	# T17/T21 ability-bearing landmarks (appended so they surface in the build picker).
	MILL, GRANARY, MINING_CAMP, POWDER_STORE,
	HOUSING, HOUSING2, HOUSING3,
	SILO, BARN, SAWMILL, STABLE, APIARY, CHAPEL, OBSERVATORY,
	# T15 crafting-station refiners (appended so they surface in the build picker after
	# the landmarks; the "first seven" slice in run_economy_tests stays unaffected).
	WORKSHOP, LARDER, FORGE, SMOKEHOUSE,
]

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

## The art family drawn for `id` on the spatial village map — a TownArtConfig art id
## (VillageScreen renders TownArtConfig.texture_for(shape) on the building's plot).
## Unknown ids — and any row that ever lacks an explicit `shape` — fall back to "house",
## the generic always-draws family. The per-building art attribute lives on the catalog
## row; VillageScreen reads it via this accessor.
static func shape_of(id: String) -> String:
	if not is_building(id):
		return "house"
	return String(BUILDINGS[id].get("shape", "house"))

## True when `id` is a board-category SPAWNER (Lumber Camp / Coop / Garden).
static func is_spawner(id: String) -> bool:
	return building_kind(id) == "spawner"

## True when `id` is a recipe-station REFINER (Bakery).
static func is_refiner(id: String) -> bool:
	return building_kind(id) == "refiner"

## True when `id` is a rats-HAZARD building (Ratcatcher / Master Ratcatcher). These
## add no board category and no recipe station — they never touch the pool/recipe
## paths. GameState.can_build gates them on rats_enabled() (Town 2 complete).
static func is_hazard_building(id: String) -> bool:
	return building_kind(id) == "hazard"

## True when `id` is an ability-bearing LANDMARK (T17/T21 — Mill / Granary / Sawmill / …).
## Like hazard buildings it has no board category and no recipe station, so it never touches
## the pool / recipe paths; its only effect is through the abilities it folds into the unified
## channels (GameState.compute_ability_channels).
static func is_landmark(id: String) -> bool:
	return building_kind(id) == "landmark"

## The AbilityConfig instances `id` contributes when BUILT (a defensive COPY), or [] for an
## unknown id or a building with no abilities. Every entry is { id, params, trigger? } —
## the source shape AbilityAggregate.aggregate_abilities consumes (weight 1 for buildings).
static func abilities(id: String) -> Array:
	if not is_building(id):
		return []
	return (BUILDINGS[id].get("abilities", []) as Array).duplicate(true)

## Buildable ids (spawners AND refiners) whose unlock_tier is at or below `tier`,
## in stable display order (ALL_BUILD_IDS) — so the Bakery is offered too.
static func available_at_tier(tier: int) -> Array:
	var out: Array = []
	for id in ALL_BUILD_IDS:
		if unlock_tier(id) <= tier:
			out.append(id)
	return out

## Short player-facing hint for a build() FAILURE reason (Batch 9 C6 — moved BYTE-IDENTICAL from
## Main._build_hint so the build-failure copy lives beside the building catalog it describes).
## Reasons mirror GameState.build()'s failure codes: exists / locked / no_plot / insufficient.
static func build_hint(reason: String) -> String:
	match reason:
		"exists":       return "already built"
		"locked":       return "need a higher tier"
		"no_plot":      return "no free plot"
		"insufficient": return "not enough resources"
		_:              return "unavailable"

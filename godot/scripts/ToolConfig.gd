class_name ToolConfig
extends RefCounted
## Tool CATALOG (M8a logic core) — the single source of truth for the
## representative tool set, ported from the Phaser tool / tool-power system
## (src/config/toolPowers.ts power ids + the tool items in src/constants.ts and
## src/features/mine/tools.ts). This is the catalog half; the pure board effects
## live in ToolEffects.gd. NO UI, NO live-board wiring (that is M8b) — this is a
## headless-testable data + dispatch layer mirroring BossConfig / BuildingConfig.
##
## Each tool entry maps an id → {
##   label:      String — display name
##   power_id:   String — which ToolEffects primitive it triggers
##   params:     Dictionary — arguments for that primitive, in ACTUAL Constants.Tile
##               values (NOT React string keys): radius / span / keys / from_keys /
##               to_key / count, depending on the power.
##   tap_target: bool — true if the tool needs a tapped cell (tap power); false if
##               it fires instantly over the whole board.
## }
##
## REACT-TILE-SET ADAPTATION (notes on remaps / omissions)
##   The Godot enum (Constants.Tile) is the farm + mine + hazard slice: GRASS…HORSE,
##   STONE / IRON_ORE / COAL / DIRT / GEM, RAT, RUBBLE. Tools whose React targets
##   don't exist here were remapped onto real Godot tiles, never invented:
##     - axe (clear_category): React clears the "trees" family; in Godot the only
##       tree-ish tile is OAK (category "trees"), so axe clears category "trees".
##     - drill (transform_tiles): React turns special_dirt → tile_mine_stone; the
##       Godot analogue is DIRT → STONE (DIRT and STONE both exist).
##     - magnet (transform_adjacent): React turns ore → stone within a radius; the
##       Godot ore family is IRON_ORE, so magnet turns IRON_ORE → STONE (radius 1).
##     - stone_hammer (clear_all): clears STONE specifically (exists in the mine set).
##   No React tool was dropped for a missing tile — every named tool in the M8a plan
##   maps onto a real Constants.Tile value.
##
## Registered as a `class_name` global (like Constants / BossConfig) so its consts
## and helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists.

# ── Tool ids ──────────────────────────────────────────────────────────────────
const BOMB: String = "bomb"
const RAKE: String = "rake"
const SICKLE: String = "sickle"
const AUGER: String = "auger"
const BLAST_CHARGE: String = "blast_charge"
const AXE: String = "axe"
const SCYTHE: String = "scythe"
const STONE_HAMMER: String = "stone_hammer"
const DRILL: String = "drill"
const MAGNET: String = "magnet"
# ── Catalog-parity board tools (Tools PR1) — all reuse an EXISTING ToolEffects
# power; only the catalog params differ. Targets/categories use the REAL Godot
# tile/category names (Constants.Tile / Constants.CATEGORY), never invented ones.
const BIRD_CAGE: String = "bird_cage"
const SCYTHE_FULL: String = "scythe_full"
const HOE: String = "hoe"
const IRON_PICK: String = "iron_pick"
const PLOUGH: String = "plough"
const FRUIT_PICKER: String = "fruit_picker"
const HERDERS_CROOK: String = "herders_crook"
const MILK_CHURN: String = "milk_churn"
const SADDLE: String = "saddle"
const COAL_HAMMER: String = "coal_hammer"
const GOLD_PICK: String = "gold_pick"
const TRIMMER: String = "trimmer"
const BEE: String = "bee"
const COAL_TRANSMUTER: String = "coal_transmuter"
# ── New board powers (Tools PR2) — transform_random_n / reshuffle_board / clear_hazard.
# These are the FIRST tools to use these three ToolEffects primitives (PR1 only reused
# the existing clear/transform/select powers). Targets use the REAL Godot tile/category
# names; the spawn-target string ("biome_base"/"biome_rare") and hazard NAME ("rats")
# are resolved to Constants.Tile values at dispatch (the TOOLS dict is a const).
const SEEDPACK: String = "basic"
const LOCKBOX: String = "rare"
const RESHUFFLE_HORN: String = "shuffle"
const CAT: String = "cat"
const TERRIER: String = "terrier"
# ── fill_bias board tools (Tools PR2b) — the FIRST tools to use the fill_bias power. These
# never touch the grid: GameState.use_tool_on_grid intercepts power_id=="fill_bias" BEFORE the
# grid dispatch and ARMS a transient spawn bias (target Tile + turns) that active_tile_pool()
# reads. `target` is a literal Constants.Tile value; `turns` is the biased-farm-turn lifetime.
const FERTILIZER: String = "fertilizer"
const BIRD_FEED: String = "bird_feed"
const SAPLING: String = "sapling"
# ── Portal magic tools (Tools PR3) — the implementable summon-economy magic tools, now
# REAL ToolConfig members so they flow through the existing rack + use_tool_on_grid +
# apply_instant/apply_tap dispatch with NO special-casing. PortalConfig stays the summon
# ECONOMY (influence cost + web power metadata); these provide the Godot-native POWER. The
# five golden/philosophers tools reuse transform_tiles (from_category → to_key); magic_wand
# uses the NEW tap_clear_type power; magic_seed the NEW restore_turns state power;
# magic_fertilizer the already-wired fill_bias power. Targets/categories use REAL Godot
# tile/category names, never invented ones. DEFERRED (NOT here): hourglass (undo_move — needs
# a board/inventory snapshot) and miners_hat (reveal_tiles — needs a hidden-tile layer); they
# stay summonable in PortalConfig but have no effect until those milestones land.
const GOLDEN_APPLE: String = "golden_apple"
const GOLDEN_CARROT: String = "golden_carrot"
const GOLDEN_IDOL: String = "golden_idol"
const GOLDEN_SHEEP: String = "golden_sheep"
const PHILOSOPHERS_STONE: String = "philosophers_stone"
const MAGIC_WAND: String = "magic_wand"
const MAGIC_SEED: String = "magic_seed"
const MAGIC_FERTILIZER: String = "magic_fertilizer"
# ── Wolf-hazard tools (T14a) — the FIRST tools to use the clear_wolves / scatter_hazard STATE
# powers. Like fill_bias / restore_turns these NEVER touch the grid: wolves are OVERLAY entities
# (not grid cells), so GameState.use_tool_on_grid intercepts these power ids in its EARLY path and
# mutates `hazards.wolves` (clear all / scare for 5 turns). Ported from the React Workshop recipes
# (src/constants.ts WORKSHOP_RECIPES.rifle/hound) + the USE_TOOL rifle/hound handlers.
const RIFLE: String = "rifle"
const HOUND: String = "hound"
# ── Mine-hazard tools (T14b) — STATE powers handled in GameState's early path (never reach
# apply_instant; they mutate `mine_hazards` + the grid). Like the wolf tools they are instant (no
# tapped cell). Ported from the React Workshop recipes (src/constants.ts rec_water_pump /
# rec_explosives) + the USE_TOOL water_pump/explosives handlers (toolPowerRuntime.ts:349-358).
#   WATER_PUMP — floods every LAVA cell → RUBBLE + clears the lava hazard (React "Lava Damper").
#   EXPLOSIVES — clears the cave_in (un-buries its rubble row) + the mole hazard.
const WATER_PUMP: String = "water_pump"
const EXPLOSIVES: String = "explosives"

## Tool catalog keyed by id. See the header for the field contract.
const TOOLS: Dictionary = {
	# ── Tap-target tools (need a tapped cell) ──────────────────────────────────
	BOMB: {
		"label": "Bomb",
		"power_id": "area_blast",
		"params": {"radius": 1},
		"tap_target": true,
	},
	RAKE: {
		"label": "Rake",
		"power_id": "clear_component",
		"params": {},
		"tap_target": true,
	},
	SICKLE: {
		"label": "Sickle",
		"power_id": "clear_row",
		"params": {"span": 1},
		"tap_target": true,
	},
	AUGER: {
		"label": "Auger",
		"power_id": "clear_column",
		"params": {"span": 1},
		"tap_target": true,
	},
	BLAST_CHARGE: {
		"label": "Blast Charge",
		"power_id": "clear_cross",
		"params": {},
		"tap_target": true,
	},
	MAGNET: {
		"label": "Magnet",
		"power_id": "transform_adjacent",
		# Pull nearby iron ore into easy-to-chain stone.
		"params": {"radius": 1, "from_keys": [Constants.Tile.IRON_ORE], "to_key": Constants.Tile.STONE},
		"tap_target": true,
	},
	# ── Instant tools (fire over the whole board) ──────────────────────────────
	AXE: {
		"label": "Axe",
		"power_id": "clear_category",
		# "trees" is OAK in the Godot tile set; resolved to its keys at dispatch.
		"params": {"category": "trees"},
		"tap_target": false,
	},
	SCYTHE: {
		"label": "Scythe",
		"power_id": "clear_random_n",
		"params": {"count": 6},
		"tap_target": false,
	},
	STONE_HAMMER: {
		"label": "Stone Hammer",
		"power_id": "clear_all",
		"params": {"target": Constants.Tile.STONE},
		"tap_target": false,
	},
	DRILL: {
		"label": "Drill",
		"power_id": "transform_tiles",
		# Turn loose dirt into stone (React: special_dirt → tile_mine_stone).
		"params": {"from_keys": [Constants.Tile.DIRT], "to_key": Constants.Tile.STONE},
		"tap_target": false,
	},
	# ── Catalog-parity board tools (Tools PR1) ─────────────────────────────────
	# All instant tools fire over the whole board; the tap-target one needs a cell.
	# Params hold category strings / explicit Tile keys and are resolved at dispatch
	# (the TOOLS dict is a const — it cannot call tiles_in_category itself).
	#
	# Farm — clear a single produce tile across the board (clear_all).
	BIRD_CAGE: {
		"label": "Bird Cage",
		"power_id": "clear_all",
		"params": {"target": Constants.Tile.BIRD_CHICKEN},
		"tap_target": false,
	},
	SCYTHE_FULL: {
		"label": "Scythe (full)",
		"power_id": "clear_all",
		"params": {"target": Constants.Tile.WHEAT},
		"tap_target": false,
	},
	HOE: {
		"label": "Hoe",
		"power_id": "clear_all",
		"params": {"target": Constants.Tile.CARROT},
		"tap_target": false,
	},
	IRON_PICK: {
		"label": "Iron Pick",
		"power_id": "clear_all",
		"params": {"target": Constants.Tile.IRON_ORE},
		"tap_target": false,
	},
	# Farm/mine — clear a whole category (clear_category). PLOUGH unions two.
	PLOUGH: {
		"label": "Plough",
		"power_id": "clear_category",
		# Multi-category clear: grass + grain. Resolved (and unioned) at dispatch.
		"params": {"categories": ["grass", "grain"]},
		"tap_target": false,
	},
	FRUIT_PICKER: {
		"label": "Fruit Picker",
		"power_id": "clear_category",
		"params": {"category": "fruit"},
		"tap_target": false,
	},
	HERDERS_CROOK: {
		"label": "Herder's Crook",
		"power_id": "clear_category",
		"params": {"category": "herd"},
		"tap_target": false,
	},
	MILK_CHURN: {
		"label": "Milk Churn",
		"power_id": "clear_category",
		"params": {"category": "cattle"},
		"tap_target": false,
	},
	SADDLE: {
		"label": "Saddle",
		"power_id": "clear_category",
		"params": {"category": "mount"},
		"tap_target": false,
	},
	COAL_HAMMER: {
		"label": "Coal Hammer",
		"power_id": "clear_category",
		"params": {"category": "coal"},
		"tap_target": false,
	},
	GOLD_PICK: {
		"label": "Gold Pick",
		"power_id": "clear_category",
		"params": {"category": "gold"},
		"tap_target": false,
	},
	# Transform a whole category into another tile (transform_tiles via from_category).
	TRIMMER: {
		"label": "Trimmer",
		"power_id": "transform_tiles",
		# Trees → grass (clears the canopy back to open ground).
		"params": {"from_category": "trees", "to_key": Constants.Tile.GRASS},
		"tap_target": false,
	},
	BEE: {
		"label": "Bee",
		"power_id": "transform_tiles",
		# Flowers → fruit (pollination): PANSY (flower) → APPLE (fruit).
		"params": {"from_category": "flower", "to_key": Constants.Tile.APPLE},
		"tap_target": false,
	},
	# Tap-target — transmute nearby mine ores into coal (transform_adjacent via from_categories).
	COAL_TRANSMUTER: {
		"label": "Coal Transmuter",
		"power_id": "transform_adjacent",
		# Real mine-ore tiles → COAL within radius 1. from_categories is resolved at
		# dispatch (stone/iron/gold/gem/copper). COPPER_ORE exists in the Godot enum.
		"params": {
			"radius": 1,
			"from_categories": ["stone", "iron", "gold", "gem", "copper"],
			"to_key": Constants.Tile.COAL,
		},
		"tap_target": true,
	},
	# ── New board powers (Tools PR2) ───────────────────────────────────────────
	# transform_random_n — re-seed N random board cells to a biome target. `to` is a
	# spawn-target STRING ("biome_base"/"biome_rare", faithful to the web's
	# resolveTransformKey for the farm biome) resolved at dispatch via _resolve_spawn_key.
	SEEDPACK: {
		"label": "Seedpack",
		"power_id": "transform_random_n",
		# 5 random cells → the farm base tile (GRASS) — sows easy-to-chain staples.
		"params": {"count": 5, "to": "biome_base"},
		"tap_target": false,
	},
	LOCKBOX: {
		"label": "Lockbox",
		"power_id": "transform_random_n",
		# 3 random cells → the farm rare tile (FRUIT_BLACKBERRY) — seeds a high-value target.
		"params": {"count": 3, "to": "biome_rare"},
		"tap_target": false,
	},
	# reshuffle_board — pure value-permutation of the board (no re-roll, no credit).
	RESHUFFLE_HORN: {
		"label": "Reshuffle Horn",
		"power_id": "reshuffle_board",
		"params": {},
		"tap_target": false,
	},
	# clear_hazard — remove a named hazard from the board (the one power allowed to). The
	# hazard NAME ("rats") is resolved to Constants.Tile.RAT at dispatch via _resolve_hazard_key.
	CAT: {
		"label": "Cat",
		"power_id": "clear_hazard",
		"params": {"target": "rats"},
		"tap_target": false,
	},
	TERRIER: {
		"label": "Terrier",
		"power_id": "clear_hazard",
		# Same as Cat — the web's terrier tool also clears the rats hazard.
		"params": {"target": "rats"},
		"tap_target": false,
	},
	# ── fill_bias tools (Tools PR2b) ───────────────────────────────────────────
	# No apply_instant case exists for fill_bias (apply_instant would return {} and is never
	# reached): GameState.use_tool_on_grid handles power_id=="fill_bias" in its EARLY path,
	# arming the bias from these params and consuming a charge. `target` is a literal
	# Constants.Tile; `turns` the biased-farm-turn lifetime. Each doubles its target's
	# already-eligible farm-pool slots while armed (never injects an off-zone tile).
	FERTILIZER: {
		"label": "Fertilizer",
		"power_id": "fill_bias",
		# Bias the next fills toward wheat (the grain staple).
		"params": {"target": Constants.Tile.WHEAT, "turns": 1},
		"tap_target": false,
	},
	BIRD_FEED: {
		"label": "Bird Feed",
		"power_id": "fill_bias",
		# Bias toward the base bird. The web biases toward its base bird tile (chicken); the
		# port's base bird is PHEASANT (FARM_CATEGORY_TILE["birds"]), so PHEASANT is the
		# faithful target — it IS base-eligible, so the bias actually doubles bird slots
		# (chicken is an unseeded catalog variant that never reaches the farm board).
		"params": {"target": Constants.Tile.PHEASANT, "turns": 1},
		"tap_target": false,
	},
	SAPLING: {
		"label": "Sapling",
		"power_id": "fill_bias",
		# Bias toward oak (the trees staple).
		"params": {"target": Constants.Tile.OAK, "turns": 1},
		"tap_target": false,
	},
	# ── Portal magic tools (Tools PR3) ──────────────────────────────────────────
	# Summoned at the Portal (PortalConfig is the influence economy); these are the
	# Godot-native POWER entries so a summoned tool shows in the rack + is usable with
	# no special-casing. The transform tools reuse transform_tiles via from_category.
	GOLDEN_APPLE: {
		"label": "Golden Apple",
		"power_id": "transform_tiles",
		# Every tree tile → apple-fruit (React: trees → tile_fruit_apple).
		"params": {"from_category": "trees", "to_key": Constants.Tile.APPLE},
		"tap_target": false,
	},
	GOLDEN_CARROT: {
		"label": "Golden Carrot",
		"power_id": "transform_tiles",
		# Every grass tile → carrot (React: grass → tile_veg_carrot).
		"params": {"from_category": "grass", "to_key": Constants.Tile.CARROT},
		"tap_target": false,
	},
	GOLDEN_IDOL: {
		"label": "Golden Idol",
		"power_id": "transform_tiles",
		# Every grass tile → cow (React: grass → tile_cattle_cow).
		"params": {"from_category": "grass", "to_key": Constants.Tile.COW},
		"tap_target": false,
	},
	GOLDEN_SHEEP: {
		"label": "Golden Sheep",
		"power_id": "transform_tiles",
		# Every grass tile → sheep herd (React: grass → tile_herd_sheep).
		"params": {"from_category": "grass", "to_key": Constants.Tile.HERD_SHEEP},
		"tap_target": false,
	},
	PHILOSOPHERS_STONE: {
		"label": "Philosopher's Stone",
		"power_id": "transform_tiles",
		# Every stone tile → gold (React: stone → tile_mine_gold).
		"params": {"from_category": "stone", "to_key": Constants.Tile.GOLD},
		"tap_target": false,
	},
	# Magic Wand — the FIRST tap_clear_type tool: tap a cell, sweep every tile of that key.
	MAGIC_WAND: {
		"label": "Magic Wand",
		"power_id": "tap_clear_type",
		"params": {},
		"tap_target": true,
	},
	# Magic Seed — the FIRST restore_turns tool: a STATE power handled in
	# GameState.use_tool_on_grid's early path (never touches the grid). Gives back `amount`
	# farm turns before the next harvest boundary.
	MAGIC_SEED: {
		"label": "Magic Seed",
		"power_id": "restore_turns",
		"params": {"amount": 5},
		"tap_target": false,
	},
	# Magic Fertilizer — reuses the already-wired fill_bias state power. 3 biased farm turns
	# toward wheat (React: next 3 fills spawn grain).
	MAGIC_FERTILIZER: {
		"label": "Magic Fertilizer",
		"power_id": "fill_bias",
		"params": {"target": Constants.Tile.WHEAT, "turns": 3},
		"tap_target": false,
	},
	# ── Wolf-hazard tools (T14a) — STATE powers handled in GameState's early path (never reach
	# apply_instant; they mutate hazards.wolves). Rifle drives off the whole pack; Hound scatters
	# them (scared 5 turns). Both are instant (no tapped cell). Ported from React rifle/hound.
	RIFLE: {
		"label": "Rifle",
		"power_id": "clear_wolves",
		"params": {},
		"tap_target": false,
	},
	HOUND: {
		"label": "Hound",
		"power_id": "scatter_hazard",
		"params": {},
		"tap_target": false,
	},
	# ── Mine-hazard tools (T14b) — STATE powers handled in GameState.use_tool_on_grid's early path
	# (they mutate `mine_hazards` + the grid, never reaching apply_instant). Both are instant.
	WATER_PUMP: {
		"label": "Water Pump",
		"power_id": "water_pump",
		"params": {},
		"tap_target": false,
	},
	EXPLOSIVES: {
		"label": "Explosives",
		"power_id": "explosives",
		"params": {},
		"tap_target": false,
	},
}

## Stable display / iteration order for every tool id. Grouped by biome so the rack
## reads sensibly: the original M8a set first, then the Tools-PR1 farm tools, then the
## mine tools.
const TOOL_IDS: Array = [
	# Original M8a representative set (tap tools then instant).
	BOMB, RAKE, SICKLE, AUGER, BLAST_CHARGE, MAGNET,
	AXE, SCYTHE, STONE_HAMMER, DRILL,
	# Tools PR1 — Farm produce / categories.
	SCYTHE_FULL, HOE, PLOUGH, TRIMMER, BEE,
	FRUIT_PICKER, BIRD_CAGE, HERDERS_CROOK, MILK_CHURN, SADDLE,
	# Tools PR1 — Mine ores.
	IRON_PICK, COAL_HAMMER, GOLD_PICK, COAL_TRANSMUTER,
	# Tools PR2 — new powers (transform_random_n / reshuffle_board / clear_hazard).
	SEEDPACK, LOCKBOX, RESHUFFLE_HORN, CAT, TERRIER,
	# Tools PR2b — fill_bias spawn-bias tools (fertilizer/bird_feed/sapling).
	FERTILIZER, BIRD_FEED, SAPLING,
	# Tools PR3 — portal magic tools (transform_tiles / tap_clear_type / restore_turns / fill_bias).
	GOLDEN_APPLE, GOLDEN_CARROT, GOLDEN_IDOL, GOLDEN_SHEEP, PHILOSOPHERS_STONE,
	MAGIC_WAND, MAGIC_SEED, MAGIC_FERTILIZER,
	# T14a — wolf-hazard tools (clear_wolves / scatter_hazard state powers).
	RIFLE, HOUND,
	# T14b — mine-hazard tools (water_pump / explosives state powers).
	WATER_PUMP, EXPLOSIVES,
]

# ── Static helpers (usable without an instance) ──────────────────────────────

## The full tool entry for `id`, or an empty Dictionary for unknown ids.
static func get_tool(id: String) -> Dictionary:
	return TOOLS.get(id, {})

## True when `id` names a real tool. (Named has_tool, not is_tool, because the
## latter collides with Script.is_tool() when called on the class_name reference.)
static func has_tool(id: String) -> bool:
	return TOOLS.has(id)

## True when `id` is a tap-target tool (needs a tapped cell). False for instant
## tools AND for unknown ids.
static func is_tap_target(id: String) -> bool:
	if not has_tool(id):
		return false
	return bool(TOOLS[id].get("tap_target", false))

## Every tool id in stable order.
static func all_ids() -> Array:
	return TOOL_IDS.duplicate()

static func tool_label(id: String) -> String:
	if not has_tool(id):
		return ""
	return String(TOOLS[id].get("label", ""))

static func power_id(id: String) -> String:
	if not has_tool(id):
		return ""
	return String(TOOLS[id].get("power_id", ""))

## Resolve every Constants.Tile value belonging to a category id (e.g. "trees").
## Returns Array[int] in Tile-enum order. Used by clear_category (axe).
static func tiles_in_category(category: String) -> Array:
	var out: Array = []
	for tile in Constants.CATEGORY.keys():
		if String(Constants.CATEGORY[tile]) == category:
			out.append(int(tile))
	out.sort()
	return out

## Resolve the UNION of every Constants.Tile value across several category ids.
## De-duplicated and sorted. Used by the multi-category clear (plough → grass+grain)
## and by transform_adjacent's from_categories (coal_transmuter → the mine ores).
static func tiles_in_categories(categories: Array) -> Array:
	var seen: Dictionary = {}
	for cat in categories:
		for tile in tiles_in_category(String(cat)):
			seen[int(tile)] = true
	var out: Array = seen.keys()
	out.sort()
	return out

## Resolve a transform_random_n `to` target: either a literal Constants.Tile int, or
## a biome spawn-target STRING. Faithful port of the web's resolveTransformKey for the
## FARM biome: "biome_base" → GRASS (the farm staple), "biome_rare" → FRUIT_BLACKBERRY
## (the farm rare). An int passes through unchanged. Unknown strings fall back to GRASS.
static func _resolve_spawn_key(to) -> int:
	if to is int:
		return int(to)
	match String(to):
		"biome_base": return Constants.Tile.GRASS
		"biome_rare": return Constants.Tile.FRUIT_BLACKBERRY
		_:            return Constants.Tile.GRASS

## Resolve a clear_hazard `target` to a Constants.Tile hazard value. "rats" → RAT.
## A literal int passes through unchanged. Unknown names resolve to RAT (the only
## hazard the port's clear_hazard tools target).
static func _resolve_hazard_key(target) -> int:
	if target is int:
		return int(target)
	match String(target):
		"rats": return Constants.Tile.RAT
		_:      return Constants.Tile.RAT

# ── Dispatch (catalog params → ToolEffects primitive) ─────────────────────────

## Apply an INSTANT (non-tap) tool over the whole board. Returns the dispatched
## ToolEffects result Dictionary ({grid, collected} or {grid, transformed}); an
## empty Dictionary for unknown / tap-target / unhandled tools. `rng` is only used
## by clear_random_n; when omitted a fresh seeded generator is created so the result
## is deterministic for tests (pass a seeded rng for a specific outcome).
static func apply_instant(grid: Array, id: String, rng: RandomNumberGenerator = null) -> Dictionary:
	if not has_tool(id) or is_tap_target(id):
		return {}
	var entry: Dictionary = TOOLS[id]
	var params: Dictionary = entry.get("params", {})
	match String(entry.get("power_id", "")):
		"clear_all":
			return ToolEffects.sweep_keys(grid, [int(params.get("target", Constants.EMPTY))])
		"clear_category":
			# Accept EITHER a single `category` (String) OR `categories` (Array of
			# Strings, unioned). The single-category path keeps axe working unchanged.
			var keys: Array
			if params.has("categories"):
				keys = tiles_in_categories(params.get("categories", []))
			else:
				keys = tiles_in_category(String(params.get("category", "")))
			return ToolEffects.sweep_keys(grid, keys)
		"clear_random_n":
			var r: RandomNumberGenerator = rng
			if r == null:
				r = RandomNumberGenerator.new()
				r.randomize()
			return ToolEffects.clear_random_n(grid, int(params.get("count", 6)), r)
		"transform_tiles":
			# Accept EITHER explicit `from_keys` (Array of ints — drill) OR a
			# `from_category` (String) resolved at dispatch (trimmer / bee). drill's
			# explicit-keys path is unchanged.
			var from_keys: Array
			if params.has("from_category"):
				from_keys = tiles_in_category(String(params.get("from_category", "")))
			else:
				from_keys = params.get("from_keys", [])
			return ToolEffects.transform_all(
				grid,
				from_keys,
				int(params.get("to_key", Constants.EMPTY)),
			)
		"transform_random_n":
			# Re-seed N random cells to a biome target. `to` may be a literal Tile int or a
			# spawn-target string ("biome_base"/"biome_rare"), resolved here. Deterministic
			# given a seeded rng (a fresh randomized one when omitted — same contract as
			# clear_random_n).
			var rt: RandomNumberGenerator = rng
			if rt == null:
				rt = RandomNumberGenerator.new()
				rt.randomize()
			return ToolEffects.transform_random_n(
				grid,
				int(params.get("count", 0)),
				_resolve_spawn_key(params.get("to", Constants.Tile.GRASS)),
				rt,
			)
		"reshuffle_board":
			# Pure value-permutation of the board. Deterministic given a seeded rng (a fresh
			# randomized one when omitted). The shuffled grid is re-landed through Board.
			# apply_external_grid's has_valid_chain guard, so it can't strand the player.
			var rs: RandomNumberGenerator = rng
			if rs == null:
				rs = RandomNumberGenerator.new()
				rs.randomize()
			return ToolEffects.shuffle_tiles(grid, rs)
		"clear_hazard":
			# Remove the named hazard from the board (bypasses the HAZARD_LOCK for it). Credits
			# nothing (hazards yield nothing). `target` is a hazard name ("rats") → Tile.RAT.
			return ToolEffects.clear_hazard(grid, _resolve_hazard_key(params.get("target", "rats")))
		_:
			return {}

## Apply a TAP-target tool at `cell` (Vector2i, col/row). Returns the dispatched
## ToolEffects result Dictionary; an empty Dictionary for unknown / instant /
## unhandled tools. Selection powers (row / column / cross / component) select then
## sweep_cells, so hazards in the selection survive — matching React.
static func apply_tap(grid: Array, id: String, cell: Vector2i) -> Dictionary:
	if not has_tool(id) or not is_tap_target(id):
		return {}
	var entry: Dictionary = TOOLS[id]
	var params: Dictionary = entry.get("params", {})
	match String(entry.get("power_id", "")):
		"area_blast":
			return ToolEffects.area_blast(grid, cell, int(params.get("radius", 1)))
		"clear_row":
			return ToolEffects.sweep_cells(grid, ToolEffects.select_row(grid, cell, int(params.get("span", 1))))
		"clear_column":
			return ToolEffects.sweep_cells(grid, ToolEffects.select_column(grid, cell, int(params.get("span", 1))))
		"clear_cross":
			return ToolEffects.sweep_cells(grid, ToolEffects.select_cross(grid, cell))
		"clear_component":
			return ToolEffects.sweep_cells(grid, ToolEffects.select_component(grid, cell))
		"tap_clear_type":
			# Magic Wand: read the tapped cell's key and sweep EVERY tile of that key off the
			# board (credited like a chain via sweep_keys). Tapping an EMPTY or HAZARD cell is a
			# no-op ({}) — no charge is burned (use_tool_on_grid treats an empty result as a
			# no_effect failure that consumes nothing).
			var k: int = grid[cell.y][cell.x]
			if k == Constants.EMPTY or ToolEffects.is_hazard(k):
				return {}
			return ToolEffects.sweep_keys(grid, [k])
		"transform_adjacent":
			# Accept EITHER explicit `from_keys` (Array of ints — magnet) OR
			# `from_categories` (Array of Strings — coal_transmuter) resolved here.
			# magnet's explicit-keys path is unchanged.
			var from_keys: Array
			if params.has("from_categories"):
				from_keys = tiles_in_categories(params.get("from_categories", []))
			else:
				from_keys = params.get("from_keys", [])
			return ToolEffects.transform_adjacent(
				grid,
				cell,
				int(params.get("radius", 1)),
				from_keys,
				int(params.get("to_key", Constants.EMPTY)),
			)
		_:
			return {}

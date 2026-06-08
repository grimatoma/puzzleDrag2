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
}

## Stable display / iteration order for every tool id.
const TOOL_IDS: Array = [
	BOMB, RAKE, SICKLE, AUGER, BLAST_CHARGE, MAGNET,
	AXE, SCYTHE, STONE_HAMMER, DRILL,
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
			var keys: Array = tiles_in_category(String(params.get("category", "")))
			return ToolEffects.sweep_keys(grid, keys)
		"clear_random_n":
			var r: RandomNumberGenerator = rng
			if r == null:
				r = RandomNumberGenerator.new()
				r.randomize()
			return ToolEffects.clear_random_n(grid, int(params.get("count", 6)), r)
		"transform_tiles":
			return ToolEffects.transform_all(
				grid,
				params.get("from_keys", []),
				int(params.get("to_key", Constants.EMPTY)),
			)
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
		"transform_adjacent":
			return ToolEffects.transform_adjacent(
				grid,
				cell,
				int(params.get("radius", 1)),
				params.get("from_keys", []),
				int(params.get("to_key", Constants.EMPTY)),
			)
		_:
			return {}

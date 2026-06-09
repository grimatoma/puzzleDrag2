class_name PortalConfig
extends RefCounted
## Magic Portal — the summon catalog of MAGIC TOOLS, ported from the React portal feature
## (src/features/portal/data.ts MAGIC_TOOLS) as a pure-data catalog + helper statics.
##
## Each magic tool is SUMMONED at the Portal by spending the Influence currency
## (granted by Decorations). Summoning a tool deducts its `influence_cost` and adds +1 to
## the player's tools dict (see GameState.summon_magic_tool). The catalog is carried
## VERBATIM from data.ts (real ids / names / influence costs / effect text):
##   magic_wand          Magic Wand           80   tap_clear_type
##   hourglass           Hourglass            120  undo_move
##   magic_seed          Magic Seed           100  restore_turns
##   magic_fertilizer    Magic Fertilizer     60   fill_bias
##   golden_apple        Golden Apple         140  transform_tiles (trees → apple)
##   golden_carrot       Golden Carrot        90   transform_tiles (grass → carrot)
##   golden_idol         Golden Idol          110  transform_tiles (grass → cow)
##   golden_sheep        Golden Sheep         110  transform_tiles (grass → sheep)
##   philosophers_stone  Philosopher's Stone  200  transform_tiles (stone → gold)
##   miners_hat          Miner's Hat          50   reveal_tiles
##
## SCOPE (faithful, self-contained port). This config + GameState.summon_magic_tool +
## the PortalScreen port the Portal feature's REAL backing logic: the summon ECONOMY (pay
## Influence → own a magic tool) and the build gate (build the Portal with coins + runes).
##
## EFFECTS (Tools PR3 update). EIGHT of these magic tools are now WIRED + usable: their
## effects are implemented as Godot-native ToolConfig members (transform_tiles / tap_clear_type
## / restore_turns / fill_bias), so once summoned they appear in the tool rack and fire through
## the normal GameState.use_tool_on_grid path — see ToolConfig (GOLDEN_APPLE/CARROT/IDOL/SHEEP,
## PHILOSOPHERS_STONE, MAGIC_WAND, MAGIC_SEED, MAGIC_FERTILIZER). PortalConfig stays the summon
## ECONOMY; ToolConfig provides the power. The `power` block on each entry below still captures
## the original React metadata (power id + params, VERBATIM from src/constants.ts) for the Wiki.
##
## EFFECTS (T24 update). `miners_hat` (reveal_tiles) is NOW WIRED — the seasonal-boss `hide_resources`
## modifier (Mossback) added the HIDDEN-TILE layer it needed, so miners_hat is a real ToolConfig member
## whose reveal_tiles STATE power reveals every hidden boss cell. Only `hourglass` (undo_move) stays
## DEFERRED — it needs a board/inventory SNAPSHOT system that doesn't exist yet — so it remains
## summonable (the catalog surfaces it) but effect-less, and is intentionally NOT a ToolConfig member.
##
## Registered as a `class_name` global (like CastleConfig / DecorationConfig / WorkerConfig)
## so its const + static helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

## The ported magic tools, in stable display order. Each entry:
##   id:             String     — stable tool id (matches React MAGIC_TOOLS id + ITEMS key)
##   name:           String     — display name
##   influence_cost: int        — Influence spent to summon one
##   effect:         String     — player-facing effect text (carried from data.ts)
##   power:          Dictionary — captured React power metadata { id:String, params:Dict }
##                                (NOT implemented in this milestone — see scope note above)
const MAGIC_TOOLS: Array = [
	{
		"id": "magic_wand", "name": "Magic Wand", "influence_cost": 80,
		"effect": "Pick a tile type; collect every tile of that type on the board. No turn cost.",
		"power": {"id": "tap_clear_type", "params": {}},
	},
	{
		"id": "hourglass", "name": "Hourglass", "influence_cost": 120,
		"effect": "Restore board, inventory, and turnsUsed to pre-last-chain snapshot (one-deep undo).",
		"power": {"id": "undo_move", "params": {}},
	},
	{
		"id": "magic_seed", "name": "Magic Seed", "influence_cost": 100,
		"effect": "Add 5 to session turnsRemaining (this session only).",
		"power": {"id": "restore_turns", "params": {"amount": 5}},
	},
	{
		"id": "magic_fertilizer", "name": "Magic Fertilizer", "influence_cost": 60,
		"effect": "Next 3 fillBoard() calls spawn grain in every cell.",
		"power": {"id": "fill_bias", "params": {"target": "tile_grain_wheat", "turns": 3}},
	},
	{
		"id": "golden_apple", "name": "Golden Apple", "influence_cost": 140,
		"effect": "Transforms every tree tile on the board into apple-fruit tiles.",
		"power": {"id": "transform_tiles", "params": {"from": "trees", "to": "tile_fruit_apple"}},
	},
	{
		"id": "golden_carrot", "name": "Golden Carrot", "influence_cost": 90,
		"effect": "Transforms every grass tile on the board into carrot vegetable tiles.",
		"power": {"id": "transform_tiles", "params": {"from": "grass", "to": "tile_veg_carrot"}},
	},
	{
		"id": "golden_idol", "name": "Golden Idol", "influence_cost": 110,
		"effect": "Transforms every grass tile on the board into cattle (cow) tiles.",
		"power": {"id": "transform_tiles", "params": {"from": "grass", "to": "tile_cattle_cow"}},
	},
	{
		"id": "golden_sheep", "name": "Golden Sheep", "influence_cost": 110,
		"effect": "Transforms every grass tile on the board into sheep herd tiles.",
		"power": {"id": "transform_tiles", "params": {"from": "grass", "to": "tile_herd_sheep"}},
	},
	{
		"id": "philosophers_stone", "name": "Philosopher's Stone", "influence_cost": 200,
		"effect": "Transmutes every stone tile in the mine into gold tiles.",
		"power": {"id": "transform_tiles", "params": {"from": "stone", "to": "tile_mine_gold"}},
	},
	{
		"id": "miners_hat", "name": "Miner's Hat", "influence_cost": 50,
		"effect": "Reveals every hidden ore tile (coal/iron/gold/gem). No effect until hidden-tile spawning ships — entry exists so the Wiki surfaces it.",
		"power": {"id": "reveal_tiles", "params": {"target": ["coal", "iron", "gold", "gem"]}},
	},
]

## Stable iteration order of the magic-tool ids.
const MAGIC_TOOL_IDS: Array = [
	"magic_wand", "hourglass", "magic_seed", "magic_fertilizer",
	"golden_apple", "golden_carrot", "golden_idol", "golden_sheep",
	"philosophers_stone", "miners_hat",
]

# ── Static helpers (usable without an instance) ──────────────────────────────────

## Every magic-tool entry in stable catalog order (a deep copy of each row, so the
## caller can't mutate the const params dicts).
static func all() -> Array:
	var out: Array = []
	for t in MAGIC_TOOLS:
		out.append((t as Dictionary).duplicate(true))
	return out

## Number of magic tools in the catalog.
static func count() -> int:
	return MAGIC_TOOLS.size()

## True when `id` names a real magic tool. (Named `has_tool`, mirroring DecorationConfig's
## `has_decoration` / CastleConfig's `has_need` — and avoiding a collision with the built-in
## Script.is_tool() method that GDScript resolves first.)
static func has_tool(id: String) -> bool:
	for t in MAGIC_TOOLS:
		if String(t.get("id", "")) == id:
			return true
	return false

## The full magic-tool entry for `id` (a deep COPY), or {} for an unknown id.
static func get_tool(id: String) -> Dictionary:
	for t in MAGIC_TOOLS:
		if String(t.get("id", "")) == id:
			return (t as Dictionary).duplicate(true)
	return {}

## Display name for magic tool `id` ("" for an unknown id).
static func tool_name(id: String) -> String:
	return String(get_tool(id).get("name", ""))

## Player-facing effect text for `id` ("" for an unknown id).
static func effect(id: String) -> String:
	return String(get_tool(id).get("effect", ""))

## The Influence cost to summon `id` (0 for an unknown id).
static func influence_cost(id: String) -> int:
	return int(get_tool(id).get("influence_cost", 0))

## The captured React power metadata for `id` (a COPY: { id:String, params:Dict }), or {}
## for an unknown id. NOT implemented this milestone — see the scope note at the top.
static func power(id: String) -> Dictionary:
	return get_tool(id).get("power", {})

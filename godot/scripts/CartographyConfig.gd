class_name CartographyConfig
extends RefCounted
## Pure data for the CARTOGRAPHY world map — a FAITHFUL port of the React game's
## `src/features/cartography/data.ts` (MAP_NODES + MAP_EDGES + REGIONS + NODE_COLORS +
## KIND_LABELS) and `src/features/cartography/lore.ts` (per-node lore + flavour quote).
##
## T26 — the full 11-node illustrated parchment map (was a trimmed 3-node hub before).
## Eleven nodes across seven regions, fourteen roads, each node carrying its KIND (home /
## farm / mine / fish / festival / boss / event / capital), its 0..100 SVG-viewBox layout
## x/y, a player-level gate, an entry cost (coins), a danger list, a description, an
## activity list, AND — for the BOARD kinds (farm / mine / fish) — its own board template
## (baseTurns + the farm upgradeMap + the season-weighted seasonDrops), so traveling to a
## node enters the RIGHT board with that node's rules.
##
## The board templates mirror the React FarmBoardInstance / MineBoardInstance /
## FishBoardInstance (data.ts:64-191): TEMPERATE_FARM (home + meadow), ORCHARD_FARM
## (orchard), MINE_STANDARD (quarry), MINE_EXTENDED (caves + forge), FISH_HARBOR (harbor).
## Categories use the GODOT category ids (Constants.CATEGORY: grass/grain/trees/birds/veg/
## fruit/flower/herd/cattle/mount) — the React vegetables/fruits/herd_animals/mounts already
## translated. "gold" is the upgrade-target sentinel (React GOLD = "no upgrade tile, coins").
##
## NON-BOARD kinds (event / festival / boss / capital) carry an empty `board` ({}) and a
## `board_kind` of "" — Main handles their activity (boss → the boss challenge; festival /
## event → a flavour toast / story hook; capital → gated on the three Hearth-Tokens, which
## do not exist as a currency in the port yet, so the node stays locked with the reason shown).
##
## A stateless `class_name` global (NOT an autoload): every value is a `const`, so it's
## reachable as `CartographyConfig.MAP_NODES` / `CartographyConfig.all()` WITHOUT an
## instance (mirrors Constants / Palette / ZoneConfig, so the helpers also work in headless
## tests before a scene tree exists).

## The upgrade-target sentinel meaning "no upgrade tile — coins instead" (React GOLD).
const GOLD: String = "gold"

# ── board templates (mirror the React FarmBoardInstance / MineBoardInstance / FishBoardInstance) ──

## TEMPERATE_FARM_TEMPLATE — data.ts:64-124. The standard farm board (home + meadow).
const TEMPERATE_FARM := {
	"base_turns": 10,
	"upgrade_map": {
		"grass": "birds",
		"grain": "veg",
		"trees": "birds",
		"birds": "herd",
		"veg":   "fruit",
		"fruit": GOLD,
	},
	"season_drops": {
		"Spring": {
			"grass": 0.38, "grain": 0.20, "trees": 0.20, "birds": 0.05, "veg": 0.13, "fruit": 0.04,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Summer": {
			"grass": 0.12, "grain": 0.38, "trees": 0.10, "birds": 0.15, "veg": 0.21, "fruit": 0.04,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Autumn": {
			"grass": 0.10, "grain": 0.15, "trees": 0.42, "birds": 0.15, "veg": 0.15, "fruit": 0.03,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Winter": {
			"grass": 0.05, "grain": 0.05, "trees": 0.73, "birds": 0.10, "veg": 0.05, "fruit": 0.02,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
	},
}

## ORCHARD_FARM_TEMPLATE — data.ts:126-187. The fruit-rich farm board (orchard); base 12.
const ORCHARD_FARM := {
	"base_turns": 12,
	"upgrade_map": {
		"grass": "grain",
		"grain": "veg",
		"trees": "fruit",
		"birds": "herd",
		"veg":   "fruit",
		"fruit": GOLD,
		"herd":  GOLD,
	},
	"season_drops": {
		"Spring": {
			"grass": 0.10, "grain": 0.10, "trees": 0.25, "birds": 0.10, "veg": 0.05, "fruit": 0.40,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Summer": {
			"grass": 0.05, "grain": 0.10, "trees": 0.20, "birds": 0.20, "veg": 0.05, "fruit": 0.40,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Autumn": {
			"grass": 0.05, "grain": 0.10, "trees": 0.35, "birds": 0.10, "veg": 0.05, "fruit": 0.35,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
		"Winter": {
			"grass": 0.05, "grain": 0.05, "trees": 0.60, "birds": 0.15, "veg": 0.05, "fruit": 0.10,
			"flower": 0.0, "herd": 0.0, "cattle": 0.0, "mount": 0.0,
		},
	},
}

## MINE_STANDARD / MINE_EXTENDED / FISH_HARBOR — data.ts:189-191. The mine + fish boards
## carry only a base-turn budget in React (no per-zone upgrade map / season drops; their
## pools are the non-seasonal MINE_POOL / tide pools the port already owns).
const MINE_STANDARD := { "base_turns": 10 }
const MINE_EXTENDED := { "base_turns": 12 }
const FISH_HARBOR := { "base_turns": 12 }

# ── the 11 nodes (faithful port of MAP_NODES, data.ts:193-345) ─────────────────
## Each node: id, name, kind, icon, x/y (0..100), level (player-level gate), region,
## entry_cost (coins), description, activities, dangers, board_kind ("farm"/"mine"/"fish"/""),
## board (the matching template, {} for non-board nodes), requires_hearth_tokens (the Old
## Capital). `board_kind` is the GameState.active_biome value entering this node maps to
## (React MapNodeKind "fish" → biome "harbor"; see board_biome()).
const MAP_NODES: Array = [
	{
		"id": "home", "name": "Hearthwood Vale", "kind": "home", "icon": "🏡",
		"x": 10.0, "y": 50.0, "level": 1, "region": "hearth", "entry_cost": {"coins": 50},
		"description": "Your home village. Build, craft, and rest by the hearth.",
		"activities": ["Manage town", "Craft & build", "Turn in orders"],
		"dangers": [], "board_kind": "farm", "board": TEMPERATE_FARM,
	},
	{
		"id": "meadow", "name": "Greenmeadow", "kind": "farm", "icon": "🌾",
		"x": 24.0, "y": 28.0, "level": 1, "region": "farm", "entry_cost": {"coins": 50},
		"description": "Sun-drenched fields. Easy harvests for new farmers.",
		"activities": ["Harvest farm tiles", "Common resources"],
		"dangers": [], "board_kind": "farm", "board": TEMPERATE_FARM,
	},
	{
		"id": "orchard", "name": "Wild Orchard", "kind": "farm", "icon": "🍎",
		"x": 24.0, "y": 72.0, "level": 2, "region": "farm", "entry_cost": {"coins": 50},
		"description": "Tangled rows of fruit trees. Richer farm yields.",
		"activities": ["Harvest farm tiles", "Higher-tier crops"],
		"dangers": [], "board_kind": "farm", "board": ORCHARD_FARM,
	},
	{
		"id": "crossroads", "name": "The Crossroads", "kind": "event", "icon": "🎲",
		"x": 40.0, "y": 50.0, "level": 2, "region": "wilds", "entry_cost": {"coins": 0},
		"description": "A windswept junction where strangers and rumors meet.",
		"activities": ["Random encounters", "Story bits"],
		"dangers": [], "board_kind": "", "board": {},
	},
	{
		"id": "quarry", "name": "Cracked Quarry", "kind": "mine", "icon": "⛏",
		"x": 56.0, "y": 26.0, "level": 2, "region": "mine", "entry_cost": {"coins": 100},
		"description": "A wide, shattered pit. Stone, ore, and a few coins lost in cracks.",
		"activities": ["Harvest mine tiles", "Ore & stone"],
		"dangers": ["cave_in", "gas_vent", "mole"], "board_kind": "mine", "board": MINE_STANDARD,
	},
	{
		"id": "caves", "name": "Lanternlit Caves", "kind": "mine", "icon": "🪨",
		"x": 56.0, "y": 74.0, "level": 4, "region": "mine", "entry_cost": {"coins": 100},
		"description": "Twisting tunnels lit by old miners' lanterns. Rare gems hide deep within.",
		"activities": ["Harvest mine tiles", "Rare gems"],
		"dangers": ["cave_in", "gas_vent", "lava", "mole"], "board_kind": "mine", "board": MINE_EXTENDED,
	},
	{
		"id": "fairground", "name": "Drifter's Fairground", "kind": "festival", "icon": "🎪",
		"x": 72.0, "y": 50.0, "level": 3, "region": "wilds", "entry_cost": {"coins": 0},
		"description": "A rolling fair of music, trinkets, and seasonal contests.",
		"activities": ["Festival rewards", "Limited-time offers"],
		"dangers": [], "board_kind": "", "board": {},
	},
	{
		"id": "forge", "name": "Black Forge", "kind": "mine", "icon": "🔥",
		"x": 86.0, "y": 28.0, "level": 5, "region": "mine", "entry_cost": {"coins": 200},
		"description": "A roaring smithy at the foot of the mountain. Where heroes' tools are born.",
		"activities": ["Advanced crafting", "Boss-tier resources"],
		"dangers": [], "board_kind": "mine", "board": MINE_EXTENDED,
	},
	{
		"id": "pit", "name": "The Pit", "kind": "boss", "icon": "⚔",
		"x": 90.0, "y": 72.0, "level": 6, "region": "boss", "entry_cost": {"coins": 0},
		"description": "Something stirs in the dark. Bring your best chains.",
		"activities": ["Boss battles", "Rare loot"],
		"dangers": [], "board_kind": "", "board": {},
	},
	{
		"id": "harbor", "name": "Saltspray Harbor", "kind": "fish", "icon": "⚓",
		"x": 16.0, "y": 86.0, "level": 3, "region": "coast", "entry_cost": {"coins": 50},
		"description": "A weather-bleached pier with nets full of sardines and clams. Tide and luck do most of the work.",
		"activities": ["Harvest fish tiles", "Sardine, mackerel & clams"],
		"dangers": [], "board_kind": "fish", "board": FISH_HARBOR,
	},
	{
		"id": "oldcapital", "name": "The Old Capital", "kind": "capital", "icon": "🏛",
		"x": 93.0, "y": 50.0, "level": 1, "region": "capital", "entry_cost": {"coins": 0},
		"description": "The first hearth of the old kingdom — dark for an age. They say the Ember still waits there.",
		"activities": ["Requires all 3 Hearth-Tokens", "The Long Return ends here"],
		"dangers": [], "board_kind": "", "board": {}, "requires_hearth_tokens": true,
	},
]

## The 14 roads (faithful port of MAP_EDGES, data.ts:347-362). Each edge is an ordered
## [from_id, to_id] pair (drawn + walked undirected).
const EDGES: Array = [
	["home", "meadow"],
	["home", "orchard"],
	["home", "harbor"],
	["meadow", "crossroads"],
	["orchard", "crossroads"],
	["crossroads", "quarry"],
	["crossroads", "caves"],
	["quarry", "fairground"],
	["caves", "fairground"],
	["fairground", "forge"],
	["fairground", "pit"],
	["forge", "pit"],
	["forge", "oldcapital"],
	["pit", "oldcapital"],
]

## Per-kind node tint (faithful port of NODE_COLORS, data.ts:364-373). The screen tints each
## node disc + the row icon by its kind.
const NODE_COLORS: Dictionary = {
	"home":     Color8(0xbb, 0x3b, 0x2f),
	"farm":     Color8(0x91, 0xbf, 0x24),
	"mine":     Color8(0x7c, 0x83, 0x88),
	"fish":     Color8(0x4a, 0x8a, 0xaa),
	"festival": Color8(0xc8, 0x92, 0x3a),
	"boss":     Color8(0x3a, 0x1a, 0x1a),
	"event":    Color8(0x5a, 0x7a, 0x9a),
	"capital":  Color8(0xd4, 0xaf, 0x37),
}

## The 7 regions (faithful port of REGIONS, data.ts:375-383). cx/cy/rx/ry are in 0..100 layout
## space; fill is the region blob colour. The screen paints these as soft ellipses UNDER the roads.
const REGIONS: Array = [
	{ "id": "hearth",  "label": "Hearthlands",     "cx": 12.0, "cy": 50.0, "rx": 16.0, "ry": 22.0, "fill": Color8(0xd8, 0xb8, 0x78) },
	{ "id": "farm",    "label": "Greenfields",     "cx": 26.0, "cy": 50.0, "rx": 14.0, "ry": 32.0, "fill": Color8(0xb8, 0xc8, 0x78) },
	{ "id": "wilds",   "label": "The Wilds",       "cx": 56.0, "cy": 50.0, "rx": 22.0, "ry": 30.0, "fill": Color8(0xc4, 0xb8, 0x88) },
	{ "id": "mine",    "label": "Stoneholds",      "cx": 72.0, "cy": 30.0, "rx": 22.0, "ry": 18.0, "fill": Color8(0xa8, 0xa4, 0xa0) },
	{ "id": "coast",   "label": "The Coast",       "cx": 16.0, "cy": 86.0, "rx": 14.0, "ry": 12.0, "fill": Color8(0x9a, 0xb8, 0xc4) },
	{ "id": "boss",    "label": "The Deep",        "cx": 90.0, "cy": 72.0, "rx": 12.0, "ry": 16.0, "fill": Color8(0x8a, 0x50, 0x50) },
	{ "id": "capital", "label": "The Old Capital", "cx": 93.0, "cy": 50.0, "rx":  7.0, "ry": 18.0, "fill": Color8(0xcd, 0xb5, 0x6a) },
]

## Per-kind label (faithful port of KIND_LABELS, data.ts:385-394). Shown in the detail panel.
const KIND_LABELS: Dictionary = {
	"home":     "Home Village",
	"farm":     "Farm Region",
	"mine":     "Mine Region",
	"fish":     "Fishing Harbor",
	"festival": "Festival",
	"boss":     "Boss Arena",
	"event":    "Wayside Event",
	"capital":  "The Old Capital",
}

## Per-node lore (faithful port of NODE_LORE, lore.ts:14-88): a short cartographic subtitle,
## an italic flavour quote (epitaph), and the speaker who said it. Surfaced in the detail panel.
const NODE_LORE: Dictionary = {
	"home": {
		"subtitle": "First hearth · the line's last keeper",
		"epitaph": "The ember has burned a hundred years without you. Now it burns with you.",
		"speaker": "Wren",
	},
	"meadow": {
		"subtitle": "Sister-hold · Greenfields",
		"epitaph": "The grain remembers a steadier hand than mine. Walk it well.",
		"speaker": "Wren",
	},
	"orchard": {
		"subtitle": "Sister-hold · the old planted rows",
		"epitaph": "Trees keep their own time. These have been counting since the founding.",
		"speaker": "Tomas",
	},
	"crossroads": {
		"subtitle": "Wayside · where rumor meets the road",
		"epitaph": "A crossroads is a place where two strangers can become a hold of two.",
		"speaker": "The old Charter, term IV",
	},
	"quarry": {
		"subtitle": "Sister-hold · the cracked face",
		"epitaph": "Stone keeps its grudges. Ask before you take, knock before you cut.",
		"speaker": "The Stone-Knocker",
	},
	"caves": {
		"subtitle": "Sister-hold · deep ways under lantern",
		"epitaph": "Each lantern down here is a name a miner left on the wall before going further.",
		"speaker": "Bram",
	},
	"fairground": {
		"subtitle": "Wayside · the drifters' fair",
		"epitaph": "If you didn't bring the festival to them, they will bring it to you. Bring coin.",
		"speaker": "Mira",
	},
	"forge": {
		"subtitle": "Sister-hold · the black forge",
		"epitaph": "My brother went looking for our stone here. The forge remembers him.",
		"speaker": "Bram",
	},
	"pit": {
		"subtitle": "The Deep · a wound in the land",
		"epitaph": "Something there refused to leave when the rest of us did. It will want a word.",
		"speaker": "Wren",
	},
	"harbor": {
		"subtitle": "Sister-hold · Saltspray pier",
		"epitaph": "The tide already knows your name. It will use it when it's ready.",
		"speaker": "The Tidesinger",
	},
	"oldcapital": {
		"subtitle": "Anchor of the Pact · the first hearth",
		"epitaph": "What is named, remains. What is forgotten, the Hollow Folk reclaim.",
		"speaker": "The Charter, term IV",
	},
}

## The three Hearth-Tokens that gate the Old Capital (lore.ts:94-119). The detail-panel "why
## locked" copy reads these names; T22 wired the CURRENCY (GameState.heirlooms) behind them.
const HEARTH_TOKENS: Array = [
	{ "id": "seed", "name": "Heirloom Seed", "glyph": "🌱", "source": "any completed farm" },
	{ "id": "iron", "name": "Pact-Iron", "glyph": "⚙", "source": "any completed mine" },
	{ "id": "pearl", "name": "Tidesinger's Pearl", "glyph": "◯", "source": "any completed harbor" },
]

# ── Settlement founding + biomes (T22, ported from src/features/zones/data.ts + constants.ts) ──

## Coin cost of the FIRST founding (the 2nd settlement; home is free). The k-th founding costs
## base × growth^(k-1). FAITHFUL to React SETTLEMENT_FOUNDING_BASE_COINS / _GROWTH (data.ts:379-380).
const FOUNDING_BASE_COINS: int = 300
const FOUNDING_GROWTH: float = 1.7

## The Hearth-Token id granted by a completed settlement of each TYPE. FAITHFUL to React
## HEARTH_TOKEN_FOR_TYPE (data.ts:517-521): farm → heirloomSeed, mine → pactIron, harbor →
## tidesingerPearl. Collecting all three opens the Old Capital.
const HEARTH_TOKEN_FOR_TYPE: Dictionary = {
	"farm": "heirloomSeed",
	"mine": "pactIron",
	"harbor": "tidesingerPearl",
}

## The biome picked at FOUNDING, keyed by settlement TYPE — FAITHFUL VERBATIM port of React
## SETTLEMENT_BIOMES (src/constants.ts:184-203). Each fixes the settlement's two hazards + a
## descriptive resource bonus. The `bonus` is descriptive (not yet a spawn multiplier), matching
## the React DEFERRED note.
const SETTLEMENT_BIOMES: Dictionary = {
	"farm": [
		{ "id": "prairie",  "name": "Prairie",  "icon": "🌾", "hazards": ["fire", "locusts"],    "bonus": "grain yield" },
		{ "id": "forest",   "name": "Forest",   "icon": "🌲", "hazards": ["wolves", "fungus"],   "bonus": "wood & herbs" },
		{ "id": "marsh",    "name": "Marsh",    "icon": "🪷", "hazards": ["poison", "flooding"], "bonus": "rare herbs" },
		{ "id": "highland", "name": "Highland", "icon": "⛰️", "hazards": ["frost", "rockslide"], "bonus": "livestock & hardy crops" },
	],
	"mine": [
		{ "id": "mountain",  "name": "Mountain",  "icon": "🏔️", "hazards": ["cave_in", "gas_pocket"], "bonus": "iron & stone" },
		{ "id": "tundra",    "name": "Tundra",    "icon": "❄️", "hazards": ["frost", "ice_spike"],     "bonus": "gems" },
		{ "id": "volcanic",  "name": "Volcanic",  "icon": "🌋", "hazards": ["lava", "ash_cloud"],      "bonus": "rare metals" },
		{ "id": "deep_cave", "name": "Deep Cave", "icon": "🦇", "hazards": ["bats", "sinkhole"],       "bonus": "crystals & runes" },
	],
	"harbor": [
		{ "id": "coastal",  "name": "Coastal",  "icon": "🌊", "hazards": ["storm", "shark"],         "bonus": "standard fish" },
		{ "id": "coral",    "name": "Coral",    "icon": "🪸", "hazards": ["jellyfish", "riptide"],   "bonus": "pearls" },
		{ "id": "arctic",   "name": "Arctic",   "icon": "🧊", "hazards": ["iceberg", "frostbite"],   "bonus": "exotic catches" },
		{ "id": "tropical", "name": "Tropical", "icon": "🏝️", "hazards": ["cyclone", "sea_monster"], "bonus": "spices & trade goods" },
	],
}

## Home's implicit biome (it's pre-founded, never goes through the picker). React DEFAULT_HOME_BIOME
## (src/constants.ts:205) is "prairie".
const DEFAULT_HOME_BIOME: String = "prairie"

## The biome options for founding a settlement of `type` (a COPY; [] for an unknown type).
## React biomesForType (data.ts:575-578).
static func biomes_for_type(type: String) -> Array:
	var list: Variant = SETTLEMENT_BIOMES.get(type, [])
	return (list as Array).duplicate(true) if list is Array else []

## Pick a biome for `type`: the one matching `wanted`, else the first option, else {}. FAITHFUL
## to React resolveBiomeChoice (data.ts:606-610) — the founder picker passes the chosen id; a
## missing/unknown choice falls back to the type's first biome.
static func resolve_biome_choice(type: String, wanted: String) -> Dictionary:
	var list: Array = biomes_for_type(type)
	if list.is_empty():
		return {}
	for b in list:
		if String((b as Dictionary).get("id", "")) == wanted:
			return (b as Dictionary)
	return (list[0] as Dictionary)

## The full biome def ({id, name, icon, hazards, bonus}) for biome `biome_id` of settlement
## `type`, or {} when none matches.
static func biome_def(type: String, biome_id: String) -> Dictionary:
	for b in biomes_for_type(type):
		if String((b as Dictionary).get("id", "")) == biome_id:
			return (b as Dictionary)
	return {}

# ── helpers (pure, usable + testable without a scene tree) ─────────────────────

## Every node dict, in declaration order.
static func all() -> Array:
	return MAP_NODES

## The node dict with id `id`, or an empty dict when no node matches.
static func by_id(id: String) -> Dictionary:
	for n in MAP_NODES:
		if String(n.get("id", "")) == id:
			return n
	return {}

## True when `id` names a real node.
static func has_node(id: String) -> bool:
	return not by_id(id).is_empty()

## True when `a` and `b` are directly joined by a road (undirected).
static func is_adjacent(a: String, b: String) -> bool:
	for e in EDGES:
		var ea: String = String(e[0])
		var eb: String = String(e[1])
		if (ea == a and eb == b) or (ea == b and eb == a):
			return true
	return false

## The ids of every node directly joined to `id` by a road (a fresh Array).
static func neighbors_of(id: String) -> Array:
	var out: Array = []
	for e in EDGES:
		var ea: String = String(e[0])
		var eb: String = String(e[1])
		if ea == id and not out.has(eb):
			out.append(eb)
		elif eb == id and not out.has(ea):
			out.append(ea)
	return out

## The region dict with id `id`, or {} when none matches.
static func region_by_id(id: String) -> Dictionary:
	for r in REGIONS:
		if String(r.get("id", "")) == id:
			return r
	return {}

## The GameState.active_biome value a node's board_kind maps to: the React "fish" board kind
## plays on the GameState "harbor" biome; "farm"/"mine" map straight through; "" (a non-board
## node) yields "" (no board). This is the one rename between the React MapNodeKind and the
## port's three biome strings.
static func board_biome(node_id: String) -> String:
	var bk := String(by_id(node_id).get("board_kind", ""))
	match bk:
		"fish":
			return "harbor"
		"farm", "mine":
			return bk
		_:
			return ""

## True when `node_id` is a BOARD node (farm / mine / fish — it has a playable board).
static func is_board_node(node_id: String) -> bool:
	return String(by_id(node_id).get("board_kind", "")) != ""

## The coin cost to ENTER `node_id` (React MAP_NODES[].entryCost.coins). 0 when absent.
static func entry_cost(node_id: String) -> int:
	var ec: Dictionary = by_id(node_id).get("entry_cost", {})
	return int(ec.get("coins", 0))

## The player-level gate for `node_id` (React MAP_NODES[].level). 1 when absent.
static func level_req(node_id: String) -> int:
	return int(by_id(node_id).get("level", 1))

## The board template dict for `node_id` (TEMPERATE_FARM / ORCHARD_FARM / MINE_* / FISH_HARBOR),
## or {} for a non-board node.
static func board_template(node_id: String) -> Dictionary:
	return by_id(node_id).get("board", {})

## The season-cycle turn budget for `node_id`'s board (React boards.*.baseTurns). 0 when the
## node has no board.
static func base_turns(node_id: String) -> int:
	return int(board_template(node_id).get("base_turns", 0))

## The upgrade-target category for `source_cat` in `node_id`'s FARM board, the GOLD sentinel,
## or "" when `source_cat` is not an eligible category (or the node has no farm board).
static func upgrade_target(node_id: String, source_cat: String) -> String:
	var um: Dictionary = board_template(node_id).get("upgrade_map", {})
	return String(um.get(source_cat, ""))

## The ELIGIBLE base-spawn categories for `node_id`'s farm board — the KEYS of its upgrade map,
## in declaration order (a fresh Array; [] for a non-farm node).
static func eligible_categories(node_id: String) -> Array:
	var out: Array = []
	var um: Dictionary = board_template(node_id).get("upgrade_map", {})
	for k in um.keys():
		out.append(String(k))
	return out

## The season-drop weights for `node_id`'s farm board in season `season_name` ("Spring"…
## "Winter") — a fresh COPY of { godot-category → weight }. {} for a non-farm node / unknown
## season. Mutating the result never corrupts the const template.
static func season_drops(node_id: String, season_name: String) -> Dictionary:
	var sd: Dictionary = board_template(node_id).get("season_drops", {})
	var row: Dictionary = sd.get(season_name, {})
	return row.duplicate()

## The lore dict for `node_id` ({subtitle, epitaph, speaker}), or {} when none.
static func lore_for(node_id: String) -> Dictionary:
	return NODE_LORE.get(node_id, {})

## True when `node_id` is gated behind the three Hearth-Tokens (the Old Capital).
static func requires_hearth_tokens(node_id: String) -> bool:
	return bool(by_id(node_id).get("requires_hearth_tokens", false))

## The world-map KIND of `node_id` ("home" | "farm" | "mine" | "fish" | "event" | "festival" |
## "boss" | "capital"), or "" when unknown. (React MapNode.kind.)
static func kind_of(node_id: String) -> String:
	return String(by_id(node_id).get("kind", ""))

## The SETTLEMENT TYPE for `node_id` — "farm" | "mine" | "harbor" — or "" when the node isn't a
## settlement (event / festival / boss / capital). FAITHFUL port of React's settlementTypeForZone
## (src/features/zones/data.ts:509-515): a home/farm node → "farm"; a mine node → "mine"; a fish
## node → "harbor". This is the keeper TYPE the node founds, and the Hearth-Token type it yields.
static func settlement_type_for_zone(node_id: String) -> String:
	match kind_of(node_id):
		"home", "farm":
			return "farm"
		"mine":
			return "mine"
		"fish":
			return "harbor"
		_:
			return ""

## Map a GameState.active_biome value back to the node id the player is "at" on the world map.
## This is a fallback for a save written before the travel state existed (or any time the
## explicit map_current is unset): "farm" → "home", "mine" → "quarry", "harbor" → "harbor".
## GameState.map_current is the canonical current node; this only seeds it on first load.
static func current_id(active_biome: String) -> String:
	match active_biome:
		"mine":
			return "quarry"
		"harbor":
			return "harbor"
		_:
			return "home"

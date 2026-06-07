class_name DecorationConfig
extends RefCounted
## Decorations — repeatable village ornaments that grant Influence, ported from the
## React decorations feature (src/features/decorations/data.ts) as a pure-data catalog
## + helper statics.
##
## Each decoration is REPEATABLE: building it deducts a coins + inventory-item cost and
## grants a flat amount of the NEW `influence` currency (the Portal feature, ported next,
## will SPEND influence). There is no per-decoration cap — the same grant fires on every
## build, and a per-decoration built count is tracked in GameState.decorations.
##
## Carried VERBATIM from data.ts (real ids / names / costs / influence values):
##   violet_bed       Violet Bed       coins 60,  tile_grass_grass 4                +20
##   stone_lantern    Stone Lantern    coins 120, tile_mine_stone 6,  plank 2       +35
##   apple_sapling    Apple Sapling    coins 200, plank 4,  berry 6                 +60
##   driftwood_arch   Driftwood Arch   coins 180, plank 4,  tile_fish_kelp 6        +55
##   pearl_fountain   Pearl Fountain   coins 400, tile_mine_stone 8, tile_fish_oyster 4 +95
##   fishing_dock     Fishing Dock     coins 300, plank 10, tile_mine_stone 4       +80
##   cobble_well      Cobble Well      coins 220, tile_mine_stone 12, plank 2       +65
##   smelter_brazier  Smelter Brazier  coins 350, iron_bar 2, tile_mine_coal 8      +90
##
## The `cost` dict's "coins" key is the special coin cost; every OTHER key is an inventory
## resource/tile key the build deducts. Some cost keys (e.g. tile_fish_kelp / tile_fish_oyster /
## berry) name React resources that are not produced in the current Godot port; those
## decorations simply read as UNAFFORDABLE here — which is faithful (the deduction logic is
## key-agnostic, so they'd build the moment that resource exists). No invented costs.
##
## Registered as a `class_name` global (like CastleConfig / WorkerConfig) so its const +
## static helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.

## The ported decorations, in stable display order. Each entry:
##   id:        String              — stable decoration id (matches React DecorationId)
##   name:      String              — display name
##   cost:      Dictionary          — { "coins": int, <resource_key>: int, … }
##   influence: int                 — Influence granted on each build (repeatable)
const DECORATIONS: Array = [
	{"id": "violet_bed",      "name": "Violet Bed",      "cost": {"coins": 60,  "tile_grass_grass": 4},                       "influence": 20},
	{"id": "stone_lantern",   "name": "Stone Lantern",   "cost": {"coins": 120, "tile_mine_stone": 6, "plank": 2},           "influence": 35},
	{"id": "apple_sapling",   "name": "Apple Sapling",   "cost": {"coins": 200, "plank": 4, "berry": 6},                     "influence": 60},
	{"id": "driftwood_arch",  "name": "Driftwood Arch",  "cost": {"coins": 180, "plank": 4, "tile_fish_kelp": 6},           "influence": 55},
	{"id": "pearl_fountain",  "name": "Pearl Fountain",  "cost": {"coins": 400, "tile_mine_stone": 8, "tile_fish_oyster": 4}, "influence": 95},
	{"id": "fishing_dock",    "name": "Fishing Dock",    "cost": {"coins": 300, "plank": 10, "tile_mine_stone": 4},          "influence": 80},
	{"id": "cobble_well",     "name": "Cobble Well",     "cost": {"coins": 220, "tile_mine_stone": 12, "plank": 2},          "influence": 65},
	{"id": "smelter_brazier", "name": "Smelter Brazier", "cost": {"coins": 350, "iron_bar": 2, "tile_mine_coal": 8},        "influence": 90},
]

## Stable iteration order of the decoration ids.
const DECORATION_IDS: Array = [
	"violet_bed", "stone_lantern", "apple_sapling", "driftwood_arch",
	"pearl_fountain", "fishing_dock", "cobble_well", "smelter_brazier",
]

# ── Static helpers (usable without an instance) ──────────────────────────────────

## Every decoration entry in stable catalog order (a deep copy of each row, so the
## caller can't mutate the const cost dicts).
static func all() -> Array:
	var out: Array = []
	for d in DECORATIONS:
		out.append((d as Dictionary).duplicate(true))
	return out

## True when `id` names a real decoration.
static func has_decoration(id: String) -> bool:
	for d in DECORATIONS:
		if String(d.get("id", "")) == id:
			return true
	return false

## The full decoration entry for `id` (a deep COPY), or {} for an unknown id.
static func get_decoration(id: String) -> Dictionary:
	for d in DECORATIONS:
		if String(d.get("id", "")) == id:
			return (d as Dictionary).duplicate(true)
	return {}

## Display name for decoration `id` ("" for an unknown id).
static func decoration_name(id: String) -> String:
	return String(get_decoration(id).get("name", ""))

## The full cost dict for `id` (a COPY: { "coins": int, <resource>: int, … }), or {}
## for an unknown id.
static func cost(id: String) -> Dictionary:
	return get_decoration(id).get("cost", {})

## The coins component of `id`'s cost (0 for an unknown id / no coin cost).
static func cost_coins(id: String) -> int:
	return int(cost(id).get("coins", 0))

## The Influence granted by building `id` (0 for an unknown id).
static func influence(id: String) -> int:
	return int(get_decoration(id).get("influence", 0))

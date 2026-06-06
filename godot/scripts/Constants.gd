class_name Constants
extends Node
## Game constants — mirrors the relevant slice of src/constants.ts (PC2 baseline).
##
## M1 scope: board dimensions, the Farm starting tile set, upgrade thresholds,
## and Stage-1 placeholder colors. Registered as a `class_name` global so its
## consts / enums / static helpers are reachable WITHOUT a live autoload — this
## matters for headless tests, which run before the scene tree exists.
##
## Source references are to the Phaser codebase this is ported from; see
## docs/godot-migration-plan.html (strategy) and
## docs/godot-migration-progress.html (status).

# ── Board dimensions (src/constants.ts:151-153) ────────────────────────────
const COLS: int = 6
const ROWS: int = 6
const TILE_SIZE: int = 74          ## base tile size in px (responsive at runtime)
const MIN_CHAIN: int = 3           ## default minimum chain length (a boss may raise it)

## Sentinel for an empty grid cell.
const EMPTY: int = -1

# ── Tile types — Farm biome starting set (src/constants.ts FARM pool) ───────
## GDScript enums are int-backed. STRING_KEYS maps each value back to the
## canonical Phaser tile key, used for save serialisation and (asset-pipeline
## Stage 2) PNG filename lookup: res://assets/tiles/<key>.png.
enum Tile {
	GRASS,
	WHEAT,
	PHEASANT,
	CARROT,
	APPLE,
	PANSY,
	OAK,
	PIG,
	COW,
	HORSE,
}

const STRING_KEYS := {
	Tile.GRASS:    "tile_grass_grass",
	Tile.WHEAT:    "tile_grain_wheat",
	Tile.PHEASANT: "tile_bird_pheasant",
	Tile.CARROT:   "tile_veg_carrot",
	Tile.APPLE:    "tile_fruit_apple",
	Tile.PANSY:    "tile_flower_pansy",
	Tile.OAK:      "tile_tree_oak",
	Tile.PIG:      "tile_herd_pig",
	Tile.COW:      "tile_cattle_cow",
	Tile.HORSE:    "tile_mount_horse",
}

## Resource each tile family produces (src/constants.ts:298-319).
const PRODUCES := {
	Tile.GRASS:    "hay_bundle",
	Tile.WHEAT:    "flour",
	Tile.PHEASANT: "eggs",
	Tile.CARROT:   "soup",
	Tile.APPLE:    "pie",
	Tile.PANSY:    "honey",
	Tile.OAK:      "plank",
	Tile.PIG:      "meat",
	Tile.COW:      "milk",
	Tile.HORSE:    "horseshoe",
}

## Chain length that yields ONE unit of the produced resource
## (UPGRADE_THRESHOLDS, src/constants.ts:222-254).
const THRESHOLDS := {
	Tile.GRASS:    6,
	Tile.WHEAT:    5,
	Tile.PHEASANT: 6,
	Tile.CARROT:   6,
	Tile.APPLE:    7,
	Tile.PANSY:    10,
	Tile.OAK:      6,
	Tile.PIG:      5,
	Tile.COW:      6,
	Tile.HORSE:    10,
}

## Weighted spawn pool for the Farm biome (src/constants.ts:268-281).
## Grass is weighted 3x so a fresh board always has a common matchable type.
## Retained as the DEFAULT fallback for BoardLogic.refill and existing tests; the
## live game (M3b+) builds its refill pool dynamically from STAPLE_POOL plus the
## tiles unlocked by placed spawner buildings (see GameState.active_tile_pool).
const FARM_POOL: Array = [
	Tile.GRASS, Tile.GRASS, Tile.GRASS,
	Tile.WHEAT, Tile.PHEASANT, Tile.CARROT, Tile.APPLE,
	Tile.PANSY, Tile.OAK, Tile.PIG, Tile.COW, Tile.HORSE,
]

# ── Staples + categories (M3b building-gated spawners) ──────────────────────
## The two staple tiles every Town-1 board always provides, regardless of which
## spawner buildings are placed: grass (→hay_bundle) and wheat/grain (→flour).
const STAPLE_TILES: Array = [Tile.GRASS, Tile.WHEAT]

## Refill pool for a fresh, building-less board: staples only, with grass weighted
## heavier so a starting board always has a common, chainable staple. Spawner
## buildings append their tiles to this at runtime (GameState.active_tile_pool).
const STAPLE_POOL: Array = [
	Tile.GRASS, Tile.GRASS, Tile.GRASS,
	Tile.WHEAT, Tile.WHEAT,
]

## Tile -> category id. Staples are "grass"/"grain"; every other family belongs to
## a category gated by a spawner building (BuildingConfig).
const CATEGORY := {
	Tile.GRASS:    "grass",
	Tile.WHEAT:    "grain",
	Tile.OAK:      "trees",
	Tile.PHEASANT: "birds",
	Tile.CARROT:   "veg",
	Tile.APPLE:    "fruit",
	Tile.PANSY:    "flower",
	Tile.PIG:      "herd",
	Tile.COW:      "cattle",
	Tile.HORSE:    "mount",
}

## A very large int that stands in for "no threshold" without needing INF.
const NO_THRESHOLD: int = 1 << 30

# ── Static helpers (usable without an instance) ────────────────────────────

static func produced_resource(tile: int) -> String:
	return PRODUCES.get(tile, "")

static func threshold_for(tile: int) -> int:
	return THRESHOLDS.get(tile, NO_THRESHOLD)

static func string_key(tile: int) -> String:
	return STRING_KEYS.get(tile, "")

## Category id for a tile ("grass", "grain", "trees", …); "" for unknown tiles.
static func category_of(tile: int) -> String:
	return CATEGORY.get(tile, "")

## Stage-1 placeholder fill color. Replaced wholesale by PNG textures in
## asset-pipeline Stage 2 without touching surrounding code. Kept as a match
## (not a const dict) so Color construction stays out of constant evaluation.
static func color_for(tile: int) -> Color:
	match tile:
		Tile.GRASS:    return Color(0.42, 0.68, 0.32)
		Tile.WHEAT:    return Color(0.89, 0.76, 0.29)
		Tile.PHEASANT: return Color(0.61, 0.42, 0.25)
		Tile.CARROT:   return Color(0.91, 0.54, 0.23)
		Tile.APPLE:    return Color(0.78, 0.26, 0.23)
		Tile.PANSY:    return Color(0.54, 0.36, 0.76)
		Tile.OAK:      return Color(0.25, 0.42, 0.23)
		Tile.PIG:      return Color(0.90, 0.56, 0.63)
		Tile.COW:      return Color(0.92, 0.89, 0.82)
		Tile.HORSE:    return Color(0.35, 0.26, 0.20)
		_:             return Color.MAGENTA

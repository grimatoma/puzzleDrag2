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
	# ── Mine biome (M3f, Town 2) — APPENDED so the farm ordinals 0..9 above are
	# unchanged (save keys + tests depend on GRASS==0 … HORSE==9). These tiles
	# only enter the board during a mine expedition (GameState.active_biome_pool).
	STONE,
	IRON_ORE,
	COAL,
	DIRT,
	GEM,
	# ── Rats hazard (M3h, Town 3) — APPENDED (ordinal 15) so every farm/mine
	# ordinal above is unchanged (GRASS==0 … HORSE==9, STONE==10 … GEM==14). RAT is
	# a board-only HAZARD tile: it produces NOTHING (chaining rats wastes a move) and
	# only seeds into the FARM pool once Town 2 is complete (GameState.rats_enabled).
	RAT,
	# ── Rubble mine hazard (M3i, Town 2 expedition) — APPENDED (ordinal 16) so every
	# farm/mine/rat ordinal above is unchanged (GRASS==0 … RAT==15). RUBBLE is the
	# mine's cave-in clutter: a board-only HAZARD tile that produces NOTHING (chaining
	# rubble wastes a precious mine turn) and only seeds into the MINE pool while on an
	# expedition (GameState.active_biome_pool). You clear it by MINING THROUGH it — a
	# resolved STONE chain clears every rubble 8-adjacent to it (Board.clear_rubble_on_stone),
	# the built-in mine analogue of the Master Ratcatcher's grass→rats sweep.
	RUBBLE,
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
	# Mine biome (M3f).
	Tile.STONE:    "tile_mine_stone",
	Tile.IRON_ORE: "tile_mine_iron_ore",
	Tile.COAL:     "tile_mine_coal",
	Tile.DIRT:     "tile_special_dirt",
	Tile.GEM:      "tile_mine_gem",
	# Rats hazard (M3h).
	Tile.RAT:      "rat",
	# Rubble mine hazard (M3i).
	Tile.RUBBLE:   "rubble",
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
	# Mine biome (M3f): stone→block, iron_ore→iron_bar, coal→coke, dirt→dirt,
	# gem→cut_gem. credit_chain is biome-agnostic and routes these through the
	# SAME shared inventory as farm goods (see GameState M3f SIMPLIFICATION note).
	Tile.STONE:    "block",
	Tile.IRON_ORE: "iron_bar",
	Tile.COAL:     "coke",
	Tile.DIRT:     "dirt",
	Tile.GEM:      "cut_gem",
	# Rats hazard (M3h): RAT produces NOTHING. Chaining rats is a wasted move — the
	# point of the hazard. Deliberately absent from THRESHOLDS too, so
	# threshold_for(RAT) returns the NO_THRESHOLD sentinel and produced_resource is "".
	Tile.RAT:      "",
	# Rubble mine hazard (M3i): RUBBLE produces NOTHING — chaining it wastes a mine
	# turn (the food/supplies gate makes turns scarce, so the clutter bites). Like RAT
	# it is deliberately ABSENT from THRESHOLDS, so threshold_for(RUBBLE) returns the
	# NO_THRESHOLD sentinel and produced_resource is "".
	Tile.RUBBLE:   "",
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
	# Mine biome (M3f) — first-pass, tunable. Stone is the cheap staple; gem rare.
	Tile.STONE:    6,
	Tile.IRON_ORE: 6,
	Tile.COAL:     8,
	Tile.DIRT:     5,
	Tile.GEM:      10,
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

## Weighted refill pool for the MINE biome (M3f, Town 2). Stone is the common
## staple (×3); iron + coal are mid-weight (×2 each); dirt fills (×2); gem is rare
## (×1). Used by GameState.active_biome_pool() while on a mine expedition — the
## mine board is NOT building-gated this milestone (no mine spawners yet).
const MINE_POOL: Array = [
	Tile.STONE, Tile.STONE, Tile.STONE,
	Tile.IRON_ORE, Tile.IRON_ORE,
	Tile.COAL, Tile.COAL,
	Tile.DIRT, Tile.DIRT,
	Tile.GEM,
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
	# Mine biome (M3f).
	Tile.STONE:    "stone",
	Tile.IRON_ORE: "iron",
	Tile.COAL:     "coal",
	Tile.DIRT:     "dirt",
	Tile.GEM:      "gem",
	# Rats hazard (M3h) — its own "rat" category; it is neither a spawner-gated farm
	# category nor a mine category, so no building adds it to the pool.
	Tile.RAT:      "rat",
	# Rubble mine hazard (M3i) — its own "rubble" category; it is seeded directly into
	# the mine pool (active_biome_pool), not via any building/category gate.
	Tile.RUBBLE:   "rubble",
}

## A very large int that stands in for "no threshold" without needing INF.
const NO_THRESHOLD: int = 1 << 30

## Rats hazard (M3h, Town 3). How many RAT tiles seed into the FARM refill pool
## while rats are active (GameState.rats_enabled / active_tile_pool). Kept low so
## rats are a recurring nuisance the player has to manage, not a board takeover.
const RAT_POOL_SLOTS: int = 2

## Rubble mine hazard (M3i, Town 2 expedition). How many RUBBLE tiles seed into the
## MINE refill pool while on an expedition (GameState.active_biome_pool). Kept low so
## rubble is a recurring nuisance the player mines through, not a board takeover — with
## only 2 slots in a 10-slot MINE_POOL it never dominates the board.
const RUBBLE_POOL_SLOTS: int = 2

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
		# Mine biome (M3f) — cool greys/earths against the warm farm palette.
		Tile.STONE:    return Color(0.55, 0.55, 0.58)
		Tile.IRON_ORE: return Color(0.72, 0.45, 0.34)
		Tile.COAL:     return Color(0.18, 0.18, 0.20)
		Tile.DIRT:     return Color(0.45, 0.34, 0.24)
		Tile.GEM:      return Color(0.40, 0.78, 0.85)
		# Rats hazard (M3h) — a drab vermin grey. No PNG ships this milestone; the
		# Stage-1 fallback renders this flat color.
		Tile.RAT:      return Color(0.36, 0.34, 0.38)
		# Rubble mine hazard (M3i) — a dark cave-rock grey-brown that reads as inert
		# cave-in stone against the cooler mine ores. No PNG ships; flat fallback fill.
		Tile.RUBBLE:   return Color(0.34, 0.30, 0.27)
		_:             return Color.MAGENTA

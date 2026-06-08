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
	# ── Fish / Harbor biome (M3j, Town 3 expedition — ported from src/features/fish) —
	# APPENDED (ordinals 17..22) so every farm/mine/rat/rubble ordinal above is unchanged
	# (GRASS==0 … RUBBLE==16; saves use STRING_KEYS, so appending is the safe way to add
	# tiles). These tiles only enter the board during a HARBOR expedition (the fish biome —
	# GameState.active_biome_pool). The harbor mirrors the mine expedition: the farm packs
	# food into supplies, supplies are spent as HARBOR TURNS, and the catch lands in the
	# SAME shared inventory. The board has a TIDE cycle (high↔low every TIDE_PERIOD turns)
	# that the next (board) slice uses to mutate the bottom row from HIGH_TIDE_POOL /
	# LOW_TIDE_POOL.
	FISH_SARDINE,
	FISH_MACKEREL,
	FISH_CLAM,
	FISH_OYSTER,
	FISH_KELP,
	# FISH_PEARL (the "giant pearl") is the harbor's rune-capture tile — the analogue of
	# the mine's Mysterious Ore. It produces NOTHING on its own (deliberately ABSENT from
	# PRODUCES/THRESHOLDS, so produced_resource is "" and threshold_for returns the
	# NO_THRESHOLD sentinel, exactly like RAT/RUBBLE). It is captured by chaining it with
	# >= REQUIRED_FISH_IN_CHAIN other fish-category tiles before its PEARL_TURNS countdown
	# expires → +1 Rune (GameState.try_capture_pearl). Its own "fish_pearl" category keeps
	# it out of the fish-spawn pools (it is conditionally seeded by the board slice, not
	# weighted into FISH_POOL / the tide pools).
	FISH_PEARL,
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
	# Fish / Harbor biome (M3j). The five catchable fish tiles use their canonical
	# Phaser tile keys (res://assets/tiles/<key>.png exists for all five). The giant
	# pearl reuses the special key the React port assigns it (PEARL_KEY).
	Tile.FISH_SARDINE:  "tile_fish_sardine",
	Tile.FISH_MACKEREL: "tile_fish_mackerel",
	Tile.FISH_CLAM:     "tile_fish_clam",
	Tile.FISH_OYSTER:   "tile_fish_oyster",
	Tile.FISH_KELP:     "tile_fish_kelp",
	Tile.FISH_PEARL:    "tile_special_giant_pearl",
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
	# Fish / Harbor biome (M3j): the catch lands in the SAME shared inventory as farm +
	# mine goods (credit_chain is biome-agnostic). sardine/mackerel → fish_fillet,
	# clam → sea_shells, oyster → pearls, kelp → fish_oil.
	Tile.FISH_SARDINE:  "fish_fillet",
	Tile.FISH_MACKEREL: "fish_fillet",
	Tile.FISH_CLAM:     "sea_shells",
	Tile.FISH_OYSTER:   "pearls",
	Tile.FISH_KELP:     "fish_oil",
	# FISH_PEARL produces NOTHING via the normal chain path — it is the rune-capture
	# tile, deliberately ABSENT from THRESHOLDS (threshold_for → NO_THRESHOLD,
	# produced_resource → ""), captured via GameState.try_capture_pearl for +1 Rune.
	Tile.FISH_PEARL:    "",
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
	# Fish / Harbor biome (M3j) — sardine/mackerel/clam/oyster at 5, kelp the cheap
	# filler at 6. FISH_PEARL is deliberately ABSENT (threshold_for → NO_THRESHOLD): it
	# is never credited through the normal chain path; capture grants a Rune instead.
	Tile.FISH_SARDINE:  5,
	Tile.FISH_MACKEREL: 5,
	Tile.FISH_CLAM:     5,
	Tile.FISH_OYSTER:   5,
	Tile.FISH_KELP:     6,
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

## ── Fish / Harbor biome pools (M3j, ported from src/features/fish) ──────────────
## The GENERAL weighted refill pool for the harbor board: sardine ×3 (the common
## staple catch), mackerel ×2, clam ×2, kelp ×2, oyster ×1 (rare). Used by
## GameState.active_biome_pool() while on a harbor expedition — the harbor board is
## NOT building-gated this milestone (no harbor spawners yet), mirroring the mine.
## The giant pearl is NOT in any pool — the board slice seeds it conditionally.
const FISH_POOL: Array = [
	Tile.FISH_SARDINE, Tile.FISH_SARDINE, Tile.FISH_SARDINE,
	Tile.FISH_MACKEREL, Tile.FISH_MACKEREL,
	Tile.FISH_CLAM, Tile.FISH_CLAM,
	Tile.FISH_KELP, Tile.FISH_KELP,
	Tile.FISH_OYSTER,
]

## The HIGH-tide bottom-row pool: surface/pelagic fish. Mirrors React HIGH_TIDE_POOL
## (sardine ×2, mackerel ×2, kelp). The board slice mutates the board's bottom row
## from this pool when the tide rises (see GameState.note_harbor_turn tide tick).
const HIGH_TIDE_POOL: Array = [
	Tile.FISH_SARDINE, Tile.FISH_SARDINE,
	Tile.FISH_MACKEREL, Tile.FISH_MACKEREL,
	Tile.FISH_KELP,
]

## The LOW-tide bottom-row pool: shellfish + kelp exposed at low water. Mirrors React
## LOW_TIDE_POOL (clam ×2, kelp ×2, oyster).
const LOW_TIDE_POOL: Array = [
	Tile.FISH_CLAM, Tile.FISH_CLAM,
	Tile.FISH_KELP, Tile.FISH_KELP,
	Tile.FISH_OYSTER,
]

## Spent harbor turns between tide flips (high↔low). Mirrors React TIDE_PERIOD.
const TIDE_PERIOD: int = 3

## Countdown (in harbor turns) on a freshly-seeded giant pearl before it expires.
## Mirrors React PEARL_TURNS — chain it within this window to capture the Rune.
const PEARL_TURNS: int = 5

## How many OTHER fish-category tiles a pearl chain must also contain to be a valid
## capture (the pearl itself does not count). Mirrors React REQUIRED_FISH_IN_CHAIN.
const REQUIRED_FISH_IN_CHAIN: int = 2

## The giant-pearl tile's string key (the rune-capture tile). Mirrors React PEARL_KEY
## (src/features/fish/pearl.ts) — kept as a named const so FishConfig and the board
## slice agree on the same key without re-deriving it from STRING_KEYS.
const PEARL_KEY: String = "tile_special_giant_pearl"

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
	# Fish / Harbor biome (M3j) — the five catchable tiles share the "fish" category,
	# which is what FishConfig.is_fish_tile and the pearl-chain rule key off (a valid
	# pearl chain needs the pearl PLUS >= REQUIRED_FISH_IN_CHAIN tiles in this category).
	Tile.FISH_SARDINE:  "fish",
	Tile.FISH_MACKEREL: "fish",
	Tile.FISH_CLAM:     "fish",
	Tile.FISH_OYSTER:   "fish",
	Tile.FISH_KELP:     "fish",
	# FISH_PEARL gets its OWN "fish_pearl" category so it is NOT counted as one of the
	# required fish tiles in its own capture chain, and so it never seeds into the fish
	# spawn pools (the board slice conditionally places it instead).
	Tile.FISH_PEARL:    "fish_pearl",
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

# ── Seasons (src/constants.ts:256 SEASONS + zones/data.ts seasonIndexInSession) ──
## The farm board cycles four seasons over its turn budget (see GameState.farm_turns_used
## + ZoneConfig.base_turns). Each season has a NAME and a LOOK palette (bg / fill / accent),
## ported VERBATIM from the React SEASONS array as 0xRRGGBB ints. The look is consumed by the
## season-bar UI (a later PR); this layer owns the palette, the names, and the index math.
const SEASON_NAMES: Array = ["Spring", "Summer", "Autumn", "Winter"]

## The four seasons, indexed 0..3 by season_index(). `bg`/`fill`/`accent` are 0xRRGGBB ints
## (matching the React SEASONS.look hex values exactly) — convert with
## Color.hex(0xFF000000 | v) when a Color is needed. `name` mirrors SEASON_NAMES[i].
const SEASONS: Array = [
	{"name": "Spring", "bg": 0x7dbd48, "fill": 0x8fd85a, "accent": 0x5daa35},
	{"name": "Summer", "bg": 0x8fca45, "fill": 0xf6c342, "accent": 0xe3a92f},
	{"name": "Autumn", "bg": 0xb77b3a, "fill": 0xd9792d, "accent": 0xa65722},
	{"name": "Winter", "bg": 0x78aaca, "fill": 0x91d9ff, "accent": 0xd9f6ff},
]

# ── Static helpers (usable without an instance) ────────────────────────────

## The season index (0=Spring … 3=Winter) for `turns_used` of a `turn_budget`-turn session.
## Ported VERBATIM from src/features/zones/data.ts `seasonIndexInSession`: the budget is split
## evenly across four seasons by REMAINING turns. A non-positive budget pins Spring (0).
static func season_index(turns_used: int, turn_budget: int) -> int:
	if turn_budget <= 0:
		return 0
	var remaining: int = maxi(0, turn_budget - turns_used)
	if remaining > turn_budget * 0.75:
		return 0   # Spring
	if remaining > turn_budget * 0.50:
		return 1   # Summer
	if remaining > turn_budget * 0.25:
		return 2   # Autumn
	return 3       # Winter

## The season NAME ("Spring"…"Winter") for `turns_used` of a `turn_budget`-turn session.
static func season_name(turns_used: int, turn_budget: int) -> String:
	return String(SEASON_NAMES[season_index(turns_used, turn_budget)])

# ── Season STRIP palette (src/ui/seasonStrip.tsx SEASON_PALETTES) ──────────────
## The season-BAR look, ported VERBATIM from src/ui/seasonStrip.tsx `SEASON_PALETTES`.
## DISTINCT from `SEASONS` above (that is the board-FIELD look; this is the HUD strip's
## per-segment vertical gradient + its name-label colour). Each entry: `bg_top`/`bg_bot`
## are the gradient stops (top→bottom) and `label` the uppercase season-name colour.
const SEASON_STRIP_PALETTES: Array = [
	{"name": "Spring", "bg_top": Color8(0xfd, 0xe7, 0xf0), "bg_bot": Color8(0xbf, 0xe3, 0xb3), "label": Color8(0x9a, 0x33, 0x58)},
	{"name": "Summer", "bg_top": Color8(0xff, 0xe9, 0xa8), "bg_bot": Color8(0xf3, 0xb8, 0x50), "label": Color8(0x7a, 0x53, 0x20)},
	{"name": "Autumn", "bg_top": Color8(0xff, 0xd9, 0xa8), "bg_bot": Color8(0xcd, 0x86, 0x4a), "label": Color8(0x8a, 0x3a, 0x14)},
	{"name": "Winter", "bg_top": Color8(0xe5, 0xf0, 0xfa), "bg_bot": Color8(0x90, 0xb0, 0xc6), "label": Color8(0x1f, 0x3a, 0x5a)},
]

## The board-FIELD gradient colours per season (src/ui/puzzleBoard.tsx). Each entry is the
## two-stop field tint the board card uses while that season is active. Subtle on purpose —
## the board tiles' own pastel backgrounds should still read over it. `top`/`bot` mirror the
## React field gradient stops; the port tints the board card's border/edge with these.
const SEASON_FIELD_COLORS: Array = [
	{"name": "Spring", "top": Color8(0xdb, 0xe6, 0xb5), "bot": Color8(0xb8, 0xcf, 0x8a)},
	{"name": "Summer", "top": Color8(0xec, 0xdf, 0xb0), "bot": Color8(0xc7, 0xb8, 0x7a)},
	{"name": "Autumn", "top": Color8(0xe8, 0xc8, 0x90), "bot": Color8(0xc8, 0xa4, 0x5a)},
	{"name": "Winter", "top": Color8(0xdd, 0xe4, 0xea), "bot": Color8(0xb6, 0xc2, 0xcc)},
]

# ── Chain-stage palette (src/ui/puzzleBoard.tsx CHAIN_STAGES) ──────────────────
## The escalating chain-tier palette, ported VERBATIM from src/ui/puzzleBoard.tsx
## `CHAIN_STAGES`. Index = upgrades EARNED (floor(chain_len / threshold)), clamped to
## 0..4 by chain_stage_index(). Each entry: `top`/`bot` are the fill gradient stops
## (top→bottom), `accent` the bar's glow/dot colour, and `label` the all-caps banner
## ("BONUS!"/"DOUBLE!"/"TRIPLE!"/"FRENZY!") shown once earned >= 1 ("" at stage 0).
## The hex strings match the React verbatim; convert with Color(hex) at the call site.
const CHAIN_STAGES: Array = [
	{"top": "#f0c14b", "bot": "#d97a2a", "accent": "#e07a3a", "label": ""},
	{"top": "#a3d65a", "bot": "#6d9928", "accent": "#5e9a2a", "label": "BONUS!"},
	{"top": "#7dc2e4", "bot": "#3a7eae", "accent": "#4082b5", "label": "DOUBLE!"},
	{"top": "#d8a4f0", "bot": "#8a4ec9", "accent": "#9648c6", "label": "TRIPLE!"},
	{"top": "#ffb04a", "bot": "#d62828", "accent": "#e62828", "label": "FRENZY!"},
]

## Split a turn `budget` across the four seasons by FLOOR math so the per-season counts sum
## EXACTLY to the budget. Ported VERBATIM from src/ui/seasonStrip.tsx `seasonTurnRanges`:
## ends = [floor(S/4), floor(2S/4), floor(3S/4), S]; each season count = end - prevEnd.
## Returns an Array of 4 Dictionaries { start:int, end:int, count:int } (one per season).
## For S=10 → counts [2,3,2,3]; S=12 → [3,3,3,3]. A non-positive budget is clamped to 1.
static func season_turn_ranges(turn_budget: int) -> Array:
	var s: int = maxi(1, turn_budget)
	var ends: Array = [
		int(floor(float(s) / 4.0)),
		int(floor(2.0 * float(s) / 4.0)),
		int(floor(3.0 * float(s) / 4.0)),
		s,
	]
	var out: Array = []
	var prev: int = 0
	for i in 4:
		var end: int = int(ends[i])
		out.append({"start": prev, "end": end, "count": end - prev})
		prev = end
	return out

static func produced_resource(tile: int) -> String:
	return PRODUCES.get(tile, "")

static func threshold_for(tile: int) -> int:
	return THRESHOLDS.get(tile, NO_THRESHOLD)

## The chain STAGE index (0..4) for a live chain of `chain_len` tiles against `threshold`,
## ported from src/ui/puzzleBoard.tsx: `earned = floor(chain_len / threshold)`, then
## `CHAIN_STAGES[min(earned, len-1)]`. A non-positive threshold (a hazard tile like RAT/
## RUBBLE, threshold_for → NO_THRESHOLD won't hit this — callers pass a real producer's
## threshold) or non-positive chain pins stage 0. Clamped to the last stage so a very long
## chain caps at FRENZY!. Pure + headless-testable (no node construction).
static func chain_stage_index(chain_len: int, threshold: int) -> int:
	if threshold <= 0 or chain_len <= 0:
		return 0
	var earned: int = int(floor(float(chain_len) / float(threshold)))
	return clampi(earned, 0, CHAIN_STAGES.size() - 1)

## The CHAIN_STAGES entry (Dictionary {top, bot, accent, label}) for a chain of `chain_len`
## against `threshold`. Convenience wrapper over chain_stage_index so the HUD can read the
## stage's palette + label in one call.
static func chain_stage(chain_len: int, threshold: int) -> Dictionary:
	return CHAIN_STAGES[chain_stage_index(chain_len, threshold)]

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
		# Fish / Harbor biome (M3j) — cool sea blues/greens. PNGs ship for the five
		# catchable tiles (res://assets/tiles/tile_fish_*.png); these flat fallbacks
		# only render if a texture is missing. The giant pearl is a pearlescent white.
		Tile.FISH_SARDINE:  return Color(0.55, 0.66, 0.74)
		Tile.FISH_MACKEREL: return Color(0.36, 0.52, 0.62)
		Tile.FISH_CLAM:     return Color(0.78, 0.72, 0.62)
		Tile.FISH_OYSTER:   return Color(0.62, 0.60, 0.56)
		Tile.FISH_KELP:     return Color(0.24, 0.46, 0.36)
		Tile.FISH_PEARL:    return Color(0.94, 0.93, 0.97)
		_:             return Color.MAGENTA

class_name VillageLayout
extends RefCounted
## Hand-authored cell catalog for the home village's fixed silhouette (town-map
## rebuild Phase 0) — the Stardew-style top-down map every later phase paints
## from. Pure data + static accessors on a square grid of TownArtConfig.TILE
## (16 px) cells; no Node, instantiable in headless tests.
##
## THE SHAPE (36×28 cells — see the layout mock in the Phase-0 PR):
##   · a river along the EAST edge (x 33..35), with the fish-dock boat landmark
##     moored against it
##   · a plaza at the center (6×4), where Main Street (the 2-wide horizontal
##     spine) crosses the 2-wide north–south Cross Street
##   · 35 building PLOTS (3×3 cells each) in organic rows fronting the streets,
##     stage-tagged so the village visibly grows: stage 1 = the 5 plots hugging
##     the plaza, later stages radiate outward (cumulative 5/10/15/20/35 —
##     STAGE_PLOT_CAPACITY; TownConfig's staged-growth tier ladder lands on
##     5/10/15/20/25, one stage band per tier, with 10 spare catalog plots
##     beyond the City grant for save-overflow renders)
##   · landmarks: the FARM field at the south-west village edge, the MINE arch
##     at the rocky north-east corner, the FISH dock boat on the river
##   · stage-tagged decor (trees / bushes / fences / flowers / plaza dressing)
##     so the outskirts fill in as the town grows
##
## CONTRACTS the gate test (tests/run_town_assets_tests.gd) enforces:
##   · plots never overlap each other, paths, the plaza, water, or landmarks
##   · the walkable region (in-bounds minus water/plots/landmarks) is ONE
##     connected component — NPC pathing (Phase 3) can always route
##   · every plot touches at least one walkable cell
##   · stage_for_plot_count is monotone over the whole plot range
## Decor is non-blocking in Phase 0 (it sits on grass/plaza the walk grid may
## cross); Phase 3 can subtract decor cells per-stage when villagers land.
##
## GROUND PAINT MODEL: grass is the implicit default everywhere; ground_cells()
## returns only the explicit non-grass kinds (water / plaza / path /
## grass_flowers), already DISJOINT (plaza wins over path at the crossing).
## The "pad" ground kind is NOT listed here — the renderer paints a pad under
## each EMPTY plot straight from plots() data. Kind names match
## TownArtConfig.GROUND_KINDS / build_tileset() source ids.

const GRID_W: int = 36
const GRID_H: int = 28

## Standard plot footprint: 3×3 cells (48 px — every stock building sprite's
## ground footprint fits on it; the widest house art may overhang visually,
## which is the Stardew look, not a layout overlap).
const PLOT_FOOTPRINT: Vector2i = Vector2i(3, 3)

## Highest growth stage (and the count of STAGE_PLOT_CAPACITY entries).
const MAX_STAGE: int = 5
## CUMULATIVE plot capacity per stage 1..MAX_STAGE: stage s unlocks plots
## [capacity(s-1), capacity(s)). The first 20 plots arrive in tight bands of 5
## near the plaza; stage 5 (City) is the big outskirts build-out.
const STAGE_PLOT_CAPACITY: Array = [5, 10, 15, 20, 35]

# ── Terrain data ─────────────────────────────────────────────────────────────

## The river hugging the east edge.
const WATER_RECT: Rect2i = Rect2i(33, 0, 3, 28)

## The central town square (paved with the "plaza" ground kind).
const PLAZA_RECT: Rect2i = Rect2i(14, 12, 6, 4)

## Path runs (inclusive from → to, axis-aligned). Expanded to cells, then
## clipped against plaza/water so ground_cells() kinds stay disjoint.
const PATH_RUNS: Array = [
	# Main Street — the 2-wide horizontal spine through the plaza.
	{"from": Vector2i(2, 13), "to": Vector2i(32, 13)},
	{"from": Vector2i(2, 14), "to": Vector2i(32, 14)},
	# Cross Street — the 2-wide north–south road through the plaza.
	{"from": Vector2i(16, 2), "to": Vector2i(16, 25)},
	{"from": Vector2i(17, 2), "to": Vector2i(17, 25)},
	# North Lane — the back lane serving the northern plot rows.
	{"from": Vector2i(2, 8), "to": Vector2i(30, 8)},
	# Mine spur — Cross Street's top end to the mine arch corner.
	{"from": Vector2i(18, 3), "to": Vector2i(28, 3)},
	# Dock spur — Cross Street to the fish-dock boat on the river.
	{"from": Vector2i(18, 20), "to": Vector2i(29, 20)},
	# Farm spur — Cross Street out to the farm field at the SW edge.
	{"from": Vector2i(5, 22), "to": Vector2i(15, 22)},
]

## Scattered flowering-grass variant cells (pure paint; same walkability as
## grass). All verified on plain-grass cells — never on path/plaza/water/plots.
const GRASS_FLOWER_CELLS: Array = [
	Vector2i(1, 4), Vector2i(6, 6), Vector2i(10, 4), Vector2i(14, 6),
	Vector2i(15, 9), Vector2i(2, 12), Vector2i(24, 9), Vector2i(28, 9),
	Vector2i(15, 18), Vector2i(10, 21), Vector2i(21, 5), Vector2i(32, 21),
]

# ── Plots ────────────────────────────────────────────────────────────────────

## The 35 building plots, ORDERED: stage ascending, plaza-nearest first within
## a stage. `cell` is the plot's top-left; every plot is PLOT_FOOTPRINT (3×3).
const PLOTS: Array = [
	# Stage 1 — the five plots hugging the plaza (Main Street frontage).
	{"cell": Vector2i(11, 10), "stage": 1},  # NW corner of the square
	{"cell": Vector2i(21, 10), "stage": 1},  # NE corner of the square
	{"cell": Vector2i(11, 16), "stage": 1},  # SW corner of the square
	{"cell": Vector2i(21, 16), "stage": 1},  # SE corner of the square
	{"cell": Vector2i(7, 10), "stage": 1},   # second lot, north side west
	# Stage 2 — completing the Main Street frontage.
	{"cell": Vector2i(25, 16), "stage": 2},
	{"cell": Vector2i(3, 10), "stage": 2},
	{"cell": Vector2i(3, 16), "stage": 2},
	{"cell": Vector2i(7, 16), "stage": 2},
	{"cell": Vector2i(25, 10), "stage": 2},
	# Stage 3 — Main Street's far ends + the North Lane row begins.
	{"cell": Vector2i(29, 10), "stage": 3},
	{"cell": Vector2i(29, 16), "stage": 3},
	{"cell": Vector2i(11, 5), "stage": 3},
	{"cell": Vector2i(18, 5), "stage": 3},
	{"cell": Vector2i(7, 5), "stage": 3},
	# Stage 4 — North Lane fills out; the dock row starts.
	{"cell": Vector2i(3, 5), "stage": 4},
	{"cell": Vector2i(22, 5), "stage": 4},
	{"cell": Vector2i(26, 5), "stage": 4},
	{"cell": Vector2i(18, 21), "stage": 4},
	{"cell": Vector2i(22, 21), "stage": 4},
	# Stage 5 — the City build-out: outskirts rows north, south, and riverside.
	{"cell": Vector2i(26, 21), "stage": 5},
	{"cell": Vector2i(7, 19), "stage": 5},
	{"cell": Vector2i(12, 19), "stage": 5},
	{"cell": Vector2i(7, 24), "stage": 5},
	{"cell": Vector2i(11, 24), "stage": 5},
	{"cell": Vector2i(3, 1), "stage": 5},
	{"cell": Vector2i(7, 1), "stage": 5},
	{"cell": Vector2i(11, 1), "stage": 5},
	{"cell": Vector2i(19, 0), "stage": 5},
	{"cell": Vector2i(23, 0), "stage": 5},
	{"cell": Vector2i(18, 24), "stage": 5},
	{"cell": Vector2i(22, 24), "stage": 5},
	{"cell": Vector2i(26, 24), "stage": 5},
	{"cell": Vector2i(30, 22), "stage": 5},
	{"cell": Vector2i(30, 5), "stage": 5},
]

# ── Landmarks ────────────────────────────────────────────────────────────────

## The three board-entrance landmarks (TownArtConfig art ids). board_fish
## deliberately overlaps the river — the boat is moored against the dock spur;
## landmark cells are NOT walkable either way.
const LANDMARKS: Dictionary = {
	"board_farm": {"cell": Vector2i(2, 21), "footprint": Vector2i(3, 3)},
	"board_mine": {"cell": Vector2i(28, 1), "footprint": Vector2i(2, 2)},
	"board_fish": {"cell": Vector2i(30, 19), "footprint": Vector2i(5, 2)},
}

# ── Decor ────────────────────────────────────────────────────────────────────

## Stage-tagged dressing (TownArtConfig art ids): plaza furniture at stage 1,
## street trees next, then the mine rocks, the farm fence line, and the
## stage-5 southern tree line. Decor never sits on plots/landmarks/water
## (gate-tested); signs/flowers may dress plaza or path edges.
const DECOR: Array = [
	# Stage 1 — plaza dressing. The two plaza lamps are also the anchor points
	# for VillageAmbience's glow halos (it filters decor_for_stage by "lamp").
	{"art_id": "sign", "cell": Vector2i(14, 12), "stage": 1},
	{"art_id": "mailbox", "cell": Vector2i(19, 15), "stage": 1},
	{"art_id": "lamp", "cell": Vector2i(15, 15), "stage": 1},
	{"art_id": "lamp", "cell": Vector2i(18, 12), "stage": 1},
	{"art_id": "flowers_red", "cell": Vector2i(20, 12), "stage": 1},
	{"art_id": "flowers_yellow", "cell": Vector2i(20, 15), "stage": 1},
	{"art_id": "flowers_blue", "cell": Vector2i(13, 15), "stage": 1},
	{"art_id": "tree_green", "cell": Vector2i(13, 9), "stage": 1},
	{"art_id": "tree_green", "cell": Vector2i(20, 9), "stage": 1},
	# Stage 2 — street trees + south-side bushes between the lots.
	{"art_id": "tree_green", "cell": Vector2i(6, 11), "stage": 2},
	{"art_id": "tree_teal", "cell": Vector2i(10, 11), "stage": 2},
	{"art_id": "bush", "cell": Vector2i(6, 17), "stage": 2},
	{"art_id": "bush", "cell": Vector2i(10, 17), "stage": 2},
	# Stage 3 — riverbank trees + the rocky mine corner + Main Street lamps
	# (in the gap columns between the north-side plot rows).
	{"art_id": "lamp", "cell": Vector2i(10, 12), "stage": 3},
	{"art_id": "lamp", "cell": Vector2i(24, 12), "stage": 3},
	{"art_id": "tree_green", "cell": Vector2i(32, 2), "stage": 3},
	{"art_id": "tree_teal", "cell": Vector2i(32, 9), "stage": 3},
	{"art_id": "tree_green", "cell": Vector2i(32, 16), "stage": 3},
	{"art_id": "rock_tall", "cell": Vector2i(27, 1), "stage": 3},
	{"art_id": "rock_small", "cell": Vector2i(27, 2), "stage": 3},
	{"art_id": "rock_small", "cell": Vector2i(30, 3), "stage": 3},
	# Stage 4 — the farm fence line + west-edge greenery.
	{"art_id": "fence_h", "cell": Vector2i(2, 20), "stage": 4},
	{"art_id": "fence_h", "cell": Vector2i(3, 20), "stage": 4},
	{"art_id": "fence_h", "cell": Vector2i(4, 20), "stage": 4},
	{"art_id": "fence_post", "cell": Vector2i(5, 20), "stage": 4},
	{"art_id": "bush", "cell": Vector2i(6, 21), "stage": 4},
	{"art_id": "tree_small", "cell": Vector2i(1, 19), "stage": 4},
	# Stage 5 — the southern tree line + outskirts flowers + dock-road lamps.
	{"art_id": "lamp", "cell": Vector2i(15, 20), "stage": 5},
	{"art_id": "lamp", "cell": Vector2i(18, 19), "stage": 5},
	{"art_id": "tree_small", "cell": Vector2i(6, 27), "stage": 5},
	{"art_id": "tree_small", "cell": Vector2i(10, 27), "stage": 5},
	{"art_id": "tree_small", "cell": Vector2i(14, 27), "stage": 5},
	{"art_id": "tree_green", "cell": Vector2i(21, 27), "stage": 5},
	{"art_id": "tree_teal", "cell": Vector2i(25, 27), "stage": 5},
	{"art_id": "tree_small", "cell": Vector2i(29, 27), "stage": 5},
	{"art_id": "flowers_red", "cell": Vector2i(15, 25), "stage": 5},
	{"art_id": "flowers_blue", "cell": Vector2i(21, 19), "stage": 5},
]

# ── Caches (computed once; the catalog is immutable) ─────────────────────────

static var _ground_cache: Dictionary = {}
static var _plots_cache: Array = []
static var _blocked_cache: Dictionary = {}   ## Vector2i -> true (water/plots/landmarks)
static var _walkable_cache: Array[Vector2i] = []

# ── Public accessors ─────────────────────────────────────────────────────────

static func grid_size() -> Vector2i:
	return Vector2i(GRID_W, GRID_H)

static func in_bounds(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.x < GRID_W and cell.y >= 0 and cell.y < GRID_H

## The cells a footprint occupies from its top-left cell (shared helper for
## plots and landmarks — renderers and the gate test both use it).
static func footprint_cells(cell: Vector2i, footprint: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for dx in range(footprint.x):
		for dy in range(footprint.y):
			out.append(cell + Vector2i(dx, dy))
	return out

## Explicit non-grass ground paint, kind -> Array[Vector2i], with the kinds
## DISJOINT (plaza wins over path at the crossing; water wins over both).
## Grass is the implicit default for every unlisted cell. Returns a deep copy.
static func ground_cells() -> Dictionary:
	if _ground_cache.is_empty():
		var water: Array[Vector2i] = _rect_cells(WATER_RECT)
		var plaza: Array[Vector2i] = _rect_cells(PLAZA_RECT)
		var taken: Dictionary = {}
		for c in water:
			taken[c] = true
		for c in plaza:
			taken[c] = true
		var path: Array[Vector2i] = []
		var path_seen: Dictionary = {}
		for run: Dictionary in PATH_RUNS:
			for c in _run_cells(run["from"], run["to"]):
				if not taken.has(c) and not path_seen.has(c):
					path_seen[c] = true
					path.append(c)
		var flowers: Array[Vector2i] = []
		flowers.assign(GRASS_FLOWER_CELLS)
		_ground_cache = {
			"water": water,
			"plaza": plaza,
			"path": path,
			"grass_flowers": flowers,
		}
	return _ground_cache.duplicate(true)

## The ordered plot catalog: Array of {cell: Vector2i, footprint: Vector2i,
## stage: int}, stage ascending (a deep copy — callers can't mutate the cache).
static func plots() -> Array:
	if _plots_cache.is_empty():
		for p: Dictionary in PLOTS:
			_plots_cache.append({
				"cell": p["cell"],
				"footprint": PLOT_FOOTPRINT,
				"stage": int(p["stage"]),
			})
	return _plots_cache.duplicate(true)

## The plots unlocked at growth stage `stage` (entries with stage <= `stage`),
## in the same plaza-out order as plots(). Thin filter over plots().
static func plots_for_stage(stage: int) -> Array:
	var out: Array = []
	for p: Dictionary in plots():
		if int(p["stage"]) <= stage:
			out.append(p)
	return out

## The three board-entrance landmarks: art id -> {cell, footprint} (deep copy).
static func landmarks() -> Dictionary:
	return LANDMARKS.duplicate(true)

## Stage-tagged dressing: Array of {art_id, cell, stage} (deep copy).
static func decor() -> Array:
	return DECOR.duplicate(true)

## The dressing visible at growth stage `stage` (entries with stage <=
## `stage`). Thin filter over decor().
static func decor_for_stage(stage: int) -> Array:
	var out: Array = []
	for d: Dictionary in decor():
		if int(d["stage"]) <= stage:
			out.append(d)
	return out

## The explicit ground-paint kind at `cell` ("water" / "plaza" / "path" /
## "grass_flowers"), or "grass" — the implicit default — for any unlisted
## cell. Thin reverse lookup over ground_cells().
## Test/debug convenience ONLY: every call deep-copies the whole ground cache.
## Painters must iterate ground_cells() once, not call this per cell.
static func ground_cell(c: Vector2i) -> String:
	var ground: Dictionary = ground_cells()
	for kind: String in ground.keys():
		if (ground[kind] as Array).has(c):
			return kind
	return "grass"

## Every walkable cell: in-bounds and not water/plot/landmark. Paths, plaza,
## and open grass are all walkable; decor does not block in Phase 0. ONE
## connected region (gate-tested) so NPC pathing always succeeds.
static func walkable_cells() -> Array[Vector2i]:
	if _walkable_cache.is_empty():
		var blocked: Dictionary = _blocked()
		for y in range(GRID_H):
			for x in range(GRID_W):
				var c := Vector2i(x, y)
				if not blocked.has(c):
					_walkable_cache.append(c)
	return _walkable_cache.duplicate()

static func is_walkable(cell: Vector2i) -> bool:
	return in_bounds(cell) and not _blocked().has(cell)

## Smallest stage whose CUMULATIVE plot capacity covers `n` built plots,
## clamped to [1, MAX_STAGE]. Monotone in n: 0..5 -> 1, 6..10 -> 2, 11..15 -> 3,
## 16..20 -> 4, 21+ -> 5.
static func stage_for_plot_count(n: int) -> int:
	for s in range(1, MAX_STAGE + 1):
		if n <= int(STAGE_PLOT_CAPACITY[s - 1]):
			return s
	return MAX_STAGE

# ── Internals ────────────────────────────────────────────────────────────────

static func _rect_cells(rect: Rect2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			out.append(Vector2i(x, y))
	return out

## Inclusive axis-aligned run -> cells (also tolerates a single-cell run).
## A diagonal run (both axes differing) is a data typo in PATH_RUNS — fail
## loudly with an empty result so the gate test catches it immediately.
static func _run_cells(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	if from.x != to.x and from.y != to.y:
		push_error("VillageLayout._run_cells: run %s -> %s is not axis-aligned" % [from, to])
		return out
	var lo := Vector2i(mini(from.x, to.x), mini(from.y, to.y))
	var hi := Vector2i(maxi(from.x, to.x), maxi(from.y, to.y))
	for y in range(lo.y, hi.y + 1):
		for x in range(lo.x, hi.x + 1):
			out.append(Vector2i(x, y))
	return out

## Blocked-cell set (Dictionary used as a set): water + plots + landmarks.
static func _blocked() -> Dictionary:
	if _blocked_cache.is_empty():
		for c in _rect_cells(WATER_RECT):
			_blocked_cache[c] = true
		for p: Dictionary in PLOTS:
			for c in footprint_cells(p["cell"], PLOT_FOOTPRINT):
				_blocked_cache[c] = true
		for id: String in LANDMARKS.keys():
			var lm: Dictionary = LANDMARKS[id]
			for c in footprint_cells(lm["cell"], lm["footprint"]):
				_blocked_cache[c] = true
	return _blocked_cache

class_name ToolEffects
extends RefCounted
## Pure, engine-agnostic board EFFECTS for the tools / tool-powers system (M8a).
## No nodes, no rendering, no live-board wiring — fully unit-testable headless.
## Ported from the Phaser source's pure tool-power primitives:
##   - src/state/boardMutations.ts (sweepTileKeys / sweepAtCoords / applyAreaBlast /
##     applyTransformAll / applyTransformAdjacent)
##   - src/config/tileSelectors.ts (selectRow / selectColumn / selectCross /
##     selectComponent + clear_random_n).
## These are the same kind of pure, composable static helpers as BoardLogic.gd, and
## are designed to thread results the same way (deep-copy in, deep-copy out).
##
## GRID REPRESENTATION (identical to BoardLogic.gd — match it exactly)
##   grid is an Array of Constants.ROWS rows; each row is an Array of Constants.COLS
##   ints. Each cell holds a Constants.Tile value, or Constants.EMPTY (-1).
##   grid[0] is the TOP row. Cells are addressed as Vector2i(col, row) — x=col, y=row,
##   so grid[cell.y][cell.x]. Selection functions return Array[Vector2i] in that frame.
##
## DISTANCE / CONNECTIVITY CHOICES (match the React semantics)
##   - area_blast / transform_adjacent use CHEBYSHEV distance: max(|dr|, |dc|) <= radius
##     (a square ring), mirroring applyAreaBlast / applyTransformAdjacent in React.
##   - select_component uses 4-CONNECTED (orthogonal) flood — diagonal same-value
##     neighbours are NOT joined, mirroring selectComponent's DIRS4 in React.
##
## PURITY
##   No function mutates its input grid. Each deep-duplicates with grid.duplicate(true)
##   and returns a NEW grid, so callers can thread results like BoardLogic does.
##
## HAZARD LOCK (the central rule)
##   Cells holding Constants.Tile.RAT or Constants.Tile.RUBBLE are SKIPPED by every
##   clear / blast / random-clear / transform — a tool must not drain the board out
##   from under a hazard (mirrors React's HAZARD_LOCKED guard: rubble/gas/frozen/rat).
##   Selection functions (select_row / select_column / select_cross / select_component)
##   MAY still include hazard cells in their returned coordinate list, but the sweep
##   that consumes them (sweep_cells) skips hazards — matching React, where the
##   selector returns cells but the mutation step excludes hazard-locked ones.

# Orthogonal (4-connected) neighbour offsets for select_component, as (dc, dr).
const DIRS4: Array = [Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 0), Vector2i(-1, 0)]

# ── helpers ─────────────────────────────────────────────────────────────────

## True when a tile value is a board HAZARD that clears/transforms must skip.
static func is_hazard(tile: int) -> bool:
	return tile == Constants.Tile.RAT or tile == Constants.Tile.RUBBLE

static func _in_bounds(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.x < Constants.COLS \
		and cell.y >= 0 and cell.y < Constants.ROWS

## Deep copy of a grid (rows duplicated). All effect functions start with this so
## the caller's input grid is never mutated.
static func _clone(grid: Array) -> Array:
	return grid.duplicate(true)

# ── sweeps (key-based / cell-list / area) ────────────────────────────────────

## Set every cell whose value is in `keys` to EMPTY. Returns
##   { "grid": Array, "collected": Dictionary {tile_value: count} }.
## Hazard cells (RAT / RUBBLE) are skipped even if their value is in `keys`.
## Backs clear_all (one key) and clear_category (all keys in a category).
static func sweep_keys(grid: Array, keys: Array) -> Dictionary:
	var out: Array = _clone(grid)
	var collected: Dictionary = {}
	var key_set: Dictionary = {}
	for k in keys:
		key_set[int(k)] = true
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var v: int = out[r][c]
			if v == Constants.EMPTY or is_hazard(v):
				continue
			if key_set.has(v):
				out[r][c] = Constants.EMPTY
				collected[v] = int(collected.get(v, 0)) + 1
	return {"grid": out, "collected": collected}

## Clear a specific list of cells (Array[Vector2i], col/row) to EMPTY. Returns
##   { "grid", "collected" }. Out-of-bounds, already-empty, and HAZARD cells are
## skipped (so a selection that includes a rat/rubble cell won't remove it).
static func sweep_cells(grid: Array, cells: Array) -> Dictionary:
	var out: Array = _clone(grid)
	var collected: Dictionary = {}
	for cell in cells:
		var p: Vector2i = cell
		if not _in_bounds(p):
			continue
		var v: int = out[p.y][p.x]
		if v == Constants.EMPTY or is_hazard(v):
			continue
		out[p.y][p.x] = Constants.EMPTY
		collected[v] = int(collected.get(v, 0)) + 1
	return {"grid": out, "collected": collected}

## Clear every in-bounds cell within CHEBYSHEV `radius` of `center`, regardless of
## tile value. Returns { "grid", "collected" }. HAZARD cells inside the blast are
## skipped (a bomb can't blow a rat/rubble off the board). Backs area_blast (bomb).
static func area_blast(grid: Array, center: Vector2i, radius: int) -> Dictionary:
	var out: Array = _clone(grid)
	var collected: Dictionary = {}
	var r0: int = max(0, center.y - radius)
	var r1: int = min(Constants.ROWS - 1, center.y + radius)
	var c0: int = max(0, center.x - radius)
	var c1: int = min(Constants.COLS - 1, center.x + radius)
	for r in range(r0, r1 + 1):
		for c in range(c0, c1 + 1):
			var v: int = out[r][c]
			if v == Constants.EMPTY or is_hazard(v):
				continue
			out[r][c] = Constants.EMPTY
			collected[v] = int(collected.get(v, 0)) + 1
	return {"grid": out, "collected": collected}

# ── selections (return Array[Vector2i]; pair with sweep_cells to clear) ───────

## Cells in the row(s) the player tapped: rows [cell.y .. cell.y + span - 1],
## clamped to the board, all columns. `span` defaults to 1. Empty cells are
## excluded (no point selecting a hole); hazards ARE included (sweep_cells skips
## them later — matches React, whose selector returns cells and the sweep filters).
static func select_row(grid: Array, cell: Vector2i, span: int = 1) -> Array:
	var out: Array = []
	var r0: int = max(0, cell.y)
	var r1: int = min(Constants.ROWS - 1, cell.y + span - 1)
	for r in range(r0, r1 + 1):
		for c in Constants.COLS:
			if grid[r][c] != Constants.EMPTY:
				out.append(Vector2i(c, r))
	return out

## Cells in the column(s) the player tapped: columns [cell.x .. cell.x + span - 1],
## clamped to the board, all rows. `span` defaults to 1. Empty cells excluded.
static func select_column(grid: Array, cell: Vector2i, span: int = 1) -> Array:
	var out: Array = []
	var c0: int = max(0, cell.x)
	var c1: int = min(Constants.COLS - 1, cell.x + span - 1)
	for c in range(c0, c1 + 1):
		for r in Constants.ROWS:
			if grid[r][c] != Constants.EMPTY:
				out.append(Vector2i(c, r))
	return out

## Row ∪ column through the tapped cell (the "plus" shape), de-duplicated.
static func select_cross(grid: Array, cell: Vector2i) -> Array:
	var seen: Dictionary = {}
	var out: Array = []
	for p in select_row(grid, cell):
		if not seen.has(p):
			seen[p] = true
			out.append(p)
	for p in select_column(grid, cell):
		if not seen.has(p):
			seen[p] = true
			out.append(p)
	return out

## 4-connected (orthogonal) flood from `cell` over cells sharing `cell`'s tile
## value. Diagonal same-value cells are NOT included. Returns the component as
## Array[Vector2i]. Empty / out-of-bounds seed → empty list. Backs clear_component
## (rake). The seed value may be a hazard; the flood still walks it (sweep_cells
## later skips hazard removal), matching React's selector/mutation split.
static func select_component(grid: Array, cell: Vector2i) -> Array:
	if not _in_bounds(cell):
		return []
	var target: int = grid[cell.y][cell.x]
	if target == Constants.EMPTY:
		return []
	var out: Array = []
	var visited: Dictionary = {}
	var stack: Array = [cell]
	visited[cell] = true
	while not stack.is_empty():
		var cur: Vector2i = stack.pop_back()
		if grid[cur.y][cur.x] != target:
			continue
		out.append(cur)
		for d in DIRS4:
			var n: Vector2i = cur + d
			if _in_bounds(n) and not visited.has(n) and grid[n.y][n.x] == target:
				visited[n] = true
				stack.append(n)
	return out

# ── transforms (remap values; never clear) ───────────────────────────────────

## Replace every cell whose value is in `from_keys` with `to_key`. Returns
##   { "grid": Array, "transformed": int }.
## HAZARD cells are skipped (a transform must not quietly undo a hazard's lock).
static func transform_all(grid: Array, from_keys: Array, to_key: int) -> Dictionary:
	var out: Array = _clone(grid)
	var transformed: int = 0
	var key_set: Dictionary = {}
	for k in from_keys:
		key_set[int(k)] = true
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var v: int = out[r][c]
			if v == Constants.EMPTY or is_hazard(v):
				continue
			if key_set.has(v):
				out[r][c] = to_key
				transformed += 1
	return {"grid": out, "transformed": transformed}

## Replace cells whose value is in `from_keys` within CHEBYSHEV `radius` of
## `center` with `to_key`. Returns { "grid", "transformed" }. HAZARD cells inside
## the radius are skipped. Backs transform_adjacent (magnet).
static func transform_adjacent(grid: Array, center: Vector2i, radius: int, from_keys: Array, to_key: int) -> Dictionary:
	var out: Array = _clone(grid)
	var transformed: int = 0
	var key_set: Dictionary = {}
	for k in from_keys:
		key_set[int(k)] = true
	var r0: int = max(0, center.y - radius)
	var r1: int = min(Constants.ROWS - 1, center.y + radius)
	var c0: int = max(0, center.x - radius)
	var c1: int = min(Constants.COLS - 1, center.x + radius)
	for r in range(r0, r1 + 1):
		for c in range(c0, c1 + 1):
			var v: int = out[r][c]
			if v == Constants.EMPTY or is_hazard(v):
				continue
			if key_set.has(v):
				out[r][c] = to_key
				transformed += 1
	return {"grid": out, "transformed": transformed}

# ── randomised clear (deterministic given the rng / seed) ─────────────────────

## Clear N random NON-HAZARD, non-empty cells. Returns { "grid", "collected" }.
## Deterministic for a given rng seed: candidate cells are gathered in a fixed
## row-major order, shuffled by `rng`, and the first N are cleared. Hazard
## (RAT / RUBBLE) and empty cells are never candidates. If fewer than N eligible
## cells exist, all of them are cleared.
static func clear_random_n(grid: Array, n: int, rng: RandomNumberGenerator) -> Dictionary:
	var out: Array = _clone(grid)
	var collected: Dictionary = {}
	if n <= 0:
		return {"grid": out, "collected": collected}
	# Gather candidates in deterministic row-major order.
	var candidates: Array = []
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var v: int = out[r][c]
			if v != Constants.EMPTY and not is_hazard(v):
				candidates.append(Vector2i(c, r))
	# Fisher–Yates shuffle driven by the supplied rng (deterministic given seed).
	for i in range(candidates.size() - 1, 0, -1):
		var j: int = rng.randi_range(0, i)
		var tmp: Vector2i = candidates[i]
		candidates[i] = candidates[j]
		candidates[j] = tmp
	var take: int = min(n, candidates.size())
	for k in take:
		var p: Vector2i = candidates[k]
		var v: int = out[p.y][p.x]
		out[p.y][p.x] = Constants.EMPTY
		collected[v] = int(collected.get(v, 0)) + 1
	return {"grid": out, "collected": collected}

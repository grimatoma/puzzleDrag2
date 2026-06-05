class_name BoardLogic
extends RefCounted
## Pure, engine-agnostic board logic for the 6x6 drag-chain puzzle.
## No nodes, no rendering — fully unit-testable headless. Ported from the
## Phaser source: chain validation + collapse + refill (src/GameScene.ts),
## upgrade counting (src/utils.ts upgradeCountForChain), and dead-board
## detection (src/game/chain.ts hasValidChain).
##
## GRID REPRESENTATION
##   grid is an Array of ROWS rows; each row is an Array of COLS ints.
##   Each cell holds a Constants.Tile value, or Constants.EMPTY (-1).
##   grid[0] is the TOP row. Collapse moves tiles toward higher row indices
##   (downward / "gravity"). Cells are addressed as Vector2i(col, row).

## Build an all-EMPTY grid.
static func make_empty_grid() -> Array:
	var grid: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(Constants.EMPTY)
		grid.append(row)
	return grid

static func in_bounds(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.x < Constants.COLS \
		and cell.y >= 0 and cell.y < Constants.ROWS

## Value at a cell. Caller must ensure the cell is in bounds.
static func cell_value(grid: Array, cell: Vector2i) -> int:
	return grid[cell.y][cell.x]

## True when `path` (an ordered Array[Vector2i] of col/row cells the player
## dragged through) is a legal chain:
##   - length >= min_chain
##   - every cell is the same, non-empty tile type
##   - consecutive cells are 8-way adjacent (Chebyshev distance == 1)
##   - no cell is revisited
static func is_valid_chain(grid: Array, path: Array, min_chain: int = Constants.MIN_CHAIN) -> bool:
	if path.size() < min_chain:
		return false
	var first: Vector2i = path[0]
	if not in_bounds(first):
		return false
	var key: int = cell_value(grid, first)
	if key == Constants.EMPTY:
		return false
	var seen := {}
	for i in path.size():
		var cell: Vector2i = path[i]
		if not in_bounds(cell):
			return false
		if cell_value(grid, cell) != key:
			return false
		if seen.has(cell):
			return false
		seen[cell] = true
		if i > 0:
			var prev: Vector2i = path[i - 1]
			var dc: int = abs(cell.x - prev.x)
			var dr: int = abs(cell.y - prev.y)
			if maxi(dc, dr) != 1:   # 0 == same cell, >1 == not adjacent
				return false
	return true

## Set every cell in `path` to EMPTY. Mutates `grid`.
static func remove_path(grid: Array, path: Array) -> void:
	for cell in path:
		grid[cell.y][cell.x] = Constants.EMPTY

## Gravity: per column, slide non-empty tiles down to fill gaps below them.
## Mutates `grid`. After this, every EMPTY cell in a column sits above all of
## that column's non-empty cells.
static func collapse(grid: Array) -> void:
	for c in Constants.COLS:
		var write: int = Constants.ROWS - 1
		for r in range(Constants.ROWS - 1, -1, -1):
			var v: int = grid[r][c]
			if v != Constants.EMPTY:
				grid[write][c] = v
				if write != r:
					grid[r][c] = Constants.EMPTY
				write -= 1

## Fill every EMPTY cell with a tile drawn from `pool` via `rng`. Mutates grid.
static func refill(grid: Array, rng: RandomNumberGenerator, pool: Array = Constants.FARM_POOL) -> void:
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == Constants.EMPTY:
				grid[r][c] = pool[rng.randi_range(0, pool.size() - 1)]

## floor(chain_len / threshold): the number of whole resource units (and
## upgrade tiles) a chain of `chain_len` earns. (src/utils.ts upgradeCountForChain)
static func upgrade_count(chain_len: int, threshold: int) -> int:
	if threshold <= 0:
		return 0
	return chain_len / threshold   # int division floors toward zero (non-negative inputs)

## True when at least one 8-connected component of equal, non-empty tiles has
## size >= min_chain — i.e. a legal chain of that length exists. A connected
## component of size N (N >= min_chain) always contains a simple adjacent path
## of min_chain cells, so this is exactly the dead-board test. (src/game/chain.ts)
static func has_valid_chain(grid: Array, min_chain: int = Constants.MIN_CHAIN) -> bool:
	var visited := {}
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var start := Vector2i(c, r)
			if visited.has(start):
				continue
			var key: int = grid[r][c]
			if key == Constants.EMPTY:
				visited[start] = true
				continue
			# Flood-fill the 8-connected same-key component containing `start`.
			var stack: Array = [start]
			var size: int = 0
			while not stack.is_empty():
				var cell: Vector2i = stack.pop_back()
				if visited.has(cell):
					continue
				visited[cell] = true
				size += 1
				for dx in [-1, 0, 1]:
					for dy in [-1, 0, 1]:
						if dx == 0 and dy == 0:
							continue
						var n := Vector2i(cell.x + dx, cell.y + dy)
						if in_bounds(n) and not visited.has(n) and grid[n.y][n.x] == key:
							stack.append(n)
			if size >= min_chain:
				return true
	return false

## Deep copy of a grid (rows duplicated) — handy for tests and undo.
static func clone_grid(grid: Array) -> Array:
	var out: Array = []
	for row in grid:
		out.append(row.duplicate())
	return out

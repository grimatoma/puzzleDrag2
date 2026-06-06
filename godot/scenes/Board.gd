class_name Board
extends Node2D
## The 6x6 drag-chain board: rendering, touch/mouse input, and the
## collect → collapse → refill pipeline. Pure rules live in BoardLogic; this
## class owns the on-screen tile nodes and animates them.
##
## `grid` (ints) is the logic mirror BoardLogic reads. `tiles` (Tile nodes) is
## the authoritative visual layer; after every resolve, `grid` is re-synced
## from `tiles` so drag validation always sees what the player sees.

signal chain_changed(length: int)                               ## live, while dragging
## Fired once a legal chain is collected. The Board reports only WHAT was
## chained (tile type + length); resource/economy accounting lives in GameState.
signal chain_resolved(tile_type: int, length: int)

const POP_TIME := 0.13
const FALL_TIME := 0.22

var grid: Array = []
var tiles: Array = []                  ## tiles[row][col] -> Tile node or null
var rng := RandomNumberGenerator.new()

var tile_size: float = 96.0
var board_origin := Vector2.ZERO       ## top-left of cell (0,0) in local space

var _dragging := false
var _path: Array = []                  ## Array[Vector2i] of dragged cells

func _ready() -> void:
	rng.randomize()
	setup_new_board()

# ── board lifecycle ────────────────────────────────────────────────────────

func setup_new_board() -> void:
	grid = BoardLogic.make_empty_grid()
	BoardLogic.refill(grid, rng)
	_ensure_live_board()
	_build_tiles()

## Reshuffle until the board has at least one legal chain (dead boards are rare
## with the weighted Farm pool, but this guarantees a playable start).
func _ensure_live_board() -> void:
	var guard := 0
	while not BoardLogic.has_valid_chain(grid) and guard < 64:
		grid = BoardLogic.make_empty_grid()
		BoardLogic.refill(grid, rng)
		guard += 1

func _build_tiles() -> void:
	for child in get_children():
		child.queue_free()
	tiles = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			var t := _make_tile(grid[r][c])
			t.position = _cell_center(c, r)
			row.append(t)
		tiles.append(row)

func _make_tile(t: int) -> Tile:
	var node := Tile.new()
	node.setup(t, tile_size)
	add_child(node)
	return node

# ── layout ─────────────────────────────────────────────────────────────────

## Size the board to the viewport and reposition all tiles. Called by Main on
## first layout and on every viewport resize.
func layout_for(viewport: Vector2) -> void:
	var avail_w := viewport.x * 0.94
	var avail_h := viewport.y * 0.62
	tile_size = floorf(minf(avail_w / Constants.COLS, avail_h / Constants.ROWS))
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var t: Tile = tiles[r][c]
			if t != null:
				t.set_size_px(tile_size)
				t.position = _cell_center(c, r)

func board_pixel_size() -> Vector2:
	return Vector2(Constants.COLS * tile_size, Constants.ROWS * tile_size)

func _cell_center(c: int, r: int) -> Vector2:
	return board_origin + Vector2((c + 0.5) * tile_size, (r + 0.5) * tile_size)

func _cell_from_local(p: Vector2) -> Vector2i:
	return Vector2i(int(floor((p.x - board_origin.x) / tile_size)),
					int(floor((p.y - board_origin.y) / tile_size)))

# ── input ──────────────────────────────────────────────────────────────────
# Touch is delivered as mouse events (emulate_mouse_from_touch in project.godot),
# so handling mouse covers both pointer kinds with one path.

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_begin_drag(_cell_from_local(to_local(event.position)))
		elif _dragging:
			_finish_drag()
	elif event is InputEventMouseMotion and _dragging:
		_extend_drag(_cell_from_local(to_local(event.position)))

func _begin_drag(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell):
		return
	if grid[cell.y][cell.x] == Constants.EMPTY:
		return
	_dragging = true
	_path = [cell]
	_set_highlight(cell, true)
	chain_changed.emit(1)

func _extend_drag(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell) or _path.is_empty():
		return
	var last: Vector2i = _path[-1]
	if cell == last:
		return
	# Backtrack: dragging back onto the previous cell pops the last one.
	if _path.size() >= 2 and cell == _path[-2]:
		_set_highlight(last, false)
		_path.pop_back()
		chain_changed.emit(_path.size())
		return
	if _path.has(cell):
		return
	# Extend: must match the chain's type and be 8-way adjacent to the last cell.
	if grid[cell.y][cell.x] != grid[_path[0].y][_path[0].x]:
		return
	if maxi(absi(cell.x - last.x), absi(cell.y - last.y)) != 1:
		return
	_path.append(cell)
	_set_highlight(cell, true)
	chain_changed.emit(_path.size())

func _finish_drag() -> void:
	var path: Array = _path.duplicate()
	for cell in _path:
		_set_highlight(cell, false)
	_path = []
	_dragging = false
	chain_changed.emit(0)
	if BoardLogic.is_valid_chain(grid, path):
		_resolve(path)

func _set_highlight(cell: Vector2i, on: bool) -> void:
	var t: Tile = tiles[cell.y][cell.x]
	if t != null:
		t.set_selected(on)

# ── resolution: collect → collapse → refill (with animation) ───────────────

## Validate-and-resolve a path. Returns true if it was a legal chain. Exposed
## so headless smoke tests can drive a move without synthesising input events.
func try_resolve(path: Array) -> bool:
	if not BoardLogic.is_valid_chain(grid, path):
		return false
	_resolve(path)
	return true

func _resolve(path: Array) -> void:
	var key: int = grid[path[0].y][path[0].x]
	var length: int = path.size()

	# 1. Pop the collected tiles out, then free them.
	for cell in path:
		var t: Tile = tiles[cell.y][cell.x]
		tiles[cell.y][cell.x] = null
		if t != null:
			var tw := create_tween()
			tw.set_parallel(true)
			tw.tween_property(t, "scale", Vector2.ZERO, POP_TIME).set_ease(Tween.EASE_IN)
			tw.tween_property(t, "rotation", 0.6, POP_TIME)
			tw.chain().tween_callback(t.queue_free)

	# 2. Collapse existing tile nodes downward, then 3. spawn new ones up top.
	for c in Constants.COLS:
		var write := Constants.ROWS - 1
		for r in range(Constants.ROWS - 1, -1, -1):
			var t: Tile = tiles[r][c]
			if t != null:
				if write != r:
					tiles[write][c] = t
					tiles[r][c] = null
					_slide_to(t, c, write)
				write -= 1
		# Fill rows 0..write (inclusive) with fresh tiles falling from above.
		for r in range(write, -1, -1):
			var ttype: int = Constants.FARM_POOL[rng.randi_range(0, Constants.FARM_POOL.size() - 1)]
			var node := _make_tile(ttype)
			node.position = _cell_center(c, r) - Vector2(0, (write + 2) * tile_size)
			tiles[r][c] = node
			_slide_to(node, c, r)

	# Re-derive the logic grid from the visual layer, keep the board playable.
	_sync_grid_from_tiles()
	if not BoardLogic.has_valid_chain(grid):
		setup_new_board()

	chain_resolved.emit(key, length)

func _slide_to(t: Tile, c: int, r: int) -> void:
	var tw := create_tween()
	tw.tween_property(t, "position", _cell_center(c, r), FALL_TIME) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func _sync_grid_from_tiles() -> void:
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var t: Tile = tiles[r][c]
			grid[r][c] = t.tile_type if t != null else Constants.EMPTY

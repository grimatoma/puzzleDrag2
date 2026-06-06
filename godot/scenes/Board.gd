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

## Active refill pool (Array[int] of Constants.Tile). Defaults to staples only, so
## a fresh game starts staples-only; Main swaps in GameState.active_tile_pool()
## (staples + each placed spawner's tiles) whenever buildings change.
var tile_pool: Array = Constants.STAPLE_POOL.duplicate()

## Minimum chain length the board demands to RESOLVE a drag. Defaults to the base
## Constants.MIN_CHAIN; an active capstone boss raises it via set_min_chain (the
## boss makes you chain harder — see GameState.boss_min_chain / BossConfig). Only
## the resolve checks (_finish_drag / try_resolve) honour it; the dead-board
## reshuffle checks stay at the base min so a raised bar never reads a normal board
## as "dead".
var min_chain: int = Constants.MIN_CHAIN

## M3h (Town 3 rats): when true, a resolved GRASS chain ALSO clears every RAT tile
## 8-adjacent to the chain (Master Ratcatcher — "grass chains collect rats too").
## Main sets this from GameState.has_master_ratcatcher() after load and on every
## board re-pool. The cleared rats are a side effect: they are NOT counted in the
## chain length nor credited (RAT produces nothing).
var clear_rats_on_grass: bool = false

var _dragging := false
var _path: Array = []                  ## Array[Vector2i] of dragged cells

## M4a — the orange/gold chain-path overlay. A sibling of the tile nodes (shares
## Board-local space) but drawn ON TOP via a high z_index. Created once in _ready
## and DELIBERATELY preserved across _build_tiles rebuilds (which free only Tiles),
## so its reference survives every collapse/refill.
var _chain_overlay: ChainOverlay

## M4a — padding (px) of the field-tinted card drawn behind the tiles by _draw().
const FRAME_PAD := 10.0

func _ready() -> void:
	rng.randomize()
	_chain_overlay = ChainOverlay.new()
	_chain_overlay.z_index = 100        # above every tile node
	add_child(_chain_overlay)
	setup_new_board()

# ── parchment-game framing (M4a) ─────────────────────────────────────────────

## Draw a rounded, field-tinted card with a soft drop shadow BEHIND the tiles.
## A CanvasItem renders itself before its children, so this frame sits under every
## Tile node automatically. Re-run on layout/board changes via queue_redraw().
func _draw() -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.FIELD
	sb.corner_radius_top_left = 16
	sb.corner_radius_top_right = 16
	sb.corner_radius_bottom_left = 16
	sb.corner_radius_bottom_right = 16
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.border_color = Palette.FIELD_EDGE
	sb.shadow_size = 10
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_offset = Vector2(0, 4)
	var rect := Rect2(
		board_origin - Vector2(FRAME_PAD, FRAME_PAD),
		board_pixel_size() + Vector2(2.0 * FRAME_PAD, 2.0 * FRAME_PAD))
	draw_style_box(sb, rect)

# ── board lifecycle ────────────────────────────────────────────────────────

## Replace the active refill pool (a copy is stored). Empty/invalid pools fall
## back to the staple pool so the board can always refill.
func set_tile_pool(pool: Array) -> void:
	if pool == null or pool.is_empty():
		tile_pool = Constants.STAPLE_POOL.duplicate()
	else:
		tile_pool = pool.duplicate()

## Set the minimum chain length required to resolve a drag (clamped to a sane floor
## of 2 — a chain of 1 is just a tap). Main calls this with GameState.boss_min_chain()
## when the boss state changes, so the raised bar applies immediately and survives a
## save restored mid-fight.
func set_min_chain(n: int) -> void:
	min_chain = maxi(2, n)

func setup_new_board() -> void:
	grid = BoardLogic.make_empty_grid()
	BoardLogic.refill(grid, rng, tile_pool)
	_ensure_live_board()
	_build_tiles()

## Reshuffle until the board has at least one legal chain (dead boards are rare
## with the weighted pool, but this guarantees a playable start).
func _ensure_live_board() -> void:
	var guard := 0
	while not BoardLogic.has_valid_chain(grid) and guard < 64:
		grid = BoardLogic.make_empty_grid()
		BoardLogic.refill(grid, rng, tile_pool)
		guard += 1

func _build_tiles() -> void:
	# Free ONLY Tile nodes — the chain overlay (a sibling Node2D) must survive the
	# collapse/refill churn so its reference stays stable across moves.
	for child in get_children():
		if child is Tile:
			child.queue_free()
	tiles = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			var t := _make_tile(grid[r][c])
			t.position = _cell_center(c, r)
			row.append(t)
		tiles.append(row)
	queue_redraw()   # field card depends on board_origin / size

func _make_tile(t: int) -> Tile:
	var node := Tile.new()
	node.setup(t, tile_size)
	add_child(node)
	return node

## M3h — the Ratcatcher "shoo": clear EVERY rat on the board as a FREE move (no
## chain, no resource credit). Scans `grid` for RAT cells, blanks them, then runs
## the pure BoardLogic collapse+refill and rebuilds the visual tile layer (and
## reshuffles to a live board, mirroring setup_new_board's guard, so a refill that
## happens to land dead can't strand the player). Returns the rat count cleared.
## GameState.use_ratcatcher_charge spends the charge; this just clears the board.
func clear_all_rats() -> int:
	var cleared := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == Constants.Tile.RAT:
				grid[r][c] = Constants.EMPTY
				cleared += 1
	if cleared > 0:
		BoardLogic.collapse(grid)
		BoardLogic.refill(grid, rng, tile_pool)
		_ensure_live_board()
		_build_tiles()
	return cleared

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
	queue_redraw()   # tile_size changed → reframe the field card

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
	_update_chain_overlay()
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
		_update_chain_overlay()
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
	_update_chain_overlay()
	chain_changed.emit(_path.size())

func _finish_drag() -> void:
	var path: Array = _path.duplicate()
	for cell in _path:
		_set_highlight(cell, false)
	_path = []
	_dragging = false
	_update_chain_overlay()                # clears the path line + nodes
	chain_changed.emit(0)
	if BoardLogic.is_valid_chain(grid, path, min_chain):
		_resolve(path)

## M4a — recompute the overlay's Board-local points from `_path` (each cell's
## centre) and push them to the chain overlay, flagged valid when the chain has
## reached the resolve threshold. Called on every path mutation; an empty path
## clears the overlay. Guarded so it's a no-op before the overlay exists.
func _update_chain_overlay() -> void:
	if _chain_overlay == null:
		return
	var points: Array = []
	for cell in _path:
		points.append(_cell_center(cell.x, cell.y))
	_chain_overlay.set_path(points, _path.size() >= min_chain, tile_size)

func _set_highlight(cell: Vector2i, on: bool) -> void:
	var t: Tile = tiles[cell.y][cell.x]
	if t != null:
		t.set_selected(on)

# ── resolution: collect → collapse → refill (with animation) ───────────────

## Validate-and-resolve a path. Returns true if it was a legal chain. Exposed
## so headless smoke tests can drive a move without synthesising input events.
func try_resolve(path: Array) -> bool:
	if not BoardLogic.is_valid_chain(grid, path, min_chain):
		return false
	_resolve(path)
	return true

func _resolve(path: Array) -> void:
	var key: int = grid[path[0].y][path[0].x]
	var length: int = path.size()

	# M3h (Master Ratcatcher): a resolved GRASS chain ALSO collects every rat that is
	# 8-adjacent to a chained cell. These rat cells are appended to the SAME removal
	# set the chain uses, so collapse+refill fills them just like the popped chain
	# tiles. They do NOT count toward `length` and are never credited (RAT produces
	# nothing) — the chain still reports the GRASS key + the GRASS chain length.
	var removal: Array = path.duplicate()
	if clear_rats_on_grass and key == Constants.Tile.GRASS:
		for rat_cell in _adjacent_rat_cells(path):
			if not removal.has(rat_cell):
				removal.append(rat_cell)

	# 1. Pop the collected tiles out (chain + any Master-Ratcatcher rats), then free.
	for cell in removal:
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
			var ttype: int = tile_pool[rng.randi_range(0, tile_pool.size() - 1)]
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

## M3h — every distinct RAT cell that is 8-adjacent (king move) to any cell in
## `path`. Used by _resolve when the Master Ratcatcher is active so a grass chain
## sweeps up the rats around it. Cells in `path` themselves are never returned (a
## grass chain has no rats in it), only their neighbours.
func _adjacent_rat_cells(path: Array) -> Array:
	var out: Array = []
	for cell in path:
		for dy in [-1, 0, 1]:
			for dx in [-1, 0, 1]:
				if dx == 0 and dy == 0:
					continue
				var nb := Vector2i(cell.x + dx, cell.y + dy)
				if not BoardLogic.in_bounds(nb):
					continue
				if grid[nb.y][nb.x] != Constants.Tile.RAT:
					continue
				if not out.has(nb):
					out.append(nb)
	return out

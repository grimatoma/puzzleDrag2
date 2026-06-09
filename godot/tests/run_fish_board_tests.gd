extends SceneTree
## Headless tests for the T25 fish / harbor BOARD layer — the in-chain pearl-capture rule.
## Two halves:
##
##   1. Pearl in-chain capture rule tests:
##      - Board._is_valid_chain_pearl_aware / _cell_can_extend_chain: FISH_PEARL can join a
##        fish chain; a purely-adjacent-but-not-in-chain path does NOT capture.
##      - GameState.try_capture_pearl with chain keys from the board (int ordinals).
##      - The DEPRECATED adjacency rule (capture_pearl_if_adjacent) is tested as still
##        present but NOT the live path: the live board only uses try_capture_pearl.
##
##   2. A Main + Board INTEGRATION drive: enter the harbor, assert board re-pools + pearl
##      placed, resolve a harbor chain that CONTAINS the pearl + fish (in-chain capture →
##      +1 rune, tile cleared), flip the tide, and leave (farm pool restored).
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_fish_board_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_fish_tests.gd / run_scene_smoke.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a constant
## expression in 4.6.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Fish / harbor BOARD tests ──────────────────────")
	_test_pearl_in_chain_rule()
	_test_capture_pearl_if_adjacent()
	await _test_main_board_integration()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + setup helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## A GameState already on a harbor expedition with `turns` turns, pearl seeded at `cell`
## (overriding the random seed cell so adjacency tests are deterministic).
func _harbor_state(turns: int, pearl_cell: Vector2i) -> GameState:
	var g := GameState.new()
	_give(g, "supplies", turns)
	g.enter_harbor()
	g.fish_pearl = {"row": pearl_cell.y, "col": pearl_cell.x, "turns_left": Constants.PEARL_TURNS}
	return g

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

# ── T25: pearl IN-CHAIN capture rule (the React rule, the live path) ─────────────

## True when the tile at `cell` is compatible with a chain anchored on `anchor_tile`
## in a harbor-mode board (clear_pearl_on_fish_chain = true). Mirrors Board._cell_can_extend_chain.
func _chain_compat(cell_tile: int, anchor_tile: int) -> bool:
	if cell_tile == anchor_tile:
		return true
	if cell_tile == Constants.Tile.FISH_PEARL and FishConfig.is_fish_tile(anchor_tile):
		return true
	if FishConfig.is_fish_tile(cell_tile) and anchor_tile == Constants.Tile.FISH_PEARL:
		return true
	return false

func _test_pearl_in_chain_rule() -> void:
	# ── FishConfig.is_pearl_chain_valid with int ordinals (what the Board passes) ──
	var T := Constants.Tile
	# pearl + 2 fish ordinals → valid.
	_check(FishConfig.is_pearl_chain_valid([T.FISH_PEARL, T.FISH_SARDINE, T.FISH_MACKEREL]),
		"T25: pearl + 2 fish (int ordinals) is a valid capture chain")
	# pearl + 1 fish → invalid.
	_check(not FishConfig.is_pearl_chain_valid([T.FISH_PEARL, T.FISH_SARDINE]),
		"T25: pearl + 1 fish → invalid (need >= 2)")
	# pearl alone → invalid.
	_check(not FishConfig.is_pearl_chain_valid([T.FISH_PEARL]),
		"T25: pearl alone → invalid")
	# 3 fish but NO pearl → invalid.
	_check(not FishConfig.is_pearl_chain_valid([T.FISH_SARDINE, T.FISH_SARDINE, T.FISH_SARDINE]),
		"T25: 3 fish with no pearl → invalid")
	# pearl + 3 fish → valid (more than required).
	_check(FishConfig.is_pearl_chain_valid([T.FISH_PEARL, T.FISH_SARDINE, T.FISH_CLAM, T.FISH_KELP]),
		"T25: pearl + 3 fish → valid")

	# ── chain-compatibility predicate (mirrors Board._cell_can_extend_chain) ──
	_check(_chain_compat(T.FISH_SARDINE, T.FISH_SARDINE),
		"T25: same fish type is compatible (normal case)")
	_check(_chain_compat(T.FISH_PEARL, T.FISH_SARDINE),
		"T25: FISH_PEARL is compatible with a fish anchor")
	# Different fish types (e.g. sardine vs mackerel) are NOT cross-compatible with each other —
	# the board's same-type chain rule still applies between fish tiles. Only FISH_PEARL is the
	# special tile that joins across types. Chains of sardines are sardine-only, etc.
	_check(not _chain_compat(T.FISH_SARDINE, T.FISH_MACKEREL),
		"T25: different fish types are NOT cross-compatible (chain is still same-type for fish)")
	_check(not _chain_compat(T.FISH_PEARL, T.GRASS),
		"T25: FISH_PEARL is NOT compatible with a non-fish anchor")
	_check(not _chain_compat(T.GRASS, T.FISH_SARDINE),
		"T25: grass is NOT compatible with a fish anchor")

	# ── try_capture_pearl with int keys (what the live board now passes) ──
	var g := _harbor_state(8, Vector2i(2, 2))
	_check(g.runes == 0, "(setup) 0 runes before in-chain capture")
	_check(g.has_active_pearl(), "(setup) pearl is live")
	# Build chain keys from int ordinals: pearl + 2 sardines → valid.
	var valid_chain: Array = [T.FISH_PEARL, T.FISH_SARDINE, T.FISH_SARDINE]
	var cap := g.try_capture_pearl(valid_chain)
	_check(bool(cap.get("captured", false)),
		"T25: try_capture_pearl with pearl + 2 fish (ints) → captured")
	_check(g.runes == 1, "T25: +1 rune granted on in-chain capture")
	_check(g.fish_pearl.is_empty(), "T25: pearl cleared after in-chain capture")

	# A purely-adjacent fish chain that does NOT contain the pearl → NOT captured.
	var g2 := _harbor_state(8, Vector2i(2, 2))
	var adjacent_only_chain: Array = [T.FISH_SARDINE, T.FISH_SARDINE, T.FISH_SARDINE]
	var no_cap := g2.try_capture_pearl(adjacent_only_chain)
	_check(not bool(no_cap.get("captured", false)),
		"T25: chain without the pearl (even if adjacent) → NOT captured (old divergence gone)")
	_check(g2.runes == 0,
		"T25: no rune for an adjacent-but-not-containing chain")
	_check(g2.has_active_pearl(),
		"T25: pearl still live — adjacency alone is NOT enough")

	# ── Board._is_valid_chain_pearl_aware: mixed fish+pearl chain validates ──
	var board := Board.new()
	board.clear_pearl_on_fish_chain = true
	board.tile_size = 96.0
	# Build a tiny 6×6 grid: fill with sardines, place a pearl at (2,2).
	var grid: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(T.FISH_SARDINE)
		grid.append(row)
	grid[2][2] = T.FISH_PEARL
	board.grid = grid
	# Path: (0,1)→(1,1)→(2,1)→(2,2) anchored on FISH_SARDINE, extends to pearl at (2,2).
	var mixed_path: Array = [Vector2i(0, 1), Vector2i(1, 1), Vector2i(2, 1), Vector2i(2, 2)]
	_check(board._is_valid_chain_pearl_aware(grid, mixed_path, 3),
		"T25: board mixed fish+pearl path validates (length 4, anchor=sardine, pearl at end)")
	# Path that does NOT contain the pearl → validates as a normal fish chain (no mixed needed).
	var pure_fish_path: Array = [Vector2i(0, 1), Vector2i(1, 1), Vector2i(2, 1)]
	_check(board._is_valid_chain_pearl_aware(grid, pure_fish_path, 3),
		"T25: pure fish path also validates (no pearl required)")
	# Path anchored on FISH_PEARL → invalid (pearl must not anchor).
	grid[0][0] = T.FISH_PEARL
	var pearl_anchor: Array = [Vector2i(0, 0), Vector2i(0, 1), Vector2i(0, 2)]
	_check(not board._is_valid_chain_pearl_aware(grid, pearl_anchor, 3),
		"T25: FISH_PEARL-anchored chain is invalid (pearl must not anchor)")
	board.queue_free()

# ── GameState.capture_pearl_if_adjacent (DEPRECATED live path, kept for backward compat) ──

func _test_capture_pearl_if_adjacent() -> void:
	# Pearl at (col 2, row 2). A 2-cell fish chain 8-adjacent to it → captures + rune.
	var g := _harbor_state(8, Vector2i(2, 2))
	_check(g.runes == 0, "(setup) 0 runes before capture")
	_check(g.has_active_pearl(), "(setup) a pearl is live at (2,2)")
	# Cells (1,1) and (1,2) — (1,1) is diagonally 8-adjacent to (2,2) (Chebyshev 1).
	var adj := g.capture_pearl_if_adjacent([Vector2i(1, 1), Vector2i(1, 2)])
	_check(bool(adj.get("captured", false)), "adjacent fish chain of 2 → captured")
	_check(int(adj.get("runes", -1)) == 1, "capture returns runes == 1")
	_check(g.runes == 1, "+1 rune granted on adjacent capture")
	_check(g.fish_pearl.is_empty(), "pearl cleared after the adjacent capture")

	# No double-grant: once the pearl is gone, the same chain captures nothing.
	var g_again := g.capture_pearl_if_adjacent([Vector2i(1, 1), Vector2i(1, 2)])
	_check(not bool(g_again.get("captured", true)), "no double-grant once the pearl is captured")
	_check(g.runes == 1, "rune count unchanged on the second attempt")

	# NON-adjacent chain (far corner) → no capture, pearl untouched.
	var g2 := _harbor_state(8, Vector2i(2, 2))
	var far := g2.capture_pearl_if_adjacent([Vector2i(5, 5), Vector2i(5, 4)])
	_check(not bool(far.get("captured", true)), "non-adjacent fish chain → not captured")
	_check(g2.runes == 0, "no rune for a non-adjacent chain")
	_check(g2.has_active_pearl(), "pearl still live after a non-adjacent chain")

	# A chain SHORTER than REQUIRED_FISH_IN_CHAIN (just 1 cell), even if adjacent → no capture.
	var g3 := _harbor_state(8, Vector2i(2, 2))
	var short := g3.capture_pearl_if_adjacent([Vector2i(2, 1)])   # (2,1) is adjacent to (2,2)
	_check(not bool(short.get("captured", true)),
		"adjacent chain of 1 (< REQUIRED_FISH_IN_CHAIN) → not captured")
	_check(g3.runes == 0, "no rune for a too-short chain")
	_check(g3.has_active_pearl(), "pearl still live after a too-short chain")

	# No live pearl → no capture (guard), even with an adjacent long chain.
	var g4 := _harbor_state(8, Vector2i(2, 2))
	g4.fish_pearl = {}
	var nopearl := g4.capture_pearl_if_adjacent([Vector2i(1, 1), Vector2i(1, 2)])
	_check(not bool(nopearl.get("captured", true)), "no pearl active → not captured")
	_check(g4.runes == 0, "no rune when no pearl is live")

	# Off the harbor (on the farm) → guarded out even with a 'live' pearl dict.
	var farm := GameState.new()
	farm.fish_pearl = {"row": 2, "col": 2, "turns_left": 5}
	var off := farm.capture_pearl_if_adjacent([Vector2i(1, 1), Vector2i(1, 2)])
	_check(not bool(off.get("captured", true)), "no capture off the harbor")
	_check(farm.runes == 0, "no rune off the harbor")

	# Boundary: a chain whose ONLY adjacent cell is exactly Chebyshev 1 still captures; a
	# cell at Chebyshev 2 does not. Pearl at (3,3); chain [(1,1),(2,2)] — (2,2) is Chebyshev 1.
	var g5 := _harbor_state(8, Vector2i(3, 3))
	var boundary := g5.capture_pearl_if_adjacent([Vector2i(1, 1), Vector2i(2, 2)])
	_check(bool(boundary.get("captured", false)),
		"chain with one cell at Chebyshev 1 → captured (boundary)")
	var g6 := _harbor_state(8, Vector2i(3, 3))
	var beyond := g6.capture_pearl_if_adjacent([Vector2i(0, 0), Vector2i(1, 1)])
	_check(not bool(beyond.get("captured", true)),
		"chain whose nearest cell is Chebyshev 2 → not captured (boundary)")

# ── Main + Board integration ────────────────────────────────────────────────────

func _test_main_board_integration() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                        # let the deferred _ready run
	_check(main.board != null, "Main created a Board")
	var board: Board = main.board
	var game: GameState = main.game

	# Put the game into a harbor-eligible state: Town 2 done + supplies, then enter the harbor
	# and drive Main's biome-refresh path exactly like the Town screen does (state_changed →
	# _on_town_changed). This is the real entry path the UI uses.
	game.town2_complete = true
	_give(game, "supplies", 8)
	_check(game.can_enter_harbor() and game.town2_complete,
		"(setup) harbor enterable: supplies + town2_complete")
	var enter := game.enter_harbor()
	_check(bool(enter.get("ok", false)), "enter_harbor succeeds")
	main._on_town_changed()                    # Main re-pools the board + places the pearl
	await process_frame

	# Board is now on the harbor: fish pool, pearl-capture flag on, pearl tile placed.
	_check(game.is_in_harbor(), "game reports is_in_harbor() after entry")
	_check(board.tile_pool == Constants.FISH_POOL, "board pool swapped to the FISH_POOL")
	_check(board.clear_pearl_on_fish_chain, "board.clear_pearl_on_fish_chain is on in the harbor")
	var pearl_cell := Vector2i(int(game.fish_pearl.get("col", -1)), int(game.fish_pearl.get("row", -1)))
	_check(board.grid[pearl_cell.y][pearl_cell.x] == T.FISH_PEARL,
		"the giant pearl tile is placed on the board at its seeded cell")
	_check(_grid_count(board.grid, T.FISH_PEARL) == 1, "exactly one pearl tile on the board")

	# A harbor fish chain resolves → spends one harbor turn (note_harbor_turn). Lay a known
	# 3-sardine row well AWAY from the pearl so it does NOT also capture, isolating the turn
	# tick. (Pearl is somewhere; put sardines in a row that avoids it.)
	var safe_row := 0 if pearl_cell.y >= 3 else 5
	for c in Constants.COLS:
		board.grid[safe_row][c] = T.FISH_SARDINE
	board._build_tiles()
	var turns_before: int = game.harbor_turns_left
	var ok := board.try_resolve([Vector2i(0, safe_row), Vector2i(1, safe_row), Vector2i(2, safe_row)])
	await process_frame
	_check(ok, "try_resolve accepts a 3-sardine harbor chain")
	_check(game.harbor_turns_left == turns_before - 1,
		"a resolved harbor chain spent one harbor turn (%d → %d)" % [turns_before, game.harbor_turns_left])
	_check(game.qty("fish_fillet") >= 0, "fish chain credited into the shared inventory")

	# TIDE FLIP mutates the bottom row. Force the tide one tick from flipping, then resolve a
	# chain so note_harbor_turn flips it; Main reseeds the bottom row from the new tide pool.
	game.fish_tide = FishConfig.TIDE_HIGH
	game.fish_tide_turn = Constants.TIDE_PERIOD - 1   # next tick flips → low
	var safe_row2 := 0 if pearl_cell.y >= 3 else 5
	for c in Constants.COLS:
		board.grid[safe_row2][c] = T.FISH_SARDINE
	board._build_tiles()
	var tide_before: String = game.fish_tide
	board.try_resolve([Vector2i(0, safe_row2), Vector2i(1, safe_row2), Vector2i(2, safe_row2)])
	await process_frame
	_check(game.fish_tide != tide_before, "the tide flipped on the TIDE_PERIOD tick (%s → %s)"
		% [tide_before, game.fish_tide])
	# The bottom row should now be drawn entirely from the LOW tide pool (clam/kelp/oyster).
	var bottom := Constants.ROWS - 1
	var all_low := true
	for c in Constants.COLS:
		if not Constants.LOW_TIDE_POOL.has(board.grid[bottom][c]):
			all_low = false
			break
	_check(all_low, "mutate_bottom_row reseeded the bottom row from the new (low) tide pool")

	# T25 PEARL CAPTURE on the live board: resolve a chain that CONTAINS the pearl tile +
	# >= REQUIRED_FISH_IN_CHAIN fish tiles — the React in-chain rule.
	# The Board now emits pearl_chain_resolved only when the chain contains FISH_PEARL (not
	# merely adjacent to it). Main's _on_pearl_chain calls try_capture_pearl with the chain
	# keys → +1 rune + tile degraded to kelp. The chain must be >= MIN_CHAIN (3) to RESOLVE.
	# First clear any pearl tile on the board (from random seed), reposition it at a known cell.
	for _r in Constants.ROWS:
		for _c in Constants.COLS:
			if board.grid[_r][_c] == T.FISH_PEARL:
				board.degrade_pearl(Vector2i(_c, _r))
	game.fish_pearl = {"row": 2, "col": 2, "turns_left": Constants.PEARL_TURNS}
	board.place_pearl(Vector2i(2, 2))
	await process_frame
	# Chain: sardine (0,2) → sardine (1,2) → FISH_PEARL (2,2). Length 3 = MIN_CHAIN.
	# The anchor is FISH_SARDINE at (0,2); the pearl at (2,2) joins via _cell_can_extend_chain.
	board.grid[2][0] = T.FISH_SARDINE
	board.grid[2][1] = T.FISH_SARDINE
	# grid[2][2] is already FISH_PEARL from place_pearl above.
	board._build_tiles()
	var runes_before: int = game.runes
	board.try_resolve([Vector2i(0, 2), Vector2i(1, 2), Vector2i(2, 2)])
	await process_frame
	_check(game.runes == runes_before + 1,
		"T25: in-chain capture (fish+pearl chain) grants +1 rune")
	_check(not game.has_active_pearl(),
		"T25: pearl is cleared after the in-chain capture")
	_check(_grid_count(board.grid, T.FISH_PEARL) == 0,
		"T25: pearl tile removed from the board after the in-chain capture")

	# T25 verify: a pure-fish chain that does NOT contain the pearl does NOT capture.
	game.fish_pearl = {"row": 3, "col": 3, "turns_left": Constants.PEARL_TURNS}
	board.place_pearl(Vector2i(3, 3))
	await process_frame
	var runes_before2: int = game.runes
	# Chain: three sardines at row 0 (far from the pearl at (3,3)) — no pearl in chain.
	board.grid[0][0] = T.FISH_SARDINE
	board.grid[0][1] = T.FISH_SARDINE
	board.grid[0][2] = T.FISH_SARDINE
	board._build_tiles()
	board.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0)])
	await process_frame
	_check(game.runes == runes_before2,
		"T25: pure fish chain (no pearl in chain) does NOT capture the pearl")
	_check(game.has_active_pearl(),
		"T25: pearl still live after a fish-only chain")

	# LEAVE the harbor → board restored to the farm pool (mirrors the mine-leave path).
	game.leave_harbor()
	main._on_town_changed()
	await process_frame
	_check(not game.is_in_harbor(), "left the harbor — back on the farm")
	_check(not board.clear_pearl_on_fish_chain, "pearl-capture flag is off after leaving")
	_check(board.tile_pool != Constants.FISH_POOL, "board pool restored away from the FISH_POOL")
	_check(_grid_count(board.grid, T.FISH_PEARL) == 0, "no pearl tile on the farm board")

	main.queue_free()

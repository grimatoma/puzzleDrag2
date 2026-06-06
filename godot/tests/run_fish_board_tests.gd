extends SceneTree
## Headless tests for the M3j fish / harbor BOARD layer — the visible slice over the
## already-landed, tested fish biome LOGIC (run_fish_tests.gd). Two halves:
##
##   1. GameState.capture_pearl_if_adjacent — the board-side pearl-capture rule. The port's
##      is_valid_chain requires an ALL-SAME-KEY chain, so React's "the chain CONTAINS the
##      pearl + 2 fish" can't fire on the live board; the board adapts it (like
##      Board.clear_rubble_on_stone) to ADJACENCY: a same-key fish chain of length
##      >= REQUIRED_FISH_IN_CHAIN run 8-adjacent to the live pearl captures it for a Rune.
##
##   2. A Main + Board INTEGRATION drive: enter the harbor (with supplies + town2_complete),
##      assert the board re-pools onto the fish pool + the pearl tile is placed, resolve a
##      harbor fish chain (turns decrement), flip the tide (bottom row mutates), capture the
##      pearl by chaining a fish run beside it (+1 rune), and leave (farm pool restored).
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

# ── GameState.capture_pearl_if_adjacent ────────────────────────────────────────

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

	# PEARL CAPTURE on the live board: lay a fish chain 8-adjacent to the pearl and resolve.
	# The Board emits pearl_chain (for any fish chain of length >= REQUIRED_FISH_IN_CHAIN) →
	# Main runs capture_pearl_if_adjacent → +1 rune + tile gone. The chain must still be >=
	# MIN_CHAIN (3) to RESOLVE, so we use a 3-sardine path one of whose cells is adjacent to
	# the pearl. First clear any pearl tile already on the board (the one placed on ENTRY at a
	# random seed cell — gameplay only ever has one, but this test re-positions it for a
	# deterministic adjacency), then place a fresh pearl at a known interior cell.
	for _r in Constants.ROWS:
		for _c in Constants.COLS:
			if board.grid[_r][_c] == T.FISH_PEARL:
				board.degrade_pearl(Vector2i(_c, _r))
	game.fish_pearl = {"row": 2, "col": 2, "turns_left": Constants.PEARL_TURNS}
	board.place_pearl(Vector2i(2, 2))
	await process_frame
	# Chain three sardines at (0,1),(1,1),(1,2): both (1,1) and (1,2) are 8-adjacent to the
	# pearl at (2,2), and the path is a valid 8-connected 3-chain (>= MIN_CHAIN).
	board.grid[1][0] = T.FISH_SARDINE
	board.grid[1][1] = T.FISH_SARDINE
	board.grid[2][1] = T.FISH_SARDINE
	board._build_tiles()
	var runes_before: int = game.runes
	board.try_resolve([Vector2i(0, 1), Vector2i(1, 1), Vector2i(1, 2)])
	await process_frame
	_check(game.runes == runes_before + 1, "an adjacent fish chain captured the pearl (+1 rune)")
	_check(not game.has_active_pearl(), "the pearl is cleared after the on-board capture")
	_check(_grid_count(board.grid, T.FISH_PEARL) == 0, "the pearl tile is removed from the board")

	# LEAVE the harbor → board restored to the farm pool (mirrors the mine-leave path).
	game.leave_harbor()
	main._on_town_changed()
	await process_frame
	_check(not game.is_in_harbor(), "left the harbor — back on the farm")
	_check(not board.clear_pearl_on_fish_chain, "pearl-capture flag is off after leaving")
	_check(board.tile_pool != Constants.FISH_POOL, "board pool restored away from the FISH_POOL")
	_check(_grid_count(board.grid, T.FISH_PEARL) == 0, "no pearl tile on the farm board")

	main.queue_free()

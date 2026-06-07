# GdUnit4 starter suite — BoardLogic (pure chain / collapse / refill logic).
#
# This is the GdUnit4 adoption suite. It does NOT replace the legacy
# godot/tests/run_tests.gd harness (that stays as the comprehensive
# compatibility runner); it re-expresses a representative slice of the same
# BoardLogic invariants in GdUnit4's assertion style so the project HAS the
# framework wired end-to-end. Expected values are mirrored from
# godot/tests/run_tests.gd.
#
# Run headless via the vendored CLI tool:
#   godot --headless --path godot -s res://addons/gdUnit4/bin/GdUnitCmdTool.gd \
#     -a res://test --ignoreHeadlessMode -c
extends GdUnitTestSuite

const T := Constants.Tile

# Build a grid from rows of enum ints (rows[0] is the top row).
func _grid(rows: Array) -> Array:
	var g: Array = []
	for row in rows:
		g.append((row as Array).duplicate())
	return g

func test_valid_chain_basic() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.WHEAT, T.WHEAT, T.WHEAT, T.WHEAT],
		[T.GRASS, T.APPLE, T.APPLE, T.APPLE, T.APPLE, T.APPLE],
		[T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK],
		[T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG],
		[T.COW,   T.COW,   T.COW,   T.COW,   T.COW,   T.COW],
		[T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE],
	])
	# An L of three GRASS along the top-left is a legal 3-chain.
	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]
	assert_bool(BoardLogic.is_valid_chain(g, path)).is_true()

func test_chain_too_short_is_rejected() -> void:
	var g := BoardLogic.make_empty_grid()
	for r in Constants.ROWS:
		for c in Constants.COLS:
			g[r][c] = T.GRASS
	var path := [Vector2i(0, 0), Vector2i(1, 0)]   # length 2 < MIN_CHAIN (3)
	assert_bool(BoardLogic.is_valid_chain(g, path)).is_false()

func test_chain_type_mismatch_is_rejected() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.WHEAT, T.WHEAT, T.WHEAT, T.WHEAT],
		[T.GRASS, T.APPLE, T.APPLE, T.APPLE, T.APPLE, T.APPLE],
		[T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK],
		[T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG],
		[T.COW,   T.COW,   T.COW,   T.COW,   T.COW,   T.COW],
		[T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE],
	])
	# (0,0)+(1,0) GRASS, (2,0) WHEAT — mixed types.
	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0)]
	assert_bool(BoardLogic.is_valid_chain(g, path)).is_false()

func test_non_adjacent_and_revisit_are_rejected() -> void:
	var g := BoardLogic.make_empty_grid()
	for r in Constants.ROWS:
		for c in Constants.COLS:
			g[r][c] = T.GRASS
	# Jump of 2 columns — not 8-way adjacent.
	var gap := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(3, 0)]
	assert_bool(BoardLogic.is_valid_chain(g, gap)).is_false()
	# Revisiting the first cell.
	var revisit := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 0)]
	assert_bool(BoardLogic.is_valid_chain(g, revisit)).is_false()

func test_diagonal_adjacency_is_accepted() -> void:
	var g := _grid([
		[T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT],
		[T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS],
		[T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT],
		[T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS],
		[T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT],
		[T.WHEAT, T.GRASS, T.WHEAT, T.GRASS, T.WHEAT, T.GRASS],
	])
	# Pure diagonal staircase of GRASS: (0,0)->(1,1)->(2,2).
	var diag := [Vector2i(0, 0), Vector2i(1, 1), Vector2i(2, 2)]
	assert_bool(BoardLogic.is_valid_chain(g, diag)).is_true()

func test_collapse_leaves_no_floating_gaps() -> void:
	var g := BoardLogic.make_empty_grid()
	g[0][0] = T.GRASS
	g[2][0] = T.WHEAT
	g[5][0] = T.OAK
	g[1][3] = T.PIG
	BoardLogic.collapse(g)
	# After collapse the three column-0 tiles rest on the bottom three rows.
	assert_int(g[3][0]).is_not_equal(Constants.EMPTY)
	assert_int(g[4][0]).is_not_equal(Constants.EMPTY)
	assert_int(g[5][0]).is_not_equal(Constants.EMPTY)
	# And no EMPTY cell sits below a filled cell in column 0 (no floating gap).
	var seen_filled := false
	var no_gap := true
	for r in Constants.ROWS:
		if g[r][0] != Constants.EMPTY:
			seen_filled = true
		elif seen_filled:
			no_gap = false
	assert_bool(no_gap).is_true()

func test_collapse_preserves_vertical_order() -> void:
	var g := BoardLogic.make_empty_grid()
	g[0][2] = T.GRASS   # top
	g[3][2] = T.WHEAT   # middle
	g[4][2] = T.OAK     # lower
	BoardLogic.collapse(g)
	assert_int(g[3][2]).is_equal(T.GRASS)
	assert_int(g[4][2]).is_equal(T.WHEAT)
	assert_int(g[5][2]).is_equal(T.OAK)

func test_refill_fills_board_without_overwriting_survivors() -> void:
	var g := BoardLogic.make_empty_grid()
	g[5][0] = T.GRASS    # one survivor
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345
	BoardLogic.refill(g, rng)
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if g[r][c] == Constants.EMPTY:
				empties += 1
	assert_int(empties).is_equal(0)
	assert_int(g[5][0]).is_equal(T.GRASS)

func test_upgrade_count_floor_division() -> void:
	assert_int(BoardLogic.upgrade_count(7, 6)).is_equal(1)
	assert_int(BoardLogic.upgrade_count(12, 6)).is_equal(2)
	assert_int(BoardLogic.upgrade_count(5, 6)).is_equal(0)
	assert_int(BoardLogic.upgrade_count(9, 10)).is_equal(0)
	assert_int(BoardLogic.upgrade_count(20, 10)).is_equal(2)
	# Defensive: a non-positive threshold yields 0 (no divide-by-zero).
	assert_int(BoardLogic.upgrade_count(20, 0)).is_equal(0)

func test_has_valid_chain_on_full_board() -> void:
	var g := BoardLogic.make_empty_grid()
	for r in Constants.ROWS:
		for c in Constants.COLS:
			g[r][c] = T.GRASS
	assert_bool(BoardLogic.has_valid_chain(g)).is_true()

func test_dead_board_king_coloring_has_no_chain() -> void:
	# A 2x2 king-graph 4-coloring: no two same-type cells are 8-adjacent, so
	# every component has size 1 and no 3-chain exists anywhere.
	var a := T.GRASS
	var b := T.WHEAT
	var cc := T.CARROT
	var d := T.APPLE
	var g := _grid([
		[a, b, a, b, a, b],
		[cc, d, cc, d, cc, d],
		[a, b, a, b, a, b],
		[cc, d, cc, d, cc, d],
		[a, b, a, b, a, b],
		[cc, d, cc, d, cc, d],
	])
	assert_bool(BoardLogic.has_valid_chain(g)).is_false()

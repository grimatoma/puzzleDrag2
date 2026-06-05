extends SceneTree
## Headless unit-test runner for BoardLogic. Run from the godot/ project root:
##   godot --headless --script res://tests/run_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## This is a deliberately small, dependency-free harness. GdUnit4 integration is
## a planned follow-up (see docs/godot-migration-progress.html); it can wrap the
## exact same BoardLogic class without changing any game code.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── BoardLogic tests ──────────────────────────────")
	_test_valid_chain_basic()
	_test_chain_too_short()
	_test_chain_type_mismatch()
	_test_adjacency_and_revisit()
	_test_diagonal_adjacency()
	_test_collapse_no_floating_gaps()
	_test_collapse_preserves_order()
	_test_refill_fills_board()
	_test_upgrade_count()
	_test_has_valid_chain_true()
	_test_has_valid_chain_false_checkerboard()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helpers ──────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## Build a grid from rows of enum ints (rows[0] is the top row).
func _grid(rows: Array) -> Array:
	var g: Array = []
	for row in rows:
		g.append((row as Array).duplicate())
	return g

func _column_has_no_floating_gap(grid: Array, c: int) -> bool:
	# Once an EMPTY appears scanning downward, everything below must be non-empty?
	# No — the invariant is the opposite: all EMPTY cells sit ABOVE all filled
	# cells. So once we see a filled cell scanning downward, no EMPTY may follow.
	var seen_filled := false
	for r in Constants.ROWS:
		var v: int = grid[r][c]
		if v != Constants.EMPTY:
			seen_filled = true
		elif seen_filled:
			return false
	return true

# ── tests ──────────────────────────────────────────────────────────────────

func _test_valid_chain_basic() -> void:
	# An L of three GRASS along the top-left.
	var g := _grid([
		[T.GRASS, T.GRASS, T.WHEAT, T.WHEAT, T.WHEAT, T.WHEAT],
		[T.GRASS, T.APPLE, T.APPLE, T.APPLE, T.APPLE, T.APPLE],
		[T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK],
		[T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG],
		[T.COW,   T.COW,   T.COW,   T.COW,   T.COW,   T.COW],
		[T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE],
	])
	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]
	_check(BoardLogic.is_valid_chain(g, path), "valid 3-chain of GRASS accepted")

func _test_chain_too_short() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.WHEAT, T.WHEAT, T.WHEAT, T.WHEAT],
		[T.GRASS, T.APPLE, T.APPLE, T.APPLE, T.APPLE, T.APPLE],
		[T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK],
		[T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG],
		[T.COW,   T.COW,   T.COW,   T.COW,   T.COW,   T.COW],
		[T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE],
	])
	var path := [Vector2i(0, 0), Vector2i(1, 0)]
	_check(not BoardLogic.is_valid_chain(g, path), "2-chain rejected (below MIN_CHAIN)")

func _test_chain_type_mismatch() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.WHEAT, T.WHEAT, T.WHEAT, T.WHEAT],
		[T.GRASS, T.APPLE, T.APPLE, T.APPLE, T.APPLE, T.APPLE],
		[T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK,   T.OAK],
		[T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG,   T.PIG],
		[T.COW,   T.COW,   T.COW,   T.COW,   T.COW,   T.COW],
		[T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE, T.HORSE],
	])
	# (1,0) is GRASS, (2,0) is WHEAT — mixed types.
	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0)]
	_check(not BoardLogic.is_valid_chain(g, path), "mixed-type chain rejected")

func _test_adjacency_and_revisit() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
	])
	# Jump of 2 columns — not adjacent.
	var gap := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(3, 0)]
	_check(not BoardLogic.is_valid_chain(g, gap), "non-adjacent jump rejected")
	# Revisit the first cell.
	var revisit := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 0)]
	_check(not BoardLogic.is_valid_chain(g, revisit), "revisited cell rejected")

func _test_diagonal_adjacency() -> void:
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
	_check(BoardLogic.is_valid_chain(g, diag), "diagonal (8-way) chain accepted")

func _test_collapse_no_floating_gaps() -> void:
	var g := BoardLogic.make_empty_grid()
	# Scatter a few tiles with gaps under them.
	g[0][0] = T.GRASS
	g[2][0] = T.WHEAT
	g[5][0] = T.OAK
	g[1][3] = T.PIG
	BoardLogic.collapse(g)
	var ok := true
	for c in Constants.COLS:
		if not _column_has_no_floating_gap(g, c):
			ok = false
	_check(ok, "collapse leaves no floating gaps in any column")
	# Column 0 had 3 tiles; they must rest on the bottom three rows.
	_check(g[3][0] != Constants.EMPTY and g[4][0] != Constants.EMPTY and g[5][0] != Constants.EMPTY,
		"collapse stacks column-0 tiles on the floor")

func _test_collapse_preserves_order() -> void:
	var g := BoardLogic.make_empty_grid()
	g[0][2] = T.GRASS   # top
	g[3][2] = T.WHEAT   # middle
	g[4][2] = T.OAK     # lower
	BoardLogic.collapse(g)
	# Relative top-to-bottom order is preserved after the fall.
	_check(g[3][2] == T.GRASS and g[4][2] == T.WHEAT and g[5][2] == T.OAK,
		"collapse preserves vertical order")

func _test_refill_fills_board() -> void:
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
	_check(empties == 0, "refill leaves zero empty cells (board full)")
	_check(g[5][0] == T.GRASS, "refill does not overwrite surviving tiles")

func _test_upgrade_count() -> void:
	_check(BoardLogic.upgrade_count(7, 6) == 1, "7 tiles / threshold 6 -> 1 unit")
	_check(BoardLogic.upgrade_count(12, 6) == 2, "12 tiles / threshold 6 -> 2 units")
	_check(BoardLogic.upgrade_count(5, 6) == 0, "5 tiles / threshold 6 -> 0 units")
	_check(BoardLogic.upgrade_count(9, 10) == 0, "9 tiles / threshold 10 -> 0 units")
	_check(BoardLogic.upgrade_count(20, 10) == 2, "20 tiles / threshold 10 -> 2 units")

func _test_has_valid_chain_true() -> void:
	var g := _grid([
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
		[T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS],
	])
	_check(BoardLogic.has_valid_chain(g), "full-grass board has a valid chain")

func _test_has_valid_chain_false_checkerboard() -> void:
	# A 2x2 king-graph 4-coloring: no two same-type cells are 8-adjacent, so
	# every component has size 1 and no 3-chain exists anywhere.
	var a := T.GRASS
	var b := T.WHEAT
	var c := T.CARROT
	var d := T.APPLE
	var g := _grid([
		[a, b, a, b, a, b],
		[c, d, c, d, c, d],
		[a, b, a, b, a, b],
		[c, d, c, d, c, d],
		[a, b, a, b, a, b],
		[c, d, c, d, c, d],
	])
	_check(not BoardLogic.has_valid_chain(g), "king-coloring board has NO valid chain (dead board)")

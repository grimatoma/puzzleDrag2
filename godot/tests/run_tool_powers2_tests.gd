extends SceneTree
## Headless unit-test runner for the Tools-PR2 NEW board POWERS — the three primitives
## added to ToolEffects (transform_random_n / shuffle_tiles / clear_hazard) and the five
## tools that drive them (basic/rare → transform_random_n, shuffle → reshuffle_board,
## cat/terrier → clear_hazard). Run from the godot/ project root:
##   godot --headless --script res://tests/run_tool_powers2_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_tool_catalog2_tests.gd (pure statics over
## int grids — no nodes needed). For the five added tools this asserts catalog membership
## + shape, then exercises each new primitive directly AND through ToolConfig.apply_instant:
##   - transform_random_n: transforms exactly N eligible cells to the resolved target;
##     "biome_base" → GRASS, "biome_rare" → FRUIT_BLACKBERRY; never touches a RAT/RUBBLE
##     cell; deterministic given a seeded rng.
##   - shuffle_tiles: output is a permutation of the input's non-empty multiset (same
##     value-counts), EMPTY cells unchanged in position; and a landed shuffle yields
##     BoardLogic.has_valid_chain true via the apply_external_grid guard.
##   - clear_hazard: clears every RAT cell to EMPTY, leaves non-rat cells intact, credits
##     nothing (collected is empty).
##   - Regression: the existing apply_instant/apply_tap powers still work (quick smoke).

const T := Constants.Tile

# Every id this PR adds, with its expected power + tap mode + label.
const ADDED := {
	"basic":   {"power": "transform_random_n", "tap": false, "label": "Seedpack"},
	"rare":    {"power": "transform_random_n", "tap": false, "label": "Lockbox"},
	"shuffle": {"power": "reshuffle_board",     "tap": false, "label": "Reshuffle Horn"},
	"cat":     {"power": "clear_hazard",        "tap": false, "label": "Cat"},
	"terrier": {"power": "clear_hazard",        "tap": false, "label": "Terrier"},
}

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Tools PR2 new board powers ─────────────────────")
	_test_membership_and_shape()
	_test_transform_random_n_primitive()
	_test_transform_random_n_dispatch_seedpack()
	_test_transform_random_n_dispatch_lockbox()
	_test_transform_random_n_skips_hazards()
	_test_transform_random_n_fewer_than_count()
	_test_shuffle_tiles_permutation()
	_test_shuffle_tiles_keeps_empties_in_place()
	_test_shuffle_landed_is_live()
	_test_clear_hazard_primitive()
	_test_clear_hazard_dispatch_cat_and_terrier()
	# Backward-compat: the pre-existing dispatch paths must still work.
	print("── Regression (pre-existing dispatch paths) ───────")
	_test_regression_existing_powers()
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

## A full 6x6 grid where every cell holds `tile`.
func _full(tile: int) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(tile)
		g.append(row)
	return g

## Count cells equal to `tile`.
func _count_of(grid: Array, tile: int) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

## A fresh rng seeded deterministically (so tests are reproducible).
func _rng(seed: int = 12345) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = seed
	return r

## The multiset {tile_value: count} of all NON-EMPTY cells in `grid`.
func _multiset(grid: Array) -> Dictionary:
	var m: Dictionary = {}
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var v: int = grid[r][c]
			if v != Constants.EMPTY:
				m[v] = int(m.get(v, 0)) + 1
	return m

# ── membership + catalog shape ──────────────────────────────────────────────

func _test_membership_and_shape() -> void:
	# 24 from PR0+PR1, +5 here = 29, +3 fill_bias (PR2b) = 32 total; TOOL_IDS has no dupes.
	_check(ToolConfig.all_ids().size() == 32, "catalog has 32 tools (24 prior + 5 PR2 + 3 PR2b)")
	var seen := {}
	var dup := false
	for id in ToolConfig.all_ids():
		if seen.has(id):
			dup = true
		seen[id] = true
	_check(not dup, "TOOL_IDS has no duplicate ids")
	for id in ADDED.keys():
		var spec: Dictionary = ADDED[id]
		_check(ToolConfig.has_tool(id), "added tool '%s' is in TOOLS" % id)
		_check(ToolConfig.all_ids().has(id), "added tool '%s' is in TOOL_IDS" % id)
		_check(ToolConfig.power_id(id) == spec["power"],
			"'%s' power_id is '%s'" % [id, spec["power"]])
		_check(ToolConfig.is_tap_target(id) == spec["tap"],
			"'%s' tap_target is %s" % [id, str(spec["tap"])])
		_check(ToolConfig.tool_label(id) == spec["label"],
			"'%s' label is '%s'" % [id, spec["label"]])

# ── transform_random_n primitive ────────────────────────────────────────────

func _test_transform_random_n_primitive() -> void:
	# On a full GRASS board, transform exactly 5 cells to FRUIT_BLACKBERRY.
	var g := _full(T.GRASS)
	var res := ToolEffects.transform_random_n(g, 5, T.FRUIT_BLACKBERRY, _rng())
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 5, "transform_random_n reports transformed=5")
	_check(_count_of(out, T.FRUIT_BLACKBERRY) == 5, "exactly 5 cells became the target")
	_check(_count_of(out, T.GRASS) == 31, "the other 31 cells are untouched")
	# Purity: caller's grid not mutated.
	_check(_count_of(g, T.GRASS) == 36, "transform_random_n did not mutate the caller's grid")
	# Determinism: same seed → same cells transformed.
	var res2 := ToolEffects.transform_random_n(g, 5, T.FRUIT_BLACKBERRY, _rng())
	var same := true
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if res["grid"][r][c] != res2["grid"][r][c]:
				same = false
	_check(same, "transform_random_n is deterministic for a fixed seed")

func _test_transform_random_n_dispatch_seedpack() -> void:
	# basic → Seedpack: count 5, to "biome_base" → GRASS. Use a DIRT board so the target
	# differs from the filler and we can count the transform exactly.
	var g := _full(T.DIRT)
	var res := ToolConfig.apply_instant(g, "basic", _rng())
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 5, "seedpack transforms 5 cells")
	_check(_count_of(out, T.GRASS) == 5, "biome_base resolved to GRASS (5 placed)")
	_check(_count_of(out, T.DIRT) == 31, "seedpack left 31 DIRT cells")
	# Direct resolver sanity.
	_check(ToolConfig._resolve_spawn_key("biome_base") == T.GRASS, "_resolve_spawn_key('biome_base') == GRASS")

func _test_transform_random_n_dispatch_lockbox() -> void:
	# rare → Lockbox: count 3, to "biome_rare" → FRUIT_BLACKBERRY.
	var g := _full(T.DIRT)
	var res := ToolConfig.apply_instant(g, "rare", _rng())
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 3, "lockbox transforms 3 cells")
	_check(_count_of(out, T.FRUIT_BLACKBERRY) == 3, "biome_rare resolved to FRUIT_BLACKBERRY (3 placed)")
	_check(_count_of(out, T.DIRT) == 33, "lockbox left 33 DIRT cells")
	_check(ToolConfig._resolve_spawn_key("biome_rare") == T.FRUIT_BLACKBERRY,
		"_resolve_spawn_key('biome_rare') == FRUIT_BLACKBERRY")

func _test_transform_random_n_skips_hazards() -> void:
	# A board of RAT/RUBBLE hazards + a few GRASS: only the non-hazard GRASS may be picked.
	var g := _full(T.RAT)
	g[0][0] = T.RUBBLE
	g[1][1] = T.GRASS
	g[2][2] = T.GRASS
	g[3][3] = T.GRASS
	# Ask for 5 but only 3 eligible (the 3 GRASS) — all 3 transform, no hazard touched.
	var res := ToolEffects.transform_random_n(g, 5, T.APPLE, _rng())
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 3, "transform_random_n only transformed the 3 eligible (non-hazard) cells")
	_check(_count_of(out, T.APPLE) == 3, "3 GRASS became APPLE")
	_check(_count_of(out, T.RAT) == _count_of(g, T.RAT), "no RAT was transformed")
	_check(out[0][0] == T.RUBBLE, "the RUBBLE hazard is untouched")

func _test_transform_random_n_fewer_than_count() -> void:
	# Fewer eligible than count → transform what's available (no error).
	var g := _full(Constants.EMPTY)
	g[0][0] = T.GRASS
	g[5][5] = T.GRASS
	var res := ToolEffects.transform_random_n(g, 10, T.APPLE, _rng())
	_check(int(res["transformed"]) == 2, "transform_random_n caps at the 2 available eligible cells")
	_check(_count_of(res["grid"], T.APPLE) == 2, "both eligible cells transformed")

# ── shuffle_tiles primitive (reshuffle_board) ────────────────────────────────

func _test_shuffle_tiles_permutation() -> void:
	# A varied full board: shuffling must preserve the exact value-multiset.
	var g := _full(T.GRASS)
	g[0][0] = T.WHEAT
	g[0][1] = T.WHEAT
	g[1][0] = T.APPLE
	g[2][2] = T.OAK
	g[3][3] = T.OAK
	g[4][4] = T.PIG
	g[5][5] = T.RAT   # a hazard is shuffled like any other value
	var before := _multiset(g)
	var res := ToolEffects.shuffle_tiles(g, _rng())
	var out: Array = res["grid"]
	var after := _multiset(out)
	var same_multiset := before.size() == after.size()
	for k in before.keys():
		if int(after.get(k, -999)) != int(before[k]):
			same_multiset = false
	_check(same_multiset, "shuffle_tiles preserves the non-empty value-multiset exactly")
	# Purity: caller's grid not mutated.
	_check(_multiset(g) == before, "shuffle_tiles did not mutate the caller's grid")
	# It actually reorders SOMETHING for this seed (not a strict guarantee, but a useful
	# smoke that the shuffle ran — a no-op permutation here would be suspicious).
	var moved := false
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if out[r][c] != g[r][c]:
				moved = true
	_check(moved, "shuffle_tiles actually permutes positions for this seed")

func _test_shuffle_tiles_keeps_empties_in_place() -> void:
	# EMPTY cells must stay holes IN PLACE (only non-empty values are permuted).
	var g := _full(T.GRASS)
	g[0][0] = Constants.EMPTY
	g[3][3] = Constants.EMPTY
	g[5][5] = Constants.EMPTY
	var res := ToolEffects.shuffle_tiles(g, _rng())
	var out: Array = res["grid"]
	_check(out[0][0] == Constants.EMPTY and out[3][3] == Constants.EMPTY and out[5][5] == Constants.EMPTY,
		"shuffle_tiles leaves EMPTY cells as holes in their original positions")
	_check(_count_of(out, Constants.EMPTY) == 3, "exactly the 3 original holes remain")
	# The 33 non-empty values are preserved in count.
	_check(_count_of(out, T.GRASS) == 33, "all 33 non-empty GRASS values survive the shuffle")

func _test_shuffle_landed_is_live() -> void:
	# A SHUFFLED grid landed through Board.apply_external_grid must end playable: the
	# existing _ensure_live_board() / has_valid_chain reshuffle guard kicks in. Build a
	# real Board, hand it a shuffled grid, and confirm has_valid_chain(live grid) is true.
	var BoardScript: GDScript = load("res://scenes/Board.gd")
	var board = BoardScript.new()
	# Board.apply_external_grid uses board.rng + board.tile_pool + collapse/refill +
	# _ensure_live_board + _build_tiles. _build_tiles instantiates Tile nodes, so the Board
	# must be in the tree. Add it under the SceneTree root.
	get_root().add_child(board)
	# Build a deliberately varied grid, shuffle it, then land it.
	var g := _full(T.GRASS)
	for c in Constants.COLS:
		g[0][c] = T.WHEAT
		g[1][c] = T.APPLE
		g[2][c] = T.OAK
	var shuffle_res := ToolEffects.shuffle_tiles(g, _rng())
	var shuffled: Array = shuffle_res["grid"]
	board.apply_external_grid(shuffled)
	# After landing, the LIVE board (post collapse/refill/guard) must have a legal chain.
	_check(BoardLogic.has_valid_chain(board.grid),
		"a landed shuffle yields a live board (has_valid_chain true via the apply_external_grid guard)")
	board.queue_free()

# ── clear_hazard primitive (cat / terrier) ───────────────────────────────────

func _test_clear_hazard_primitive() -> void:
	# Clear every RAT to EMPTY; leave non-rat cells (incl. the OTHER hazard, RUBBLE) intact.
	var g := _full(T.GRASS)
	g[0][0] = T.RAT
	g[2][3] = T.RAT
	g[4][1] = T.RAT
	g[5][5] = T.RUBBLE   # a DIFFERENT hazard — clear_hazard(RAT) must NOT touch it
	var res := ToolEffects.clear_hazard(g, T.RAT)
	var out: Array = res["grid"]
	_check(_count_of(out, T.RAT) == 0, "clear_hazard cleared every RAT")
	_check(_count_of(out, Constants.EMPTY) == 3, "the 3 RAT cells are now EMPTY")
	_check(out[5][5] == T.RUBBLE, "clear_hazard(RAT) leaves the RUBBLE hazard intact")
	_check(_count_of(out, T.GRASS) == 32, "clear_hazard left every non-rat GRASS intact")
	_check(res["collected"].is_empty(), "clear_hazard credits nothing (collected is empty)")
	# Purity.
	_check(_count_of(g, T.RAT) == 3, "clear_hazard did not mutate the caller's grid")

func _test_clear_hazard_dispatch_cat_and_terrier() -> void:
	# Both cat and terrier dispatch clear_hazard with target "rats" → Tile.RAT.
	for id in ["cat", "terrier"]:
		var g := _full(T.GRASS)
		g[1][1] = T.RAT
		g[3][3] = T.RAT
		var res := ToolConfig.apply_instant(g, id)
		var out: Array = res["grid"]
		_check(not res.is_empty(), "apply_instant('%s') dispatches" % id)
		_check(_count_of(out, T.RAT) == 0, "'%s' cleared every RAT" % id)
		_check(int(res.get("collected", {}).size()) == 0, "'%s' credits nothing" % id)
	_check(ToolConfig._resolve_hazard_key("rats") == T.RAT, "_resolve_hazard_key('rats') == RAT")

# ── Regression: pre-existing dispatch paths still work ──────────────────────

func _test_regression_existing_powers() -> void:
	# clear_all (stone_hammer): clears STONE.
	var g1 := _full(T.GRASS)
	g1[0][0] = T.STONE
	g1[1][1] = T.STONE
	var r1 := ToolConfig.apply_instant(g1, "stone_hammer")
	_check(_count_of(r1["grid"], T.STONE) == 0 and int(r1["collected"].get(T.STONE, 0)) == 2,
		"REGRESSION: stone_hammer (clear_all) still clears + collects STONE")
	# clear_category (axe → trees): clears OAK.
	var g2 := _full(T.GRASS)
	g2[2][2] = T.OAK
	var r2 := ToolConfig.apply_instant(g2, "axe")
	_check(_count_of(r2["grid"], T.OAK) == 0, "REGRESSION: axe (clear_category) still clears trees")
	# transform_tiles (drill → DIRT→STONE).
	var g3 := _full(T.DIRT)
	var r3 := ToolConfig.apply_instant(g3, "drill")
	_check(_count_of(r3["grid"], T.STONE) == 36 and not r3.has("collected") and int(r3.get("transformed", 0)) == 36,
		"REGRESSION: drill (transform_tiles) still remaps DIRT→STONE, credits nothing")
	# clear_random_n (scythe, count 6) with a seeded rng — deterministic clear of 6.
	var g4 := _full(T.GRASS)
	var r4 := ToolConfig.apply_instant(g4, "scythe", _rng())
	_check(_count_of(r4["grid"], Constants.EMPTY) == 6, "REGRESSION: scythe (clear_random_n) still clears 6 cells")
	# area_blast (bomb, tap) — 3x3 cleared.
	var g5 := _full(T.GRASS)
	var r5 := ToolConfig.apply_tap(g5, "bomb", Vector2i(2, 2))
	_check(_count_of(r5["grid"], Constants.EMPTY) == 9, "REGRESSION: bomb (area_blast tap) still clears the 3x3")
	# transform_adjacent (magnet, tap) — 3x3 IRON_ORE→STONE.
	var g6 := _full(T.IRON_ORE)
	var r6 := ToolConfig.apply_tap(g6, "magnet", Vector2i(2, 2))
	_check(int(r6["transformed"]) == 9 and r6["grid"][2][2] == T.STONE,
		"REGRESSION: magnet (transform_adjacent tap) still remaps the 3x3 ore→stone")

extends SceneTree
## Headless unit-test runner for the M8a TOOLS LOGIC CORE — ToolEffects (pure board
## effects) + ToolConfig (catalog + dispatch). Run from the godot/ project root:
##   godot --headless --script res://tests/run_tools_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_tests.gd (no nodes needed — every
## function under test is a pure static over the int grid). Covers each ToolEffects
## primitive, the hazard-lock rule (RAT / RUBBLE survive clears/blasts/random), input
## non-mutation, and every catalogued tool via ToolConfig.apply_instant / apply_tap.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Tools logic core tests (M8a) ───────────────────")
	# ToolEffects primitives
	_test_area_blast_interior()
	_test_area_blast_corner()
	_test_select_component_4connected()
	_test_select_row()
	_test_select_column()
	_test_select_cross()
	_test_sweep_keys_clear_all()
	_test_sweep_keys_category()
	_test_sweep_cells()
	_test_transform_all()
	_test_transform_adjacent()
	_test_clear_random_n_count_and_determinism()
	# Hazard lock
	_test_hazard_survives_blast()
	_test_hazard_survives_clear_all()
	_test_hazard_survives_random()
	_test_hazard_survives_transform()
	# Purity
	_test_input_not_mutated()
	# ToolConfig catalog + dispatch
	_test_catalog_membership()
	_test_is_tap_target()
	_test_apply_tap_bomb()
	_test_apply_tap_rake()
	_test_apply_tap_sickle()
	_test_apply_tap_auger()
	_test_apply_tap_blast_charge()
	_test_apply_tap_magnet()
	_test_apply_instant_axe()
	_test_apply_instant_scythe()
	_test_apply_instant_stone_hammer()
	_test_apply_instant_drill()
	_test_apply_dispatch_guards()
	# ── GameState tool API (M8b) ───────────────────────────────────────────────
	print("── GameState tool API (M8b) ───────────────────────")
	_test_gs_grant_and_counts()
	_test_gs_arm_only_tap_tools()
	_test_gs_use_instant_credits_and_consumes()
	_test_gs_use_tap_credits_consumes_disarms()
	_test_gs_use_guards()
	_test_gs_hazard_not_credited()
	_test_gs_transform_credits_nothing()
	_test_gs_save_load_roundtrip()
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

## A full 6x6 grid where every cell holds `tile`.
func _full(tile: int) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(tile)
		g.append(row)
	return g

## Count non-EMPTY cells in a grid.
func _count_filled(grid: Array) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] != Constants.EMPTY:
				n += 1
	return n

## Count cells equal to `tile`.
func _count_of(grid: Array, tile: int) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

# ── ToolEffects: area_blast ─────────────────────────────────────────────────

func _test_area_blast_interior() -> void:
	var g := _full(T.GRASS)
	var res := ToolEffects.area_blast(g, Vector2i(2, 2), 1)
	var out: Array = res["grid"]
	# 3x3 around (2,2) cleared = 9 cells; the rest survive.
	_check(_count_filled(out) == 36 - 9, "area_blast r1 interior clears exactly the 3x3 (9 cells)")
	_check(int(res["collected"].get(T.GRASS, 0)) == 9, "area_blast interior collected 9 grass")
	_check(out[2][2] == Constants.EMPTY and out[1][1] == Constants.EMPTY and out[3][3] == Constants.EMPTY,
		"area_blast cleared center + diagonals of the 3x3")
	_check(out[0][0] != Constants.EMPTY, "area_blast left distant corner intact")

func _test_area_blast_corner() -> void:
	var g := _full(T.GRASS)
	var res := ToolEffects.area_blast(g, Vector2i(0, 0), 1)
	var out: Array = res["grid"]
	# Top-left corner: only the 2x2 in-bounds quadrant is hit (4 cells).
	_check(_count_filled(out) == 36 - 4, "area_blast r1 at corner clears only the in-bounds 2x2 (4 cells)")
	_check(out[0][0] == Constants.EMPTY and out[0][1] == Constants.EMPTY \
		and out[1][0] == Constants.EMPTY and out[1][1] == Constants.EMPTY,
		"area_blast corner cleared the 2x2 quadrant")

# ── ToolEffects: select_component (4-connected) ──────────────────────────────

func _test_select_component_4connected() -> void:
	# An L-shaped WHEAT patch (3 orthogonally-connected cells) plus a DIAGONAL-only
	# wheat at (col=3,row=3) touching the corner (col=2,row=2) only at a diagonal —
	# it must NOT join the 4-connected component. Grid is grid[row][col].
	var g := _full(T.GRASS)
	g[2][2] = T.WHEAT  # corner of the L  (col=2,row=2)
	g[2][3] = T.WHEAT  # right arm        (col=3,row=2)
	g[3][2] = T.WHEAT  # down arm         (col=2,row=3)
	g[3][3] = T.WHEAT  # diagonal of the corner (col=3,row=3) — but it IS orthogonal
	                   # to both arms, so to make a clean diagonal-only test we clear
	                   # the arms below and use a 1-cell seed instead.
	# Reset to a clean diagonal-only case: seed alone + one diagonal neighbour.
	g = _full(T.GRASS)
	g[2][2] = T.WHEAT          # seed (col=2,row=2)
	g[3][3] = T.WHEAT          # pure diagonal neighbour (col=3,row=3), no ortho link
	var comp := ToolEffects.select_component(g, Vector2i(2, 2))
	_check(comp.size() == 1, "select_component (4-connected) does NOT cross a pure diagonal")
	_check(not comp.has(Vector2i(3, 3)), "select_component EXCLUDES the diagonal same-value cell")
	# And a real orthogonal patch floods fully.
	var g2 := _full(T.GRASS)
	g2[2][2] = T.WHEAT  # (col=2,row=2)
	g2[2][3] = T.WHEAT  # (col=3,row=2) right
	g2[3][2] = T.WHEAT  # (col=2,row=3) down
	var comp2 := ToolEffects.select_component(g2, Vector2i(2, 2))
	_check(comp2.size() == 3, "select_component floods the 3-cell orthogonal L")
	_check(comp2.has(Vector2i(2, 2)) and comp2.has(Vector2i(3, 2)) and comp2.has(Vector2i(2, 3)),
		"select_component includes seed + orthogonal neighbours")

# ── ToolEffects: row / column / cross selection ──────────────────────────────

func _test_select_row() -> void:
	var g := _full(T.GRASS)
	var sel := ToolEffects.select_row(g, Vector2i(3, 2))
	_check(sel.size() == Constants.COLS, "select_row returns the whole tapped row (6 cells)")
	var all_row := true
	for p in sel:
		if p.y != 2:
			all_row = false
	_check(all_row, "select_row cells all share the tapped row index")

func _test_select_column() -> void:
	var g := _full(T.GRASS)
	var sel := ToolEffects.select_column(g, Vector2i(4, 1))
	_check(sel.size() == Constants.ROWS, "select_column returns the whole tapped column (6 cells)")
	var all_col := true
	for p in sel:
		if p.x != 4:
			all_col = false
	_check(all_col, "select_column cells all share the tapped column index")

func _test_select_cross() -> void:
	var g := _full(T.GRASS)
	var sel := ToolEffects.select_cross(g, Vector2i(3, 3))
	# 6 row + 6 col - 1 shared center = 11 unique cells.
	_check(sel.size() == 11, "select_cross returns row ∪ column de-duplicated (11 cells)")

# ── ToolEffects: sweep_keys (clear_all / clear_category) ─────────────────────

func _test_sweep_keys_clear_all() -> void:
	var g := _full(T.GRASS)
	g[0][0] = T.WHEAT
	g[5][5] = T.WHEAT
	var res := ToolEffects.sweep_keys(g, [T.GRASS])
	var out: Array = res["grid"]
	_check(_count_of(out, T.GRASS) == 0, "sweep_keys [GRASS] clears every grass cell")
	_check(_count_of(out, T.WHEAT) == 2, "sweep_keys [GRASS] leaves wheat untouched")
	_check(int(res["collected"].get(T.GRASS, 0)) == 34, "sweep_keys collected 34 grass")

func _test_sweep_keys_category() -> void:
	# "trees" category includes OAK (plus the full-catalog parity tree tiles added
	# in #1047); the sweep grid below only places OAK, so the category just needs to
	# contain OAK for clear_category to remove it.
	var g := _full(T.GRASS)
	g[1][1] = T.OAK
	g[4][4] = T.OAK
	g[2][2] = T.WHEAT
	var keys := ToolConfig.tiles_in_category("trees")
	var res := ToolEffects.sweep_keys(g, keys)
	var out: Array = res["grid"]
	_check(keys.has(T.OAK), "tiles_in_category('trees') includes OAK")
	_check(_count_of(out, T.OAK) == 0, "clear_category 'trees' removes all OAK")
	_check(_count_of(out, T.WHEAT) == 1 and _count_of(out, T.GRASS) == 33,
		"clear_category 'trees' leaves non-tree tiles intact")

func _test_sweep_cells() -> void:
	var g := _full(T.GRASS)
	var cells := [Vector2i(0, 0), Vector2i(5, 5), Vector2i(2, 3)]
	var res := ToolEffects.sweep_cells(g, cells)
	var out: Array = res["grid"]
	_check(_count_filled(out) == 33, "sweep_cells clears exactly the 3 listed cells")
	# cells are Vector2i(col,row); check grid[row][col]: (0,0)->[0][0], (5,5)->[5][5], (2,3)->[3][2].
	_check(out[0][0] == Constants.EMPTY and out[5][5] == Constants.EMPTY and out[3][2] == Constants.EMPTY,
		"sweep_cells cleared each listed (col,row) coordinate")

# ── ToolEffects: transforms ──────────────────────────────────────────────────

func _test_transform_all() -> void:
	var g := _full(T.DIRT)
	g[0][0] = T.GEM
	var res := ToolEffects.transform_all(g, [T.DIRT], T.STONE)
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 35, "transform_all remapped all 35 DIRT")
	_check(_count_of(out, T.STONE) == 35 and _count_of(out, T.DIRT) == 0, "transform_all DIRT→STONE")
	_check(_count_of(out, T.GEM) == 1, "transform_all left the non-matching GEM alone")

func _test_transform_adjacent() -> void:
	var g := _full(T.IRON_ORE)
	var res := ToolEffects.transform_adjacent(g, Vector2i(2, 2), 1, [T.IRON_ORE], T.STONE)
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 9, "transform_adjacent r1 remapped the 3x3 (9 cells)")
	_check(out[2][2] == T.STONE and out[1][1] == T.STONE, "transform_adjacent center+corner → STONE")
	_check(out[0][0] == T.IRON_ORE, "transform_adjacent left ore outside the radius unchanged")

# ── ToolEffects: clear_random_n ──────────────────────────────────────────────

func _test_clear_random_n_count_and_determinism() -> void:
	var g := _full(T.GRASS)
	var rng_a := RandomNumberGenerator.new()
	rng_a.seed = 999
	var res_a := ToolEffects.clear_random_n(g, 6, rng_a)
	var out_a: Array = res_a["grid"]
	_check(_count_filled(out_a) == 30, "clear_random_n(6) clears exactly 6 cells")
	# Reproducible: same seed → same cleared cells.
	var rng_b := RandomNumberGenerator.new()
	rng_b.seed = 999
	var res_b := ToolEffects.clear_random_n(g, 6, rng_b)
	var out_b: Array = res_b["grid"]
	var same := true
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if out_a[r][c] != out_b[r][c]:
				same = false
	_check(same, "clear_random_n is reproducible for a fixed seed")

# ── Hazard lock ──────────────────────────────────────────────────────────────

func _test_hazard_survives_blast() -> void:
	var g := _full(T.STONE)
	g[2][2] = T.RAT       # center of an interior blast (col=2,row=2)
	g[2][3] = T.RUBBLE    # also inside the 3x3 (col=3,row=2)
	var res := ToolEffects.area_blast(g, Vector2i(2, 2), 1)
	var out: Array = res["grid"]
	_check(out[2][2] == T.RAT, "RAT survives an area_blast that would otherwise clear it")
	_check(out[2][3] == T.RUBBLE, "RUBBLE survives an area_blast (grid[2][3])")
	# Of the 9-cell 3x3, 2 are hazards → only 7 stone cleared.
	_check(int(res["collected"].get(T.STONE, 0)) == 7, "area_blast collected only the 7 non-hazard cells")

func _test_hazard_survives_clear_all() -> void:
	var g := _full(T.GRASS)
	g[0][0] = T.RAT
	g[5][5] = T.RUBBLE
	# clear_all GRASS shouldn't touch hazards even though they're not grass; and a
	# clear targeting the hazard's own value must still skip it.
	var res := ToolEffects.sweep_keys(g, [T.GRASS, T.RAT, T.RUBBLE])
	var out: Array = res["grid"]
	_check(out[0][0] == T.RAT and out[5][5] == T.RUBBLE, "sweep_keys never removes RAT/RUBBLE even if listed")
	_check(_count_of(out, T.GRASS) == 0, "sweep_keys still cleared all grass around the hazards")

func _test_hazard_survives_random() -> void:
	# A board that is ALL hazards: clear_random_n has zero eligible candidates.
	var g := _full(T.RAT)
	g[0][0] = T.RUBBLE
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var res := ToolEffects.clear_random_n(g, 6, rng)
	var out: Array = res["grid"]
	_check(_count_filled(out) == 36, "clear_random_n clears nothing on an all-hazard board")
	_check(res["collected"].is_empty(), "clear_random_n collected nothing (no eligible cells)")

func _test_hazard_survives_transform() -> void:
	var g := _full(T.IRON_ORE)
	g[2][2] = T.RAT      # (col=2,row=2)
	g[2][3] = T.RUBBLE   # (col=3,row=2)
	var res := ToolEffects.transform_adjacent(g, Vector2i(2, 2), 1, [T.IRON_ORE, T.RAT, T.RUBBLE], T.STONE)
	var out: Array = res["grid"]
	_check(out[2][2] == T.RAT and out[2][3] == T.RUBBLE, "transform_adjacent skips RAT/RUBBLE in the radius")
	_check(int(res["transformed"]) == 7, "transform_adjacent remapped only the 7 non-hazard cells")

# ── Purity ───────────────────────────────────────────────────────────────────

func _test_input_not_mutated() -> void:
	var g := _full(T.GRASS)
	var before := _count_filled(g)
	var blast := ToolEffects.area_blast(g, Vector2i(2, 2), 1)
	var swept := ToolEffects.sweep_keys(g, [T.GRASS])
	var xform := ToolEffects.transform_all(g, [T.GRASS], T.STONE)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1
	var rand := ToolEffects.clear_random_n(g, 6, rng)
	# Input grid must be untouched by every effect.
	_check(_count_filled(g) == before, "input grid not mutated by any effect (still full)")
	_check(_count_of(g, T.GRASS) == 36 and _count_of(g, T.STONE) == 0, "input grid values unchanged after transform")
	# And the returned grids are genuinely different objects with the expected change.
	_check(not blast["grid"].is_empty() and _count_filled(blast["grid"]) < before, "returned blast grid is a new, modified grid")
	_check(_count_filled(swept["grid"]) == 0, "returned swept grid is fully cleared")
	_check(_count_filled(rand["grid"]) == before - 6, "returned random grid is a new grid missing 6 cells")
	_check(_count_of(xform["grid"], T.STONE) == 36, "returned transform grid is fully remapped")

# ── ToolConfig: catalog + dispatch ───────────────────────────────────────────

func _test_catalog_membership() -> void:
	# 10 original M8a tools + 14 catalog-parity tools (Tools PR1) + 5 new-power tools
	# (Tools PR2: basic/rare/shuffle/cat/terrier) + 3 fill_bias tools (Tools PR2b:
	# fertilizer/bird_feed/sapling) + 8 portal magic tools (Tools PR3) + 2 wolf-hazard tools
	# (T14a: rifle/hound) + 2 mine-hazard tools (T14b: water_pump/explosives) = 44.
	_check(ToolConfig.all_ids().size() == 44, "catalog has 44 tools")
	for id in ToolConfig.all_ids():
		_check(ToolConfig.has_tool(id), "catalog id '%s' resolves to a tool" % id)
	_check(not ToolConfig.has_tool("not_a_tool"), "unknown id is not a tool")
	_check(ToolConfig.get_tool("not_a_tool").is_empty(), "get_tool(unknown) returns empty dict")

func _test_is_tap_target() -> void:
	_check(ToolConfig.is_tap_target("bomb"), "is_tap_target('bomb') is true")
	_check(ToolConfig.is_tap_target("rake"), "is_tap_target('rake') is true")
	_check(ToolConfig.is_tap_target("sickle"), "is_tap_target('sickle') is true")
	_check(not ToolConfig.is_tap_target("stone_hammer"), "is_tap_target('stone_hammer') is false (instant)")
	_check(not ToolConfig.is_tap_target("scythe"), "is_tap_target('scythe') is false (instant)")
	_check(not ToolConfig.is_tap_target("not_a_tool"), "is_tap_target(unknown) is false")

func _test_apply_tap_bomb() -> void:
	var g := _full(T.GRASS)
	var res := ToolConfig.apply_tap(g, "bomb", Vector2i(2, 2))
	_check(_count_filled(res["grid"]) == 36 - 9, "apply_tap('bomb') dispatches area_blast r1 (clears 3x3)")

func _test_apply_tap_rake() -> void:
	var g := _full(T.GRASS)
	g[2][2] = T.WHEAT
	g[2][3] = T.WHEAT
	g[3][2] = T.WHEAT  # orthogonal patch of 3 wheat
	g[5][5] = T.WHEAT  # disconnected wheat — must NOT be cleared
	var res := ToolConfig.apply_tap(g, "rake", Vector2i(2, 2))
	var out: Array = res["grid"]
	_check(out[2][2] == Constants.EMPTY and out[3][2] == Constants.EMPTY and out[2][3] == Constants.EMPTY,
		"apply_tap('rake') clears the tapped 4-connected wheat patch")
	_check(out[5][5] == T.WHEAT, "apply_tap('rake') leaves the disconnected wheat alone")

func _test_apply_tap_sickle() -> void:
	var g := _full(T.GRASS)
	var res := ToolConfig.apply_tap(g, "sickle", Vector2i(1, 3))
	var out: Array = res["grid"]
	var row_clear := true
	for c in Constants.COLS:
		if out[3][c] != Constants.EMPTY:
			row_clear = false
	_check(row_clear, "apply_tap('sickle') clears the whole tapped row")
	_check(_count_filled(out) == 36 - Constants.COLS, "apply_tap('sickle') cleared exactly one row")

func _test_apply_tap_auger() -> void:
	var g := _full(T.GRASS)
	var res := ToolConfig.apply_tap(g, "auger", Vector2i(4, 0))
	var out: Array = res["grid"]
	var col_clear := true
	for r in Constants.ROWS:
		if out[r][4] != Constants.EMPTY:
			col_clear = false
	_check(col_clear, "apply_tap('auger') clears the whole tapped column")
	_check(_count_filled(out) == 36 - Constants.ROWS, "apply_tap('auger') cleared exactly one column")

func _test_apply_tap_blast_charge() -> void:
	var g := _full(T.GRASS)
	var res := ToolConfig.apply_tap(g, "blast_charge", Vector2i(3, 3))
	# cross = 11 cells cleared.
	_check(_count_filled(res["grid"]) == 36 - 11, "apply_tap('blast_charge') clears row ∪ column (11 cells)")

func _test_apply_tap_magnet() -> void:
	var g := _full(T.IRON_ORE)
	var res := ToolConfig.apply_tap(g, "magnet", Vector2i(2, 2))
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 9, "apply_tap('magnet') transforms the 3x3 ore→stone")
	_check(out[2][2] == T.STONE and out[0][0] == T.IRON_ORE, "apply_tap('magnet') only affects the radius")

func _test_apply_instant_axe() -> void:
	var g := _full(T.GRASS)
	g[1][1] = T.OAK
	g[4][4] = T.OAK
	var res := ToolConfig.apply_instant(g, "axe")
	var out: Array = res["grid"]
	_check(_count_of(out, T.OAK) == 0, "apply_instant('axe') clears all trees (OAK)")
	_check(_count_of(out, T.GRASS) == 34, "apply_instant('axe') leaves non-trees intact")

func _test_apply_instant_scythe() -> void:
	var g := _full(T.GRASS)
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var res := ToolConfig.apply_instant(g, "scythe", rng)
	_check(_count_filled(res["grid"]) == 30, "apply_instant('scythe') clears 6 random cells (count 6)")

func _test_apply_instant_stone_hammer() -> void:
	var g := _full(T.GRASS)
	g[0][0] = T.STONE
	g[3][3] = T.STONE
	var res := ToolConfig.apply_instant(g, "stone_hammer")
	var out: Array = res["grid"]
	_check(_count_of(out, T.STONE) == 0, "apply_instant('stone_hammer') clears all STONE")
	_check(_count_of(out, T.GRASS) == 34, "apply_instant('stone_hammer') leaves grass intact")

func _test_apply_instant_drill() -> void:
	var g := _full(T.DIRT)
	g[0][0] = T.GEM
	var res := ToolConfig.apply_instant(g, "drill")
	var out: Array = res["grid"]
	_check(_count_of(out, T.STONE) == 35 and _count_of(out, T.DIRT) == 0,
		"apply_instant('drill') transforms DIRT→STONE")
	_check(_count_of(out, T.GEM) == 1, "apply_instant('drill') leaves GEM alone")

func _test_apply_dispatch_guards() -> void:
	var g := _full(T.GRASS)
	# Instant dispatch refuses a tap tool, and vice versa; unknown ids return {}.
	_check(ToolConfig.apply_instant(g, "bomb").is_empty(), "apply_instant refuses a tap tool (bomb)")
	_check(ToolConfig.apply_tap(g, "stone_hammer", Vector2i(0, 0)).is_empty(), "apply_tap refuses an instant tool (stone_hammer)")
	_check(ToolConfig.apply_instant(g, "not_a_tool").is_empty(), "apply_instant(unknown) returns empty dict")
	_check(ToolConfig.apply_tap(g, "not_a_tool", Vector2i(0, 0)).is_empty(), "apply_tap(unknown) returns empty dict")

# ── GameState tool API (M8b) ──────────────────────────────────────────────────

func _test_gs_grant_and_counts() -> void:
	var gs := GameState.new()
	_check(gs.tool_count("stone_hammer") == 0, "fresh GameState owns 0 stone_hammer")
	_check(not gs.can_use_tool("stone_hammer"), "can_use_tool false with no charges")
	gs.grant_tool("stone_hammer", 2)
	_check(gs.tool_count("stone_hammer") == 2, "grant_tool(2) → count 2")
	_check(gs.can_use_tool("stone_hammer"), "can_use_tool true after grant")
	_check(gs.has_tool_charges("stone_hammer"), "has_tool_charges true after grant")
	# Granting again stacks.
	gs.grant_tool("stone_hammer")
	_check(gs.tool_count("stone_hammer") == 3, "grant_tool() default n=1 stacks → 3")
	# Unknown id and non-positive n are no-ops.
	gs.grant_tool("not_a_tool", 5)
	_check(gs.tool_count("not_a_tool") == 0, "grant_tool(unknown) is a no-op")
	_check(not gs.can_use_tool("not_a_tool"), "can_use_tool(unknown) is false")
	gs.grant_tool("bomb", 0)
	gs.grant_tool("bomb", -3)
	_check(gs.tool_count("bomb") == 0, "grant_tool with n<=0 is a no-op")

func _test_gs_arm_only_tap_tools() -> void:
	var gs := GameState.new()
	# Cannot arm without charges.
	_check(not gs.arm_tool("bomb"), "arm_tool fails with no charges")
	_check(not gs.is_tool_armed(), "not armed after a failed arm")
	gs.grant_tool("bomb")
	_check(gs.arm_tool("bomb"), "arm_tool('bomb') succeeds (tap tool with a charge)")
	_check(gs.is_tool_armed(), "is_tool_armed true after arming bomb")
	_check(gs.pending_tool == "bomb", "pending_tool names the armed tool")
	gs.clear_pending_tool()
	_check(not gs.is_tool_armed(), "clear_pending_tool disarms")
	# Instant tools can never be armed.
	gs.grant_tool("stone_hammer")
	_check(not gs.arm_tool("stone_hammer"), "arm_tool refuses an INSTANT tool")
	_check(not gs.is_tool_armed(), "instant tool did not arm anything")
	# Unknown id can't arm.
	_check(not gs.arm_tool("not_a_tool"), "arm_tool refuses an unknown id")

func _test_gs_use_instant_credits_and_consumes() -> void:
	var gs := GameState.new()
	gs.grant_tool("stone_hammer", 2)
	# A grid with a known number of STONE; the rest grass so credit is isolated.
	var g := _full(T.GRASS)
	g[0][0] = T.STONE
	g[0][1] = T.STONE
	g[3][3] = T.STONE
	g[5][5] = T.STONE   # 4 STONE total
	# Expected credit: compare against what credit_chain(STONE, 4) does on a twin state.
	var twin := GameState.new()
	var expected := twin.credit_chain(T.STONE, 4)
	var res := gs.use_tool_on_grid("stone_hammer", g)
	_check(res["ok"], "use_tool_on_grid('stone_hammer') ok")
	_check(_count_of(res["grid"], T.STONE) == 0, "stone_hammer cleared every STONE on the grid")
	_check(_count_of(res["grid"], T.GRASS) == 32, "stone_hammer left grass untouched")
	_check(int(res["collected"].get(T.STONE, 0)) == 4, "use returned collected: 4 STONE")
	# Credited resources match the credit_chain(STONE,4) twin exactly.
	_check(gs.qty("block") == twin.qty("block"), "credited 'block' matches credit_chain(STONE,4)")
	_check(int(gs.progress.get("block", 0)) == int(twin.progress.get("block", 0)),
		"credited progress for 'block' matches the twin (carry-over identical)")
	_check(expected["resource"] == "block", "STONE produces 'block' (sanity)")
	# Charge decremented 2 → 1.
	_check(gs.tool_count("stone_hammer") == 1, "stone_hammer charge decremented to 1")
	# Input grid not mutated by GameState either (ToolEffects deep-copies).
	_check(_count_of(g, T.STONE) == 4, "use_tool_on_grid did not mutate the caller's grid")

func _test_gs_use_tap_credits_consumes_disarms() -> void:
	var gs := GameState.new()
	gs.grant_tool("bomb")
	_check(gs.arm_tool("bomb"), "armed bomb")
	# Interior 3x3 of GEM at (2,2) so the whole blast credits the same resource.
	var g := _full(T.GRASS)
	for r in range(1, 4):
		for c in range(1, 4):
			g[r][c] = T.GEM   # 9 GEM in the 3x3 the bomb will clear
	var twin := GameState.new()
	twin.credit_chain(T.GEM, 9)
	var res := gs.use_tool_on_grid("bomb", g, Vector2i(2, 2))
	_check(res["ok"], "use_tool_on_grid('bomb', cell) ok")
	# All 9 GEM in the 3x3 cleared.
	_check(_count_of(res["grid"], T.GEM) == 0, "bomb cleared the 3x3 GEM block")
	_check(int(res["collected"].get(T.GEM, 0)) == 9, "bomb collected 9 GEM")
	_check(gs.qty("cut_gem") == twin.qty("cut_gem"), "credited 'cut_gem' matches credit_chain(GEM,9)")
	# Charge consumed (1 → 0, key erased) and disarmed.
	_check(gs.tool_count("bomb") == 0, "bomb charge consumed to 0")
	_check(not gs.tools.has("bomb"), "bomb key erased at 0 charges")
	_check(not gs.is_tool_armed(), "pending_tool cleared after firing the armed bomb")

func _test_gs_use_guards() -> void:
	var gs := GameState.new()
	var g := _full(T.GRASS)
	# 0 charges → ok=false, grid + inventory untouched.
	var r0 := gs.use_tool_on_grid("stone_hammer", g)
	_check(not r0["ok"] and r0["reason"] == "no_charges", "use with 0 charges → ok=false no_charges")
	_check(r0["grid"] == g and gs.inventory.is_empty(), "no_charges guard mutated nothing")
	# Tap tool with the default (-1,-1) cell → needs_target (no charge spent).
	gs.grant_tool("bomb")
	var r1 := gs.use_tool_on_grid("bomb", g)
	_check(not r1["ok"] and r1["reason"] == "needs_target", "tap tool with (-1,-1) → needs_target")
	_check(gs.tool_count("bomb") == 1, "needs_target did NOT consume a charge")
	# Out-of-bounds cell for a tap tool → also needs_target.
	var r2 := gs.use_tool_on_grid("bomb", g, Vector2i(99, 99))
	_check(not r2["ok"] and r2["reason"] == "needs_target", "tap tool with OOB cell → needs_target")
	# Unknown id → unknown.
	var r3 := gs.use_tool_on_grid("not_a_tool", g)
	_check(not r3["ok"] and r3["reason"] == "unknown", "unknown id → ok=false unknown")

func _test_gs_hazard_not_credited() -> void:
	# A bomb over a 3x3 that contains a RAT and a RUBBLE: hazards survive and are NOT
	# credited (ToolEffects skips them, so they never appear in `collected`).
	var gs := GameState.new()
	gs.grant_tool("bomb")
	var g := _full(T.STONE)
	g[2][2] = T.RAT      # center of the blast (col=2,row=2)
	g[2][3] = T.RUBBLE   # also in the 3x3 (col=3,row=2)
	var res := gs.use_tool_on_grid("bomb", g, Vector2i(2, 2))
	_check(res["ok"], "bomb over hazards still ok")
	_check(res["grid"][2][2] == T.RAT and res["grid"][2][3] == T.RUBBLE, "RAT/RUBBLE survive the bomb")
	# Only the 7 non-hazard STONE in the 3x3 are collected/credited.
	_check(int(res["collected"].get(T.STONE, 0)) == 7, "collected only 7 non-hazard STONE")
	# RAT/RUBBLE produce nothing, and credit must never gain a rat/rubble resource.
	_check(not gs.inventory.has("rat") and not gs.inventory.has("rubble"),
		"inventory gained no rat/rubble resource")
	_check(not gs.progress.has("rat") and not gs.progress.has("rubble"),
		"progress gained no rat/rubble entry")

func _test_gs_transform_credits_nothing() -> void:
	# A transform tool (drill: DIRT→STONE) returns `transformed`, not `collected`, so
	# it credits NOTHING — it only remaps the grid.
	var gs := GameState.new()
	gs.grant_tool("drill")
	var g := _full(T.DIRT)
	var res := gs.use_tool_on_grid("drill", g)
	_check(res["ok"], "drill (transform) ok")
	_check(_count_of(res["grid"], T.STONE) == 36 and _count_of(res["grid"], T.DIRT) == 0,
		"drill remapped DIRT→STONE on the grid")
	_check(res["collected"].is_empty(), "transform tool returns no collected counts")
	_check(gs.inventory.is_empty() and gs.progress.is_empty(), "transform credited nothing")
	_check(gs.tool_count("drill") == 0, "drill charge still consumed (1 → 0)")

func _test_gs_save_load_roundtrip() -> void:
	var gs := GameState.new()
	gs.grant_tool("stone_hammer", 3)
	gs.grant_tool("bomb", 1)
	gs.arm_tool("bomb")   # pending_tool set — must NOT survive the round-trip.
	var d := gs.to_dict()
	_check(d.has("tools"), "to_dict includes 'tools'")
	_check(not d.has("pending_tool"), "to_dict does NOT persist transient pending_tool")
	var back := GameState.from_dict(d)
	_check(back.tool_count("stone_hammer") == 3 and back.tool_count("bomb") == 1,
		"from_dict round-trips tool charges exactly")
	_check(back.tools.size() == 2, "no extra tool keys after round-trip")
	_check(not back.is_tool_armed(), "loaded state starts disarmed (pending_tool not persisted)")
	# A save dict with NO 'tools' key (an old save) loads as {} — defensive default.
	var legacy := GameState.new().to_dict()
	legacy.erase("tools")
	var old := GameState.from_dict(legacy)
	_check(old.tools.is_empty(), "a dict missing 'tools' loads as {} (old-save default)")
	# Malformed entries (0 / negative / non-numeric) are dropped on load.
	var dirty := {"tools": {"bomb": 2, "stone_hammer": 0, "axe": -1, "scythe": "x"}}
	var cleaned := GameState.from_dict(dirty)
	_check(cleaned.tool_count("bomb") == 2, "from_dict keeps the valid positive tool count")
	_check(cleaned.tools.size() == 1, "from_dict drops 0/negative/non-numeric tool entries")

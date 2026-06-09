extends SceneTree
## Headless unit-test runner for the 8 PORTAL MAGIC TOOLS + the 2 new powers they
## introduce (tap_clear_type / restore_turns) — Tools PR3. Run from the godot/ root:
##   godot --headless --script res://tests/run_magic_tools_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## The summoned magic tools are now REAL ToolConfig members with Godot-native powers, so
## they flow through the EXISTING rack + GameState.use_tool_on_grid + apply_instant/apply_tap
## dispatch with no special-casing. This asserts:
##   - catalog: all 8 tools are in TOOLS + TOOL_IDS with the right power_id / tap_target.
##   - transform_tiles tools (golden_apple/carrot/idol/sheep, philosophers_stone) remap the
##     right category to the right tile via apply_instant on a crafted grid.
##   - magic_wand (tap_clear_type) via apply_tap: clears every tile of the tapped key;
##     tapping EMPTY / a hazard is a no-op ({}).
##   - magic_seed (restore_turns) via use_tool_on_grid: rewinds farm_turns_used by 5,
##     clamps at 0, consumes the charge, leaves the grid unchanged.
##   - magic_fertilizer (fill_bias) via use_tool_on_grid: arms fill_bias_target == WHEAT,
##     fill_bias_turns == 3.
##   - a summon → use round-trip: portal-built GameState with influence summons
##     philosophers_stone, then use_tool_on_grid applies the transform.
##   - the 1 remaining deferred magic tool (hourglass) is NOT a ToolConfig member; miners_hat IS
##     now wired (T24 reveal_tiles, the boss hide_resources hidden-tile layer).

const T := Constants.Tile

# Each transform_tiles magic tool with the (category-source tile, expected output tile).
const TRANSFORMS := {
	"golden_apple":       {"from": T.OAK,   "to": T.APPLE},      # trees → apple
	"golden_carrot":      {"from": T.GRASS, "to": T.CARROT},     # grass → carrot
	"golden_idol":        {"from": T.GRASS, "to": T.COW},        # grass → cow
	"golden_sheep":       {"from": T.GRASS, "to": T.HERD_SHEEP}, # grass → sheep
	"philosophers_stone": {"from": T.STONE, "to": T.GOLD},       # stone → gold
}

# Expected power_id + tap_target for every PR3 magic tool.
const CATALOG := {
	"golden_apple":       {"power": "transform_tiles", "tap": false},
	"golden_carrot":      {"power": "transform_tiles", "tap": false},
	"golden_idol":        {"power": "transform_tiles", "tap": false},
	"golden_sheep":       {"power": "transform_tiles", "tap": false},
	"philosophers_stone": {"power": "transform_tiles", "tap": false},
	"magic_wand":         {"power": "tap_clear_type",  "tap": true},
	"magic_seed":         {"power": "restore_turns",   "tap": false},
	"magic_fertilizer":   {"power": "fill_bias",       "tap": false},
}

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Portal magic tools (Tools PR3) ─────────────────")
	_test_catalog_membership_and_shape()
	_test_transform_tiles_magic_tools()
	_test_magic_wand_tap_clear_type()
	_test_magic_wand_noop_on_empty_and_hazard()
	_test_magic_seed_restore_turns()
	_test_magic_fertilizer_arms_fill_bias()
	_test_summon_then_use_roundtrip()
	_test_deferred_tools_not_toolconfig_members()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helpers ────────────────────────────────────────────────────────

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

## Count cells equal to `tile` across a 6x6 grid.
func _count_cells(grid: Array, tile: int) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

# ── catalog membership + shape ───────────────────────────────────────────────

func _test_catalog_membership_and_shape() -> void:
	for id in CATALOG.keys():
		var spec: Dictionary = CATALOG[id]
		_check(ToolConfig.has_tool(id), "magic tool '%s' is in TOOLS" % id)
		_check(ToolConfig.all_ids().has(id), "magic tool '%s' is in TOOL_IDS" % id)
		_check(ToolConfig.power_id(id) == String(spec["power"]),
			"'%s' power_id is '%s'" % [id, spec["power"]])
		_check(ToolConfig.is_tap_target(id) == bool(spec["tap"]),
			"'%s' tap_target is %s" % [id, spec["tap"]])
		_check(ToolConfig.tool_label(id) != "", "'%s' has a non-empty label" % id)
	# No duplicate ids in the catalog after the 8 additions.
	var seen := {}
	var dup := false
	for id in ToolConfig.all_ids():
		if seen.has(id):
			dup = true
		seen[id] = true
	_check(not dup, "TOOL_IDS has no duplicate ids after the 8 magic-tool additions")

# ── transform_tiles magic tools (apply_instant on a crafted grid) ──────────────

func _test_transform_tiles_magic_tools() -> void:
	for id in TRANSFORMS.keys():
		var spec: Dictionary = TRANSFORMS[id]
		var from_tile: int = spec["from"]
		var to_tile: int = spec["to"]
		# A board of DIRT filler with ONE source tile in the corner. DIRT is in no transform
		# source category here, so only the single source cell flips.
		var g := _full(T.DIRT)
		g[0][0] = from_tile
		var res := ToolConfig.apply_instant(g, id)
		_check(not res.is_empty() and res.has("grid"), "%s apply_instant returns a grid" % id)
		var out: Array = res["grid"]
		_check(out[0][0] == to_tile, "%s turned the source tile into the expected output" % id)
		_check(int(res.get("transformed", 0)) == 1, "%s reports 1 transformed cell" % id)
		_check(_count_cells(out, T.DIRT) == Constants.ROWS * Constants.COLS - 1,
			"%s left the DIRT filler intact" % id)
		# Input grid is not mutated (purity).
		_check(g[0][0] == from_tile, "%s did not mutate its input grid" % id)

# ── magic_wand (tap_clear_type) clears every tile of the tapped key ────────────

func _test_magic_wand_tap_clear_type() -> void:
	# A DIRT board with three GRASS cells; tapping one GRASS clears ALL grass.
	var g := _full(T.DIRT)
	g[0][0] = T.GRASS
	g[2][3] = T.GRASS
	g[5][5] = T.GRASS
	var res := ToolConfig.apply_tap(g, "magic_wand", Vector2i(0, 0))
	_check(not res.is_empty() and res.has("grid"), "magic_wand apply_tap returns a grid")
	var out: Array = res["grid"]
	_check(_count_cells(out, T.GRASS) == 0, "magic_wand cleared every GRASS tile")
	_check(_count_cells(out, T.DIRT) == Constants.ROWS * Constants.COLS - 3,
		"magic_wand left every non-grass DIRT tile intact")
	var collected: Dictionary = res.get("collected", {})
	_check(int(collected.get(T.GRASS, 0)) == 3, "magic_wand credited the 3 cleared GRASS in collected")

func _test_magic_wand_noop_on_empty_and_hazard() -> void:
	# Tapping an EMPTY cell → {} (no-op).
	var g := _full(T.DIRT)
	g[1][1] = Constants.EMPTY
	var res_empty := ToolConfig.apply_tap(g, "magic_wand", Vector2i(1, 1))
	_check(res_empty.is_empty(), "magic_wand on an EMPTY cell is a no-op ({})")
	# Tapping a HAZARD (RAT) cell → {} (no-op).
	var gh := _full(T.DIRT)
	gh[2][2] = T.RAT
	var res_haz := ToolConfig.apply_tap(gh, "magic_wand", Vector2i(2, 2))
	_check(res_haz.is_empty(), "magic_wand on a HAZARD (rat) cell is a no-op ({})")
	# Through GameState.use_tool_on_grid the no-op surfaces as a no_effect failure that does
	# NOT burn a charge (a misconfigured/empty tap can't waste a use).
	var gs := GameState.new()
	gs.grant_tool("magic_wand", 1)
	var hg := _full(T.DIRT)
	hg[0][0] = T.RAT
	var ur := gs.use_tool_on_grid("magic_wand", hg, Vector2i(0, 0))
	_check(not bool(ur.get("ok", true)), "use_tool_on_grid(magic_wand) on a hazard returns ok:false")
	_check(gs.tool_count("magic_wand") == 1, "no-op magic_wand did NOT consume the charge")

# ── magic_seed (restore_turns) rewinds farm_turns_used, clamps at 0 ────────────

func _test_magic_seed_restore_turns() -> void:
	var g := GameState.new()
	g.farm_turns_used = 7
	g.grant_tool("magic_seed", 1)
	var grid := _full(T.GRASS)
	var res := g.use_tool_on_grid("magic_seed", grid)
	_check(bool(res.get("ok", false)), "use_tool_on_grid('magic_seed') returns ok:true")
	_check(g.farm_turns_used == 2, "magic_seed (amount 5) rewinds farm_turns_used 7 → 2")
	_check((res.get("collected", {}) as Dictionary).is_empty(), "magic_seed credits nothing")
	# Grid handed back unchanged (restore_turns never edits the board).
	var out: Array = res["grid"]
	_check(_count_cells(out, T.GRASS) == Constants.ROWS * Constants.COLS,
		"magic_seed leaves the grid unchanged (still all GRASS)")
	_check(g.tool_count("magic_seed") == 0, "magic_seed charge consumed (count → 0)")
	# Clamp at 0: with only 3 turns used, amount 5 floors to 0 (not negative).
	var g2 := GameState.new()
	g2.farm_turns_used = 3
	g2.grant_tool("magic_seed", 1)
	g2.use_tool_on_grid("magic_seed", _full(T.GRASS))
	_check(g2.farm_turns_used == 0, "magic_seed clamps farm_turns_used at 0 (3 - 5 → 0)")

# ── magic_fertilizer (fill_bias) arms the WHEAT bias for 3 turns ───────────────

func _test_magic_fertilizer_arms_fill_bias() -> void:
	var g := GameState.new()
	g.grant_tool("magic_fertilizer", 1)
	_check(g.fill_bias_target == Constants.EMPTY, "no bias armed before magic_fertilizer use")
	var res := g.use_tool_on_grid("magic_fertilizer", _full(T.GRASS))
	_check(bool(res.get("ok", false)), "use_tool_on_grid('magic_fertilizer') returns ok:true")
	_check(g.fill_bias_target == T.WHEAT, "magic_fertilizer arms fill_bias_target to WHEAT")
	_check(g.fill_bias_turns == 3, "magic_fertilizer arms fill_bias_turns to 3")
	_check(g.tool_count("magic_fertilizer") == 0, "magic_fertilizer charge consumed")

# ── summon → use round-trip (the whole PortalConfig + ToolConfig flow) ─────────

func _test_summon_then_use_roundtrip() -> void:
	var g := GameState.new()
	# Build the portal (coins + runes), then bank enough influence to summon.
	g.coins = PortalConfig.BUILD_COST_COINS
	g.runes = PortalConfig.BUILD_COST_RUNES
	_check(bool(g.build_portal().get("ok", false)), "portal built for the summon round-trip")
	g.influence = PortalConfig.influence_cost("philosophers_stone")
	var sres := g.summon_magic_tool("philosophers_stone")
	_check(bool(sres.get("ok", false)), "summon_magic_tool('philosophers_stone') returns ok:true")
	_check(g.tool_count("philosophers_stone") == 1, "summon credited 1 philosophers_stone charge")
	# Now that it's summoned it's a usable ToolConfig member: has_tool + has_charges true.
	_check(ToolConfig.has_tool("philosophers_stone"), "philosophers_stone is a ToolConfig member")
	_check(g.has_tool_charges("philosophers_stone"), "summoned philosophers_stone has a charge")
	# Use it on a board: a STONE in DIRT filler → GOLD.
	var grid := _full(T.DIRT)
	grid[3][3] = T.STONE
	var ures := g.use_tool_on_grid("philosophers_stone", grid)
	_check(bool(ures.get("ok", false)), "use_tool_on_grid('philosophers_stone') returns ok:true")
	_check(ures["grid"][3][3] == T.GOLD, "summoned philosophers_stone turned STONE → GOLD")
	_check(g.tool_count("philosophers_stone") == 0, "the summoned charge was consumed on use")

# ── the remaining deferred magic tool stays out of ToolConfig ──────────────────

func _test_deferred_tools_not_toolconfig_members() -> void:
	# hourglass (undo_move) still needs an absent mechanic (a board/inventory snapshot), so it remains
	# summonable in PortalConfig but is NOT a ToolConfig member. As of T24 miners_hat (reveal_tiles) IS
	# wired (the boss hide_resources modifier added the hidden-tile layer it awaited) — it's now a real
	# ToolConfig member, summonable AND usable.
	_check(PortalConfig.has_tool("hourglass"), "deferred 'hourglass' is still in PortalConfig (summonable)")
	_check(not ToolConfig.has_tool("hourglass"), "deferred 'hourglass' is NOT a ToolConfig member (no effect yet)")
	_check(PortalConfig.has_tool("miners_hat"), "miners_hat is still summonable in PortalConfig")
	_check(ToolConfig.has_tool("miners_hat"), "miners_hat is NOW a ToolConfig member (T24 reveal_tiles wired)")
	_check(ToolConfig.power_id("miners_hat") == "reveal_tiles", "miners_hat carries the reveal_tiles power")

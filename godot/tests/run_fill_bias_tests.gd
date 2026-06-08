extends SceneTree
## Headless unit-test runner for the fill_bias POWER + its 3 board tools
## (fertilizer/bird_feed/sapling) — Tools PR2b. Run from the godot/ project root:
##   godot --headless --script res://tests/run_fill_bias_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## fill_bias is a STATE power, not a grid power: the tools never touch the board. Instead
## GameState.use_tool_on_grid intercepts power_id=="fill_bias" in its EARLY path (before the
## grid dispatch), ARMS a transient {fill_bias_target, fill_bias_turns}, consumes a charge,
## and ticks the TOOL quest. active_tile_pool() then DOUBLES the target tile's already-
## eligible slots while armed; note_farm_turn() decrements the countdown and clears the
## target at expiry. The bias is NOT persisted (a save/reload simply clears it).
##
## This asserts:
##   - catalog: the 3 tools exist (TOOLS + TOOL_IDS) with power "fill_bias" + right target.
##   - arm: a fertilizer use returns ok, leaves the grid unchanged, consumes the charge, and
##     sets fill_bias_target == WHEAT / fill_bias_turns == 1.
##   - bias doubling: active_tile_pool() WHEAT count is exactly 2× the unbiased baseline.
##   - expiry: note_farm_turn() decrements to 0 + clears the target; pool count returns to baseline.
##   - bird_feed → PHEASANT and sapling → OAK arm + double their (base-eligible) slots.

const T := Constants.Tile

# Each fill_bias tool with its expected target Tile.
const ADDED := {
	"fertilizer": T.WHEAT,
	"bird_feed":  T.PHEASANT,
	"sapling":    T.OAK,
}

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── fill_bias power + tools (Tools PR2b) ────────────")
	_test_catalog_membership_and_shape()
	_test_fertilizer_arms_and_consumes()
	_test_bias_doubles_pool_wheat()
	_test_bias_expires_in_note_farm_turn()
	_test_bird_feed_and_sapling_arm()
	_test_sapling_end_to_end_oak_doubling()
	_test_no_bias_pool_unchanged()
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

## Count occurrences of `tile` in a flat pool Array.
func _count_pool(pool: Array, tile: int) -> int:
	var n: int = 0
	for t in pool:
		if int(t) == tile:
			n += 1
	return n

# ── catalog membership + shape ───────────────────────────────────────────────

func _test_catalog_membership_and_shape() -> void:
	for id in ADDED.keys():
		var target: int = ADDED[id]
		_check(ToolConfig.has_tool(id), "fill_bias tool '%s' is in TOOLS" % id)
		_check(ToolConfig.all_ids().has(id), "fill_bias tool '%s' is in TOOL_IDS" % id)
		_check(ToolConfig.power_id(id) == "fill_bias", "'%s' power_id is 'fill_bias'" % id)
		_check(not ToolConfig.is_tap_target(id), "'%s' is NOT a tap-target tool" % id)
		_check(ToolConfig.tool_label(id) != "", "'%s' has a non-empty label" % id)
		var params: Dictionary = ToolConfig.get_tool(id).get("params", {})
		_check(int(params.get("target", Constants.EMPTY)) == target,
			"'%s' params.target is the expected Tile (%d)" % [id, target])
		_check(int(params.get("turns", 0)) == 1, "'%s' params.turns is 1" % id)
	# No duplicate ids in the catalog after adding three.
	var seen := {}
	var dup := false
	for id in ToolConfig.all_ids():
		if seen.has(id):
			dup = true
		seen[id] = true
	_check(not dup, "TOOL_IDS has no duplicate ids after the 3 fill_bias additions")

# ── fertilizer ARMS the bias, consumes a charge, leaves the grid unchanged ─────

func _test_fertilizer_arms_and_consumes() -> void:
	var g := GameState.new()
	g.grant_tool("fertilizer", 1)
	_check(g.tool_count("fertilizer") == 1, "fertilizer granted: 1 charge")
	_check(g.fill_bias_target == Constants.EMPTY, "no bias armed before use")
	_check(g.fill_bias_turns == 0, "no biased turns before use")
	var grid := _full(T.GRASS)
	var res := g.use_tool_on_grid("fertilizer", grid)
	_check(bool(res.get("ok", false)), "use_tool_on_grid('fertilizer') returns ok:true")
	_check((res.get("collected", {}) as Dictionary).is_empty(),
		"fertilizer credits nothing (collected empty)")
	# Grid handed back is the SAME grid, untouched (fill_bias never edits the board).
	var out: Array = res["grid"]
	_check(_count_cells(out, T.GRASS) == Constants.ROWS * Constants.COLS,
		"fertilizer leaves the grid unchanged (still all GRASS)")
	_check(g.tool_count("fertilizer") == 0, "fertilizer charge consumed (count → 0)")
	_check(g.fill_bias_target == T.WHEAT, "fill_bias_target armed to WHEAT")
	_check(g.fill_bias_turns == 1, "fill_bias_turns armed to 1")

# ── active_tile_pool() DOUBLES the armed target's already-eligible slots ────────

func _test_bias_doubles_pool_wheat() -> void:
	# Deterministic season: farm_turns_used = 0 → Spring (grain weight 0.20 → 20 WHEAT slots).
	var g := GameState.new()
	g.farm_turns_used = 0
	var unbiased := _count_pool(g.active_tile_pool(), T.WHEAT)
	_check(unbiased > 0, "unbiased Spring pool has WHEAT (%d slots)" % unbiased)
	# Arm the bias directly (use_tool path is covered above); read the pool again.
	g.fill_bias_target = T.WHEAT
	g.fill_bias_turns = 1
	var biased := _count_pool(g.active_tile_pool(), T.WHEAT)
	_check(biased > unbiased, "biased pool has MORE WHEAT than unbiased (%d > %d)" % [biased, unbiased])
	_check(biased == unbiased * 2, "biased WHEAT count is exactly 2× the baseline (%d == 2×%d)" % [biased, unbiased])
	# The bias must not perturb a NON-target eligible tile (OAK stays at its baseline).
	var oak_unbiased := _count_pool(GameState.new().active_tile_pool(), T.OAK)
	var oak_biased := _count_pool(g.active_tile_pool(), T.OAK)
	_check(oak_biased == oak_unbiased, "WHEAT bias leaves OAK count unchanged (%d == %d)" % [oak_biased, oak_unbiased])

# ── note_farm_turn() decrements the countdown and clears at expiry ─────────────

func _test_bias_expires_in_note_farm_turn() -> void:
	var g := GameState.new()
	g.farm_turns_used = 0
	var baseline := _count_pool(g.active_tile_pool(), T.WHEAT)
	g.fill_bias_target = T.WHEAT
	g.fill_bias_turns = 1
	# Spend one farm turn → the single biased turn is consumed and the bias expires.
	g.note_farm_turn()
	_check(g.fill_bias_turns == 0, "note_farm_turn decremented fill_bias_turns to 0")
	_check(g.fill_bias_target == Constants.EMPTY, "fill_bias_target cleared at expiry")
	# With the bias gone the WHEAT count is back to the unbiased baseline.
	var after := _count_pool(g.active_tile_pool(), T.WHEAT)
	_check(after == baseline, "WHEAT pool count back to baseline after expiry (%d == %d)" % [after, baseline])

# ── bird_feed → PHEASANT (base bird) and sapling → OAK arm correctly ───────────

func _test_bird_feed_and_sapling_arm() -> void:
	# bird_feed: arms PHEASANT — the port's base bird tile (FARM_CATEGORY_TILE["birds"]).
	# PHEASANT IS base-eligible, so the bias really doubles bird slots (not a no-op).
	var gb := GameState.new()
	gb.farm_turns_used = 0   # Spring — birds has positive weight
	var birds_unbiased := _count_pool(gb.active_tile_pool(), T.PHEASANT)
	gb.grant_tool("bird_feed", 1)
	var rb := gb.use_tool_on_grid("bird_feed", _full(T.GRASS))
	_check(bool(rb.get("ok", false)), "bird_feed use returns ok:true")
	_check(gb.fill_bias_target == T.PHEASANT, "bird_feed arms fill_bias_target to PHEASANT")
	_check(gb.fill_bias_turns == 1, "bird_feed arms fill_bias_turns to 1")
	_check(gb.tool_count("bird_feed") == 0, "bird_feed charge consumed")
	var birds_biased := _count_pool(gb.active_tile_pool(), T.PHEASANT)
	_check(birds_unbiased > 0 and birds_biased == birds_unbiased * 2,
		"bird_feed doubles the PHEASANT slots in the pool (%d → %d)" % [birds_unbiased, birds_biased])
	# sapling: arms OAK.
	var gs := GameState.new()
	gs.grant_tool("sapling", 1)
	var rs := gs.use_tool_on_grid("sapling", _full(T.GRASS))
	_check(bool(rs.get("ok", false)), "sapling use returns ok:true")
	_check(gs.fill_bias_target == T.OAK, "sapling arms fill_bias_target to OAK")
	_check(gs.fill_bias_turns == 1, "sapling arms fill_bias_turns to 1")
	_check(gs.tool_count("sapling") == 0, "sapling charge consumed")

# ── sapling end-to-end: arm via use_tool, confirm OAK doubling in the pool ──────

func _test_sapling_end_to_end_oak_doubling() -> void:
	# OAK (trees) IS base-eligible in Spring (weight 0.20), so sapling's bias is observable in
	# the pool — a second full end-to-end like fertilizer, on a different target.
	var g := GameState.new()
	g.farm_turns_used = 0
	var unbiased := _count_pool(g.active_tile_pool(), T.OAK)
	_check(unbiased > 0, "unbiased Spring pool has OAK (%d slots)" % unbiased)
	g.grant_tool("sapling", 1)
	g.use_tool_on_grid("sapling", _full(T.GRASS))
	var biased := _count_pool(g.active_tile_pool(), T.OAK)
	_check(biased == unbiased * 2, "sapling end-to-end: OAK count is exactly 2× baseline (%d == 2×%d)" % [biased, unbiased])

# ── safety: with NO bias armed the pool is the plain unbiased pool ─────────────

func _test_no_bias_pool_unchanged() -> void:
	# A fresh GameState has fill_bias off; the pool must be identical to one read with the
	# fields explicitly cleared (proves the new branch is a strict no-op when disarmed).
	var g := GameState.new()
	g.farm_turns_used = 0
	var a := g.active_tile_pool()
	g.fill_bias_target = Constants.EMPTY
	g.fill_bias_turns = 0
	var b := g.active_tile_pool()
	_check(a.size() == b.size(), "no-bias pool size is stable (%d == %d)" % [a.size(), b.size()])
	_check(_count_pool(a, T.WHEAT) == _count_pool(b, T.WHEAT), "no-bias WHEAT count unchanged")

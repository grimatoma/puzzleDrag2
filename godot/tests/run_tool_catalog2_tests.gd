extends SceneTree
## Headless unit-test runner for the Tools-PR1 CATALOG additions — the 14 board tools
## that reuse an EXISTING ToolEffects power (no new mechanics), plus the small dispatch
## enhancements in ToolConfig.gd (multi-category clear, transform from a category,
## transform_adjacent from categories). Run from the godot/ project root:
##   godot --headless --script res://tests/run_tool_catalog2_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_tools_tests.gd (pure statics over int
## grids — no nodes needed). For EACH added tool this asserts:
##   - it exists in ToolConfig.TOOLS and in TOOL_IDS, with the right power_id +
##     tap_target;
##   - apply_instant / apply_tap on a crafted grid produces the expected mutation.
## It ALSO re-asserts the pre-existing dispatch paths (axe single-category clear,
## drill from_keys transform, magnet from_keys transform_adjacent) still work, so the
## dispatch enhancements stay backward-compatible.

const T := Constants.Tile

# Every id this PR adds, with its expected power + tap mode.
const ADDED := {
	"bird_cage":       {"power": "clear_all",          "tap": false},
	"scythe_full":     {"power": "clear_all",          "tap": false},
	"hoe":             {"power": "clear_all",          "tap": false},
	"iron_pick":       {"power": "clear_all",          "tap": false},
	"plough":          {"power": "clear_category",     "tap": false},
	"fruit_picker":    {"power": "clear_category",     "tap": false},
	"herders_crook":   {"power": "clear_category",     "tap": false},
	"milk_churn":      {"power": "clear_category",     "tap": false},
	"saddle":          {"power": "clear_category",     "tap": false},
	"coal_hammer":     {"power": "clear_category",     "tap": false},
	"gold_pick":       {"power": "clear_category",     "tap": false},
	"trimmer":         {"power": "transform_tiles",    "tap": false},
	"bee":             {"power": "transform_tiles",    "tap": false},
	"coal_transmuter": {"power": "transform_adjacent", "tap": true},
}

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Tools PR1 catalog additions ────────────────────")
	_test_membership_and_shape()
	_test_clear_all_tools()
	_test_clear_category_single()
	_test_clear_category_multi_plough()
	_test_transform_from_category_trimmer()
	_test_transform_from_category_bee()
	_test_coal_transmuter_tap()
	# Backward-compat: the pre-existing dispatch paths must still work.
	print("── Regression (pre-existing dispatch paths) ───────")
	_test_regression_axe_single_category()
	_test_regression_drill_from_keys()
	_test_regression_magnet_from_keys()
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

# ── membership + catalog shape ──────────────────────────────────────────────

func _test_membership_and_shape() -> void:
	# All 45 ids resolvable (10 original + 14 PR1 + 5 PR2 + 3 PR2b + 8 PR3 + 2 T14a wolf + 2 T14b mine + 1 T24 miners_hat) + no dupes.
	_check(ToolConfig.all_ids().size() == 45, "catalog has 45 tools (10 original + 14 PR1 + 5 PR2 + 3 PR2b + 8 PR3 + 2 T14a rifle/hound + 2 T14b water_pump/explosives + 1 T24 miners_hat)")
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
		_check(ToolConfig.tool_label(id) != "", "'%s' has a non-empty label" % id)

# ── clear_all (single-target) tools ─────────────────────────────────────────

func _test_clear_all_tools() -> void:
	# bird_cage → BIRD_CHICKEN, scythe_full → WHEAT, hoe → CARROT, iron_pick → IRON_ORE.
	var cases := {
		"bird_cage":   T.BIRD_CHICKEN,
		"scythe_full": T.WHEAT,
		"hoe":         T.CARROT,
		"iron_pick":   T.IRON_ORE,
	}
	for id in cases.keys():
		var target: int = cases[id]
		var g := _full(T.GRASS)
		g[0][0] = target
		g[3][4] = target   # two target tiles; rest grass
		# Avoid a false positive when target IS grass (none of these are, but be safe).
		var grass_before := _count_of(g, T.GRASS)
		var res := ToolConfig.apply_instant(g, id)
		var out: Array = res["grid"]
		_check(_count_of(out, target) == 0, "apply_instant('%s') clears every target tile" % id)
		_check(int(res["collected"].get(target, 0)) == 2, "'%s' collected the 2 target tiles" % id)
		_check(_count_of(out, T.GRASS) == grass_before, "'%s' leaves non-target tiles intact" % id)

# ── clear_category (single) tools ───────────────────────────────────────────

func _test_clear_category_single() -> void:
	# Each single-category clear tool: place a representative tile from its category,
	# fire, and confirm that tile cleared while a foreign tile survives.
	# {tool: [representative tile, its category]}
	var cases := {
		"fruit_picker":  [T.APPLE, "fruit"],
		"herders_crook": [T.PIG,   "herd"],
		"milk_churn":    [T.COW,   "cattle"],
		"saddle":        [T.HORSE, "mount"],
		"coal_hammer":   [T.COAL,  "coal"],
		"gold_pick":     [T.GOLD,  "gold"],
	}
	for id in cases.keys():
		var rep: int = cases[id][0]
		var cat: String = cases[id][1]
		# Sanity: the representative really is in that category in Constants.
		_check(Constants.category_of(rep) == cat,
			"'%s' representative tile is category '%s'" % [id, cat])
		var g := _full(T.DIRT)   # DIRT is its own category — a clean "foreign" filler
		g[1][1] = rep
		g[4][4] = rep
		var res := ToolConfig.apply_instant(g, id)
		var out: Array = res["grid"]
		_check(_count_of(out, rep) == 0, "apply_instant('%s') clears its category tile" % id)
		_check(_count_of(out, T.DIRT) == 34, "'%s' leaves the foreign DIRT filler intact" % id)

# ── plough — MULTI-category clear (grass + grain) ───────────────────────────

func _test_clear_category_multi_plough() -> void:
	var g := _full(T.DIRT)
	g[0][0] = T.GRASS   # grass category
	g[0][1] = T.WHEAT   # grain category
	g[5][5] = T.APPLE   # fruit — must SURVIVE (not grass/grain)
	var res := ToolConfig.apply_instant(g, "plough")
	var out: Array = res["grid"]
	_check(_count_of(out, T.GRASS) == 0, "plough cleared the grass tile (grass category)")
	_check(_count_of(out, T.WHEAT) == 0, "plough cleared the grain tile (grain category)")
	_check(_count_of(out, T.APPLE) == 1, "plough left the fruit tile (foreign category) intact")
	_check(_count_of(out, T.DIRT) == 33, "plough left the DIRT filler intact")
	# The dispatch helper resolves BOTH categories into a single key union.
	var union := ToolConfig.tiles_in_categories(["grass", "grain"])
	_check(union.has(T.GRASS) and union.has(T.WHEAT),
		"tiles_in_categories(['grass','grain']) unions both categories")

# ── trimmer / bee — transform FROM a category ───────────────────────────────

func _test_transform_from_category_trimmer() -> void:
	# trimmer: trees → GRASS. OAK is a "trees" tile.
	var g := _full(T.DIRT)
	g[2][2] = T.OAK
	g[3][3] = T.OAK
	var res := ToolConfig.apply_instant(g, "trimmer")
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 2, "trimmer transformed both OAK (trees) tiles")
	_check(out[2][2] == T.GRASS and out[3][3] == T.GRASS, "trimmer turned OAK → GRASS")
	_check(_count_of(out, T.OAK) == 0, "no OAK left after trimmer")
	_check(_count_of(out, T.DIRT) == 34, "trimmer left the DIRT filler unchanged")

func _test_transform_from_category_bee() -> void:
	# bee: flower → APPLE. PANSY is a "flower" tile.
	var g := _full(T.DIRT)
	g[1][1] = T.PANSY
	var res := ToolConfig.apply_instant(g, "bee")
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 1, "bee transformed the PANSY (flower) tile")
	_check(out[1][1] == T.APPLE, "bee turned PANSY → APPLE (fruit)")
	_check(_count_of(out, T.PANSY) == 0, "no PANSY left after bee")

# ── coal_transmuter — tap-target transform_adjacent FROM categories ─────────

func _test_coal_transmuter_tap() -> void:
	# A 3x3 of mixed mine ores around (2,2): IRON_ORE / GOLD / STONE / GEM / COPPER_ORE
	# all turn to COAL within radius 1; an ore OUTSIDE the radius survives.
	var g := _full(T.GRASS)
	g[1][1] = T.STONE
	g[1][2] = T.IRON_ORE
	g[2][2] = T.GOLD
	g[2][3] = T.GEM
	g[3][3] = T.COPPER_ORE
	g[5][5] = T.IRON_ORE   # outside radius 1 of (2,2) — must survive
	var res := ToolConfig.apply_tap(g, "coal_transmuter", Vector2i(2, 2))
	var out: Array = res["grid"]
	_check(not res.is_empty(), "apply_tap('coal_transmuter', cell) dispatches")
	# Every ore within the 3x3 became COAL.
	_check(out[1][1] == T.COAL and out[1][2] == T.COAL and out[2][2] == T.COAL \
		and out[2][3] == T.COAL and out[3][3] == T.COAL,
		"coal_transmuter turned all adjacent mine ores → COAL")
	_check(int(res["transformed"]) == 5, "coal_transmuter transformed the 5 in-radius ores")
	# The distant IRON_ORE is untouched, proving the radius bound.
	_check(out[5][5] == T.IRON_ORE, "coal_transmuter left the out-of-radius ore unchanged")
	# Specifically an IRON_ORE adjacent to the tap became COAL (spec's named case).
	_check(out[1][2] == T.COAL, "coal_transmuter turns an adjacent IRON_ORE into COAL (radius 1)")

# ── Regression: pre-existing dispatch paths still work ──────────────────────

func _test_regression_axe_single_category() -> void:
	# axe uses the SINGLE-category path of clear_category ("trees"). The enhancement
	# added a `categories` branch — the single `category` branch must be untouched.
	var g := _full(T.GRASS)
	g[1][1] = T.OAK
	g[4][4] = T.OAK
	var res := ToolConfig.apply_instant(g, "axe")
	var out: Array = res["grid"]
	_check(_count_of(out, T.OAK) == 0, "REGRESSION: axe (single-category) still clears trees")
	_check(_count_of(out, T.GRASS) == 34, "REGRESSION: axe leaves non-trees intact")

func _test_regression_drill_from_keys() -> void:
	# drill uses the explicit `from_keys` path of transform_tiles (DIRT → STONE). The
	# enhancement added a `from_category` branch — explicit from_keys must still work.
	var g := _full(T.DIRT)
	g[0][0] = T.GEM
	var res := ToolConfig.apply_instant(g, "drill")
	var out: Array = res["grid"]
	_check(_count_of(out, T.STONE) == 35 and _count_of(out, T.DIRT) == 0,
		"REGRESSION: drill (from_keys) still transforms DIRT → STONE")
	_check(_count_of(out, T.GEM) == 1, "REGRESSION: drill leaves the non-matching GEM alone")

func _test_regression_magnet_from_keys() -> void:
	# magnet uses the explicit `from_keys` path of transform_adjacent (IRON_ORE → STONE).
	# The enhancement added `from_categories` — explicit from_keys must still work.
	var g := _full(T.IRON_ORE)
	var res := ToolConfig.apply_tap(g, "magnet", Vector2i(2, 2))
	var out: Array = res["grid"]
	_check(int(res["transformed"]) == 9, "REGRESSION: magnet (from_keys) transforms the 3x3 ore→stone")
	_check(out[2][2] == T.STONE and out[0][0] == T.IRON_ORE,
		"REGRESSION: magnet only affects the radius")

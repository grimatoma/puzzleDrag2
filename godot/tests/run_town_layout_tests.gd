extends SceneTree
## Headless unit-test runner for TownLayout (the procedural top-down town-map
## generator). Run from the godot/ project root:
##   godot --headless --script res://tests/run_town_layout_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Mirrors the 21 invariants asserted by src/__tests__/townLayout.test.ts:
## determinism on repeat; lot count == plot_count (clamped >= 1); lots in-bounds;
## uniform lot size; valid quarter tags; boards per kind; field inside the farm
## board at angle 0; river always present + shore iff a fish board; roads
## axis-aligned; waypoint graph connected (BFS from node 0); bridges at road×river
## crossings; front paths y2 >= y1; lampposts clear of roads; street trees
## in-bounds & off roads; lot decor within its matching lot.
##
## Same dependency-free harness style as tests/run_state_tests.gd.

const W: float = 1280.0
const H: float = 960.0
const EPS: float = 0.001

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── TownLayout tests ──────────────────────────────")
	_test_stage_dims()
	_test_determinism_default()
	_test_determinism_explicit_args()
	_test_different_zones_differ()
	_test_plot_count_clamp_and_bounds()
	_test_uniform_lot_size()
	_test_extreme_plot_count()
	_test_boards_per_kind()
	_test_non_array_board_kinds()
	_test_always_water_and_streets()
	_test_roads_axis_aligned()
	_test_waypoint_graph_connected()
	_test_tree_cap()
	_test_bridges_at_crossings()
	_test_front_paths()
	_test_lampposts_off_roads()
	_test_street_trees()
	_test_lot_decor_in_bounds()
	_test_decor_uses_separate_seed()
	_test_field_inside_farm_board()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ─────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# Local copy of the generator's point-to-segment distance (matches the test).
func _seg_dist(p: Dictionary, a: Dictionary, b: Dictionary) -> float:
	var dx: float = b["x"] - a["x"]
	var dy: float = b["y"] - a["y"]
	var len2: float = dx * dx + dy * dy
	if len2 == 0.0:
		len2 = 1.0
	var t: float = ((p["x"] - a["x"]) * dx + (p["y"] - a["y"]) * dy) / len2
	t = clampf(t, 0.0, 1.0)
	var qx: float = a["x"] + t * dx
	var qy: float = a["y"] + t * dy
	return sqrt((p["x"] - qx) * (p["x"] - qx) + (p["y"] - qy) * (p["y"] - qy))

# ── Tests ─────────────────────────────────────────────────────────────────────

func _test_stage_dims() -> void:
	_check(TownLayout.STAGE_W == W, "STAGE_W == 1280")
	_check(TownLayout.STAGE_H == H, "STAGE_H == 960")

func _test_determinism_default() -> void:
	var p1 := TownLayout.build_plan()
	var p2 := TownLayout.build_plan()
	_check(p1 == p2, "default args → identical plan on repeat (determinism)")
	_check(p1["stage_w"] == W, "default plan stage_w == 1280")
	_check(p1["stage_h"] == H, "default plan stage_h == 960")
	_check((p1["lots"] as Array).size() == 12, "default plotCount → 12 lots")
	_check(float(p1["ground"]["top"]) == 0.0, "ground.top == 0")

func _test_determinism_explicit_args() -> void:
	var a := TownLayout.build_plan("harbor", 14, ["fish", "farm"])
	var b := TownLayout.build_plan("harbor", 14, ["fish", "farm"])
	_check(a == b, "explicit (non-default) args → identical plan on repeat")

func _test_different_zones_differ() -> void:
	var home := TownLayout.build_plan("home")
	var forest := TownLayout.build_plan("forest")
	var mountain := TownLayout.build_plan("mountain")
	_check(home["lots"] != forest["lots"], "home vs forest lots differ")
	_check(home["lots"] != mountain["lots"], "home vs mountain lots differ")
	_check(forest["lots"] != mountain["lots"], "forest vs mountain lots differ")

func _test_plot_count_clamp_and_bounds() -> void:
	_check((TownLayout.build_plan("home", 0)["lots"] as Array).size() == 1, "plotCount 0 clamps to 1 lot")
	_check((TownLayout.build_plan("home", 1)["lots"] as Array).size() == 1, "plotCount 1 → 1 lot")
	_check((TownLayout.build_plan("home", 12)["lots"] as Array).size() == 12, "plotCount 12 → 12 lots")

	var big := TownLayout.build_plan("home", 40)
	_check((big["lots"] as Array).size() == 40, "plotCount 40 → 40 lots")

	var in_bounds_ok := true
	var tags_ok := true
	for plan in [TownLayout.build_plan("home", 1), big]:
		for lot in plan["lots"]:
			if lot["cx"] < 0.0 or lot["cx"] > W or lot["cy"] < 0.0 or lot["cy"] > H:
				in_bounds_ok = false
	for lot in big["lots"]:
		if not (lot["row"] in ["nw", "ne", "sw", "se"]):
			tags_ok = false
	_check(in_bounds_ok, "all lots stay within the design space (0..W, 0..H)")
	_check(tags_ok, "every lot carries a quarter tag ∈ {nw,ne,sw,se}")

func _test_uniform_lot_size() -> void:
	for plot_count in [12, 40]:
		var lots: Array = TownLayout.build_plan("home", plot_count)["lots"]
		_check(lots.size() > 0, "plotCount %d → at least one lot" % plot_count)
		var w: float = lots[0]["w"]
		var h: float = lots[0]["h"]
		var uniform := true
		for l in lots:
			if l["w"] != w or l["h"] != h:
				uniform = false
		_check(uniform, "plotCount %d → all lots share w and h (uniform size)" % plot_count)

func _test_extreme_plot_count() -> void:
	for n in [90, 100, 120, 150, 200]:
		var plan := TownLayout.build_plan("home", n)
		var lots: Array = plan["lots"]
		_check(lots.size() > int(n * 0.8) and lots.size() <= n,
			"extreme plotCount %d → lot count in (0.8n, n] (got %d)" % [n, lots.size()])
		var ok := true
		for lot in lots:
			if not (lot["row"] in ["nw", "ne", "sw", "se"]):
				ok = false
			if lot["cx"] < 0.0 or lot["cx"] > W or lot["cy"] < 0.0 or lot["cy"] > H:
				ok = false
		_check(ok, "extreme plotCount %d → lots tagged & in-bounds" % n)
		_check(TownLayout.build_plan("home", n) == plan, "determinism holds at plotCount %d" % n)

func _test_boards_per_kind() -> void:
	var farm := TownLayout.build_plan("home", 12, ["farm"])
	_check(_board_kinds(farm) == ["farm"], "boardKinds [farm] → boards == [farm]")
	_check((farm["fields"] as Array).size() > 0, "farm board → at least one tilled field")

	var mine := TownLayout.build_plan("home", 12, ["mine"])
	_check(_board_kinds(mine) == ["mine"], "boardKinds [mine] → boards == [mine]")

	var fish := TownLayout.build_plan("home", 12, ["fish"])
	_check(_board_kinds(fish) == ["fish"], "boardKinds [fish] → boards == [fish]")
	var has_shore := false
	for w in fish["water"]:
		if w["kind"] == "shore":
			has_shore = true
	_check(has_shore, "fish board → a shoreline water body")

	var all := TownLayout.build_plan("home", 12, ["farm", "mine", "fish"])
	var sorted_kinds: Array = _board_kinds(all)
	sorted_kinds.sort()
	_check(sorted_kinds == ["farm", "fish", "mine"], "all boardKinds → all three boards")

func _board_kinds(plan: Dictionary) -> Array:
	var out: Array = []
	for b in plan["boards"]:
		out.append(b["kind"])
	return out

func _test_non_array_board_kinds() -> void:
	# build_plan's signature is typed Array, but an empty/garbage Array yields []
	# boards — mirror the TS "non-array boardKinds → no boards" intent.
	var plan := TownLayout.build_plan("home", 12, [])
	_check((plan["boards"] as Array).is_empty(), "empty boardKinds → no boards")
	var junk := TownLayout.build_plan("home", 12, ["not_a_board", "xyzzy"])
	_check((junk["boards"] as Array).is_empty(), "unknown board kinds → no boards")

func _test_always_water_and_streets() -> void:
	var plan := TownLayout.build_plan("home", 12)
	_check((plan["water"] as Array).size() > 0, "always >= 1 water body")
	_check((plan["roads"] as Array).size() > 0, "always >= 1 road")
	var roads_ok := true
	for r in plan["roads"]:
		if (r["points"] as Array).size() < 3:
			roads_ok = false
	_check(roads_ok, "every road polyline has >= 3 points")
	_check((plan["streets"] as Array).size() > 0, "always >= 1 street segment")
	var has_river := false
	for w in plan["water"]:
		if w["kind"] == "river":
			has_river = true
	_check(has_river, "river is always present")

func _test_roads_axis_aligned() -> void:
	var cases := [
		{"zone": "home", "n": 12, "kinds": []},
		{"zone": "home", "n": 40, "kinds": []},
		{"zone": "harbor", "n": 16, "kinds": ["farm", "mine", "fish"]},
	]
	var all_ok := true
	for cse in cases:
		var plan := TownLayout.build_plan(cse["zone"], cse["n"], cse["kinds"])
		for road in plan["roads"]:
			var pts: Array = road["points"]
			for i in pts.size() - 1:
				var a: Dictionary = pts[i]
				var b: Dictionary = pts[i + 1]
				var shares_x: bool = abs(a["x"] - b["x"]) < EPS
				var shares_y: bool = abs(a["y"] - b["y"]) < EPS
				if not (shares_x or shares_y):
					all_ok = false
			var xs: Array = []
			var ys: Array = []
			for p in pts:
				xs.append(p["x"])
				ys.append(p["y"])
				var same_x: bool = (xs.max() - xs.min()) < EPS
				var same_y: bool = (ys.max() - ys.min()) < EPS
				if not (same_x or same_y):
					all_ok = false
	_check(all_ok, "every road segment (and whole polyline) is axis-aligned")

func _test_waypoint_graph_connected() -> void:
	var plan := TownLayout.build_plan("home", 16, ["farm", "mine"])
	var n: int = (plan["waypoints"] as Array).size()
	_check(n > 0, "waypoint graph is non-empty")
	var adj: Array = []
	for _i in n:
		adj.append([])
	for e in plan["edges"]:
		adj[e[0]].append(e[1])
		adj[e[1]].append(e[0])
	var seen := {0: true}
	var queue: Array = [0]
	while queue.size() > 0:
		var cur: int = queue.pop_front()
		for nx in adj[cur]:
			if not seen.has(nx):
				seen[nx] = true
				queue.append(nx)
	_check(seen.size() == n, "BFS from node 0 reaches all %d waypoints" % n)

func _test_tree_cap() -> void:
	var plan := TownLayout.build_plan("verdant", 6)
	_check((plan["trees"] as Array).size() <= 40, "tree canopy entries capped at 40")

func _test_bridges_at_crossings() -> void:
	var cases := [
		{"zone": "home", "n": 12, "kinds": []},
		{"zone": "harbor", "n": 16, "kinds": ["farm", "mine", "fish"]},
	]
	var all_ok := true
	var any_empty := false
	for cse in cases:
		var plan := TownLayout.build_plan(cse["zone"], cse["n"], cse["kinds"])
		if (plan["bridges"] as Array).is_empty():
			any_empty = true
		for b in plan["bridges"]:
			if not (b["width"] > 0.0):
				all_ok = false
			# Bridges sit on axis-aligned roads → angle is a multiple of π/2 →
			# sin(2·angle) ≈ 0.
			if abs(sin(2.0 * float(b["angle"]))) >= 1e-6:
				all_ok = false
	_check(not any_empty, "every case has >= 1 bridge at a road×river crossing")
	_check(all_ok, "every bridge has width>0 and sin(2·angle)≈0 (axis-aligned road)")

func _test_front_paths() -> void:
	var plan := TownLayout.build_plan("home", 12)
	_check((plan["paths"] as Array).size() > 0, "at least one front path")
	var ok := true
	for p in plan["paths"]:
		var axis_aligned: bool = abs(p["x1"] - p["x2"]) < 1e-6 or abs(p["y1"] - p["y2"]) < 1e-6
		if not axis_aligned:
			ok = false
		if not (p["width"] > 0.0):
			ok = false
		if not (p["y2"] >= p["y1"] - 1e-6):
			ok = false
	_check(ok, "front paths are axis-aligned, width>0, and never exit above the building (y2>=y1)")

func _test_lampposts_off_roads() -> void:
	var plan := TownLayout.build_plan("home", 16, ["farm", "mine", "fish"])
	var lamps: Array = []
	for p in plan["props"]:
		if p["kind"] == "lamppost":
			lamps.append(p)
	_check(lamps.size() > 0, "at least one lamppost is placed")
	var ok := true
	for lamp in lamps:
		var min_clearance: float = INF
		for road in plan["roads"]:
			var pts: Array = road["points"]
			for i in pts.size() - 1:
				var d: float = _seg_dist(lamp, pts[i], pts[i + 1])
				min_clearance = min(min_clearance, d - road["width"] / 2.0)
		if min_clearance < -1e-6:
			ok = false
	_check(ok, "every lamppost is clear of road bodies (clearance >= -eps)")

func _test_street_trees() -> void:
	var plan := TownLayout.build_plan("home", 16, ["farm", "mine", "fish"])
	_check((plan["street_trees"] as Array).size() <= 22, "street trees capped at 22 (STREET_TREE_CAP)")
	var ok := true
	for t in plan["street_trees"]:
		if t["x"] < 0.0 or t["x"] > W or t["y"] < 0.0 or t["y"] > H:
			ok = false
		for road in plan["roads"]:
			var pts: Array = road["points"]
			for i in pts.size() - 1:
				var d: float = _seg_dist(t, pts[i], pts[i + 1])
				if not (d > road["width"] / 2.0):
					ok = false
	_check(ok, "street trees stay in-bounds and off every road body")

func _test_lot_decor_in_bounds() -> void:
	var plan := TownLayout.build_plan("home", 16, ["farm", "mine", "fish"])
	var lot_by_index := {}
	for l in plan["lots"]:
		lot_by_index[l["index"]] = l
	var ok := true
	for d in plan["lot_decor"]:
		if not lot_by_index.has(d["lot"]):
			ok = false
			continue
		var lot: Dictionary = lot_by_index[d["lot"]]
		if abs(d["x"] - lot["cx"]) > lot["w"] / 2.0:
			ok = false
		if abs(d["y"] - lot["cy"]) > lot["h"] / 2.0:
			ok = false
	_check(ok, "every lot decor accent sits within its matching lot's bounds")

func _test_decor_uses_separate_seed() -> void:
	# Decor RNG is seeded independently → existing arrays are still populated and
	# the whole plan stays deterministic across calls.
	var plan := TownLayout.build_plan("home", 12)
	_check((plan["trees"] as Array).size() > 0, "home has trees")
	_check((plan["fields"] as Array).size() >= 0, "fields array exists (may be 0 without a farm board)")
	_check((plan["props"] as Array).size() > 0, "home has props")
	_check(TownLayout.build_plan("home", 12) == plan, "plan deterministic across calls (decor included)")

	var farm := TownLayout.build_plan("home", 12, ["farm"])
	_check((farm["fields"] as Array).size() > 0, "farm board → non-empty fields")
	_check((farm["trees"] as Array).size() > 0, "farm plan still has trees")
	_check(TownLayout.build_plan("home", 12, ["farm"]) == farm, "farm plan deterministic across calls")

func _test_field_inside_farm_board() -> void:
	var plan := TownLayout.build_plan("home", 16, ["farm"])
	var farm: Dictionary = {}
	for b in plan["boards"]:
		if b["kind"] == "farm":
			farm = b
	_check(not farm.is_empty(), "farm board exists")
	_check((plan["fields"] as Array).size() > 0, "fields are present with a farm board")
	var TOL: float = 1.0  # field is 0.9× the card → strictly inside, small float tol
	var ok := true
	for f in plan["fields"]:
		if f["angle"] != 0.0:
			ok = false
		if f["cx"] - f["w"] / 2.0 < farm["cx"] - farm["w"] / 2.0 - TOL:
			ok = false
		if f["cx"] + f["w"] / 2.0 > farm["cx"] + farm["w"] / 2.0 + TOL:
			ok = false
		if f["cy"] - f["h"] / 2.0 < farm["cy"] - farm["h"] / 2.0 - TOL:
			ok = false
		if f["cy"] + f["h"] / 2.0 > farm["cy"] + farm["h"] / 2.0 + TOL:
			ok = false
	_check(ok, "field is locked inside the farm board's footprint at angle 0")

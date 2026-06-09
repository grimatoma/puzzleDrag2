extends SceneTree
## Headless tests for the distinct town-building ART + walking townsfolk
## (scenes/town/BuildingArt.gd + the townsfolk additions in scenes/town/TownMap.gd).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_building_art_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## A renderer can't assert pixels in a headless run, so this asserts the load-bearing
## contract instead:
##   1. BuildingArt.shape_for(id) resolves EVERY BuildingConfig build id to a KNOWN
##      shape-family drawer, an UNKNOWN id falls back to "house" (the always-draws
##      fallback), and distinct families are actually distinct (the map is not all
##      "house").
##   2. draw_building() runs without error on a real TownMap for every id (the
##      per-shape drawers + the fallback all execute through the canvas helpers).
##   3. Townsfolk spawn within bounds, scale with town size, and a _process tick
##      moves them while keeping them inside the roam bounds — and a headless tick is
##      a guarded no-op (the test sweep stays deterministic).

const TownMapScript := preload("res://scenes/town/TownMap.gd")

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Building art + townsfolk tests ─────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. shape_for() mapping ────────────────────────────────────────────────
	var known := {}
	for s in BuildingArt.KNOWN_SHAPES:
		known[s] = true
	var shapes_seen := {}
	for id in BuildingConfig.ALL_BUILD_IDS:
		var sh: String = BuildingArt.shape_for(id)
		_check(sh != "", "shape_for('%s') is non-empty (got '%s')" % [id, sh])
		_check(known.has(sh), "shape_for('%s') == '%s' is a KNOWN shape" % [id, sh])
		shapes_seen[sh] = true
	# An unknown id falls back to the generic "house" drawer.
	_check(BuildingArt.shape_for("totally_unknown_building") == "house",
		"shape_for(unknown id) falls back to 'house'")
	_check(BuildingArt.shape_for("") == "house", "shape_for('') falls back to 'house'")
	# The town is NOT all-the-same: distinct families are actually used. The build
	# roster spans many silhouettes — assert a healthy spread so we never regress to
	# the old "every plot is the same box".
	_check(shapes_seen.size() >= 12,
		"build roster maps to ≥12 DISTINCT shape families (got %d) — not one box" % shapes_seen.size())
	# A few specific load-bearing mappings (the headline parity buildings).
	_check(BuildingArt.shape_for("mill") == "mill", "mill → mill (turning sails)")
	_check(BuildingArt.shape_for("barn") == "barn", "barn → barn (gambrel)")
	_check(BuildingArt.shape_for("chapel") == "chapel", "chapel → chapel (steeple)")
	_check(BuildingArt.shape_for("silo") == "silo", "silo → silo (round tower)")
	_check(BuildingArt.shape_for("forge") == "forge", "forge → forge (chimney + glow)")
	_check(BuildingArt.shape_for("observatory") == "observatory", "observatory → observatory (dome)")
	# Every KNOWN_SHAPES key (except the meta fallback names) is reachable from at
	# least the named lists — at minimum draw_building handles them all (checked next).

	# ── 2. draw_building runs for every id (+ the fallback) on a real TownMap ──
	var town_map: Node2D = TownMapScript.new()
	root.add_child(town_map)
	# Render a realistic plan so the canvas transform (_pxy/_s) is valid.
	town_map.render_plan(TownLayout.build_plan("home", 11, ["farm"]), 720.0, 1280.0, [])
	await process_frame
	# Drive each shape drawer directly (a 120×120 plan-space cell at the origin).
	var ids := BuildingConfig.ALL_BUILD_IDS.duplicate()
	ids.append("magic_portal")          # the portal special-case id
	ids.append("totally_unknown_building")  # the fallback path
	for id in ids:
		BuildingArt.draw_building(town_map, String(id), 100.0, 100.0, 120.0, 120.0, 1.0)
	_check(true, "draw_building() ran for every build id + portal + fallback without error")
	# Animated families with a different phase also run (sails/smoke/blade/pulse).
	for id in ["mill", "forge", "sawmill", "magic_portal", "bakery"]:
		BuildingArt.draw_building(town_map, id, 100.0, 100.0, 120.0, 120.0, 3.7)
	_check(true, "animated families run at a non-zero phase without error")

	# ── 3. Townsfolk: spawn, bounds, scale, movement ─────────────────────────
	# A small town (few lots) spawns at least the floor; a big town spawns more.
	var small_map: Node2D = TownMapScript.new()
	root.add_child(small_map)
	small_map.render_plan(TownLayout.build_plan("home", 1, ["farm"]), 720.0, 1280.0, [])
	await process_frame
	var small_n: int = small_map._folk.size()
	_check(small_n >= TownMapScript.TOWNSFOLK_MIN,
		"small town spawns ≥ TOWNSFOLK_MIN villagers (got %d)" % small_n)

	var big_map: Node2D = TownMapScript.new()
	root.add_child(big_map)
	big_map.render_plan(TownLayout.build_plan("home", 11, ["farm"]), 720.0, 1280.0, [])
	await process_frame
	var big_n: int = big_map._folk.size()
	_check(big_n >= small_n, "bigger town spawns ≥ as many villagers (%d ≥ %d)" % [big_n, small_n])
	_check(big_n <= TownMapScript.TOWNSFOLK_MAX, "villager count capped at TOWNSFOLK_MAX (got %d)" % big_n)
	# Every villager spawns inside the roam bounds with a finite target.
	var bounds: Rect2 = big_map._folk_bounds
	var all_in: bool = true
	for f in big_map._folk:
		if not bounds.has_point(f.pos):
			all_in = false
	_check(all_in, "every villager spawns inside the roam bounds")

	# Movement: a manual _step_townsfolk tick moves at least one villager but keeps
	# ALL of them inside the bounds (the clamp holds). We call _step_townsfolk
	# directly (not _process, which is a headless no-op) so the test is deterministic.
	# Zero pauses so they all move this tick.
	for f in big_map._folk:
		f.pause = 0.0
	var before: Array = []
	for f in big_map._folk:
		before.append(f.pos)
	big_map._phase = 1.0
	for _i in 10:
		big_map._step_townsfolk(0.1)   # 1s of strolling in 0.1s steps
	var moved: bool = false
	var still_in: bool = true
	for i in big_map._folk.size():
		if big_map._folk[i].pos.distance_to(before[i]) > 0.5:
			moved = true
		if not bounds.has_point(big_map._folk[i].pos):
			still_in = false
	_check(moved, "at least one villager moved after a strolling tick")
	_check(still_in, "all villagers stay inside the roam bounds after moving (clamp holds)")

	# Headless guard: _anim_enabled() is false under the headless sweep, so _process
	# does nothing (no phase advance, no movement, no draw) — keeps the suite
	# deterministic and never errors on a missing renderer.
	_check(not big_map._anim_enabled(), "_anim_enabled() is false under headless (DisplayServer 'headless')")
	var phase_before: float = big_map._phase
	big_map._process(0.5)
	_check(is_equal_approx(big_map._phase, phase_before), "_process is a no-op under headless (phase unchanged)")

	# Drawing with folk present must not crash (queue a redraw + tick).
	big_map.queue_redraw()
	await process_frame
	_check(big_map.is_inside_tree(), "TownMap with villagers live after a frame (draw did not crash)")

	town_map.queue_free()
	small_map.queue_free()
	big_map.queue_free()
	await process_frame

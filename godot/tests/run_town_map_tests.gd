extends SceneTree
## Headless smoke runner for TownMap (the spatial top-down town-map renderer).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_town_map_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## A renderer can't assert pixels in a headless run, so this asserts the load-
## bearing wiring instead: the script instances, render_plan() runs without error
## on a real TownLayout plan, the stored plan is non-empty, the computed fit
## transform is positive, and adding the node + ticking a frame (which triggers
## _draw via queue_redraw) doesn't crash. Same dependency-free harness style as
## run_town_layout_tests.gd.

const TownMapScript := preload("res://scenes/town/TownMap.gd")

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── TownMap tests ─────────────────────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _run() -> void:
	# 1. Instances.
	var town_map: Node2D = TownMapScript.new()
	_check(town_map != null, "TownMap script instances to a Node2D")

	# 2. render_plan runs without error on a real plan.
	var plan := TownLayout.build_plan("home", 7, ["farm"])
	_check(not plan.is_empty(), "TownLayout produced a non-empty plan")
	town_map.render_plan(plan, 720.0, 1280.0)
	_check(true, "render_plan(plan, 720, 1280) ran without error")

	# 3. The renderer stored the plan + computed a positive fit scale.
	_check(not town_map._plan.is_empty(), "stored plan is non-empty after render_plan")
	_check(town_map._scale > 0.0, "computed fit scale is > 0 (got %f)" % town_map._scale)
	# Fit-by-width: scale should be view_w / stage_w = 720/1280 = 0.5625.
	_check(abs(town_map._scale - (720.0 / 1280.0)) < 1e-4,
		"fit-by-width scale == view_w/stage_w (got %f)" % town_map._scale)
	# Vertical centring offset (stage shorter than viewport after scaling → > 0).
	_check(town_map._oy > 0.0, "stage is vertically centred (offset_y > 0)")

	# 4. Adding to the tree + ticking a frame drives _draw without crashing.
	root.add_child(town_map)
	town_map.queue_redraw()
	await process_frame
	await process_frame
	_check(town_map.is_inside_tree(), "node is live in the SceneTree after a frame")
	_check(true, "_draw via queue_redraw + frame tick did not crash")

	# 5. A second plan (no boards) also renders cleanly — empty optional layers
	#    must not crash the guarded draw.
	var bare := TownLayout.build_plan("home", 1, [])
	town_map.render_plan(bare, 720.0, 1280.0)
	town_map.queue_redraw()
	await process_frame
	_check(town_map._scale > 0.0, "re-render with a board-less plan keeps a valid transform")

	town_map.queue_free()

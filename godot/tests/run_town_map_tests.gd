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
	# M6c: the fit is now CONTENT-AWARE — it measures the drawn-content bbox and fits
	# THAT (with a small PAD) into the viewport, centred. Assert the content bbox is a
	# proper sub-rectangle of the full stage (the empty grass border is trimmed)…
	var bb: Dictionary = town_map._content_bbox(1280.0, 960.0)
	var bbw: float = bb.x1 - bb.x0
	var bbh: float = bb.y1 - bb.y0
	_check(bbw > 0.0 and bbw <= 1280.0 + 1e-3, "content bbox width within the stage (got %f)" % bbw)
	_check(bbh > 0.0 and bbh <= 960.0 + 1e-3, "content bbox height within the stage (got %f)" % bbh)
	_check(bbw < 1280.0 or bbh < 960.0, "content bbox is tighter than the full stage on at least one axis")
	# …and the fitted content FILLS the viewport on its binding axis (the scaled bbox
	# reaches the viewport edge minus the ~24px PAD, so the offset on that axis is ~PAD,
	# not a wide empty margin). This is the "fills the portrait viewport" guarantee.
	var min_off: float = min(town_map._ox + bb.x0 * town_map._scale, town_map._oy + bb.y0 * town_map._scale)
	_check(min_off <= 24.0 + 1.0, "fitted content fills a viewport axis (binding-axis offset ~PAD, got %f)" % min_off)

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

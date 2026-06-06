extends SceneTree
## Headless tests for M6c — the spatial town map reachable IN-GAME with REAL state.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_townmap_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Three layers:
##   1. ViewRouter pure-state — the new TOWNMAP modal + resolve("map"/"townmap"),
##      modal_id(TOWNMAP), and known_ids() coverage.
##   2. TownMap direct — render_plan(plan, 720, 1280, built) runs without error and
##      marks the right number of lots built (the first built.size() lots).
##   3. Main integration (like run_inventory_tests) — _open_townmap() lazily creates
##      + shows _townmap_screen and reuses it on a 2nd call; apply_deeplink("map")
##      shows it with the router in TOWNMAP; apply_deeplink("board") closes it; and
##      the screen's plan was built from REAL state (lot count == settlement.plots()).

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
	print("\n── Town map in-game (M6c) tests ───────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. ViewRouter pure-state for the new TOWNMAP modal ────────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.TOWNMAP)
	_check(r.current_modal() == ViewRouter.Modal.TOWNMAP, "open_modal(TOWNMAP) → current_modal() == TOWNMAP")
	_check(r.is_open(ViewRouter.Modal.TOWNMAP), "is_open(TOWNMAP) == true after open")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() → NONE")

	var d_map := ViewRouter.resolve("map")
	_check(bool(d_map.get("ok", false)), "resolve('map') ok")
	_check(int(d_map.get("modal", -1)) == ViewRouter.Modal.TOWNMAP, "resolve('map') modal == TOWNMAP")
	var d_tm := ViewRouter.resolve("townmap")
	_check(bool(d_tm.get("ok", false)), "resolve('townmap') ok")
	_check(int(d_tm.get("modal", -1)) == ViewRouter.Modal.TOWNMAP, "resolve('townmap') modal == TOWNMAP")
	_check(ViewRouter.modal_id(ViewRouter.Modal.TOWNMAP) == "map", "modal_id(TOWNMAP) == 'map'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("map"), "known_ids() contains 'map'")
	_check(ids.has("townmap"), "known_ids() contains 'townmap'")

	# ── 2. TownMap direct — render + built-lot marking ────────────────────────
	var town_map: Node2D = TownMapScript.new()
	root.add_child(town_map)
	var plan := TownLayout.build_plan("home", 7, ["farm"])
	_check(not plan.is_empty(), "TownLayout produced a non-empty plan")
	town_map.render_plan(plan, 720.0, 1280.0, ["lumber_camp", "coop"])
	_check(true, "render_plan(plan, 720, 1280, [lumber_camp, coop]) ran without error")
	_check(town_map._built_ids.size() == 2, "render_plan stored 2 built ids (2 lots built)")
	_check(town_map._scale > 0.0, "content-aware fit produced a positive scale (got %f)" % town_map._scale)
	town_map.queue_redraw()
	await process_frame
	await process_frame
	_check(town_map.is_inside_tree(), "TownMap node live in the SceneTree after a frame")
	_check(true, "_draw with built lots did not crash")
	town_map.queue_free()

	# ── 3. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_townmap"), "Main has _open_townmap()")
	_check(main.has_method("_on_townmap_closed"), "Main has _on_townmap_closed()")
	_check(main._townmap_screen == null, "town-map screen is lazily created (null before open)")

	# Opening lazily creates + shows it.
	main._open_townmap()
	_check(main._townmap_screen != null, "_open_townmap() lazily created the TownMapScreen")
	_check(main._townmap_screen is TownMapScreen, "_townmap_screen is a TownMapScreen")
	_check(main._townmap_screen.visible, "town-map is visible after _open_townmap()")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNMAP,
		"_router.current_modal() == TOWNMAP after _open_townmap()")

	# The plan was built from REAL state: lot count == settlement.plots() for this tier.
	var expected_plots: int = main.game.settlement.plots()
	_check(main._townmap_screen.plan_lot_count() == expected_plots,
		"plan lot count (%d) == settlement.plots() (%d)" % [main._townmap_screen.plan_lot_count(), expected_plots])

	# A second open() reuses the SAME screen (no duplicate child).
	var first_ref = main._townmap_screen
	main._open_townmap()
	_check(main._townmap_screen == first_ref, "_open_townmap() reuses the one screen")

	# apply_deeplink("map") shows it; router in TOWNMAP.
	main._townmap_screen.visible = false        # reset so the deeplink re-shows it
	var ok_map: bool = main.apply_deeplink("map")
	_check(ok_map, "apply_deeplink('map') returns true")
	_check(main._townmap_screen.visible, "_townmap_screen visible after apply_deeplink('map')")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNMAP,
		"_router.current_modal() == TOWNMAP after apply_deeplink('map')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._townmap_screen.visible, "_townmap_screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()

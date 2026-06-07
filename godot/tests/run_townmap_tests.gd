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

	# ── 2b. M6d hit-testing — screen → lot inverse map ────────────────────────
	# The centre of a known build-slot lot must round-trip back to that slot's
	# index; a point far outside every lot must return -1.
	var slot1_center: Vector2 = town_map.lot_screen_center(1)
	_check(slot1_center.x != INF, "lot_screen_center(1) resolved a finite centre")
	_check(town_map.lot_at_screen(slot1_center) == 1,
		"lot_at_screen(centre of slot 1) == 1 (round-trips)")
	var slot0_center: Vector2 = town_map.lot_screen_center(0)
	_check(town_map.lot_at_screen(slot0_center) == 0,
		"lot_at_screen(centre of slot 0) == 0")
	_check(town_map.lot_at_screen(Vector2(-9999.0, -9999.0)) == -1,
		"lot_at_screen(far outside) == -1")
	_check(town_map.built_count() == 2, "built_count() == 2 (matches built ids given)")
	_check(town_map.lot_count() >= town_map.built_count(),
		"lot_count() (%d) >= built_count() (%d)" % [town_map.lot_count(), town_map.built_count()])
	# Hover is cosmetic + safe: setting it then drawing must not crash.
	town_map.set_hover_lot(0)
	town_map.queue_redraw()
	await process_frame
	_check(town_map._hover_lot == 0, "set_hover_lot(0) stored the hover index")
	town_map.set_hover_lot(-1)
	town_map.queue_free()

	# ── 2c. M6d interaction — build picker + demolish via TownMapScreen ────────
	await _run_interaction()

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

## ── M6d interaction (build picker + demolish) ─────────────────────────────────
## Stand up a Village-tier GameState with ONE building already built and a generous
## inventory (so at least one further build is affordable), open a TownMapScreen on
## it, and drive the two click paths WITHOUT real input events:
##   • clicking the built lot (slot 0) → a "demolish" button exists; pressing it
##     shrinks game.buildings by 1 and the map re-renders (built_count drops).
##   • clicking an empty lot → a build picker with ≥1 "build:<id>" button exists;
##     pressing an affordable one grows game.buildings by 1.
## Mirrors run_town_ui_tests' setup + _press helper.
func _run_interaction() -> void:
	var game := GameState.new()
	game.settlement.tier = TownConfig.TIER_VILLAGE
	# Start with one building placed on slot 0 (lumber_camp), and stock the cost of a
	# second affordable build (coop = plank 6, flour 6) plus headroom.
	game.buildings = ["lumber_camp"]
	game.inventory = {"plank": 30, "flour": 30, "hay_bundle": 30, "eggs": 12}

	var screen := TownMapScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame

	var map = screen._map
	_check(map != null, "TownMapScreen exposes its TownMap node")
	_check(map.built_count() == 1, "map built_count() == 1 (lumber_camp on slot 0)")

	# ── M-nav: the prominent "Build · N/N plots" button (matches React) ──────────
	# A discoverable Build affordance, bottom-right, registered as "build_open". Its
	# label reflects the live built/total plot counts, and pressing it opens the build
	# picker (the SAME picker a click on an empty plot opens) — then an affordable Build
	# in that picker actually grows game.buildings.
	_check(screen._action_buttons.has("build_open"), "TownMapScreen registered a 'build_open' Build button")
	var build_open_btn = screen._action_buttons["build_open"]
	_check("Build" in build_open_btn.text, "Build button label reads 'Build …' (got '%s')" % build_open_btn.text)
	_check("%d/%d" % [game.buildings.size(), max(1, game.settlement.plots())] in build_open_btn.text,
		"Build button label shows the live built/total plot counts")
	# Pressing the Build button opens the picker with ≥1 enabled build:<id>.
	build_open_btn.emit_signal("pressed")
	await process_frame
	_check(screen._action_buttons.has("picker_close"), "pressing Build opened the build picker")
	var build_via_btn: String = ""
	for k in screen._action_buttons.keys():
		if String(k).begins_with("build:") and not screen._action_buttons[k].disabled:
			build_via_btn = String(k)
			break
	_check(build_via_btn != "", "Build-button picker has ≥1 ENABLED build:<id> (got '%s')" % build_via_btn)
	var built_via_btn_before: int = game.buildings.size()
	if build_via_btn != "":
		screen._action_buttons[build_via_btn].emit_signal("pressed")
		await process_frame
	_check(game.buildings.size() == built_via_btn_before + 1,
		"building via the prominent Build button grew game.buildings by 1 (%d → %d)"
		% [built_via_btn_before, game.buildings.size()])
	# Refresh re-labels the Build button with the new built count.
	_check("%d/%d" % [game.buildings.size(), max(1, game.settlement.plots())] in build_open_btn.text,
		"Build button label updated after the build (%s)" % build_open_btn.text)

	# A click on the centre of slot 0 resolves to slot 0, which is BUILT.
	var c0: Vector2 = map.lot_screen_center(0)
	_check(map.lot_at_screen(c0) == 0, "click on slot 0 resolves to lot 0")
	_check(0 < map.built_count(), "slot 0 is a BUILT lot (index < built_count)")

	# Open the built-lot info card (what a click on a built lot does) → demolish btn.
	screen._open_info_for_lot(0)
	await process_frame
	_check(screen._action_buttons.has("demolish"), "built-lot card registered a 'demolish' button")
	var built_before: int = game.buildings.size()
	screen._action_buttons["demolish"].emit_signal("pressed")
	await process_frame
	_check(game.buildings.size() == built_before - 1,
		"pressing demolish shrank game.buildings by 1 (%d → %d)" % [built_before, game.buildings.size()])
	_check(map.built_count() == game.buildings.size(),
		"map re-rendered after demolish (built_count == buildings.size())")
	_check(not screen._action_buttons.has("demolish"), "demolish button cleared after the panel closed")

	# Now every plot is empty (buildings emptied). Click an empty lot → build picker.
	var first_empty: int = map.built_count()   # the first empty build-slot
	var ce: Vector2 = map.lot_screen_center(first_empty)
	_check(map.lot_at_screen(ce) == first_empty, "click on empty slot resolves to it")
	_check(map.lot_at_screen(ce) >= map.built_count(), "that slot is EMPTY (index >= built_count)")

	screen._open_build_picker_for_lot(first_empty)
	await process_frame
	_check(screen._action_buttons.has("picker_close"), "build picker registered a 'picker_close' button")
	# Find an affordable build button (coop is stocked + Village-unlocked).
	var build_key: String = ""
	for k in screen._action_buttons.keys():
		if String(k).begins_with("build:") and not screen._action_buttons[k].disabled:
			build_key = String(k)
			break
	_check(build_key != "", "build picker has ≥1 ENABLED build:<id> button (got '%s')" % build_key)
	var grow_before: int = game.buildings.size()
	if build_key != "":
		screen._action_buttons[build_key].emit_signal("pressed")
		await process_frame
	_check(game.buildings.size() == grow_before + 1,
		"pressing an affordable build grew game.buildings by 1 (%d → %d)" % [grow_before, game.buildings.size()])
	_check(map.built_count() == game.buildings.size(),
		"map re-rendered after build (built_count == buildings.size())")

	screen.queue_free()
	await process_frame

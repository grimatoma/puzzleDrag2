extends SceneTree
## Headless tests for the Town nav route — the TOWNMAP router modal + the
## VillageScreen that serves it (town-map rebuild Phase 2 replaced the old
## TownMap/TownMapScreen renderer with the GameState-driven village view).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_townmap_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Three layers:
##   1. ViewRouter pure-state — the TOWNMAP modal + resolve("map"/"townmap"),
##      modal_id(TOWNMAP), and known_ids() coverage.
##   2. VillageScreen interaction — the build picker (build_open → picker_close +
##      build:<id> keys → game.build grows game.buildings) and the built-plot
##      info card (demolish → game.buildings shrinks), driven through the SAME
##      registered _action_buttons the live taps create. The deeper render /
##      camera / tap matrix lives in run_village_tests.gd.
##   3. Main integration (like run_inventory_tests) — _open_townmap() lazily
##      creates + shows _townmap_screen and reuses it on a 2nd call;
##      apply_deeplink("map") shows it with the router in TOWNMAP;
##      apply_deeplink("board") closes it; and the screen's plan reflects REAL
##      state (lot count == settlement.plots()).

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
	# ── 1. ViewRouter pure-state for the TOWNMAP modal ────────────────────────
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

	# ── 2. VillageScreen interaction — build picker + demolish ────────────────
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

	# Opening lazily creates + shows the VillageScreen on the Town route.
	main._open_townmap()
	_check(main._townmap_screen != null, "_open_townmap() lazily created the village screen")
	_check(main._townmap_screen is VillageScreen, "_townmap_screen is a VillageScreen")
	_check(main._townmap_screen.visible, "town-map is visible after _open_townmap()")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNMAP,
		"_router.current_modal() == TOWNMAP after _open_townmap()")

	# The plan reflects REAL state: lot count == settlement.plots() for this tier.
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

	# Task C — board RUN-GATE: the board is only reachable while a bounded farm run is live (town
	# is home). Mark a run active so apply_deeplink("board") reaches the board (hides the town map,
	# resets the router to NONE) instead of redirecting back to the town home.
	main.game.farm_run_active = true
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._townmap_screen.visible, "_townmap_screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	main.queue_free()
	await process_frame
	SaveManager.clear()

## ── VillageScreen interaction (build picker + demolish) ───────────────────────
## Stand up a Village-tier GameState with ONE building already built and a generous
## inventory (so further builds are affordable), open a VillageScreen on it, and
## drive the two panel paths through the registered action buttons:
##   • the 🔨 Build button ("build_open") → the picker opens ("picker_close" key)
##     with ≥1 ENABLED "build:<id>"; pressing one grows game.buildings by 1 and the
##     picker keys clear (panel closed) while state_changed fires.
##   • the built-plot info card (_open_info_for_plot(0)) → a "demolish" button;
##     pressing it shrinks game.buildings by 1 and clears the panel keys.
## Mirrors run_town_ui_tests' setup + press style. The tap→panel resolution matrix
## (pad tap opens picker, built tap opens card, locked rows) lives in
## run_village_tests.gd.
func _run_interaction() -> void:
	var game := GameState.new()
	game.settlement.tier = TownConfig.TIER_VILLAGE
	# Start with one building placed on plot 0 (lumber_camp), and stock the cost of a
	# second affordable build (coop = plank 6, flour 6) plus headroom.
	game.buildings = ["lumber_camp"]
	game.inventory = {"plank": 30, "flour": 30, "hay_bundle": 30, "eggs": 12}

	var screen := VillageScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame

	var changed := {"n": 0}
	screen.state_changed.connect(func() -> void: changed.n += 1)

	# ── the prominent "Build · N/N plots" button (matches React) ──────────────
	_check(screen._action_buttons.has("build_open"), "VillageScreen registered a 'build_open' Build button")
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
	var built_before: int = game.buildings.size()
	if build_via_btn != "":
		screen._action_buttons[build_via_btn].emit_signal("pressed")
		await process_frame
	_check(game.buildings.size() == built_before + 1,
		"building via the Build picker grew game.buildings by 1 (%d → %d)"
		% [built_before, game.buildings.size()])
	_check(changed.n == 1, "the successful build emitted state_changed once")
	_check(not screen._action_buttons.has("picker_close"), "the picker closed after the build")
	# Refresh re-labels the Build button with the new built count.
	_check("%d/%d" % [game.buildings.size(), max(1, game.settlement.plots())] in build_open_btn.text,
		"Build button label updated after the build (%s)" % build_open_btn.text)

	# ── built-plot info card + demolish ────────────────────────────────────────
	screen._open_info_for_plot(0)
	await process_frame
	_check(screen._action_buttons.has("demolish"), "built-plot card registered a 'demolish' button")
	var demo_before: int = game.buildings.size()
	screen._action_buttons["demolish"].emit_signal("pressed")
	await process_frame
	_check(game.buildings.size() == demo_before - 1,
		"pressing demolish shrank game.buildings by 1 (%d → %d)" % [demo_before, game.buildings.size()])
	_check(changed.n == 2, "the successful demolish emitted state_changed too")
	_check(not screen._action_buttons.has("demolish"), "demolish button cleared after the panel closed")

	screen.queue_free()
	await process_frame

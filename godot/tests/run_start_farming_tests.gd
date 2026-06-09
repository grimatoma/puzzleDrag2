extends SceneTree
## Headless tests for the "Start Farming" UI (Task B): the StartFarmingModal picker/confirm
## card and the farm board-pad tap affordance on the town map.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_start_farming_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI auto-discovers + gates on it.
##
## Three layers (no real input events — drive accessors/signals directly, like
## run_townmap_tests):
##   1. StartFarmingModal — setup(game) builds the shell headlessly; preview_budget(),
##      default-all-selected categories, Start enabled/disabled by affordability, and the
##      start_requested(selected, use_fertilizer) emission on Start.
##   2. TownMap.board_at_screen — the farm pad's screen centre round-trips to "farm"; a
##      far-off point returns "".
##   3. TownMapScreen.start_farming_requested — a tap on the farm pad fires the signal once
##      and opens NO build/demolish panel.

const StartFarmingModalScript := preload("res://scenes/StartFarmingModal.gd")
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
	print("\n── Start Farming UI (Task B) tests ────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	await _test_modal()
	await _test_board_at_screen()
	await _test_screen_signal()
	await _test_main_wiring()
	await _test_expedition_input_gate()
	await _test_run_end_dismiss()

# ── 1. StartFarmingModal ───────────────────────────────────────────────────────

func _test_modal() -> void:
	# Build the modal BEFORE add_child to prove the shell builds without a live viewport.
	var game := GameState.new()
	game.coins = 50
	var m = StartFarmingModalScript.new()
	m.setup(game)
	_check(m._built, "setup(game) built the shell (headless, before add_child)")

	# Budget preview == game.farm_run_turn_budget(false) == 10 for the home zone.
	_check(m.preview_budget() == 10, "preview_budget() == 10 (game.farm_run_turn_budget(false))")

	# Default selection == every eligible home category, in declaration order.
	var eligible: Array = ZoneConfig.eligible_categories("home")
	_check(m.selected_categories() == eligible,
		"default selected_categories() == ZoneConfig.eligible_categories('home') (%s)" % str(eligible))
	# One toggle button registered per category.
	for c in eligible:
		_check(m._action_buttons.has("cat_" + String(c)), "registered a 'cat_%s' toggle" % String(c))

	# Now mount + open so the live render runs (affordable case).
	root.add_child(m)
	m.open()
	await process_frame
	_check(m.visible, "open() shows the modal")
	_check(m._action_buttons.has("start") and not m._action_buttons["start"].disabled,
		"coins == 50 (>= 50 cost) → Start button ENABLED")

	# Toggling a category off drops it from the selection.
	var first_cat: String = String(eligible[0])
	m._action_buttons["cat_" + first_cat].button_pressed = false
	await process_frame
	_check(not m.selected_categories().has(first_cat),
		"toggling '%s' off removes it from selected_categories()" % first_cat)
	# Re-select it so the Start emission carries the full set.
	m._action_buttons["cat_" + first_cat].button_pressed = true
	await process_frame
	_check(m.selected_categories().has(first_cat), "re-toggling '%s' on restores it" % first_cat)

	# Pressing Start emits start_requested(selected, false) then closes.
	var probe := {"fired": 0, "selected": [], "fert": null}
	m.start_requested.connect(func(sel: Array, fert: bool) -> void:
		probe.fired += 1
		probe.selected = sel
		probe.fert = fert)
	m._action_buttons["start"].emit_signal("pressed")
	await process_frame
	_check(probe.fired == 1, "Start fired start_requested exactly once")
	_check((probe.selected as Array).size() > 0, "start_requested carried a non-empty selection (%s)" % str(probe.selected))
	_check(probe.selected == eligible, "start_requested selection == all categories (none dropped)")
	_check(probe.fert == false, "start_requested use_fertilizer == false (NO-FAKE: no primitive)")
	_check(not m.visible, "Start closed the modal")
	m.queue_free()
	await process_frame

	# Unaffordable case: a fresh modal with coins < 50 → Start disabled.
	var poor := GameState.new()
	poor.coins = 49
	var m2 = StartFarmingModalScript.new()
	m2.setup(poor)
	root.add_child(m2)
	m2.open()
	await process_frame
	_check(m2._action_buttons["start"].disabled, "coins == 49 (< 50 cost) → Start button DISABLED")
	_check("Not enough coin" in m2._action_buttons["start"].text,
		"unaffordable Start label reads 'Not enough coin' (got '%s')" % m2._action_buttons["start"].text)
	m2.queue_free()
	await process_frame

# ── 2. TownMap.board_at_screen ─────────────────────────────────────────────────

func _test_board_at_screen() -> void:
	var town_map: Node2D = TownMapScript.new()
	root.add_child(town_map)
	# A plan WITH a farm board (board_kinds includes "farm").
	var plan := TownLayout.build_plan("home", 7, ["farm"])
	town_map.render_plan(plan, 720.0, 1280.0, [])
	await process_frame
	_check(town_map._scale > 0.0, "render_plan produced a positive scale")

	var farm_center: Vector2 = town_map.board_screen_center("farm")
	_check(farm_center.x != INF, "board_screen_center('farm') resolved a finite centre")
	_check(town_map.board_at_screen(farm_center) == "farm",
		"board_at_screen(centre of farm pad) == 'farm' (round-trips)")
	_check(town_map.board_at_screen(Vector2(-9999.0, -9999.0)) == "",
		"board_at_screen(far outside) == '' (no board hit)")
	town_map.queue_free()
	await process_frame

# ── 3. TownMapScreen.start_farming_requested ───────────────────────────────────

func _test_screen_signal() -> void:
	var game := GameState.new()
	game.settlement.tier = TownConfig.TIER_VILLAGE
	var screen := TownMapScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame

	var map = screen._map
	_check(map != null, "TownMapScreen exposes its TownMap node")
	var farm_center: Vector2 = map.board_screen_center("farm")
	_check(farm_center.x != INF, "the rendered plan has a farm board pad")
	_check(map.board_at_screen(farm_center) == "farm", "farm pad centre resolves to 'farm' on the live screen")

	var probe := {"fired": 0}
	screen.start_farming_requested.connect(func() -> void: probe.fired += 1)

	# Drive the tap-resolution path directly (mirrors how run_townmap_tests drives clicks).
	screen._resolve_lot_click(farm_center)
	await process_frame
	_check(probe.fired == 1, "tapping the farm pad fired start_farming_requested exactly once")
	# The farm-pad tap must NOT open a build/demolish panel — it's its own affordance.
	_check(not screen._action_buttons.has("demolish"), "farm-pad tap opened NO demolish (built-lot) panel")
	_check(not screen._action_buttons.has("picker_close"), "farm-pad tap opened NO build picker")

	screen.queue_free()
	await process_frame

# ── 4. Main wiring (Task C): start a run → live board; end a run → back to town ─────────────

## Drive the Task C Main orchestration through its handler methods (no real input events): a
## successful _on_start_farming makes the board LIVE with a run active and lands on the board
## (router NONE); a failed start surfaces no run; and _on_season_return ends the run, makes the
## board INERT again, and reopens the town home.
func _test_main_wiring() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Fresh headless launch → no run → the board is gated INERT (town-is-home; headless does NOT
	# auto-open town, so the board is rendered-but-inert).
	_check(not main.game.farm_run_active, "fresh launch: no farm run active")
	_check(not main.board.active, "fresh launch (no run): board is INERT")

	# A FAILED start (no coin) surfaces no run and leaves the board inert.
	main.game.coins = 0
	main._on_start_farming([], false)
	await process_frame
	_check(not main.game.farm_run_active, "start with 0 coins → no run started")
	_check(not main.board.active, "failed start leaves the board inert")

	# A SUCCESSFUL start → run active, board live, lands on the board (router NONE), picker closed.
	main.game.coins = 50
	main._on_start_farming(["trees"], false)
	await process_frame
	_check(main.game.farm_run_active, "successful start → farm_run_active")
	_check(main.board.active, "successful start → board is LIVE")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"successful start lands on the board (router NONE)")
	_check(main._startfarming_modal == null or not main._startfarming_modal.visible,
		"successful start closed the picker modal")
	_check(main.game.coins == 0, "successful start charged the 50-coin entry cost")

	# End the run via the run-end return path → close_season clears the run, board goes inert,
	# the town home reopens, and the +25 return bonus landed.
	var coins_before: int = main.game.coins
	main._on_season_return()
	await process_frame
	_check(not main.game.farm_run_active, "_on_season_return cleared the run")
	_check(not main.board.active, "_on_season_return made the board INERT (back to town)")
	_check(main.game.coins == coins_before + 25, "_on_season_return granted the +25 return bonus")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"_on_season_return reopened the town home (town map visible)")

	main.queue_free()
	await process_frame
	SaveManager.clear()

# ── 5. BUG C1: the expedition / boss input gate ────────────────────────────────

## A non-farm expedition (mine/harbor) and a boss fight are PLAYABLE board sessions even with
## NO farm run active — the board must be LIVE for them. Regression for BUG C1, where the gate
## only checked farm_run_active so entering the mine / starting a boss left the board INERT and
## the expedition/fight unplayable. Drives the REAL wiring: game.enter_mine() + main._on_town_changed()
## (exactly what the TownScreen state_changed / cartography travel path calls).
func _test_expedition_input_gate() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Fresh launch, no run → board INERT (the town-is-home baseline).
	_check(not main.game.farm_run_active, "C1 setup: fresh launch has no farm run")
	_check(not main.board.active, "C1: fresh launch (no run) → board INERT")

	# Enter the MINE the real way (City tier + supplies), then run the town-changed funnel.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory["supplies"] = 3
	var mine_res: Dictionary = main.game.enter_mine()
	_check(bool(mine_res.get("ok", false)), "C1 setup: enter_mine() succeeded at City + supplies")
	main._on_town_changed()
	await process_frame
	_check(main.game.is_in_mine(), "C1: is_in_mine() true after entering")
	_check(main.board.active, "C1: entering the mine (no run) makes the board LIVE")

	# Leave the mine the real way → back on the farm with no run → board INERT again.
	main.game.leave_mine()
	main._on_town_changed()
	await process_frame
	_check(not main.game.is_in_mine(), "C1: left the mine (back on the farm)")
	_check(not main.board.active, "C1: leaving the mine with no run makes the board INERT again")

	# BOSS: fought ON the farm board (active_biome stays 'farm'), so the gate must go live for it.
	# Meet the boss gate (City + 12 combined mine goods), start the fight, run the funnel.
	main.game.inventory["block"] = 12
	var boss_res: Dictionary = main.game.start_boss()
	_check(bool(boss_res.get("ok", false)), "C1 setup: start_boss() succeeded (City + 12 mine goods)")
	_check(main.game.is_boss_active(), "C1 setup: boss is active")
	_check(main.game.active_biome == "farm", "C1 setup: the boss is fought on the farm board")
	main._on_town_changed()
	await process_frame
	_check(main.board.active, "C1: a boss fight on the farm (no run) makes the board LIVE")

	main.queue_free()
	await process_frame
	SaveManager.clear()

# ── 6. BUG I1: dismissing the run-end modal completes the return (no exploit) ───

## The run-end "Harvest Complete" modal must complete the return-to-town (close_season → +25,
## run cleared, board inert) NO MATTER how it is dismissed — including a scrim-tap / ESC that
## fires only `closed` (NOT the "Return to Town" CTA's return_to_town). Regression for BUG I1,
## where a dismiss bypassed close_season, leaving the run live + the board active → unlimited
## re-harvest. Also confirms the CTA path grants exactly +25 once (no double-grant via the
## idempotent close_season guard).
func _test_run_end_dismiss() -> void:
	# ── 6a. DISMISS (not the CTA) still completes the return ──
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	main.game.coins = 50
	main._on_start_farming(["trees"], false)
	await process_frame
	_check(main.game.farm_run_active, "I1 setup: run started")
	_check(main.board.active, "I1 setup: board live during the run")

	# Park the run one farm turn short of its budget, then resolve ONE benign farm chain so the
	# NEXT note_farm_turn() crosses the boundary → the run ENDS and the run-end modal opens.
	main.game.farm_turns_used = main.game.farm_run_budget - 1
	main._on_chain_resolved(Constants.Tile.GRASS, 1)
	await process_frame
	_check(main.game.farm_run_active and main.game.farm_run_turns_left == 0,
		"I1: a chain at the budget ends the run (ended-but-unclosed: active && 0 turns left)")
	_check(not main.board.active, "I1: the board goes INERT the instant the run ends")
	_check(main._harvest_modal != null and main._harvest_modal.visible,
		"I1: the run-end HarvestModal opened")

	var coins_before: int = main.game.coins
	# DISMISS via the modal's own close() — the scrim/ESC path — NOT the Return-to-Town CTA.
	main._harvest_modal.close()
	await process_frame
	_check(not main.game.farm_run_active, "I1: a DISMISS completed the return (run cleared)")
	_check(main.game.farm_run_turns_left == 0, "I1: turns_left stays 0 after the return")
	_check(main.game.coins == coins_before + 25, "I1: a DISMISS granted the +25 close_season bonus")
	_check(not main.board.active, "I1: the board stays INERT after the dismiss-return")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"I1: the dismiss-return reopened the town home")

	main.queue_free()
	await process_frame
	SaveManager.clear()

	# ── 6b. CTA "Return to Town" grants EXACTLY +25 once (no double-grant) ──
	var main2 = packed.instantiate()
	root.add_child(main2)
	await process_frame
	main2.game.coins = 50
	main2._on_start_farming(["trees"], false)
	await process_frame
	main2.game.farm_turns_used = main2.game.farm_run_budget - 1
	main2._on_chain_resolved(Constants.Tile.GRASS, 1)
	await process_frame
	_check(main2._harvest_modal != null and main2._harvest_modal.visible,
		"I1 (CTA): the run-end modal opened")
	var coins_before2: int = main2.game.coins
	# Press the run-end CTA. It emits return_to_town (→ _on_season_return → close_season grants +25
	# and clears the run), THEN close() → closed → _on_harvest_closed sees the run already cleared
	# (farm_run_active == false) → hide only, NO second return. Net: exactly one +25.
	main2._harvest_modal._action_buttons["return_town"].emit_signal("pressed")
	await process_frame
	_check(not main2.game.farm_run_active, "I1 (CTA): the CTA cleared the run")
	_check(main2.game.coins == coins_before2 + 25,
		"I1 (CTA): the CTA granted EXACTLY +25 (no double-grant via idempotent close_season)")
	_check(not main2.board.active, "I1 (CTA): the board is INERT after the CTA return")

	main2.queue_free()
	await process_frame
	SaveManager.clear()

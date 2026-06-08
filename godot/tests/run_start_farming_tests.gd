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

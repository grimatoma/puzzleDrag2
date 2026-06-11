extends SceneTree
## Headless tests for the "leave the farming session" feature (the puzzle board's top-left
## "◀ Leave" back button + hidden bottom nav):
##   1. LeaveFarmModal — pure shell: setup/open/close, the confirmed/closed signals, and the
##      _action_buttons registry ("confirm"/"cancel").
##   2. Hud.set_board_mode — board mode HIDES the bottom nav + SHOWS the back button; town mode
##      is the reverse.
##   3. Main integration — the back button confirms leaving a live farm RUN and ENDS it with a
##      summary (run-end HarvestModal), via BOTH the "Return to Town" CTA and a scrim/ESC bypass.
##      Confirms the run is cleared (close_season) so the next farm visit starts fresh, and the
##      board chrome (nav / back button) tracks board state across the whole flow.
##   4. ViewRouter + Main — the LEAVEFARM modal enum + "leavefarm" deeplink shows the card.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_leave_farm_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const LeaveFarmModalScript := preload("res://scenes/LeaveFarmModal.gd")

var _checks: int = 0
var _failures: int = 0

# Signal counters for the leave-farm modal.
var _confirmed_count: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_confirmed() -> void:
	_confirmed_count += 1

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(modal, key: String) -> bool:
	var btn: Variant = modal._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

## Mark `game` as mid farm-run (no gating needed — we set the run fields directly so the test
## doesn't depend on tier / coins / founding).
func _arm_run(game: GameState, turns: int = 5) -> void:
	game.active_biome = "farm"
	game.farm_run_active = true
	game.farm_run_budget = turns
	game.farm_run_turns_left = turns

func _initialize() -> void:
	print("\n── Leave-farming-session tests (back button · hidden nav · end-with-summary) ──")
	_test_modal_pure()
	_test_set_board_mode()
	await _test_main_cta_path()
	await _test_main_bypass_path()
	await _test_deeplink()
	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. LeaveFarmModal — pure shell + signals ───────────────────────────────────

func _test_modal_pure() -> void:
	_confirmed_count = 0
	_closed_count = 0
	var modal = LeaveFarmModalScript.new()
	get_root().add_child(modal)
	modal.setup(GameState.new())
	modal.connect("confirmed", Callable(self, "_on_confirmed"))
	modal.connect("closed", Callable(self, "_on_closed"))

	_check(not modal.visible, "modal hidden until open()")
	_check(modal._action_buttons.has("confirm") and modal._action_buttons.has("cancel"),
		"_action_buttons registers 'confirm' + 'cancel'")
	_check(modal._title_label != null and modal._body_label != null,
		"title + body labels built")

	modal.open()
	_check(modal.visible, "open() shows the card")

	# Cancel → closed only (no confirm).
	_press(modal, "cancel")
	_check(_closed_count == 1 and _confirmed_count == 0, "Cancel emits closed only")
	_check(not modal.visible, "Cancel hides the card")

	# Confirm → confirmed THEN closed.
	modal.open()
	_press(modal, "confirm")
	_check(_confirmed_count == 1, "Confirm emits confirmed")
	_check(_closed_count == 2, "Confirm also emits closed (after confirmed)")

	modal.queue_free()

# ── 2. Hud.set_board_mode — nav hidden + back button shown on the board ─────────

func _test_set_board_mode() -> void:
	var hud = preload("res://scenes/Hud.gd").new()
	hud.game = GameState.new()
	get_root().add_child(hud)
	hud.build()

	# Defaults (town home): nav visible, back button hidden.
	_check(hud._back_btn != null, "Hud built the back button")
	_check(hud._nav_layer != null, "Hud built the bottom-nav layer")
	_check(not hud._back_btn.visible, "back button hidden by default (town home)")
	_check(hud._nav_layer.visible, "bottom nav visible by default (town home)")

	# Board mode: nav hidden, back button shown.
	hud.set_board_mode(true)
	_check(hud._back_btn.visible, "set_board_mode(true) shows the back button")
	_check(not hud._nav_layer.visible, "set_board_mode(true) hides the bottom nav")

	# Back to town: reverse.
	hud.set_board_mode(false)
	_check(not hud._back_btn.visible, "set_board_mode(false) hides the back button")
	_check(hud._nav_layer.visible, "set_board_mode(false) shows the bottom nav")

	hud.queue_free()

# ── 3a. Main — back button → confirm → "Return to Town" CTA ends the run ────────

func _test_main_cta_path() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	get_root().add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	# Put the player into a live farm run and sync the board chrome through the board deeplink.
	_arm_run(main.game, 5)
	main.apply_deeplink("board")
	_check(main._board_should_be_active(), "board is active during a farm run")
	_check(not main._hud._nav_layer.visible, "bottom nav HIDDEN on the board page")
	_check(main._hud._back_btn.visible, "back button SHOWN on the board page")

	# Tap the back button → the leave-farming confirm card.
	main._on_board_back()
	_check(main._leavefarm_modal != null and main._leavefarm_modal.visible,
		"_on_board_back() on a farm run shows the leave-farming confirm")
	_check(main._router.current_modal() == ViewRouter.Modal.LEAVEFARM,
		"_router.current_modal() == LEAVEFARM after the back button")
	_check(main.game.farm_run_active, "run still live while the confirm is showing")

	# Confirm → the run-end summary appears + the board goes inert; the run is NOT yet closed.
	_press(main._leavefarm_modal, "confirm")
	await process_frame
	_check(main._harvest_modal != null and main._harvest_modal.visible,
		"Confirm opens the run-end harvest summary")
	_check(main._harvest_modal.is_run_end(), "summary is in RUN-END mode")
	_check(not main.board.active, "board made inert the instant the summary shows")

	# The "Return to Town" CTA closes the season — the run clears + a fresh farm awaits.
	_press(main._harvest_modal, "return_town")
	await process_frame
	_check(not main.game.farm_run_active, "Return to Town closes the run (close_season)")
	_check(main.game.farm_run_turns_left == 0, "no run turns left after closing")
	_check(main.game.active_biome == "farm", "back on the farm home after the run ends")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"the town map is shown after the run ends")
	# Chrome returns to town mode.
	_check(main._hud._nav_layer.visible, "bottom nav restored after leaving the session")
	_check(not main._hud._back_btn.visible, "back button hidden after leaving the session")

	main.free()

# ── 3b. Main — a scrim/ESC bypass of the summary still closes the run ───────────

func _test_main_bypass_path() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	get_root().add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	# Live run with turns REMAINING (an EARLY leave — farm_run_turns_left > 0).
	_arm_run(main.game, 7)
	main.apply_deeplink("board")
	main._on_board_back()
	_press(main._leavefarm_modal, "confirm")
	await process_frame
	_check(main._harvest_modal.visible and main.game.farm_run_active,
		"early leave: summary up, run still live (turns remaining)")
	_check(main.game.farm_run_turns_left > 0, "early leave keeps turns_left > 0 until close")

	# Dismiss the summary by ANY means (scrim tap / ESC route through close()): the bypass in
	# _on_harvest_closed must still complete the return so close_season runs exactly once.
	main._harvest_modal.close()
	await process_frame
	_check(not main.game.farm_run_active, "bypass dismiss still closes the run (close_season)")
	_check(main.game.farm_run_turns_left == 0, "run fully cleared after the bypass dismiss")

	main.free()

# ── 4. ViewRouter + Main — the leavefarm deeplink shows the card ───────────────

func _test_deeplink() -> void:
	# Pure router round-trip.
	_check(bool(ViewRouter.resolve("leavefarm").get("ok", false)), "resolve('leavefarm') ok")
	_check(int(ViewRouter.resolve("leavefarm").get("modal", -1)) == ViewRouter.Modal.LEAVEFARM,
		"resolve('leavefarm') → Modal.LEAVEFARM")

	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	get_root().add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	var ok: bool = main.apply_deeplink("leavefarm")
	_check(ok, "apply_deeplink('leavefarm') returns true")
	_check(main._leavefarm_modal != null and main._leavefarm_modal.visible,
		"apply_deeplink('leavefarm') shows the confirm card")
	main.free()

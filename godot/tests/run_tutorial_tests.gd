extends SceneTree
## Headless tests for the tutorial onboarding modal:
##   TutorialConfig — 6 steps with correct titles/bodies
##   TutorialModal  — open/next/skip/finished/closed signals + _action_buttons
##   GameState      — tutorial_seen persisted in to_dict / from_dict
##   Main integration — auto-shows on fresh load; completed → tutorial_seen=true;
##                       apply_deeplink("tutorial") opens for replay; ViewRouter TUTORIAL modal.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_tutorial_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const TutorialModalScript := preload("res://scenes/TutorialModal.gd")

var _checks: int = 0
var _failures: int = 0

# Signal counters for the tutorial modal.
var _finished_count: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_finished() -> void:
	_finished_count += 1

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(modal, key: String) -> bool:
	var btn: Variant = modal._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Tutorial onboarding tests ───────────────────────")

	# ── 1. TutorialConfig data ────────────────────────────────────────────────
	_check(TutorialConfig.count() == 6, "TutorialConfig.count() == 6")
	_check(TutorialConfig.all().size() == 6, "TutorialConfig.all().size() == 6")

	var steps: Array = TutorialConfig.all()
	# Verify titles + bodies faithfully ported from the React source.
	_check(String(steps[0].get("title", "")) == "Welcome to Hearthwood Vale",
		"step 0 title == 'Welcome to Hearthwood Vale'")
	_check(String(steps[0].get("body", "")) != "",
		"step 0 body is non-empty")
	_check(String(steps[1].get("title", "")) == "Drag chains",
		"step 1 title == 'Drag chains'")
	_check(String(steps[2].get("title", "")) == "Upgrades ★",
		"step 2 title == 'Upgrades ★'")
	_check(String(steps[3].get("title", "")) == "Orders",
		"step 3 title == 'Orders'")
	_check(String(steps[4].get("title", "")) == "Town",
		"step 4 title == 'Town'")
	_check(String(steps[5].get("title", "")) == "You're ready",
		"step 5 title == 'You\\'re ready'")

	# Every step has a non-empty id, title, and body.
	var all_have_content := true
	for s in steps:
		if String(s.get("id", "")) == "" or String(s.get("title", "")) == "" or String(s.get("body", "")) == "":
			all_have_content = false
	_check(all_have_content, "all 6 steps have non-empty id + title + body")

	# ── 2. TutorialModal — basic open + action buttons ────────────────────────
	var game := GameState.new()
	var modal = TutorialModalScript.new()
	root.add_child(modal)
	modal.setup(game)
	modal.connect("finished", Callable(self, "_on_finished"))
	modal.connect("closed", Callable(self, "_on_closed"))

	_check(not modal.visible, "modal hidden before open()")
	modal.open()
	await process_frame

	_check(modal.visible, "modal visible after open()")
	_check(modal._action_buttons.has("next"), "_action_buttons has 'next'")
	_check(modal._action_buttons.has("skip"), "_action_buttons has 'skip'")

	# Step 0: title + body rendered correctly.
	_check(modal._title_label.text == String(steps[0].get("title", "")),
		"step 0 title rendered in _title_label")
	_check(modal._body_label.text == String(steps[0].get("body", "")),
		"step 0 body rendered in _body_label")
	_check(modal._indicator_label.text == "Step 1 / 6",
		"indicator reads 'Step 1 / 6' at step 0")
	# On step 0 (not the last step) the button reads "Next".
	_check(modal._next_btn.text == "Next",
		"next button text is 'Next' at step 0")

	# ── 3. Stepping Next through all steps ──────────────────────────────────
	# Steps 1–4: Next advances; not the last step → button stays "Next".
	for i in range(1, 5):
		_check(_press(modal, "next"), "pressed next at step %d → %d" % [i - 1, i])
		_check(modal._indicator_label.text == "Step %d / 6" % [i + 1],
			"indicator reads 'Step %d / 6' after %d advances" % [i + 1, i])

	# Now at step 5 (index 4, 0-based) — one more Next brings us to step 6 (index 5).
	_check(_press(modal, "next"), "pressed next to reach step 6")
	_check(modal._indicator_label.text == "Step 6 / 6",
		"indicator reads 'Step 6 / 6' at last step")
	_check(modal._next_btn.text == "Got it!",
		"next button text is 'Got it!' on last step")

	# Pressing "Got it!" on the last step emits finished + closed.
	var fin_before := _finished_count
	var clo_before := _closed_count
	_check(_press(modal, "next"), "pressed 'Got it!' on last step")
	_check(_finished_count == fin_before + 1, "finished signal fired once on completion")
	_check(_closed_count == clo_before + 1, "closed signal fired once on completion")
	_check(not modal.visible, "modal hidden after completion")

	# ── 4. Skip on step 1 ────────────────────────────────────────────────────
	# Reset signal counters; _on_finished/_on_closed are reused.
	_finished_count = 0
	_closed_count = 0
	var skip_modal = TutorialModalScript.new()
	root.add_child(skip_modal)
	skip_modal.setup(game)
	skip_modal.connect("finished", Callable(self, "_on_finished"))
	skip_modal.connect("closed", Callable(self, "_on_closed"))
	skip_modal.open()
	await process_frame

	# Advance once (step 0 → step 1), then Skip.
	_press(skip_modal, "next")
	_check(skip_modal._indicator_label.text == "Step 2 / 6",
		"indicator reads 'Step 2 / 6' after one advance")
	_check(_press(skip_modal, "skip"), "pressed skip at step 1")
	_check(_finished_count == 1, "finished signal fired once on skip")
	_check(_closed_count == 1, "closed signal fired once on skip")
	_check(not skip_modal.visible, "modal hidden after skip")

	# ── 5. GameState — tutorial_seen persisted in to_dict / from_dict ─────────
	var gs := GameState.new()
	_check(gs.tutorial_seen == false, "GameState.new() has tutorial_seen=false")

	# to_dict carries tutorial_seen.
	var d: Dictionary = gs.to_dict()
	_check(d.has("tutorial_seen"), "to_dict() carries 'tutorial_seen' key")
	_check(d["tutorial_seen"] == false, "to_dict() tutorial_seen is false for fresh state")

	# mark_tutorial_seen() flips the flag.
	gs.mark_tutorial_seen()
	_check(gs.tutorial_seen == true, "mark_tutorial_seen() sets tutorial_seen=true")

	# Round-trip: from_dict restores tutorial_seen=true.
	var d2: Dictionary = gs.to_dict()
	_check(d2["tutorial_seen"] == true, "to_dict() tutorial_seen=true after mark_tutorial_seen()")
	var gs2 := GameState.from_dict(d2)
	_check(gs2.tutorial_seen == true, "from_dict() restores tutorial_seen=true")

	# from_dict with missing key defaults to false (additive save compatibility).
	var d3: Dictionary = gs.to_dict()
	d3.erase("tutorial_seen")
	var gs3 := GameState.from_dict(d3)
	_check(gs3.tutorial_seen == false, "from_dict() with missing key defaults to false")

	# ── 6. ViewRouter — TUTORIAL modal (pure-state assertions) ───────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.TUTORIAL)
	_check(r.current_modal() == ViewRouter.Modal.TUTORIAL,
		"current_modal() == TUTORIAL after open_modal")
	_check(r.is_open(ViewRouter.Modal.TUTORIAL), "is_open(TUTORIAL) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_tut := ViewRouter.resolve("tutorial")
	_check(bool(d_tut.get("ok", false)), "resolve('tutorial') ok")
	_check(int(d_tut.get("modal", -1)) == ViewRouter.Modal.TUTORIAL,
		"resolve('tutorial') modal == TUTORIAL")
	_check(int(d_tut.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('tutorial') view == BOARD")
	_check(ViewRouter.modal_id(ViewRouter.Modal.TUTORIAL) == "tutorial",
		"modal_id(TUTORIAL) == 'tutorial'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("tutorial"), "known_ids() contains 'tutorial'")

	# ── 7. Main integration ──────────────────────────────────────────────────
	# Fresh game (tutorial_seen=false) — auto-shows the tutorial modal on load.
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame

	_check(main.has_method("_open_tutorial"), "Main has _open_tutorial()")
	_check(main.has_method("_on_tutorial_finished"), "Main has _on_tutorial_finished()")
	_check(main._tutorial_modal != null,
		"_ready (fresh game) lazily created _tutorial_modal")
	_check(main._tutorial_modal != null and main._tutorial_modal.visible,
		"tutorial modal visible on fresh load (tutorial_seen=false)")
	# Story modal must NOT be visible yet — tutorial shows first.
	_check(main._story_modal == null or not main._story_modal.visible,
		"story modal NOT visible while tutorial is showing")

	# Stepping Next through all 6 steps → finished → tutorial_seen=true + modal hidden.
	for _i in range(6):
		_press(main._tutorial_modal, "next")
	await process_frame

	_check(main.game.tutorial_seen == true,
		"game.tutorial_seen=true after stepping through all 6 steps")
	_check(main._tutorial_modal == null or not main._tutorial_modal.visible,
		"tutorial modal hidden after completing all steps")
	# Story queue drains now (story modal may now appear for act1_arrival).
	# We just assert the method ran without error — no strong assertion on story
	# modal visibility since it depends on the story beat queue.

	# Loaded game (tutorial_seen=true) — does NOT auto-show.
	main.game.tutorial_seen = false   # reset for the next sub-test
	main.game.mark_tutorial_seen()    # now true again via the proper helper
	SaveManager.save(main.game)

	var main2 = packed.instantiate()
	root.add_child(main2)
	await process_frame
	_check(main2._tutorial_modal == null or not main2._tutorial_modal.visible,
		"tutorial modal NOT shown on load when tutorial_seen=true")

	# apply_deeplink("tutorial") opens it (replay) regardless of tutorial_seen.
	var ok_tut: bool = main2.apply_deeplink("tutorial")
	_check(ok_tut, "apply_deeplink('tutorial') returns true")
	_check(main2._tutorial_modal != null and main2._tutorial_modal.visible,
		"apply_deeplink('tutorial') shows the modal (replay)")
	_check(main2._router.current_modal() == ViewRouter.Modal.TUTORIAL,
		"_router.current_modal() == TUTORIAL after apply_deeplink('tutorial')")

	# apply_deeplink("board") closes it; router resets to NONE.
	main2.apply_deeplink("board")
	_check(main2._tutorial_modal == null or not main2._tutorial_modal.visible,
		"tutorial modal hidden after apply_deeplink('board')")
	_check(main2._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# Skip on step 1 also finishes + marks seen.
	SaveManager.clear()
	var main3 = packed.instantiate()
	root.add_child(main3)
	await process_frame

	_check(main3._tutorial_modal != null and main3._tutorial_modal.visible,
		"tutorial modal visible for main3 (fresh game)")
	_press(main3._tutorial_modal, "next")   # advance once (step 0 → 1)
	_press(main3._tutorial_modal, "skip")   # skip from step 1
	await process_frame
	_check(main3.game.tutorial_seen == true,
		"game.tutorial_seen=true after skip on step 1")
	_check(main3._tutorial_modal == null or not main3._tutorial_modal.visible,
		"tutorial modal hidden after skip")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

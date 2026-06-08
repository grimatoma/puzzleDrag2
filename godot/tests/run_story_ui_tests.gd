extends SceneTree
## Headless tests for the STORY UI (scenes/StoryModal.gd + scenes/ChronicleScreen.gd +
## their wiring into scenes/Main.gd + the ViewRouter.CHRONICLE modal). The story LOGIC
## (engine / beats / flags / choices) is covered by run_story_tests.gd; this suite covers
## the beat MODAL (queue draining + continue/choice advance) and the chronicle TIMELINE
## over that logic. Layers:
##
##   1. StoryModal rendering — open_for(beat) sets the title + renders one row per line;
##      a no-choice beat registers "continue"; a choice beat registers "choice:<id>".
##   2. StoryModal advance — pressing "continue" pops the beat off game.story.beat_queue
##      and emits `advanced`; pressing a choice button calls game.resolve_story_choice
##      (asserted via the granted flag + coins) then advances.
##   3. ChronicleScreen — total_count() == StoryConfig.all_beats().size(), fired_count()
##      counts the fired markers, a fired beat renders a row, a fresh game shows the empty
##      state; ViewRouter CHRONICLE modal round-trips (resolve/modal_id/known_ids).
##   4. Main integration — _drain_story_queue() shows the modal for act1_arrival after
##      start_story_session; continue advances/hides; _open_chronicle() shows the screen +
##      lists a fired beat; apply_deeplink("chronicle") opens it + sets the router modal.
##
## Same dependency-free harness as run_achievements_view_tests.gd. Run from godot/:
##   godot --headless --script res://tests/run_story_ui_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const StoryModalScript := preload("res://scenes/StoryModal.gd")
const ChronicleScreenScript := preload("res://scenes/ChronicleScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _advanced_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_advanced() -> void:
	_advanced_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Story UI tests ─────────────────────────────────")

	# ── 1 + 2. StoryModal rendering + advance (no-choice continue) ─────────────
	# A GameState with the arrival beat fired + queued (the real session-start path), so
	# the modal presents act1_arrival exactly as Main would.
	var game := GameState.new()
	game.start_story_session()
	_check(game.story.beat_queue.size() >= 1, "session_start enqueued at least one beat")
	_check(game.story.beat_queue[0] == "act1_arrival", "front of queue is act1_arrival")

	var modal = StoryModalScript.new()
	root.add_child(modal)
	modal.setup(game)
	modal.connect("advanced", Callable(self, "_on_advanced"))
	modal.open_for("act1_arrival")
	await process_frame

	_check(modal.visible, "modal visible after open_for(act1_arrival)")
	_check(modal.current_beat_id() == "act1_arrival", "current_beat_id() == act1_arrival")
	# Title + lines render from StoryConfig.
	var arrival: Dictionary = StoryConfig.beat_by_id("act1_arrival")
	_check(modal._title_label.text == String(arrival.get("title", "")),
		"modal title == beat title ('%s')" % arrival.get("title", ""))
	var arrival_line_count: int = (arrival.get("lines", []) as Array).size()
	_check(modal._line_rows.size() == arrival_line_count,
		"modal rendered %d line rows (one per beat line)" % arrival_line_count)
	# A no-choice beat has a Continue button, no choice buttons.
	_check(modal._action_buttons.has("continue"), "no-choice beat registers 'continue'")
	var has_choice_btn := false
	for k in modal._action_buttons.keys():
		if String(k).begins_with("choice:"):
			has_choice_btn = true
	_check(not has_choice_btn, "no-choice beat registers no 'choice:*' buttons")

	# Pressing Continue advances: pops act1_arrival off the front + emits `advanced`.
	var before_adv := _advanced_count
	var q_before: int = game.story.beat_queue.size()
	_check(_press(modal, "continue"), "pressed continue button")
	_check(_advanced_count == before_adv + 1, "advanced signal fired once on continue")
	_check(not game.story.beat_queue.has("act1_arrival"),
		"act1_arrival dequeued from game.story.beat_queue after continue")
	_check(game.story.beat_queue.size() == q_before - 1, "queue shrank by one on continue")

	# ── 2b. StoryModal advance (a CHOICE beat) ────────────────────────────────
	# frostmaw_aftermath is the port's branching beat: no `when` (never auto-fires), queued
	# by the boss-defeat path. Enqueue it directly + present it; pressing the "break" choice
	# must call resolve_story_choice (assert via the granted flag + block grant).
	var choice_game := GameState.new()
	choice_game.story.beat_queue.append("frostmaw_aftermath")
	var aftermath: Dictionary = StoryConfig.beat_by_id("frostmaw_aftermath")
	var aftermath_choices: Array = aftermath.get("choices", [])
	_check(aftermath_choices.size() == 2, "frostmaw_aftermath has 2 choices (catalog sanity)")

	var choice_modal = StoryModalScript.new()
	root.add_child(choice_modal)
	choice_modal.setup(choice_game)
	choice_modal.connect("advanced", Callable(self, "_on_advanced"))
	choice_modal.open_for("frostmaw_aftermath")
	await process_frame

	# Each choice gets a "choice:<id>" button; no Continue.
	_check(choice_modal._action_buttons.has("choice:bind"), "choice beat registers 'choice:bind'")
	_check(choice_modal._action_buttons.has("choice:break"), "choice beat registers 'choice:break'")
	_check(not choice_modal._action_buttons.has("continue"), "choice beat registers no 'continue'")

	# Press "break": resolve_story_choice applies keeper_path_broken + grants 25 block.
	var block_before: int = choice_game.qty("block")
	var adv_before2 := _advanced_count
	_check(_press(choice_modal, "choice:break"), "pressed 'choice:break' button")
	_check(bool(choice_game.story.flags.get("keeper_path_broken", false)),
		"choice 'break' set keeper_path_broken flag (resolve_story_choice ran)")
	_check(bool(choice_game.story.flags.get("keeper_choice_made", false)),
		"choice 'break' set keeper_choice_made flag")
	_check(choice_game.qty("block") == block_before + 25,
		"choice 'break' granted +25 block (was %d, now %d)" % [block_before, choice_game.qty("block")])
	_check(_advanced_count == adv_before2 + 1, "advanced fired once after resolving a choice")
	_check(not choice_game.story.beat_queue.has("frostmaw_aftermath"),
		"frostmaw_aftermath dequeued after choice resolved")

	# ── 3. ChronicleScreen — helpers + rendering ──────────────────────────────
	# A GameState with a few beats marked fired so the timeline lists them grouped by act.
	var chron_game := GameState.new()
	# Mark three beats fired via the engine's fired-marker convention (what the live engine sets).
	for bid in ["act1_arrival", "act1_light_hearth", "act2_kitchen"]:
		chron_game.story.flags[StoryEngine.fired_key(bid)] = true

	var chronicle = ChronicleScreenScript.new()
	root.add_child(chronicle)
	chronicle.setup(chron_game)
	await process_frame
	chronicle.open()
	_check(chronicle.visible, "chronicle visible after open()")
	_check(chronicle._action_buttons.has("close"), "chronicle _action_buttons has 'close'")

	var total_beats: int = StoryConfig.all_beats().size()
	_check(chronicle.total_count() == total_beats,
		"chronicle total_count() == StoryConfig.all_beats().size() (%d)" % total_beats)
	_check(chronicle.fired_count() == 3, "chronicle fired_count() == 3")
	_check(chronicle.is_fired("act1_arrival"), "is_fired('act1_arrival') == true")
	_check(not chronicle.is_fired("act3_finish"), "is_fired('act3_finish') == false (unfired)")
	_check(chronicle._header_label.text == "3 / %d chapters" % total_beats,
		"chronicle header reads '3 / %d chapters'" % total_beats)
	# Each fired beat renders a timeline card row; an unfired beat does not.
	_check(chronicle._rows.has("act1_arrival"), "fired act1_arrival has a rendered card")
	_check(chronicle._rows.has("act2_kitchen"), "fired act2_kitchen has a rendered card")
	_check(not chronicle._rows.has("act3_finish"), "unfired act3_finish has no card")
	_check(chronicle._rows.size() == 3, "exactly 3 timeline cards rendered")

	# The "View Charter" button exists and emits `charter_view_requested` when pressed.
	_check(chronicle._action_buttons.has("charter"), "chronicle has a 'View Charter' button")
	var charter_emitted := [false]
	chronicle.connect("charter_view_requested", func(): charter_emitted[0] = true)
	chronicle._action_buttons["charter"].emit_signal("pressed")
	_check(charter_emitted[0], "'View Charter' button emits charter_view_requested")

	# A fresh, zero-fired GameState renders the empty state + "0 / N chapters".
	var fresh_game := GameState.new()
	var fresh_chron = ChronicleScreenScript.new()
	root.add_child(fresh_chron)
	fresh_chron.setup(fresh_game)
	await process_frame
	fresh_chron.open()
	_check(fresh_chron.fired_count() == 0, "fresh game: chronicle fired_count() == 0")
	_check(fresh_chron._rows.is_empty(), "fresh game: no timeline cards")
	_check(fresh_chron._empty_label.visible, "fresh game: empty-state label shown")
	_check(fresh_chron._header_label.text == "0 / %d chapters" % total_beats,
		"fresh game header reads '0 / %d chapters'" % total_beats)

	# ── 3b. ViewRouter — the CHRONICLE modal (pure-state assertions) ───────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.CHRONICLE)
	_check(r.current_modal() == ViewRouter.Modal.CHRONICLE,
		"current_modal() == CHRONICLE after open_modal")
	_check(r.is_open(ViewRouter.Modal.CHRONICLE), "is_open(CHRONICLE) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_chr := ViewRouter.resolve("chronicle")
	_check(bool(d_chr.get("ok", false)), "resolve('chronicle') ok")
	_check(int(d_chr.get("modal", -1)) == ViewRouter.Modal.CHRONICLE,
		"resolve('chronicle') modal == CHRONICLE")
	_check(int(d_chr.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('chronicle') view == BOARD")
	var d_story := ViewRouter.resolve("story")
	_check(bool(d_story.get("ok", false)), "resolve('story') ok (alias)")
	_check(int(d_story.get("modal", -1)) == ViewRouter.Modal.CHRONICLE,
		"resolve('story') modal == CHRONICLE")
	_check(ViewRouter.modal_id(ViewRouter.Modal.CHRONICLE) == "chronicle",
		"modal_id(CHRONICLE) == 'chronicle'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("chronicle"), "known_ids() contains 'chronicle'")
	_check(ids.has("story"), "known_ids() contains 'story'")

	# ── 4. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Tutorial onboarding now shows FIRST on a fresh game (tutorial_seen=false), and the
	# story queue is held back until it finishes. Mirror a real new player: skip the
	# tutorial, which fires _on_tutorial_finished → _drain_story_queue() and surfaces the
	# arrival beat. (A returning player with tutorial_seen=true drains immediately in _ready.)
	if main._tutorial_modal != null and main._tutorial_modal.visible:
		_press(main._tutorial_modal, "skip")
		await process_frame

	_check(main.has_method("_drain_story_queue"), "Main has _drain_story_queue()")
	_check(main.has_method("_open_chronicle"), "Main has _open_chronicle()")
	_check(main.has_method("_on_chronicle_closed"), "Main has _on_chronicle_closed()")
	_check(main.has_method("_on_chronicle_view_charter"), "Main has _on_chronicle_view_charter()")

	# _ready calls start_story_session(); after the tutorial is dismissed the queue drains,
	# so the beat modal should now be presenting act1_arrival (the front of the queue).
	_check(main._story_modal != null, "_ready drained the queue → story modal created")
	_check(main._story_modal != null and main._story_modal.visible, "story modal visible after _ready")
	_check(main._story_modal != null and main._story_modal.current_beat_id() == "act1_arrival",
		"story modal presents act1_arrival on load")

	# Pressing Continue advances: act1_arrival dequeues; the modal shows the next queued
	# beat or hides. (A brand-new save fires only act1_arrival, so the queue empties + hides.)
	var main_q_before: int = main.game.story.beat_queue.size()
	_check(_press(main._story_modal, "continue"), "pressed continue on the live modal")
	_check(not main.game.story.beat_queue.has("act1_arrival"),
		"act1_arrival dequeued from the live game after continue")
	if main.game.story.beat_queue.is_empty():
		_check(not main._story_modal.visible, "story modal hidden after the queue drained")
	else:
		_check(main._story_modal.visible,
			"story modal still visible showing the next queued beat (queue not empty)")
	_check(main.game.story.beat_queue.size() == main_q_before - 1, "live queue shrank by one")

	# _open_chronicle() lazily creates + shows the chronicle + sets the router modal. The
	# fresh save has act1_arrival fired (session_start) so the chronicle lists it.
	_check(main._chronicle_screen == null, "chronicle lazily created (null before open)")
	main._open_chronicle()
	_check(main._chronicle_screen != null, "_open_chronicle() lazily created the screen")
	_check(main._chronicle_screen.visible, "chronicle visible after _open_chronicle()")
	_check(main._router.current_modal() == ViewRouter.Modal.CHRONICLE,
		"_router.current_modal() == CHRONICLE after _open_chronicle()")
	_check(main._chronicle_screen.is_fired("act1_arrival"),
		"chronicle reports act1_arrival fired (session_start)")
	_check(main._chronicle_screen._rows.has("act1_arrival"),
		"chronicle lists the fired act1_arrival beat")
	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._chronicle_screen
	main._open_chronicle()
	_check(main._chronicle_screen == first_ref, "_open_chronicle() reuses the one screen")

	# apply_deeplink("chronicle") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_chr: bool = main.apply_deeplink("chronicle")
	_check(ok_chr, "apply_deeplink('chronicle') returns true")
	_check(main._chronicle_screen != null and main._chronicle_screen.visible,
		"apply_deeplink('chronicle') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.CHRONICLE,
		"_router.current_modal() == CHRONICLE after apply_deeplink('chronicle')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._chronicle_screen.visible, "chronicle hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

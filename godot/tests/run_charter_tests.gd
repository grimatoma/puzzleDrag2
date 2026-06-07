extends SceneTree
## Headless tests for the Charter feature ("The Hollow Pact"): the CharterConfig data +
## read-only derivation layer, the ViewRouter.CHARTER modal, the CharterScreen rendering
## (both tabs + the term detail overlay), and its wiring into scenes/Main.gd. The Charter
## is READ-ONLY — it never mutates GameState — so there is no economy path to test, only
## derivation correctness + the anti-dead-feature remap guard + the UI smoke. Layers:
##
##   1. CharterConfig catalog — 6 terms, each with non-empty id/roman/title/description;
##      all()/count()/term_by_id hit+miss.
##   2. REMAP GUARD (the anti-dead-feature check) — every remapped related_beat exists in
##      StoryConfig (has_beat) and every honored/violation flag exists (has_flag). Proves
##      the terms can actually resolve against the Godot arc.
##   3. derive_term_state truth table (React precedence: violation→honored→pending).
##   4. term_related_entries / term_caption / format_choice_entry.
##   5. ViewRouter — the new CHARTER modal: open/current/resolve/modal_id/known_ids.
##   6. CharterScreen rendering — both tabs build without error; the detail overlay opens;
##      a story state with a couple flags + a choice_log row shows a non-pending pill +
##      a timeline entry.
##   7. Main integration — _open_charter() lazily creates+reuses the screen + sets the
##      router; apply_deeplink("charter") shows it; apply_deeplink("board") hides it +
##      resets the router to NONE; the close handler does NOT save (read-only).
##
## Same dependency-free harness as run_portal_tests.gd. Run from the godot/ project root:
##   godot --headless --script res://tests/run_charter_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const CharterScreenScript := preload("res://scenes/CharterScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Charter tests ──────────────────────────────────")

	# ── 1. CharterConfig catalog ────────────────────────────────────────────────────
	_check(CharterConfig.all().size() == 6, "CharterConfig.all() has 6 terms")
	_check(CharterConfig.count() == 6, "CharterConfig.count() == 6")
	_check(CharterConfig.PACT_TERMS.size() == 6, "PACT_TERMS has 6 terms")

	for term in CharterConfig.all():
		var id: String = String(term.get("id", ""))
		_check(id != "", "term has non-empty id")
		_check(String(term.get("roman", "")) != "", "term '%s' has non-empty roman" % id)
		_check(String(term.get("title", "")) != "", "term '%s' has non-empty title" % id)
		_check(String(term.get("description", "")) != "", "term '%s' has non-empty description" % id)

	# Stable ids carried from React PACT_TERMS.
	for tid in ["found_first", "audit_embers", "three_names", "no_empty_hearths", "drive_out_bite", "capital_last"]:
		_check(not CharterConfig.term_by_id(tid).is_empty(), "term_by_id('%s') hits" % tid)
	_check(CharterConfig.term_by_id("bogus").is_empty(), "term_by_id('bogus') == {} (miss)")

	# Roman numerals + verbatim narrative spot-checks.
	_check(String(CharterConfig.term_by_id("found_first").get("roman")) == "I", "found_first roman == I")
	_check(String(CharterConfig.term_by_id("capital_last").get("roman")) == "VI", "capital_last roman == VI")
	_check(String(CharterConfig.term_by_id("drive_out_bite").get("title")) == "Drive out only what bites",
		"drive_out_bite title verbatim")
	_check(String(CharterConfig.term_by_id("found_first").get("description")).begins_with("Every settlement is founded"),
		"found_first description verbatim (React text)")

	# ── 2. REMAP GUARD — every remapped beat/flag id EXISTS in the Godot story arc ────
	# This is the anti-dead-feature check: it proves the remap targets REAL StoryConfig ids,
	# so each term can actually resolve against live story state (no dead/fake terms).
	for term in CharterConfig.all():
		var tid: String = String(term.get("id", ""))
		for b in term.get("related_beats", []):
			_check(StoryConfig.has_beat(String(b)), "term '%s' related beat '%s' exists in StoryConfig" % [tid, String(b)])
		for f in term.get("honored_flags", []):
			_check(StoryConfig.has_flag(String(f)), "term '%s' honored flag '%s' exists in StoryConfig" % [tid, String(f)])
		for f in term.get("violation_flags", []):
			_check(StoryConfig.has_flag(String(f)), "term '%s' violation flag '%s' exists in StoryConfig" % [tid, String(f)])

	# ── 3. derive_term_state truth table (React precedence) ──────────────────────────
	var t_found := CharterConfig.term_by_id("found_first")
	var t_hearth := CharterConfig.term_by_id("no_empty_hearths")
	var t_keeper := CharterConfig.term_by_id("drive_out_bite")
	var t_capital := CharterConfig.term_by_id("capital_last")

	# Empty log + empty flags → every term pending.
	for term in CharterConfig.all():
		_check(CharterConfig.derive_term_state(term as Dictionary, [], {}) == "pending",
			"term '%s' pending with empty log+flags" % String((term as Dictionary).get("id", "")))

	# keeper_path_broken → term V VIOLATED.
	_check(CharterConfig.derive_term_state(t_keeper, [], {"keeper_path_broken": true}) == "violated",
		"term V violated when keeper_path_broken set")
	# keeper_path_bound (and not broken) → term V HONORED.
	_check(CharterConfig.derive_term_state(t_keeper, [], {"keeper_path_bound": true}) == "honored",
		"term V honored when keeper_path_bound set")

	# A related-beat row → honored via the entry path (no flag needed).
	var hearth_row: Array = [{"beat_id": "act1_light_hearth", "choice_id": "x"}]
	_check(CharterConfig.derive_term_state(t_hearth, hearth_row, {}) == "honored",
		"term IV honored when an act1_light_hearth row exists (related entry)")
	_check(CharterConfig.derive_term_state(t_found, hearth_row, {}) == "honored",
		"term I honored when an act1_light_hearth row exists (act1_light_hearth ∈ both terms)")

	# settlement_lives flag → term VI honored.
	_check(CharterConfig.derive_term_state(t_capital, [], {"settlement_lives": true}) == "honored",
		"term VI honored when settlement_lives set")

	# Violation precedence: BOTH a related entry AND a violation flag on term V → violated wins.
	var keeper_row: Array = [{"beat_id": "frostmaw_aftermath", "choice_id": "break"}]
	_check(CharterConfig.derive_term_state(t_keeper, keeper_row, {"keeper_path_broken": true}) == "violated",
		"term V: violation flag beats a related entry (precedence)")
	# And honored flag + violation flag together → violated still wins.
	_check(CharterConfig.derive_term_state(t_keeper, [], {"keeper_path_bound": true, "keeper_path_broken": true}) == "violated",
		"term V: violation flag beats honored flag (precedence)")

	# ── 4. term_related_entries / term_caption / format_choice_entry ─────────────────
	# Only matching beat_ids are returned (an unrelated row is excluded).
	var mixed_log: Array = [
		{"beat_id": "act1_light_hearth", "choice_id": "a"},
		{"beat_id": "act3_finish", "choice_id": "b"},          # unrelated to term IV
		{"beat_id": "act1_first_order", "choice_id": "c"},
	]
	var rel := CharterConfig.term_related_entries(t_hearth, mixed_log)
	_check(rel.size() == 2, "term IV related_entries returns 2 (light_hearth + first_order, not act3_finish)")
	for e in rel:
		_check(["act1_light_hearth", "act1_first_order"].has(String((e as Dictionary).get("beat_id", ""))),
			"related entry beat_id is one of term IV's related beats")

	# Captions — wording incl. singular/plural.
	_check(CharterConfig.term_caption(t_found, [], {}) == "Awaiting your hand",
		"pending caption == 'Awaiting your hand'")
	# 1 honored choice → singular "choice".
	_check(CharterConfig.term_caption(t_found, [{"beat_id": "act1_arrival", "choice_id": "x"}], {}) == "Honored across 1 choice",
		"honored caption singular: 'Honored across 1 choice'")
	# 2 honored choices → plural "choices".
	var two_found: Array = [{"beat_id": "act1_arrival", "choice_id": "x"}, {"beat_id": "act1_light_hearth", "choice_id": "y"}]
	_check(CharterConfig.term_caption(t_found, two_found, {}) == "Honored across 2 choices",
		"honored caption plural: 'Honored across 2 choices'")
	# Honored by FLAG only (no entries) → count floors at 1 ("|| 1").
	_check(CharterConfig.term_caption(t_capital, [], {"settlement_lives": true}) == "Honored across 1 choice",
		"honored-by-flag caption floors count at 1")
	# Violated by flag only (no entries) → "1 recorded mark" (singular, floored).
	_check(CharterConfig.term_caption(t_keeper, [], {"keeper_path_broken": true}) == "Violated — 1 recorded mark",
		"violated-by-flag caption: 'Violated — 1 recorded mark' (singular, floored)")
	# Violated with 1 related entry → still singular "mark".
	_check(CharterConfig.term_caption(t_keeper, keeper_row, {"keeper_path_broken": true}) == "Violated — 1 recorded mark",
		"violated caption singular with 1 entry")

	# format_choice_entry — a known beat resolves title + act.
	var fa := CharterConfig.format_choice_entry({"beat_id": "act1_arrival", "choice_id": "z"})
	_check(String(fa.get("title", "")) == "A Cold Hearth", "format_choice_entry('act1_arrival').title == 'A Cold Hearth'")
	_check(int(fa.get("act", -1)) == 1, "format_choice_entry('act1_arrival').act == 1")
	# A beat with choices (keeper) resolves the choice LABEL from the choices array.
	var fk := CharterConfig.format_choice_entry({"beat_id": "frostmaw_aftermath", "choice_id": "bind"})
	_check(String(fk.get("choice_label", "")) == "Let it stay. The hearth can share its warmth.",
		"format_choice_entry resolves the keeper 'bind' choice label")
	_check(int(fk.get("act", -1)) == 2, "frostmaw_aftermath act == 2")
	# An unknown beat falls back to the raw ids + act 0 (the "no act" sentinel).
	var fu := CharterConfig.format_choice_entry({"beat_id": "nope_beat", "choice_id": "q"})
	_check(String(fu.get("title", "")) == "nope_beat", "unknown beat → title falls back to raw beat_id")
	_check(String(fu.get("choice_label", "")) == "q", "unknown beat → choice_label falls back to raw choice_id")
	_check(int(fu.get("act", -1)) == 0, "unknown beat → act == 0 (no-act sentinel)")
	# A known beat with an UNKNOWN choice_id falls back to the raw choice_id for the label.
	var fkx := CharterConfig.format_choice_entry({"beat_id": "frostmaw_aftermath", "choice_id": "ghost"})
	_check(String(fkx.get("choice_label", "")) == "ghost", "known beat + unknown choice → raw choice_id label")

	# ── 5. ViewRouter — CHARTER modal (pure-state assertions) ────────────────────────
	var rt := ViewRouter.new()
	rt.open_modal(ViewRouter.Modal.CHARTER)
	_check(rt.current_modal() == ViewRouter.Modal.CHARTER, "current_modal() == CHARTER after open_modal")
	_check(rt.is_open(ViewRouter.Modal.CHARTER), "is_open(CHARTER) == true")
	rt.close_modal()
	_check(rt.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_charter := ViewRouter.resolve("charter")
	_check(bool(d_charter.get("ok", false)), "resolve('charter') ok")
	_check(int(d_charter.get("modal", -1)) == ViewRouter.Modal.CHARTER, "resolve('charter') modal == CHARTER")
	_check(int(d_charter.get("view", -1)) == ViewRouter.View.BOARD, "resolve('charter') view == BOARD")

	var d_alias := ViewRouter.resolve("pact")
	_check(bool(d_alias.get("ok", false)), "resolve('pact') ok (alias)")
	_check(int(d_alias.get("modal", -1)) == ViewRouter.Modal.CHARTER, "resolve('pact') modal == CHARTER")

	_check(ViewRouter.modal_id(ViewRouter.Modal.CHARTER) == "charter", "modal_id(CHARTER) == 'charter'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("charter"), "known_ids() contains 'charter'")
	_check(ids.has("pact"), "known_ids() contains 'pact'")

	# ── 6. CharterScreen rendering — both tabs + detail overlay ──────────────────────
	# A story state with a couple flags + a keeper-choice row so the Terms tab shows a
	# non-pending pill and the timeline has an entry.
	var sg := GameState.new()
	sg.turn = 7
	sg.story.flags = {"intro_seen": true, "hearth_lit": true, "keeper_path_bound": true, "settlement_lives": true}
	sg.story.choice_log = [
		{"beat_id": "frostmaw_aftermath", "choice_id": "bind"},
		{"beat_id": "act1_arrival", "choice_id": "name"},
	]

	var screen = CharterScreenScript.new()
	root.add_child(screen)
	screen.setup(sg)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "charter screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.total_count() == 6, "screen.total_count() == 6")
	_check(screen._tab_buttons.has("terms") and screen._tab_buttons.has("all"), "both tab buttons present")

	# Default tab = Terms: 6 cards + their openers rendered; ribbon shows '7 turns elapsed'.
	_check(screen._tab == "terms", "default tab is 'terms'")
	_check(screen._cards.size() == 6, "Terms tab: 6 term cards rendered")
	for tid in ["found_first", "audit_embers", "three_names", "no_empty_hearths", "drive_out_bite", "capital_last"]:
		_check(screen._cards.has(tid), "card rendered for term '%s'" % tid)
		_check(screen._card_buttons.has(tid), "card opener button for term '%s'" % tid)
	_check(screen._ribbon_turns != null and screen._ribbon_turns.text == "7 turns elapsed",
		"ribbon shows '7 turns elapsed'")

	# Open term V's detail panel via its card opener; the detail overlay shows + has a close.
	screen._card_buttons["drive_out_bite"].emit_signal("pressed")
	_check(screen._open_term_id == "drive_out_bite", "opening term V sets _open_term_id")
	_check(screen._detail_panel != null and screen._detail_panel.visible, "term detail overlay visible after open")
	_check(screen._action_buttons.has("detail_close"), "detail overlay has a close button")
	# term V is HONORED here (keeper_path_bound) — its derived state is non-pending.
	_check(CharterConfig.derive_term_state(CharterConfig.term_by_id("drive_out_bite"), sg.story.choice_log, sg.story.flags) == "honored",
		"term V derives 'honored' (keeper_path_bound) in this state")
	# Close the detail overlay.
	_check(_press(screen, "detail_close"), "pressed detail close")
	_check(screen._open_term_id == "", "detail close clears _open_term_id")
	_check(not screen._detail_panel.visible, "detail overlay hidden after close")

	# Switch to the All-choices tab: the timeline rebuilds with our 2 rows (no crash).
	screen._tab_buttons["all"].emit_signal("pressed")
	_check(screen._tab == "all", "tab switched to 'all'")
	_check(screen._cards.is_empty(), "All-choices tab: no term cards")
	# The body should hold 2 timeline rows for the 2 choice_log entries.
	_check(screen._body.get_child_count() == 2, "All-choices tab: 2 timeline rows for 2 choice_log entries")

	# Empty-log state: a fresh game on the All tab shows the empty-state line (1 child).
	var eg := GameState.new()
	var escreen = CharterScreenScript.new()
	root.add_child(escreen)
	escreen.setup(eg)
	await process_frame
	escreen._tab_buttons["all"].emit_signal("pressed")
	_check(escreen._body.get_child_count() == 1, "empty choice_log → All tab shows a single empty-state line")
	# And on Terms tab, every term is pending (fresh state).
	escreen._tab_buttons["terms"].emit_signal("pressed")
	for term in CharterConfig.all():
		_check(CharterConfig.derive_term_state(term as Dictionary, eg.story.choice_log, eg.story.flags) == "pending",
			"fresh game: term '%s' pending" % String((term as Dictionary).get("id", "")))

	# Close fires `closed` + hides.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "charter screen hidden after close")

	# ── 7. Main integration ──────────────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame

	_check(main.has_method("_open_charter"), "Main has _open_charter()")
	_check(main.has_method("_on_charter_closed"), "Main has _on_charter_closed()")
	_check(main._charter_screen == null, "charter screen lazily created (null before open)")

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_charter()
	_check(main._charter_screen != null, "_open_charter() lazily created the screen")
	_check(main._charter_screen.visible, "charter screen visible after _open_charter()")
	_check(main._router.current_modal() == ViewRouter.Modal.CHARTER,
		"_router.current_modal() == CHARTER after _open_charter()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._charter_screen
	main._open_charter()
	_check(main._charter_screen == first_ref, "_open_charter() reuses the one screen")

	# apply_deeplink("charter") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first for a clean modal state
	var ok_charter: bool = main.apply_deeplink("charter")
	_check(ok_charter, "apply_deeplink('charter') returns true")
	_check(main._charter_screen != null and main._charter_screen.visible,
		"apply_deeplink('charter') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.CHARTER,
		"_router.current_modal() == CHARTER after apply_deeplink('charter')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._charter_screen.visible, "charter screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# READ-ONLY proof: opening + closing the Charter never changes the game economy.
	var coins_before: int = int(main.game.coins)
	var inv_before: Dictionary = main.game.inventory.duplicate(true)
	main._open_charter()
	main._on_charter_closed()
	_check(int(main.game.coins) == coins_before, "Charter open/close leaves coins unchanged (read-only)")
	_check(main.game.inventory == inv_before, "Charter open/close leaves inventory unchanged (read-only)")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

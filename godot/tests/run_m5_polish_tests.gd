extends SceneTree
## Headless tests for the M5 UI-polish trio:
##   1. LeaveBoardModal — only ARMS in an expedition (no-op on the farm); Confirm calls
##      game.leave_mine()/leave_harbor(); Cancel leaves the expedition intact; the biome-
##      specific prompt strings; the confirmed/closed signals + _action_buttons registry.
##   2. Toast — the show/dismiss helper builds, shows synchronously, replaces, and dismisses.
##   3. InventoryScreen search — the pure matches_query() filter, the live _on_search_changed
##      re-render, the "No items match '<q>'" empty-state, and the empty-stockpile state.
##   4. ViewRouter + Main integration — LEAVEBOARD modal enum + "leaveboard"/"leave" deeplink;
##      apply_deeplink("leaveboard") shows the card; apply_deeplink("toast") shows a toast.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_m5_polish_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const LeaveBoardModalScript := preload("res://scenes/LeaveBoardModal.gd")
const ToastScript := preload("res://scenes/Toast.gd")

var _checks: int = 0
var _failures: int = 0

# Signal counters for the leave-board modal.
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

## A GameState placed on a mine expedition with `turns` turns left (no gating needed —
## we set the biome directly so the test doesn't depend on tier/supplies).
func _mine_state(turns: int = 4) -> GameState:
	var g := GameState.new()
	g.active_biome = "mine"
	g.mine_turns_left = turns
	return g

## A GameState placed on a harbor expedition with `turns` turns left.
func _harbor_state(turns: int = 4) -> GameState:
	var g := GameState.new()
	g.active_biome = "harbor"
	g.harbor_turns_left = turns
	return g

func _initialize() -> void:
	print("\n── M5 polish tests (leave-board · toast · inventory search) ───────────")

	_test_leaveboard_prompts()
	_test_leaveboard_modal()
	_test_toast()
	_test_inventory_search_pure()
	_test_inventory_search_ui()
	_test_router()
	await _test_main_integration()

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1a. LeaveBoardModal — pure prompt strings ──────────────────────────────────

func _test_leaveboard_prompts() -> void:
	_check(LeaveBoardModalScript.prompt_title("mine") == "Leave the mine?",
		"prompt_title('mine') == 'Leave the mine?'")
	_check(LeaveBoardModalScript.prompt_title("harbor") == "Leave the harbor?",
		"prompt_title('harbor') == 'Leave the harbor?'")
	_check(LeaveBoardModalScript.prompt_title("") == "Leave the expedition?",
		"prompt_title('') falls back to 'Leave the expedition?'")
	_check(LeaveBoardModalScript.prompt_body("mine").find("the mine") != -1,
		"prompt_body('mine') mentions 'the mine'")
	_check(LeaveBoardModalScript.prompt_body("harbor").find("the harbor") != -1,
		"prompt_body('harbor') mentions 'the harbor'")
	_check(LeaveBoardModalScript.prompt_body("mine").find("stays in your stores") != -1,
		"prompt_body reassures unbanked progress stays in your stores")

# ── 1b. LeaveBoardModal — arm gating + confirm/cancel ──────────────────────────

func _test_leaveboard_modal() -> void:
	# (a) On the FARM, arm() is a no-op (returns false, stays hidden).
	var farm := GameState.new()
	var m_farm = LeaveBoardModalScript.new()
	root.add_child(m_farm)
	m_farm.setup(farm)
	_check(not m_farm.visible, "modal hidden before arm()")
	_check(m_farm.arm() == false, "arm() returns false on the farm (no-op)")
	_check(not m_farm.visible, "modal stays hidden after arm() on the farm")
	_check(m_farm.armed_biome() == "", "armed_biome() == '' on the farm")

	# (b) In the MINE, arm() shows the card with the mine prompt.
	var mine := _mine_state(4)
	var m = LeaveBoardModalScript.new()
	root.add_child(m)
	m.setup(mine)
	m.connect("confirmed", Callable(self, "_on_confirmed"))
	m.connect("closed", Callable(self, "_on_closed"))
	_check(m.arm() == true, "arm() returns true in the mine")
	_check(m.visible, "modal visible after arm() in the mine")
	_check(m.armed_biome() == "mine", "armed_biome() == 'mine'")
	_check(m._action_buttons.has("confirm"), "_action_buttons has 'confirm'")
	_check(m._action_buttons.has("cancel"), "_action_buttons has 'cancel'")
	_check(m._title_label.text == "Leave the mine?", "title renders 'Leave the mine?'")
	_check(m._body_label.text.find("the mine") != -1, "body mentions the mine")

	# (c) CANCEL keeps the expedition; emits closed only, no confirmed.
	var conf_before := _confirmed_count
	var clo_before := _closed_count
	_check(_press(m, "cancel"), "pressed cancel")
	_check(_confirmed_count == conf_before, "cancel does NOT emit confirmed")
	_check(_closed_count == clo_before + 1, "cancel emits closed once")
	_check(not m.visible, "modal hidden after cancel")
	_check(mine.is_in_mine(), "still in the mine after cancel (nothing left)")

	# (d) CONFIRM in the mine calls leave_mine() → back on the farm; confirmed + closed.
	_check(m.arm() == true, "re-arm() in the mine returns true")
	conf_before = _confirmed_count
	clo_before = _closed_count
	_check(_press(m, "confirm"), "pressed confirm")
	_check(_confirmed_count == conf_before + 1, "confirm emits confirmed once")
	_check(_closed_count == clo_before + 1, "confirm emits closed once")
	_check(not m.visible, "modal hidden after confirm")
	_check(not mine.is_in_mine(), "leave_mine() ran — no longer in the mine")
	_check(mine.active_biome == "farm", "active_biome back to 'farm' after confirm")
	_check(mine.mine_turns_left == 0, "mine_turns_left dropped to 0 after leaving")

	# (e) CONFIRM in the HARBOR calls leave_harbor().
	var harbor := _harbor_state(3)
	var mh = LeaveBoardModalScript.new()
	root.add_child(mh)
	mh.setup(harbor)
	_check(mh.arm() == true, "arm() returns true in the harbor")
	_check(mh.armed_biome() == "harbor", "armed_biome() == 'harbor'")
	_check(mh._title_label.text == "Leave the harbor?", "title renders 'Leave the harbor?'")
	_check(_press(mh, "confirm"), "pressed confirm in the harbor")
	_check(not harbor.is_in_harbor(), "leave_harbor() ran — no longer in the harbor")
	_check(harbor.active_biome == "farm", "active_biome back to 'farm' after harbor confirm")

	# (f) preview() shows the card regardless of biome (QA/deeplink path).
	var pv = LeaveBoardModalScript.new()
	root.add_child(pv)
	pv.setup(GameState.new())   # on the farm
	pv.preview("mine")
	_check(pv.visible, "preview('mine') shows the card even on the farm")
	_check(pv.armed_biome() == "mine", "preview('mine') arms biome 'mine'")
	pv.close()
	_check(not pv.visible, "close() hides the previewed card")

# ── 2. Toast helper ────────────────────────────────────────────────────────────

func _test_toast() -> void:
	var t = ToastScript.new()
	root.add_child(t)
	t.setup()
	_check(not t.is_showing(), "toast hidden before show_toast()")
	_check(t.current_text() == "", "toast text empty before show_toast()")

	t.show_toast("Order filled! +18")
	_check(t.is_showing(), "toast visible synchronously after show_toast()")
	_check(t.current_text() == "Order filled! +18", "toast text set to the message")

	# A second show REPLACES the message (latest wins).
	t.show_toast("Returned to the farm")
	_check(t.current_text() == "Returned to the farm", "second show_toast replaces the text")
	_check(t.is_showing(), "toast still visible after replace")

	# A blank message is ignored (no phantom empty bubble).
	t.show_toast("   ")
	_check(t.current_text() == "Returned to the farm", "blank show_toast is ignored (text unchanged)")

	# dismiss() hides it immediately.
	t.dismiss()
	_check(not t.is_showing(), "dismiss() hides the toast immediately")

# ── 3a. InventoryScreen search — pure matches_query() ──────────────────────────

func _test_inventory_search_pure() -> void:
	const INV := preload("res://scenes/InventoryScreen.gd")
	# Empty / blank query matches everything.
	_check(INV.matches_query("flour", ""), "empty query matches 'flour'")
	_check(INV.matches_query("flour", "   "), "blank query matches 'flour'")
	# Case-insensitive substring.
	_check(INV.matches_query("flour", "flo"), "'flo' matches 'flour'")
	_check(INV.matches_query("flour", "OUR"), "'OUR' (upper) matches 'flour' (case-insensitive)")
	_check(INV.matches_query("iron_bar", "bar"), "'bar' matches 'iron_bar'")
	_check(INV.matches_query("iron_bar", "iron"), "'iron' matches 'iron_bar'")
	# Non-matches.
	_check(not INV.matches_query("flour", "xyz"), "'xyz' does NOT match 'flour'")
	_check(not INV.matches_query("bread", "flour"), "'flour' does NOT match 'bread'")

# ── 3b. InventoryScreen search — live UI re-render + empty-state ────────────────

func _test_inventory_search_ui() -> void:
	const INV := preload("res://scenes/InventoryScreen.gd")
	var g := GameState.new()
	g.inventory = {"flour": 4, "bread": 2, "block": 3}
	var screen = INV.new()
	root.add_child(screen)
	screen.setup(g)

	# Search field exists + starts empty (full ledger).
	_check(screen._search_field != null, "search LineEdit was built")
	_check(screen._query == "", "query starts empty")
	# With no query, the body has content (group sections + footer), no empty line.
	var body_children_full: int = screen._body.get_child_count()
	_check(body_children_full > 0, "ledger body populated with no query")

	# Type "flo" → only flour matches; no empty-state line.
	screen._on_search_changed("flo")
	_check(screen._query == "flo", "query updated to 'flo'")
	var has_no_match := _body_has_text(screen, "No items match")
	_check(not has_no_match, "'flo' matches flour → NO empty-state line")

	# Type a non-matching query → the "No items match '<q>'" empty-state shows.
	screen._on_search_changed("zzz")
	_check(_body_has_text(screen, "No items match 'zzz'"),
		"non-matching query shows \"No items match 'zzz'\"")

	# Clear the query → full ledger restored, no empty line.
	screen._on_search_changed("")
	_check(screen._query == "", "query cleared")
	_check(not _body_has_text(screen, "No items match"),
		"cleared query restores the full ledger (no empty-state)")

	# An empty stockpile shows the empty-stockpile line, NOT the no-match line.
	var empty_g := GameState.new()
	empty_g.inventory = {}
	var empty_screen = INV.new()
	root.add_child(empty_screen)
	empty_screen.setup(empty_g)
	_check(_body_has_text(empty_screen, "stockpile is empty"),
		"empty stockpile shows the 'stockpile is empty' line")
	empty_screen._on_search_changed("flour")
	_check(_body_has_text(empty_screen, "stockpile is empty"),
		"empty stockpile + a query still shows the empty-stockpile line (not no-match)")

## True when any Label under the screen's body VBox contains `needle` as a substring.
func _body_has_text(screen, needle: String) -> bool:
	for child in screen._body.get_children():
		if child is Label and String(child.text).find(needle) != -1:
			return true
	return false

# ── 4a. ViewRouter — LEAVEBOARD modal + deeplink ───────────────────────────────

func _test_router() -> void:
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.LEAVEBOARD)
	_check(r.current_modal() == ViewRouter.Modal.LEAVEBOARD,
		"current_modal() == LEAVEBOARD after open_modal")
	_check(r.is_open(ViewRouter.Modal.LEAVEBOARD), "is_open(LEAVEBOARD) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d := ViewRouter.resolve("leaveboard")
	_check(bool(d.get("ok", false)), "resolve('leaveboard') ok")
	_check(int(d.get("modal", -1)) == ViewRouter.Modal.LEAVEBOARD,
		"resolve('leaveboard') modal == LEAVEBOARD")
	var d2 := ViewRouter.resolve("leave")
	_check(int(d2.get("modal", -1)) == ViewRouter.Modal.LEAVEBOARD,
		"resolve('leave') alias → LEAVEBOARD")
	_check(ViewRouter.modal_id(ViewRouter.Modal.LEAVEBOARD) == "leaveboard",
		"modal_id(LEAVEBOARD) == 'leaveboard'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("leaveboard"), "known_ids() contains 'leaveboard'")
	_check(ids.has("leave"), "known_ids() contains 'leave'")

# ── 4b. Main integration — deeplinks for leaveboard + toast ────────────────────

func _test_main_integration() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides overlays + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true
	# Quiet the tutorial so it doesn't sit over the board for these checks.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	_check(main.has_method("_on_town_button"), "Main has _on_town_button() gate")
	_check(main.has_method("_open_leaveboard"), "Main has _open_leaveboard()")
	_check(main.has_method("show_toast"), "Main has show_toast() helper")
	_check(main._toast != null, "_ready built the toast node")

	# apply_deeplink("toast") shows a transient toast.
	var ok_toast: bool = main.apply_deeplink("toast")
	_check(ok_toast, "apply_deeplink('toast') returns true")
	_check(main._toast.is_showing(), "apply_deeplink('toast') shows a toast")
	_check(main._toast.current_text() != "", "toast has a message after the deeplink")

	# apply_deeplink("leaveboard") shows the confirm card (preview on the farm).
	var ok_lb: bool = main.apply_deeplink("leaveboard")
	_check(ok_lb, "apply_deeplink('leaveboard') returns true")
	_check(main._leaveboard_modal != null and main._leaveboard_modal.visible,
		"apply_deeplink('leaveboard') shows the leave-confirm card")
	_check(main._router.current_modal() == ViewRouter.Modal.LEAVEBOARD,
		"_router.current_modal() == LEAVEBOARD after the deeplink")

	# apply_deeplink("board") closes it; router resets to NONE.
	main.apply_deeplink("board")
	_check(main._leaveboard_modal == null or not main._leaveboard_modal.visible,
		"leave-confirm card hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# The Town button gate: on the farm it opens Town directly (no leave-confirm).
	main._on_town_button()
	_check(main._town_screen != null and main._town_screen.visible,
		"_on_town_button() on the farm opens Town directly (no confirm)")
	_check(main._leaveboard_modal == null or not main._leaveboard_modal.visible,
		"no leave-confirm card shown when tapping Town on the farm")
	# Close Town again.
	main.apply_deeplink("board")

	# In an expedition the gate shows the confirm card instead of Town.
	main.game.active_biome = "mine"
	main.game.mine_turns_left = 5
	main._on_town_button()
	_check(main._leaveboard_modal != null and main._leaveboard_modal.visible,
		"_on_town_button() in the mine shows the leave-confirm card")
	_check(main.game.is_in_mine(), "still in the mine while the confirm is showing")
	# Confirm → leaves the mine + opens Town.
	_press(main._leaveboard_modal, "confirm")
	await process_frame
	_check(not main.game.is_in_mine(), "Confirm from the gate leaves the mine")
	_check(main.game.active_biome == "farm", "back on the farm after Confirm")

	SaveManager.clear()

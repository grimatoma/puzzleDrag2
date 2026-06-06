extends SceneTree
## Headless tests for the Townsfolk roster VIEW (scenes/TownsfolkScreen.gd + its wiring
## into scenes/Main.gd + the ViewRouter.TOWNSFOLK modal). The NPC/bond LOGIC is covered
## by run_npc_tests.gd; this suite covers the SCREEN over that logic. Four layers:
##
##   1. TownsfolkScreen pure helpers — npc_count() matches roster size, _cards keyed by
##      NPC id, header reads "N townsfolk".
##   2. TownsfolkScreen rendering — setup() builds the shell, refresh() renders one card
##      per roster NPC in NpcConfig.all_ids() order; card contains the right name/role
##      and bond-band label (Liked ×1.15 at bond 8, Warm ×1.00 at bond 5, Sour at bond 3).
##   3. ViewRouter — the new TOWNSFOLK modal: resolve("townsfolk")/("folk"), modal_id
##      round-trip, known_ids() completeness.
##   4. Main integration — _open_townsfolk() lazily creates + reuses the screen and sets
##      the router modal; apply_deeplink("townsfolk") shows it; ("board") closes it.
##
## Same dependency-free harness as run_achievements_view_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_townsfolk_view_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const TownsfolkScreenScript := preload("res://scenes/TownsfolkScreen.gd")

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

## Scan the children of a Control for a Label whose text contains `substr`.
## Returns the first matching Label, or null.
func _find_label_with(node: Node, substr: String) -> Label:
	for child in node.get_children():
		if child is Label:
			var lbl := child as Label
			if lbl.text.contains(substr):
				return lbl
		var found: Label = _find_label_with(child, substr)
		if found != null:
			return found
	return null

func _initialize() -> void:
	print("\n── Townsfolk VIEW tests ──────────────────────────────")

	# ── 1 + 2. TownsfolkScreen helpers + rendering ────────────────────────────
	var game := GameState.new()
	# Set up varied bonds so the screen shows real tier labels.
	# mira → bond 8.0 → Liked · ×1.15
	# bram → bond 3.0 → Sour  · ×0.70
	# All others stay at the Warm default 5.0 → ×1.00.
	var bonds: Dictionary = game.npcs.get("bonds", {})
	bonds["mira"] = 8.0
	bonds["bram"] = 3.0
	game.npcs["bonds"] = bonds

	var screen = TownsfolkScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "townsfolk screen is visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")

	# The roster in NpcConfig order: wren / mira / tomas / bram / liss — 5 NPCs.
	var all_ids: Array = NpcConfig.all_ids()
	_check(screen.npc_count() == all_ids.size(),
		"npc_count() == NpcConfig.all_ids().size() (%d)" % all_ids.size())
	_check(screen._cards.size() == all_ids.size(),
		"one rendered card per roster NPC (_cards.size() == %d)" % all_ids.size())

	# Every id from all_ids() has a card.
	var all_have_cards := true
	for id in all_ids:
		if not screen._cards.has(String(id)):
			all_have_cards = false
	_check(all_have_cards, "every NpcConfig.all_ids() id has a rendered card in _cards")

	# Header reads "N townsfolk".
	var roster_size: int = game.npcs.get("roster", NpcConfig.all_ids()).size()
	_check(screen._header_label.text == "%d townsfolk" % roster_size,
		"header reads '%d townsfolk'" % roster_size)

	# ── Rendering: name, role, and bond-band label in each card ───────────────
	# mira → bond 8.0 → Liked · bond 8.0/10 · ×1.15 orders
	var mira_card = screen._cards.get("mira")
	_check(mira_card != null, "mira card exists in _cards")
	if mira_card != null:
		_check(_find_label_with(mira_card, "Mira") != null,
			"mira card contains name label 'Mira'")
		_check(_find_label_with(mira_card, "Baker") != null,
			"mira card contains role label 'Baker'")
		_check(_find_label_with(mira_card, "Liked") != null,
			"mira card contains band label 'Liked' (bond 8.0)")
		_check(_find_label_with(mira_card, "1.15") != null,
			"mira card contains multiplier '1.15' (Liked band)")

	# bram → bond 3.0 → Sour · bond 3.0/10 · ×0.70 orders
	var bram_card = screen._cards.get("bram")
	_check(bram_card != null, "bram card exists in _cards")
	if bram_card != null:
		_check(_find_label_with(bram_card, "Bram") != null,
			"bram card contains name label 'Bram'")
		_check(_find_label_with(bram_card, "Smith") != null,
			"bram card contains role label 'Smith'")
		_check(_find_label_with(bram_card, "Sour") != null,
			"bram card contains band label 'Sour' (bond 3.0)")
		_check(_find_label_with(bram_card, "0.70") != null,
			"bram card contains multiplier '0.70' (Sour band)")

	# wren → default bond 5.0 → Warm · ×1.00 orders
	var wren_card = screen._cards.get("wren")
	_check(wren_card != null, "wren card exists in _cards")
	if wren_card != null:
		_check(_find_label_with(wren_card, "Wren") != null,
			"wren card contains name label 'Wren'")
		_check(_find_label_with(wren_card, "Scout") != null,
			"wren card contains role label 'Scout'")
		_check(_find_label_with(wren_card, "Warm") != null,
			"wren card contains band label 'Warm' (default bond 5.0)")
		_check(_find_label_with(wren_card, "1.00") != null,
			"wren card contains multiplier '1.00' (Warm band)")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "townsfolk screen hidden after close")

	# Re-open and re-render after updating a bond (refresh must pick up changes).
	bonds["tomas"] = 9.0   # → Beloved · ×1.25
	game.npcs["bonds"] = bonds
	screen.open()
	await process_frame
	var tomas_card_after = screen._cards.get("tomas")
	_check(tomas_card_after != null, "tomas card present after re-open")
	if tomas_card_after != null:
		_check(_find_label_with(tomas_card_after, "Beloved") != null,
			"tomas card shows 'Beloved' after bond updated to 9.0")
		_check(_find_label_with(tomas_card_after, "1.25") != null,
			"tomas card shows multiplier '1.25' (Beloved band)")

	# ── 3. ViewRouter — the new TOWNSFOLK modal (pure-state assertions) ────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.TOWNSFOLK)
	_check(r.current_modal() == ViewRouter.Modal.TOWNSFOLK,
		"current_modal() == TOWNSFOLK after open_modal")
	_check(r.is_open(ViewRouter.Modal.TOWNSFOLK), "is_open(TOWNSFOLK) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_folk := ViewRouter.resolve("townsfolk")
	_check(bool(d_folk.get("ok", false)), "resolve('townsfolk') ok")
	_check(int(d_folk.get("modal", -1)) == ViewRouter.Modal.TOWNSFOLK,
		"resolve('townsfolk') modal == TOWNSFOLK")
	_check(int(d_folk.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('townsfolk') view == BOARD")

	var d_alias := ViewRouter.resolve("folk")
	_check(bool(d_alias.get("ok", false)), "resolve('folk') ok (alias)")
	_check(int(d_alias.get("modal", -1)) == ViewRouter.Modal.TOWNSFOLK,
		"resolve('folk') modal == TOWNSFOLK")

	_check(ViewRouter.modal_id(ViewRouter.Modal.TOWNSFOLK) == "townsfolk",
		"modal_id(TOWNSFOLK) == 'townsfolk'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("townsfolk"), "known_ids() contains 'townsfolk'")
	_check(ids.has("folk"), "known_ids() contains 'folk'")

	# ── 4. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_townsfolk"), "Main has _open_townsfolk()")
	_check(main.has_method("_on_townsfolk_closed"), "Main has _on_townsfolk_closed()")
	_check(main._townsfolk_screen == null,
		"townsfolk screen lazily created (null before open)")

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_townsfolk()
	_check(main._townsfolk_screen != null, "_open_townsfolk() lazily created the screen")
	_check(main._townsfolk_screen.visible, "townsfolk visible after _open_townsfolk()")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNSFOLK,
		"_router.current_modal() == TOWNSFOLK after _open_townsfolk()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._townsfolk_screen
	main._open_townsfolk()
	_check(main._townsfolk_screen == first_ref, "_open_townsfolk() reuses the one screen")

	# Render check: one card per game.npcs.roster entry.
	var roster_arr: Array = main.game.npcs.get("roster", NpcConfig.all_ids())
	_check(main._townsfolk_screen.npc_count() == roster_arr.size(),
		"screen renders one card per roster entry (count == %d)" % roster_arr.size())

	# apply_deeplink("townsfolk") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_folk: bool = main.apply_deeplink("townsfolk")
	_check(ok_folk, "apply_deeplink('townsfolk') returns true")
	_check(main._townsfolk_screen != null and main._townsfolk_screen.visible,
		"apply_deeplink('townsfolk') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNSFOLK,
		"_router.current_modal() == TOWNSFOLK after apply_deeplink('townsfolk')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._townsfolk_screen.visible,
		"townsfolk hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

extends SceneTree
## Headless tests for the Castle contributions feature: the CastleConfig data layer,
## the GameState.contribute_to_castle sink (+ persistence), the ViewRouter.CASTLE
## modal, the CastleScreen rendering, and its wiring into scenes/Main.gd. Five layers:
##
##   1. CastleConfig data — 3 needs with the correct ids/labels/resources/targets
##      (soup 53 / meat 47 / coal→tile_mine_coal 43), plus the static helpers.
##   2. GameState.contribute_to_castle — deducts inventory, bumps the contributed
##      counter, clamps to what's available (can't contribute more than you have or
##      past the target), one-way (no reset), and the no-op guard paths.
##   3. to_dict/from_dict round-trip of castle_contributed + the missing-key default.
##   4. ViewRouter — the new CASTLE modal: open_modal/current_modal/resolve("castle")/
##      modal_id round-trip / known_ids() completeness.
##   5. Main integration — _open_castle() lazily creates + reuses the screen + sets the
##      router modal; apply_deeplink("castle") shows it (and a contribute button works);
##      apply_deeplink("board") hides it + resets the router to NONE.
##
## Same dependency-free harness as run_recipe_wiki_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_castle_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const CastleScreenScript := preload("res://scenes/CastleScreen.gd")

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
	print("\n── Castle tests ────────────────────────────────────")

	# ── 1. CastleConfig data ──────────────────────────────────────────────────
	_check(CastleConfig.all().size() == 3, "CastleConfig.all() has 3 needs")
	_check(CastleConfig.NEED_IDS.size() == 3, "CastleConfig.NEED_IDS has 3 ids")

	_check(CastleConfig.has_need("soup"), "has_need('soup') true")
	_check(CastleConfig.has_need("meat"), "has_need('meat') true")
	_check(CastleConfig.has_need("coal"), "has_need('coal') true")
	_check(not CastleConfig.has_need("bogus"), "has_need('bogus') false")

	_check(CastleConfig.need_target("soup") == 53, "soup target == 53")
	_check(CastleConfig.need_target("meat") == 47, "meat target == 47")
	_check(CastleConfig.need_target("coal") == 43, "coal target == 43")
	_check(CastleConfig.need_target("bogus") == 0, "unknown target == 0")

	_check(CastleConfig.need_resource("soup") == "soup", "soup resource == 'soup'")
	_check(CastleConfig.need_resource("meat") == "meat", "meat resource == 'meat'")
	# Coal need-key maps to the PREFIXED mine inventory key (the key/resource split).
	_check(CastleConfig.need_resource("coal") == "tile_mine_coal",
		"coal resource == 'tile_mine_coal' (prefixed mine key)")

	_check(CastleConfig.need_label("soup") == "Soup", "soup label == 'Soup'")
	_check(CastleConfig.need_label("coal") == "Coal", "coal label == 'Coal'")

	# get_need returns a copy with all fields.
	var soup_def := CastleConfig.get_need("soup")
	_check(soup_def.get("id") == "soup" and int(soup_def.get("target")) == 53,
		"get_need('soup') has id + target")
	_check(CastleConfig.get_need("bogus").is_empty(), "get_need('bogus') == {}")

	# ── 2. GameState.contribute_to_castle ─────────────────────────────────────
	var g := GameState.new()
	# Fresh state defaults every need to 0 contributed.
	_check(g.castle_contributed_for("soup") == 0, "fresh: soup contributed == 0")
	_check(g.castle_contributed_for("meat") == 0, "fresh: meat contributed == 0")
	_check(g.castle_contributed_for("coal") == 0, "fresh: coal contributed == 0")

	# Seed inventory: 10 soup. Contribute 3 → inventory 7, contributed 3.
	g.inventory["soup"] = 10
	var r1: Dictionary = g.contribute_to_castle("soup", 3)
	_check(bool(r1.get("ok", false)), "contribute soup 3 ok")
	_check(int(r1.get("amount", -1)) == 3, "contribute soup 3 → amount 3")
	_check(int(g.inventory.get("soup", -1)) == 7, "inventory soup deducted to 7")
	_check(g.castle_contributed_for("soup") == 3, "soup contributed bumped to 3")

	# CLAMP to available: have 7, ask for 100 → only 7 contributed, inventory key erased.
	var r2: Dictionary = g.contribute_to_castle("soup", 100)
	_check(bool(r2.get("ok", false)), "contribute soup 100 (clamped) ok")
	_check(int(r2.get("amount", -1)) == 7, "clamped contribution donates only the 7 on hand")
	_check(not g.inventory.has("soup"), "inventory soup key erased at 0")
	_check(g.castle_contributed_for("soup") == 10, "soup contributed now 10 (3 + 7)")

	# Nothing left to contribute (have 0) → no-op {ok:false, reason:'nothing'}.
	var r3: Dictionary = g.contribute_to_castle("soup", 1)
	_check(not bool(r3.get("ok", true)), "contribute with 0 on hand → not ok")
	_check(String(r3.get("reason", "")) == "nothing", "reason == 'nothing' when empty")
	_check(g.castle_contributed_for("soup") == 10, "soup contributed unchanged after no-op")

	# CLAMP to target: meat target 47, have 100 → contribute capped at 47, 53 remain.
	g.inventory["meat"] = 100
	var r4: Dictionary = g.contribute_to_castle("meat", 100)
	_check(int(r4.get("amount", -1)) == 47, "meat contribution capped at target (47)")
	_check(g.castle_contributed_for("meat") == 47, "meat contributed == target 47")
	_check(int(g.inventory.get("meat", -1)) == 53, "meat inventory left at 53 (100 - 47)")
	# Met need → further contribute is a no-op (one-way, never exceeds target).
	var r5: Dictionary = g.contribute_to_castle("meat", 1)
	_check(not bool(r5.get("ok", true)), "contribute to a met need → not ok")
	_check(g.castle_contributed_for("meat") == 47, "met need stays at target (one-way)")

	# Coal uses the PREFIXED inventory key tile_mine_coal.
	g.inventory["tile_mine_coal"] = 5
	var r6: Dictionary = g.contribute_to_castle("coal", 2)
	_check(bool(r6.get("ok", false)), "contribute coal 2 ok")
	_check(int(g.inventory.get("tile_mine_coal", -1)) == 3, "tile_mine_coal deducted to 3")
	_check(g.castle_contributed_for("coal") == 2, "coal contributed bumped to 2")

	# Guard paths: unknown need + non-positive amount → no-op, no mutation.
	var r7: Dictionary = g.contribute_to_castle("bogus", 5)
	_check(String(r7.get("reason", "")) == "unknown", "unknown need → reason 'unknown'")
	g.inventory["tile_mine_coal"] = 3
	var r8: Dictionary = g.contribute_to_castle("coal", 0)
	_check(String(r8.get("reason", "")) == "bad_amount", "amount 0 → reason 'bad_amount'")
	_check(int(g.inventory.get("tile_mine_coal", -1)) == 3, "bad_amount leaves inventory untouched")

	# castle_contributable convenience.
	g.inventory["tile_mine_coal"] = 100
	# coal target 43, contributed 2 → remaining 41; have 100 → contributable == 41.
	_check(g.castle_contributable("coal") == 41, "castle_contributable('coal') == min(remaining, have) == 41")
	_check(g.castle_contributable("bogus") == 0, "castle_contributable(unknown) == 0")

	# ── 3. to_dict / from_dict round-trip + missing-key default ───────────────
	var snap: Dictionary = g.to_dict()
	_check(snap.has("castle_contributed"), "to_dict includes 'castle_contributed'")
	var restored := GameState.from_dict(snap)
	_check(restored.castle_contributed_for("soup") == 10, "round-trip: soup contributed 10")
	_check(restored.castle_contributed_for("meat") == 47, "round-trip: meat contributed 47")
	_check(restored.castle_contributed_for("coal") == 2, "round-trip: coal contributed 2")

	# Missing key (a save written before the castle existed) → all needs default to 0.
	var legacy := GameState.from_dict({"coins": 5})
	_check(legacy.castle_contributed_for("soup") == 0, "missing key → soup default 0")
	_check(legacy.castle_contributed_for("meat") == 0, "missing key → meat default 0")
	_check(legacy.castle_contributed_for("coal") == 0, "missing key → coal default 0")

	# Defensive clamp: a corrupt over-target saved value is clamped to the target.
	var corrupt := GameState.from_dict({"castle_contributed": {"soup": 9999, "bogus": 7}})
	_check(corrupt.castle_contributed_for("soup") == 53, "corrupt over-target soup clamped to 53")
	_check(not corrupt.castle_contributed.has("bogus"), "unknown need id dropped on load")

	# ── 4. ViewRouter — CASTLE modal (pure-state assertions) ──────────────────
	var rt := ViewRouter.new()
	rt.open_modal(ViewRouter.Modal.CASTLE)
	_check(rt.current_modal() == ViewRouter.Modal.CASTLE, "current_modal() == CASTLE after open_modal")
	_check(rt.is_open(ViewRouter.Modal.CASTLE), "is_open(CASTLE) == true")
	rt.close_modal()
	_check(rt.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_castle := ViewRouter.resolve("castle")
	_check(bool(d_castle.get("ok", false)), "resolve('castle') ok")
	_check(int(d_castle.get("modal", -1)) == ViewRouter.Modal.CASTLE, "resolve('castle') modal == CASTLE")
	_check(int(d_castle.get("view", -1)) == ViewRouter.View.BOARD, "resolve('castle') view == BOARD")

	var d_keep := ViewRouter.resolve("keep")
	_check(bool(d_keep.get("ok", false)), "resolve('keep') ok (alias)")
	_check(int(d_keep.get("modal", -1)) == ViewRouter.Modal.CASTLE, "resolve('keep') modal == CASTLE")

	_check(ViewRouter.modal_id(ViewRouter.Modal.CASTLE) == "castle", "modal_id(CASTLE) == 'castle'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("castle"), "known_ids() contains 'castle'")
	_check(ids.has("keep"), "known_ids() contains 'keep'")

	# ── 5a. CastleScreen rendering ─────────────────────────────────────────────
	var sg := GameState.new()
	sg.inventory["soup"] = 8
	var screen = CastleScreenScript.new()
	root.add_child(screen)
	screen.setup(sg)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "castle screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.total_count() == 3, "screen.total_count() == 3")
	_check(screen._cards.size() == 3, "one rendered card per need (_cards.size() == 3)")
	for nid in CastleConfig.NEED_IDS:
		_check(screen._cards.has(String(nid)), "card rendered for need '%s'" % String(nid))
	_check(screen._need_buttons.has("soup"), "_need_buttons has 'soup'")
	# soup has 8 on hand → Contribute 1 enabled; coal has 0 → disabled.
	_check(not screen._need_buttons["soup"]["one"].disabled, "soup 'Contribute 1' enabled (have 8)")
	_check(screen._need_buttons["coal"]["one"].disabled, "coal 'Contribute 1' disabled (have 0)")

	# Driving the screen's button mutates GameState the real way + re-renders.
	screen._need_buttons["soup"]["one"].emit_signal("pressed")
	_check(sg.castle_contributed_for("soup") == 1, "screen Contribute-1 bumped soup to 1")
	_check(int(sg.inventory.get("soup", -1)) == 7, "screen Contribute-1 deducted soup to 7")

	# Close fires `closed` + hides.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "castle screen hidden after close")

	# ── 5b. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_castle"), "Main has _open_castle()")
	_check(main.has_method("_on_castle_closed"), "Main has _on_castle_closed()")
	_check(main._castle_screen == null, "castle screen lazily created (null before open)")

	# Seed inventory so a contribute button path is exercised through Main's live game.
	main.game.inventory["soup"] = 5

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_castle()
	_check(main._castle_screen != null, "_open_castle() lazily created the screen")
	_check(main._castle_screen.visible, "castle screen visible after _open_castle()")
	_check(main._router.current_modal() == ViewRouter.Modal.CASTLE,
		"_router.current_modal() == CASTLE after _open_castle()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._castle_screen
	main._open_castle()
	_check(main._castle_screen == first_ref, "_open_castle() reuses the one screen")

	# Exercise a contribute path through the live screen → live GameState.
	main._castle_screen._need_buttons["soup"]["one"].emit_signal("pressed")
	_check(main.game.castle_contributed_for("soup") == 1, "Main contribute path bumped soup")
	_check(int(main.game.inventory.get("soup", -1)) == 4, "Main contribute path deducted soup to 4")

	# apply_deeplink("castle") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_castle: bool = main.apply_deeplink("castle")
	_check(ok_castle, "apply_deeplink('castle') returns true")
	_check(main._castle_screen != null and main._castle_screen.visible,
		"apply_deeplink('castle') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.CASTLE,
		"_router.current_modal() == CASTLE after apply_deeplink('castle')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._castle_screen.visible, "castle screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

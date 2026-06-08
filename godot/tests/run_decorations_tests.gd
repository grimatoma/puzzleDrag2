extends SceneTree
## Headless tests for the Decorations feature: the DecorationConfig data layer, the
## GameState.build_decoration / can_afford_decoration path (+ the new Influence currency +
## persistence), the ViewRouter.DECORATIONS modal, the DecorationsScreen rendering, and its
## wiring into scenes/Main.gd. Five layers:
##
##   1. DecorationConfig data — the catalog is non-empty with the correct ids/names/costs/
##      influence carried VERBATIM from src/features/decorations/data.ts (at least the first
##      few), plus the static helpers.
##   2. GameState.build_decoration — deducts coins + each cost item, bumps the per-decoration
##      built count, grants the influence; can_afford_decoration gates on coins AND items;
##      an unaffordable build is a no-op (no mutation); the guard reasons.
##   3. to_dict/from_dict round-trip of influence + decorations + the missing-key defaults.
##   4. ViewRouter — the new DECORATIONS modal: open_modal/current_modal/resolve("decorations")/
##      modal_id round-trip / known_ids() completeness.
##   5. Main integration — _open_decorations() lazily creates + reuses the screen + sets the
##      router modal; apply_deeplink("decorations") shows it (and a real build raises
##      influence); apply_deeplink("board") hides it + resets the router to NONE.
##
## Same dependency-free harness as run_castle_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_decorations_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const DecorationsScreenScript := preload("res://scenes/DecorationsScreen.gd")

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
	print("\n── Decorations tests ───────────────────────────────")

	# ── 1. DecorationConfig data ──────────────────────────────────────────────────
	_check(DecorationConfig.all().size() == 8, "DecorationConfig.all() has 8 decorations")
	_check(DecorationConfig.DECORATION_IDS.size() == 8, "DecorationConfig.DECORATION_IDS has 8 ids")
	_check(not DecorationConfig.all().is_empty(), "DecorationConfig.all() non-empty")

	_check(DecorationConfig.has_decoration("violet_bed"), "has_decoration('violet_bed') true")
	_check(DecorationConfig.has_decoration("stone_lantern"), "has_decoration('stone_lantern') true")
	_check(DecorationConfig.has_decoration("apple_sapling"), "has_decoration('apple_sapling') true")
	_check(not DecorationConfig.has_decoration("bogus"), "has_decoration('bogus') false")

	# Names carried verbatim from data.ts.
	_check(DecorationConfig.decoration_name("violet_bed") == "Violet Bed", "violet_bed name 'Violet Bed'")
	_check(DecorationConfig.decoration_name("stone_lantern") == "Stone Lantern", "stone_lantern name 'Stone Lantern'")
	_check(DecorationConfig.decoration_name("apple_sapling") == "Apple Sapling", "apple_sapling name 'Apple Sapling'")
	_check(DecorationConfig.decoration_name("bogus") == "", "unknown name == ''")

	# Influence grants carried verbatim.
	_check(DecorationConfig.influence("violet_bed") == 20, "violet_bed influence == 20")
	_check(DecorationConfig.influence("stone_lantern") == 35, "stone_lantern influence == 35")
	_check(DecorationConfig.influence("apple_sapling") == 60, "apple_sapling influence == 60")
	_check(DecorationConfig.influence("smelter_brazier") == 90, "smelter_brazier influence == 90")
	_check(DecorationConfig.influence("bogus") == 0, "unknown influence == 0")

	# Costs carried verbatim (coins component + a representative resource item each).
	_check(DecorationConfig.cost_coins("violet_bed") == 60, "violet_bed coins == 60")
	_check(int(DecorationConfig.cost("violet_bed").get("tile_grass_grass", -1)) == 4,
		"violet_bed cost tile_grass_grass == 4")
	_check(DecorationConfig.cost_coins("stone_lantern") == 120, "stone_lantern coins == 120")
	_check(int(DecorationConfig.cost("stone_lantern").get("tile_mine_stone", -1)) == 6,
		"stone_lantern cost tile_mine_stone == 6")
	_check(int(DecorationConfig.cost("stone_lantern").get("plank", -1)) == 2,
		"stone_lantern cost plank == 2")
	_check(DecorationConfig.cost_coins("apple_sapling") == 200, "apple_sapling coins == 200")
	_check(int(DecorationConfig.cost("apple_sapling").get("berry", -1)) == 6,
		"apple_sapling cost berry == 6")

	# get_decoration returns a copy with all fields.
	var vb_def := DecorationConfig.get_decoration("violet_bed")
	_check(vb_def.get("id") == "violet_bed" and int(vb_def.get("influence")) == 20,
		"get_decoration('violet_bed') has id + influence")
	_check(DecorationConfig.get_decoration("bogus").is_empty(), "get_decoration('bogus') == {}")

	# ── 2. GameState.build_decoration / can_afford_decoration ──────────────────────
	var g := GameState.new()
	# Fresh state: 0 influence, no decorations built.
	_check(g.influence == 0, "fresh: influence == 0")
	_check(g.decoration_count("violet_bed") == 0, "fresh: violet_bed count == 0")

	# Short on coins → cant_afford even with the item present.
	g.coins = 10
	g.inventory["tile_grass_grass"] = 10
	_check(not g.can_afford_decoration("violet_bed"), "can_afford false when short on coins")
	var rc: Dictionary = g.build_decoration("violet_bed")
	_check(not bool(rc.get("ok", true)), "build with too few coins → not ok")
	_check(String(rc.get("reason", "")) == "cant_afford", "reason == 'cant_afford' (coins)")
	_check(g.coins == 10, "coins untouched after unaffordable build")
	_check(g.decoration_count("violet_bed") == 0, "count untouched after unaffordable build")
	_check(g.influence == 0, "influence untouched after unaffordable build")

	# Short on the item → cant_afford even with coins present.
	g.coins = 1000
	g.inventory["tile_grass_grass"] = 2          # need 4
	_check(not g.can_afford_decoration("violet_bed"), "can_afford false when short on item")
	var ri: Dictionary = g.build_decoration("violet_bed")
	_check(String(ri.get("reason", "")) == "cant_afford", "reason == 'cant_afford' (item)")
	_check(g.coins == 1000, "coins untouched (short on item)")
	_check(int(g.inventory.get("tile_grass_grass", -1)) == 2, "item untouched (short on item)")

	# Affordable → real deduction + count bump + influence grant.
	g.coins = 1000
	g.inventory["tile_grass_grass"] = 10
	_check(g.can_afford_decoration("violet_bed"), "can_afford true when coins + item covered")
	var ro: Dictionary = g.build_decoration("violet_bed")
	_check(bool(ro.get("ok", false)), "build violet_bed ok")
	_check(g.coins == 940, "coins deducted 60 (1000 - 60)")
	_check(int(g.inventory.get("tile_grass_grass", -1)) == 6, "tile_grass_grass deducted 4 (10 - 4)")
	_check(g.decoration_count("violet_bed") == 1, "violet_bed count bumped to 1")
	_check(g.influence == 20, "influence granted +20")
	_check(int(ro.get("influence", -1)) == 20, "build result reports new influence 20")

	# Build again → repeatable: count 2, influence 40.
	g.build_decoration("violet_bed")
	_check(g.decoration_count("violet_bed") == 2, "second build → count 2 (repeatable)")
	_check(g.influence == 40, "second build → influence 40 (repeatable grant)")
	_check(g.coins == 880, "coins deducted again (940 - 60)")

	# A cost item exactly emptied → key erased (the floor/erase write pattern).
	var g2 := GameState.new()
	g2.coins = 1000
	g2.inventory["tile_grass_grass"] = 4          # exactly the cost
	g2.build_decoration("violet_bed")
	_check(not g2.inventory.has("tile_grass_grass"), "cost item key erased when emptied to 0")
	_check(g2.influence == 20, "exact-cost build still granted influence")

	# A second decoration with multiple item costs (stone_lantern: 120 coins + stone 6 + plank 2).
	var g3 := GameState.new()
	g3.coins = 500
	g3.inventory["tile_mine_stone"] = 6
	g3.inventory["plank"] = 5
	_check(g3.can_afford_decoration("stone_lantern"), "stone_lantern affordable with both items")
	g3.build_decoration("stone_lantern")
	_check(g3.coins == 380, "stone_lantern coins deducted 120 (500 - 120)")
	_check(not g3.inventory.has("tile_mine_stone"), "stone (6/6) erased to 0")
	_check(int(g3.inventory.get("plank", -1)) == 3, "plank deducted 2 (5 - 3)")
	_check(g3.influence == 35, "stone_lantern granted +35 influence")

	# Guard: unknown decoration → no-op {ok:false, reason:'unknown'}.
	var ru: Dictionary = g3.build_decoration("bogus")
	_check(String(ru.get("reason", "")) == "unknown", "unknown decoration → reason 'unknown'")
	_check(not g3.can_afford_decoration("bogus"), "can_afford_decoration('bogus') false")

	# ── 3. to_dict / from_dict round-trip + missing-key default ───────────────────
	var snap: Dictionary = g.to_dict()
	_check(snap.has("influence"), "to_dict includes 'influence'")
	_check(snap.has("decorations"), "to_dict includes 'decorations'")
	var restored := GameState.from_dict(snap)
	_check(restored.influence == 40, "round-trip: influence 40")
	_check(restored.decoration_count("violet_bed") == 2, "round-trip: violet_bed count 2")

	# Missing keys (a save written before decorations existed) → influence 0 + empty dict.
	var legacy := GameState.from_dict({"coins": 5})
	_check(legacy.influence == 0, "missing key → influence default 0")
	_check(legacy.decoration_count("violet_bed") == 0, "missing key → decoration count default 0")

	# Defensive restore: an unknown decoration id is dropped; counts coerced to int + floored.
	var corrupt := GameState.from_dict({"influence": -7, "decorations": {"violet_bed": 3.0, "bogus": 9}})
	_check(corrupt.influence == 0, "negative influence floored to 0 on load")
	_check(corrupt.decoration_count("violet_bed") == 3, "real id count coerced int (3.0 → 3)")
	_check(not corrupt.decorations.has("bogus"), "unknown decoration id dropped on load")

	# ── 4. ViewRouter — DECORATIONS modal (pure-state assertions) ─────────────────
	var rt := ViewRouter.new()
	rt.open_modal(ViewRouter.Modal.DECORATIONS)
	_check(rt.current_modal() == ViewRouter.Modal.DECORATIONS, "current_modal() == DECORATIONS after open_modal")
	_check(rt.is_open(ViewRouter.Modal.DECORATIONS), "is_open(DECORATIONS) == true")
	rt.close_modal()
	_check(rt.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_dec := ViewRouter.resolve("decorations")
	_check(bool(d_dec.get("ok", false)), "resolve('decorations') ok")
	_check(int(d_dec.get("modal", -1)) == ViewRouter.Modal.DECORATIONS, "resolve('decorations') modal == DECORATIONS")
	_check(int(d_dec.get("view", -1)) == ViewRouter.View.BOARD, "resolve('decorations') view == BOARD")

	var d_alias := ViewRouter.resolve("decor")
	_check(bool(d_alias.get("ok", false)), "resolve('decor') ok (alias)")
	_check(int(d_alias.get("modal", -1)) == ViewRouter.Modal.DECORATIONS, "resolve('decor') modal == DECORATIONS")

	_check(ViewRouter.modal_id(ViewRouter.Modal.DECORATIONS) == "decorations", "modal_id(DECORATIONS) == 'decorations'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("decorations"), "known_ids() contains 'decorations'")
	_check(ids.has("decor"), "known_ids() contains 'decor'")

	# ── 5a. DecorationsScreen rendering ───────────────────────────────────────────
	var sg := GameState.new()
	sg.coins = 1000
	sg.inventory["tile_grass_grass"] = 10        # violet_bed affordable
	var screen = DecorationsScreenScript.new()
	root.add_child(screen)
	screen.setup(sg)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "decorations screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.total_count() == 8, "screen.total_count() == 8")
	_check(screen._cards.size() == 8, "one rendered card per decoration (_cards.size() == 8)")
	for did in DecorationConfig.DECORATION_IDS:
		_check(screen._cards.has(String(did)), "card rendered for decoration '%s'" % String(did))
	_check(screen._build_buttons.has("violet_bed"), "_build_buttons has 'violet_bed'")
	# violet_bed affordable (coins 1000, grass 10) → Build enabled; apple_sapling needs
	# berry which isn't seeded → Build disabled.
	_check(not screen._build_buttons["violet_bed"].disabled, "violet_bed Build enabled (affordable)")
	_check(screen._build_buttons["apple_sapling"].disabled, "apple_sapling Build disabled (no berry)")
	_check(screen._header_label.text.contains("0"), "header shows 0 influence before any build")

	# Driving the screen's Build button mutates GameState the real way + re-renders.
	screen._build_buttons["violet_bed"].emit_signal("pressed")
	_check(sg.decoration_count("violet_bed") == 1, "screen Build bumped violet_bed to 1")
	_check(sg.influence == 20, "screen Build granted +20 influence")
	_check(int(sg.coins) == 940, "screen Build deducted coins to 940")
	_check(screen._header_label.text.contains("20"), "header re-rendered to 20 influence after build")

	# Close fires `closed` + hides.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "decorations screen hidden after close")

	# ── 5b. Main integration ───────────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

	_check(main.has_method("_open_decorations"), "Main has _open_decorations()")
	_check(main.has_method("_on_decorations_closed"), "Main has _on_decorations_closed()")
	_check(main._decorations_screen == null, "decorations screen lazily created (null before open)")

	# Seed coins + items so a real build path is exercised through Main's live game.
	main.game.coins = 1000
	main.game.inventory["tile_grass_grass"] = 10

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_decorations()
	_check(main._decorations_screen != null, "_open_decorations() lazily created the screen")
	_check(main._decorations_screen.visible, "decorations screen visible after _open_decorations()")
	_check(main._router.current_modal() == ViewRouter.Modal.DECORATIONS,
		"_router.current_modal() == DECORATIONS after _open_decorations()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._decorations_screen
	main._open_decorations()
	_check(main._decorations_screen == first_ref, "_open_decorations() reuses the one screen")

	# Exercise a real build path through the live screen → live GameState; influence rises.
	var infl_before: int = main.game.influence
	main._decorations_screen._build_buttons["violet_bed"].emit_signal("pressed")
	_check(main.game.decoration_count("violet_bed") == 1, "Main build path bumped violet_bed")
	_check(main.game.influence == infl_before + 20, "Main build path raised influence +20")
	_check(int(main.game.coins) == 940, "Main build path deducted coins to 940")

	# apply_deeplink("decorations") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_dec: bool = main.apply_deeplink("decorations")
	_check(ok_dec, "apply_deeplink('decorations') returns true")
	_check(main._decorations_screen != null and main._decorations_screen.visible,
		"apply_deeplink('decorations') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.DECORATIONS,
		"_router.current_modal() == DECORATIONS after apply_deeplink('decorations')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._decorations_screen.visible, "decorations screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

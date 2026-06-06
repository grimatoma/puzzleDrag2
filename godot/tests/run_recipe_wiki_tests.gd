extends SceneTree
## Headless tests for the Recipe Wiki screen (scenes/RecipeWikiScreen.gd + its wiring
## into scenes/Main.gd + the ViewRouter.RECIPES modal). Four layers:
##
##   1. RecipeWikiScreen pure helpers — recipe_count() == RecipeConfig.RECIPE_IDS.size(),
##      _build_formula builds the correct "input×n + input×n → output×qty" string.
##   2. RecipeWikiScreen rendering — setup() builds the shell, refresh() renders one
##      card per RecipeConfig.RECIPE_IDS (tracked in `_cards`), the header reads
##      "N recipes", a known recipe (BREAD) shows name + flour/eggs inputs + bread output
##      + "at Bakery" station.
##   3. ViewRouter — the new RECIPES modal: resolve("recipes")/("recipewiki"),
##      modal_id round-trip, known_ids() completeness (pure-state assertions live here).
##   4. Main integration — _open_recipes() lazily creates + reuses the screen and sets
##      the router modal; apply_deeplink("recipes") shows it; ("board") closes it.
##
## Same dependency-free harness as run_achievements_view_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_recipe_wiki_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const RecipeWikiScreenScript := preload("res://scenes/RecipeWikiScreen.gd")

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
	print("\n── Recipe Wiki tests ───────────────────────────────")

	# ── 1. Pure helpers ───────────────────────────────────────────────────────
	var expected_count: int = RecipeConfig.RECIPE_IDS.size()
	_check(RecipeWikiScreenScript.recipe_count() == expected_count,
		"recipe_count() == RecipeConfig.RECIPE_IDS.size() (%d)" % expected_count)

	# _build_formula: standard case
	var formula := RecipeWikiScreenScript._build_formula({"flour": 3, "eggs": 1}, "bread", 1)
	_check(formula.contains("flour×3"), "_build_formula includes 'flour×3'")
	_check(formula.contains("eggs×1"), "_build_formula includes 'eggs×1'")
	_check(formula.contains("bread×1"), "_build_formula includes 'bread×1'")
	_check(formula.contains("→"), "_build_formula includes '→' separator")

	# _build_formula: single input
	var f2 := RecipeWikiScreenScript._build_formula({"bread": 1, "flour": 2}, "supplies", 1)
	_check(f2.contains("bread×1"), "_build_formula(supplies) includes 'bread×1'")
	_check(f2.contains("flour×2"), "_build_formula(supplies) includes 'flour×2'")
	_check(f2.contains("supplies×1"), "_build_formula(supplies) includes 'supplies×1'")

	# _build_formula: empty inputs → "—"
	var f3 := RecipeWikiScreenScript._build_formula({}, "widget", 2)
	_check(f3.contains("—"), "_build_formula with empty inputs contains '—'")
	_check(f3.contains("widget×2"), "_build_formula with empty inputs still shows output")

	# ── 2. RecipeWikiScreen rendering ─────────────────────────────────────────
	var game := GameState.new()
	var screen = RecipeWikiScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "recipe wiki is visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")

	# One card per RECIPE_IDS.
	_check(screen._cards.size() == expected_count,
		"one rendered card per recipe id (_cards.size() == %d)" % expected_count)

	# Every RECIPE_IDS entry has a card.
	var all_have_cards := true
	for id in RecipeConfig.RECIPE_IDS:
		if not screen._cards.has(String(id)):
			all_have_cards = false
	_check(all_have_cards, "every RecipeConfig.RECIPE_IDS id has a rendered card in _cards")

	# Header reads "N recipe(s)".
	_check(screen._header_label.text == "%d recipes" % expected_count,
		"header reads '%d recipes'" % expected_count)

	# BREAD card: verify the card exists and the visible formula + station labels are correct.
	var bread_card = screen._cards.get(RecipeConfig.BREAD)
	_check(bread_card != null, "BREAD card exists in _cards")
	if bread_card != null:
		# Walk the card's children to collect all label texts for assertions.
		var all_texts: Array = _collect_label_texts(bread_card)
		# Recipe name
		var has_name := false
		for t in all_texts:
			if String(t).to_lower().contains("bread"):
				has_name = true
		_check(has_name, "BREAD card contains recipe name 'Bread'")
		# Station
		var has_station := false
		for t in all_texts:
			if String(t).to_lower().contains("bakery"):
				has_station = true
		_check(has_station, "BREAD card contains station 'Bakery'")
		# Inputs — flour and eggs in the formula line
		var has_flour := false
		var has_eggs := false
		for t in all_texts:
			if String(t).contains("flour"):
				has_flour = true
			if String(t).contains("eggs"):
				has_eggs = true
		_check(has_flour, "BREAD card formula contains 'flour'")
		_check(has_eggs, "BREAD card formula contains 'eggs'")
		# Output — bread
		var has_output := false
		for t in all_texts:
			if String(t).contains("bread×"):
				has_output = true
		_check(has_output, "BREAD card formula contains 'bread×' output")

	# SUPPLIES card: bread+flour → supplies at Kitchen
	var sup_card = screen._cards.get(RecipeConfig.SUPPLIES)
	_check(sup_card != null, "SUPPLIES card exists in _cards")
	if sup_card != null:
		var all_texts: Array = _collect_label_texts(sup_card)
		var has_kitchen := false
		var has_supplies := false
		for t in all_texts:
			if String(t).to_lower().contains("kitchen"):
				has_kitchen = true
			if String(t).to_lower().contains("supplies"):
				has_supplies = true
		_check(has_kitchen, "SUPPLIES card contains station 'Kitchen'")
		_check(has_supplies, "SUPPLIES card contains 'supplies'")

	# Close button fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "recipe wiki hidden after close")

	# ── 3. ViewRouter — RECIPES modal (pure-state assertions) ─────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.RECIPES)
	_check(r.current_modal() == ViewRouter.Modal.RECIPES,
		"current_modal() == RECIPES after open_modal")
	_check(r.is_open(ViewRouter.Modal.RECIPES), "is_open(RECIPES) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_rec := ViewRouter.resolve("recipes")
	_check(bool(d_rec.get("ok", false)), "resolve('recipes') ok")
	_check(int(d_rec.get("modal", -1)) == ViewRouter.Modal.RECIPES,
		"resolve('recipes') modal == RECIPES")
	_check(int(d_rec.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('recipes') view == BOARD")

	var d_rw := ViewRouter.resolve("recipewiki")
	_check(bool(d_rw.get("ok", false)), "resolve('recipewiki') ok (alias)")
	_check(int(d_rw.get("modal", -1)) == ViewRouter.Modal.RECIPES,
		"resolve('recipewiki') modal == RECIPES")

	_check(ViewRouter.modal_id(ViewRouter.Modal.RECIPES) == "recipes",
		"modal_id(RECIPES) == 'recipes'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("recipes"), "known_ids() contains 'recipes'")
	_check(ids.has("recipewiki"), "known_ids() contains 'recipewiki'")

	# ── 4. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_recipes"), "Main has _open_recipes()")
	_check(main.has_method("_on_recipes_closed"), "Main has _on_recipes_closed()")
	_check(main._recipe_wiki_screen == null, "recipe wiki lazily created (null before open)")

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_recipes()
	_check(main._recipe_wiki_screen != null, "_open_recipes() lazily created the screen")
	_check(main._recipe_wiki_screen.visible, "recipe wiki visible after _open_recipes()")
	_check(main._router.current_modal() == ViewRouter.Modal.RECIPES,
		"_router.current_modal() == RECIPES after _open_recipes()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._recipe_wiki_screen
	main._open_recipes()
	_check(main._recipe_wiki_screen == first_ref, "_open_recipes() reuses the one screen")

	# apply_deeplink("recipes") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_rec: bool = main.apply_deeplink("recipes")
	_check(ok_rec, "apply_deeplink('recipes') returns true")
	_check(main._recipe_wiki_screen != null and main._recipe_wiki_screen.visible,
		"apply_deeplink('recipes') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.RECIPES,
		"_router.current_modal() == RECIPES after apply_deeplink('recipes')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._recipe_wiki_screen.visible, "recipe wiki hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# Render verification: the screen renders one card per RecipeConfig.RECIPE_IDS.
	_check(main._recipe_wiki_screen._cards.size() == RecipeConfig.RECIPE_IDS.size(),
		"Main's recipe wiki renders %d card(s) matching RECIPE_IDS" % RecipeConfig.RECIPE_IDS.size())

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## Walk a control tree depth-first and collect the `text` of every Label found.
func _collect_label_texts(node: Node) -> Array:
	var out: Array = []
	if node is Label:
		out.append((node as Label).text)
	for child in node.get_children():
		out.append_array(_collect_label_texts(child))
	return out

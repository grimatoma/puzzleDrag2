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

	# ── 2. RecipeWikiScreen rendering (station tabs + selectable rows + detail) ──
	var game := GameState.new()
	var screen = RecipeWikiScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "recipe wiki is visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")

	# Station tab bar: one tab per real station (Bakery + Kitchen).
	_check(screen._station_buttons.has(BuildingConfig.BAKERY), "station tab for Bakery exists")
	_check(screen._station_buttons.has(BuildingConfig.KITCHEN), "station tab for Kitchen exists")

	# Header reads the TOTAL recipe count (across stations).
	_check(screen._header_label.text == "%d recipes" % expected_count,
		"header reads '%d recipes'" % expected_count)

	# Default station = Bakery → BREAD shown + selected; SUPPLIES (Kitchen) not shown.
	_check(screen._active_station == BuildingConfig.BAKERY, "default station is Bakery")
	_check(screen._selected_recipe == RecipeConfig.BREAD, "default selected recipe is BREAD")
	_check(screen._cards.has(RecipeConfig.BREAD), "BREAD row present on the Bakery tab")
	_check(not screen._cards.has(RecipeConfig.SUPPLIES), "SUPPLIES row absent on the Bakery tab")

	# The detail card shows the recipe name + "at Bakery" station line.
	var bakery_texts: Array = _collect_label_texts(screen._body)
	var has_bread := false
	var has_bakery := false
	for t in bakery_texts:
		if String(t).to_lower().contains("bread"): has_bread = true
		if String(t).to_lower().contains("bakery"): has_bakery = true
	_check(has_bread, "Bakery tab shows 'Bread'")
	_check(has_bakery, "Bakery tab shows the 'at Bakery' station line")

	# A fresh game can't craft (no Bakery built) → the Craft button is disabled.
	_check(screen._action_buttons.has("craft"), "_action_buttons has 'craft' (detail card)")
	_check(screen._action_buttons["craft"].disabled, "Craft disabled with no station / inputs")

	# Switch to the Kitchen tab → SUPPLIES becomes the shown + selected recipe.
	screen._on_station_tab(BuildingConfig.KITCHEN)
	_check(screen._active_station == BuildingConfig.KITCHEN, "_on_station_tab(Kitchen) switches station")
	_check(screen._selected_recipe == RecipeConfig.SUPPLIES, "Kitchen tab selects SUPPLIES")
	_check(screen._cards.has(RecipeConfig.SUPPLIES), "SUPPLIES row present on the Kitchen tab")
	_check(not screen._cards.has(RecipeConfig.BREAD), "BREAD row absent on the Kitchen tab")
	var kitchen_texts: Array = _collect_label_texts(screen._body)
	var has_kitchen := false
	for t in kitchen_texts:
		if String(t).to_lower().contains("kitchen"): has_kitchen = true
	_check(has_kitchen, "Kitchen tab shows the 'at Kitchen' station line")

	# ── Real craft flow: build the Bakery, stock flour+eggs, press Craft ─────────
	screen._on_station_tab(BuildingConfig.BAKERY)
	game.buildings.append(BuildingConfig.BAKERY)   # the same array game.build() appends to
	game.inventory["flour"] = 6
	game.inventory["eggs"] = 2
	screen.refresh()
	_check(game.can_craft(RecipeConfig.BREAD), "can_craft(BREAD) after building Bakery + stocking")
	_check(not screen._action_buttons["craft"].disabled, "Craft enabled when craftable")
	var bread_before := int(game.inventory.get("bread", 0))
	var changed := [false]
	screen.connect("state_changed", func(): changed[0] = true)
	screen._action_buttons["craft"].emit_signal("pressed")
	_check(int(game.inventory.get("bread", 0)) == bread_before + 1, "Craft produced +1 bread")
	_check(int(game.inventory.get("flour", 0)) == 3, "Craft consumed 3 flour (6 → 3)")
	_check(int(game.inventory.get("eggs", 0)) == 1, "Craft consumed 1 eggs (2 → 1)")
	_check(changed[0], "Craft emitted state_changed")

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
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

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

	# Render verification: the screen renders at least the active station's recipe row(s).
	_check(main._recipe_wiki_screen._cards.size() >= 1,
		"Main's recipe wiki renders the active station's recipe row(s)")

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

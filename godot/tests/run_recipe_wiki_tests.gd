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
	# review-3 — the crafting screen is a B1 PRIMARY view now (the 🔨 Craft nav target): the
	# "close" Button stays registered (ESC/back/deep-link/tests rely on it) but is NOT visible
	# (no card "✖ Close" — the view is left via the bottom nav / ESC-back).
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(not screen._action_buttons["close"].visible,
		"the 'close' button is NOT visible (primary view — card close dropped)")

	# Station tab bar: one tab per real station. T15 grew this from Bakery+Kitchen to all
	# six crafting stations (Bakery, Kitchen, Workshop, Larder, Forge, Smokehouse).
	_check(screen._station_buttons.has(BuildingConfig.BAKERY), "station tab for Bakery exists")
	_check(screen._station_buttons.has(BuildingConfig.KITCHEN), "station tab for Kitchen exists")
	_check(screen._station_buttons.has(BuildingConfig.WORKSHOP), "station tab for Workshop exists")
	_check(screen._station_buttons.has(BuildingConfig.LARDER), "station tab for Larder exists")
	_check(screen._station_buttons.has(BuildingConfig.FORGE), "station tab for Forge exists")
	_check(screen._station_buttons.has(BuildingConfig.SMOKEHOUSE), "station tab for Smokehouse exists")

	# Switching to the Workshop tab renders its tool recipes (e.g. the Rake row).
	screen._on_station_tab(BuildingConfig.WORKSHOP)
	_check(screen._active_station == BuildingConfig.WORKSHOP, "_on_station_tab(Workshop) switches station")
	_check(screen._cards.has(RecipeConfig.RAKE), "Workshop tab renders the Rake (tool) recipe row")
	_check(screen._cards.size() >= 1, "Workshop tab renders at least one recipe row")
	screen._on_station_tab(BuildingConfig.BAKERY)   # restore the default station for the checks below

	# Header reads the TOTAL recipe count (across stations).
	_check(screen._header_label.text == "%d recipes" % expected_count,
		"header reads '%d recipes'" % expected_count)

	# Default station = Bakery → BREAD shown; SUPPLIES (Kitchen) not shown.
	_check(screen._active_station == BuildingConfig.BAKERY, "default station is Bakery")
	_check(screen._expanded == "", "no recipe auto-expanded by default")
	_check(screen._cards.has(RecipeConfig.BREAD), "BREAD row present on the Bakery tab")
	_check(not screen._cards.has(RecipeConfig.SUPPLIES), "SUPPLIES row absent on the Bakery tab")

	# Recipe name appears in the collapsed row; station line + craft button only appear
	# when the row is expanded — expand BREAD to check those.
	var bakery_texts_collapsed: Array = _collect_label_texts(screen._body)
	var has_bread_collapsed := false
	for t in bakery_texts_collapsed:
		if String(t).to_lower().contains("bread"): has_bread_collapsed = true
	_check(has_bread_collapsed, "Bakery tab shows 'Bread' in the collapsed row")

	screen.toggle_expand(RecipeConfig.BREAD)
	_check(screen._expanded == RecipeConfig.BREAD, "toggle_expand(BREAD) expands the BREAD row")

	var bakery_texts: Array = _collect_label_texts(screen._body)
	var has_bakery := false
	for t in bakery_texts:
		if String(t).to_lower().contains("bakery"): has_bakery = true
	_check(has_bakery, "Expanded BREAD row shows the 'Recipe · Bakery' station eyebrow")

	# Craft button appears in the expanded row; disabled with no station / inputs.
	_check(screen._action_buttons.has("craft"), "_action_buttons has 'craft' when row expanded")
	_check(screen._action_buttons["craft"].disabled, "Craft disabled with no station / inputs")

	# Switch to the Kitchen tab → SUPPLIES shown, expansion collapses.
	screen._on_station_tab(BuildingConfig.KITCHEN)
	_check(screen._active_station == BuildingConfig.KITCHEN, "_on_station_tab(Kitchen) switches station")
	_check(screen._expanded == "", "station switch collapses the expanded row")
	_check(screen._cards.has(RecipeConfig.SUPPLIES), "SUPPLIES row present on the Kitchen tab")
	_check(not screen._cards.has(RecipeConfig.BREAD), "BREAD row absent on the Kitchen tab")

	# Expand SUPPLIES to verify the station eyebrow.
	screen.toggle_expand(RecipeConfig.SUPPLIES)
	var kitchen_texts: Array = _collect_label_texts(screen._body)
	var has_kitchen := false
	for t in kitchen_texts:
		if String(t).to_lower().contains("kitchen"): has_kitchen = true
	_check(has_kitchen, "Expanded SUPPLIES row shows the 'Recipe · Kitchen' station eyebrow")

	# ── Real craft flow: build the Bakery, stock flour+eggs, press Craft ─────────
	screen._on_station_tab(BuildingConfig.BAKERY)
	game.buildings.append(BuildingConfig.BAKERY)   # the same array game.build() appends to
	game.inventory["flour"] = 6
	game.inventory["eggs"] = 2
	# Expand BREAD so the inline detail (have/need chips + Craft button) is rendered.
	screen.toggle_expand(RecipeConfig.BREAD)
	_check(game.can_craft(RecipeConfig.BREAD), "can_craft(BREAD) after building Bakery + stocking")
	_check(not screen._action_buttons["craft"].disabled, "Craft enabled when craftable")

	# The expanded row shows per-input have/need chips ("flour 6/3", "eggs 2/1") and a
	# "Ready to craft" status line when craftable.
	var detail_texts: Array = _collect_label_texts(screen._body)
	var has_flour_haveneed := false
	var has_eggs_haveneed := false
	var has_ready := false
	for t in detail_texts:
		var s := String(t)
		if s == "6/3": has_flour_haveneed = true        # flour have/need chip
		if s == "2/1": has_eggs_haveneed = true          # eggs have/need chip
		if s.to_lower().contains("ready to craft"): has_ready = true
	_check(has_flour_haveneed, "expanded row shows the flour have/need chip '6/3'")
	_check(has_eggs_haveneed, "expanded row shows the eggs have/need chip '2/1'")
	_check(has_ready, "expanded row shows the 'Ready to craft' status when craftable")
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
	# review-3 — as the 🔨 Craft PRIMARY view it marks the "craft" bottom-nav tab active.
	_check(main._hud._nav_current == "craft",
		"_open_recipes() marks the 'craft' nav tab active (it's the Craft primary view)")

	# review-3 — tapping the bottom-nav "craft" tab opens THIS crafting screen, not the Town
	# ledger (TownScreen). Close first, then drive the nav handler the HUD emits.
	main.apply_deeplink("board")
	main._on_nav_selected("craft")
	_check(main._recipe_wiki_screen.visible,
		"craft nav tap opens the crafting screen (RecipeWikiScreen)")
	_check(main._town_screen == null or not main._town_screen.visible,
		"craft nav tap does NOT open the Town ledger")
	_check(main._router.current_modal() == ViewRouter.Modal.RECIPES,
		"craft nav tap → router == RECIPES (crafting UI)")

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

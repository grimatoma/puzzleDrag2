extends SceneTree
## Headless tests for the Tile Collection browser (scenes/TileCollectionScreen.gd + its wiring
## into scenes/Main.gd + the ViewRouter.TILES modal). The browser now has FAMILY TABS (Farm /
## Mining / Water / Hazards / Uncategorized), a tab-scoped tile grid, and a DETAIL panel with an
## action button mirroring React getTileDetailViewModel. Four layers:
##
##   1. TileCollectionScreen rendering — setup() builds the shell, refresh() renders the
##      selected tab's tiles into `_cards`; header reads "N tiles in play"; family tabs are
##      registered ("tab_<family>"); selecting tabs scopes the grid (Farm has GRASS, Mining has
##      IRON_ORE, Hazards has RAT); selecting a tile populates the detail panel; the detail
##      action label matches the tile's discovery state (Activate / Active / Buy / Chain /
##      Research / informational), and "Activate" calls set_active_tile.
##   2. Display-name derivation — unit-tests _derive_display_name and tile_count().
##   3. ViewRouter — the TILES modal: resolve("tiles")/("collection"), modal_id round-trip,
##      known_ids() completeness (pure-state assertions).
##   4. Main integration — _open_tiles() lazily creates + reuses the screen and sets the
##      router modal; apply_deeplink("tiles") shows it; ("board") closes it.
##
## Same dependency-free harness as run_achievements_view_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_tile_collection_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const TileCollectionScreenScript := preload("res://scenes/TileCollectionScreen.gd")

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

func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Tile Collection browser (M11) tests ────────────────")

	# ── 1. TileCollectionScreen rendering ────────────────────────────────────
	var game := GameState.new()
	var screen = TileCollectionScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "tile collection screen is visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")

	var total: int = Constants.STRING_KEYS.size()
	# Header reads "N tiles in play" (the full catalog count, even though the grid is tab-scoped).
	_check(screen._header_label.text == "%d tiles in play" % total,
		"header reads '%d tiles in play'" % total)

	# Family tabs are registered.
	for fam in ["farm", "mining", "water", "hazards", "uncategorized"]:
		_check(screen._action_buttons.has("tab_" + fam), "registered a 'tab_%s' tab" % fam)
	# Default tab is Farm.
	_check(screen.selected_tab() == "farm", "default selected_tab() == 'farm'")

	# ── Farm tab: GRASS is present; a card-count sanity check (subset of total). ──
	_check(screen._cards.has(Constants.Tile.GRASS), "Farm tab grid includes GRASS")
	_check(screen._cards.size() > 0 and screen._cards.size() < total,
		"Farm tab grid is a non-empty SUBSET of the catalog (%d of %d)" % [screen._cards.size(), total])
	# GRASS card shows its display name.
	var grass_card: Variant = screen._cards.get(Constants.Tile.GRASS)
	if grass_card != null:
		var labels := _collect_labels(grass_card as Node)
		var found_name := false
		for lbl in labels:
			if (lbl as Label).text.ends_with("Grass"):
				found_name = true
		_check(found_name, "GRASS card shows display name 'Grass'")

	# ── Select GRASS → the detail panel populates with its produced resource + Activate. ──
	_check(_press(screen, "tile_tile_grass_grass"), "pressed the GRASS tile card")
	await process_frame
	_check(screen.selected_tile_id() == "tile_grass_grass",
		"selecting GRASS set selected_tile_id() == 'tile_grass_grass'")
	var detail_labels := _collect_labels(screen._detail_body)
	var found_produces := false
	for lbl in detail_labels:
		if (lbl as Label).text == "Produces: Hay Bundle":
			found_produces = true
	_check(found_produces, "GRASS detail shows 'Produces: Hay Bundle'")
	# GRASS is the base grass tile + default-active → its detail action reads "Active" (disabled).
	_check(screen.detail_action_label() == "Active",
		"GRASS (default-active) detail action label == 'Active' (got '%s')" % screen.detail_action_label())
	_check(screen._action_buttons.has("detail_action") and screen._action_buttons["detail_action"].disabled,
		"the 'Active' detail action button is disabled")

	# ── A discovered, non-active variant → "Activate"; pressing it calls set_active_tile. ──
	game.discover_tile("tile_grass_meadow")
	screen.refresh()
	await process_frame
	_check(_press(screen, "tile_tile_grass_meadow"), "pressed the discovered Meadow card")
	await process_frame
	_check(screen.detail_action_label() == "Activate",
		"discovered non-active Meadow detail action label == 'Activate'")
	_check(_press(screen, "detail_action"), "pressed the 'Activate' detail action")
	await process_frame
	_check(game.active_tile_id_for_category("grass") == "tile_grass_meadow",
		"'Activate' called set_active_tile (grass active == tile_grass_meadow)")
	_check(screen.detail_action_label() == "Active",
		"after activating, the detail action flips to 'Active'")

	# ── Mining tab: IRON_ORE present; multi-word display name. ──
	_check(_press(screen, "tab_mining"), "pressed the Mining tab")
	await process_frame
	_check(screen.selected_tab() == "mining", "selected_tab() == 'mining' after pressing it")
	_check(screen._cards.has(Constants.Tile.IRON_ORE), "Mining tab grid includes IRON_ORE")
	_check(not screen._cards.has(Constants.Tile.GRASS), "Mining tab grid does NOT include GRASS")
	var iron_card: Variant = screen._cards.get(Constants.Tile.IRON_ORE)
	if iron_card != null:
		var labels := _collect_labels(iron_card as Node)
		var found_iron := false
		for lbl in labels:
			if (lbl as Label).text.ends_with("Iron Ore"):
				found_iron = true
		_check(found_iron, "IRON_ORE card shows display name 'Iron Ore'")

	# ── Hazards tab: RAT present; detail shows the no-yield label + NO action. ──
	_check(_press(screen, "tab_hazards"), "pressed the Hazards tab")
	await process_frame
	_check(screen._cards.has(Constants.Tile.RAT), "Hazards tab grid includes RAT")
	_check(_press(screen, "tile_rat"), "pressed the RAT card (non-catalog hazard, id == string_key)")
	await process_frame
	_check(screen.selected_tile_id() == "rat", "selecting RAT set selected_tile_id() == 'rat'")
	var rat_labels := _collect_labels(screen._detail_body)
	var found_hazard := false
	for lbl in rat_labels:
		if (lbl as Label).text == "Hazard — no yield":
			found_hazard = true
	_check(found_hazard, "RAT detail shows 'Hazard — no yield'")
	_check(not screen._action_buttons.has("detail_action"),
		"a non-catalog hazard (RAT) has NO detail action button")

	# ── A buy-variant detail action label (mirrors getTileDetailViewModel). ──
	# tile_bird_melon is a buy-method FRUIT variant (coinCost 500). Switch to Farm + select it.
	_check(_press(screen, "tab_farm"), "back to Farm tab")
	await process_frame
	_check(_press(screen, "tile_tile_bird_melon"), "pressed the locked buy-variant Melon card")
	await process_frame
	_check(screen.detail_action_label() == "Buy 500 🪙",
		"locked buy-variant detail action label == 'Buy 500 🪙' (got '%s')" % screen.detail_action_label())
	# Coins < 500 → the Buy action is disabled.
	game.coins = 0
	screen.refresh()
	await process_frame
	_check(screen._action_buttons.has("detail_action") and screen._action_buttons["detail_action"].disabled,
		"the Buy action is DISABLED when coins < cost")
	# Grant coins → Buy enabled → pressing it discovers the variant.
	game.coins = 500
	screen.refresh()
	await process_frame
	_check(not screen._action_buttons["detail_action"].disabled, "Buy enabled once affordable")
	_check(_press(screen, "detail_action"), "pressed the 'Buy' detail action")
	await process_frame
	_check(game.is_tile_discovered("tile_bird_melon"), "'Buy' discovered tile_bird_melon")
	_check(screen.detail_action_label() == "Activate",
		"after buying, the detail action flips to 'Activate'")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "tile collection screen hidden after close")

	# Re-opening (open() called again) still renders the current tab's grid (reuses screen).
	screen.open()
	await process_frame
	_check(screen._cards.size() > 0, "re-open still renders the current tab's grid")

	# ── 2. Display-name derivation ────────────────────────────────────────────
	# tile_count() == STRING_KEYS.size()
	_check(TileCollectionScreenScript.tile_count() == total,
		"tile_count() == %d" % total)

	# _derive_display_name unit tests via display_name_for():
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.GRASS) == "Grass",
		"display_name_for(GRASS) == 'Grass'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.WHEAT) == "Wheat",
		"display_name_for(WHEAT) == 'Wheat'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.IRON_ORE) == "Iron Ore",
		"display_name_for(IRON_ORE) == 'Iron Ore'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.RAT) == "Rat",
		"display_name_for(RAT) == 'Rat'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.RUBBLE) == "Rubble",
		"display_name_for(RUBBLE) == 'Rubble'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.OAK) == "Oak",
		"display_name_for(OAK) == 'Oak'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.PHEASANT) == "Pheasant",
		"display_name_for(PHEASANT) == 'Pheasant'")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.DIRT) == "Dirt",
		"display_name_for(DIRT) == 'Dirt' (tile_special_dirt → drop 'special')")
	_check(TileCollectionScreenScript.display_name_for(Constants.Tile.HORSE) == "Horse",
		"display_name_for(HORSE) == 'Horse'")

	# ── 3. ViewRouter — the TILES modal (pure-state assertions) ───────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.TILES)
	_check(r.current_modal() == ViewRouter.Modal.TILES,
		"current_modal() == TILES after open_modal")
	_check(r.is_open(ViewRouter.Modal.TILES), "is_open(TILES) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_tiles := ViewRouter.resolve("tiles")
	_check(bool(d_tiles.get("ok", false)), "resolve('tiles') ok")
	_check(int(d_tiles.get("modal", -1)) == ViewRouter.Modal.TILES,
		"resolve('tiles') modal == TILES")
	_check(int(d_tiles.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('tiles') view == BOARD")

	var d_col := ViewRouter.resolve("collection")
	_check(bool(d_col.get("ok", false)), "resolve('collection') ok (alias)")
	_check(int(d_col.get("modal", -1)) == ViewRouter.Modal.TILES,
		"resolve('collection') modal == TILES")

	_check(ViewRouter.modal_id(ViewRouter.Modal.TILES) == "tiles",
		"modal_id(TILES) == 'tiles'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("tiles"),      "known_ids() contains 'tiles'")
	_check(ids.has("collection"), "known_ids() contains 'collection'")

	# ── 4. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

	_check(main.has_method("_open_tiles"), "Main has _open_tiles()")
	_check(main.has_method("_on_tiles_closed"), "Main has _on_tiles_closed()")
	_check(main._tile_collection_screen == null,
		"_tile_collection_screen lazily created (null before open)")

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_tiles()
	_check(main._tile_collection_screen != null,
		"_open_tiles() lazily created the screen")
	_check(main._tile_collection_screen.visible,
		"tile collection visible after _open_tiles()")
	_check(main._router.current_modal() == ViewRouter.Modal.TILES,
		"_router.current_modal() == TILES after _open_tiles()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._tile_collection_screen
	main._open_tiles()
	_check(main._tile_collection_screen == first_ref,
		"_open_tiles() reuses the one screen")

	# apply_deeplink("tiles") shows it + sets the router modal.
	main.apply_deeplink("board")   # close first
	var ok_tiles: bool = main.apply_deeplink("tiles")
	_check(ok_tiles, "apply_deeplink('tiles') returns true")
	_check(main._tile_collection_screen != null and main._tile_collection_screen.visible,
		"apply_deeplink('tiles') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.TILES,
		"_router.current_modal() == TILES after apply_deeplink('tiles')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._tile_collection_screen.visible,
		"tile collection hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# The live screen renders a non-empty tab-scoped grid (the default Farm tab).
	main._open_tiles()
	await process_frame
	var tc_screen = main._tile_collection_screen
	_check(tc_screen._cards.size() > 0,
		"live screen renders a non-empty grid for the default Farm tab (%d cards)" % tc_screen._cards.size())

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## Collect all Label descendants of `node` into a flat Array. Used to inspect card
## content without knowing the exact tree depth. Avoids lambda captures in headless mode.
func _collect_labels(node: Node) -> Array:
	var out: Array = []
	_collect_labels_rec(node, out)
	return out

func _collect_labels_rec(node: Node, out: Array) -> void:
	if node is Label:
		out.append(node)
	for child in node.get_children():
		_collect_labels_rec(child, out)

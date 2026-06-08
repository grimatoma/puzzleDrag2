extends SceneTree
## Headless tests for the M11 Tile Collection browser (scenes/TileCollectionScreen.gd +
## its wiring into scenes/Main.gd + the ViewRouter.TILES modal). Four layers:
##
##   1. TileCollectionScreen rendering — setup() builds the shell, refresh() renders one
##      card per STRING_KEY tile (tracked in `_cards`), header reads "N tiles in play",
##      a known tile (GRASS) shows derived name "Grass" and "Produces: hay_bundle",
##      a hazard (RAT) shows the no-yield label "Hazard — no yield", a multi-word key
##      (iron_ore → "Iron Ore") is correctly title-cased.
##   2. Display-name derivation — unit-tests _derive_display_name and tile_count().
##   3. ViewRouter — the new TILES modal: resolve("tiles")/("collection"), modal_id
##      round-trip, known_ids() completeness (pure-state assertions).
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

	# Exactly one card per wired tile.
	var total: int = Constants.STRING_KEYS.size()
	_check(screen._cards.size() == total,
		"one rendered card per wired tile (_cards.size() == %d)" % total)

	# Header reads "N tiles in play".
	_check(screen._header_label.text == "%d tiles in play" % total,
		"header reads '%d tiles in play'" % total)

	# Every STRING_KEYS tile has a card.
	var all_have_cards := true
	for tile_val in Constants.STRING_KEYS.keys():
		if not screen._cards.has(int(tile_val)):
			all_have_cards = false
	_check(all_have_cards, "every STRING_KEYS tile has a rendered card in _cards")

	# GRASS card: display name "Grass", produces "hay_bundle".
	# Card structure: PanelContainer[0]=HBoxContainer[1]=VBoxContainer
	# → Label[0] name, Label[1] category, Label[2] produces.
	var grass_card: Variant = screen._cards.get(Constants.Tile.GRASS)
	_check(grass_card != null, "GRASS has a rendered card")
	if grass_card != null:
		var labels := _collect_labels(grass_card as Node)
		var found_name := false
		var found_produces := false
		for lbl in labels:
			if (lbl as Label).text == "Grass":
				found_name = true
			if (lbl as Label).text == "Produces: hay_bundle":
				found_produces = true
		_check(found_name, "GRASS card shows display name 'Grass'")
		_check(found_produces, "GRASS card shows 'Produces: hay_bundle'")

	# RAT card: display name "Rat", shows "Hazard — no yield".
	var rat_card: Variant = screen._cards.get(Constants.Tile.RAT)
	_check(rat_card != null, "RAT has a rendered card")
	if rat_card != null:
		var labels := _collect_labels(rat_card as Node)
		var found_name_rat := false
		var found_hazard := false
		for lbl in labels:
			if (lbl as Label).text == "Rat":
				found_name_rat = true
			if (lbl as Label).text == "Hazard — no yield":
				found_hazard = true
		_check(found_name_rat, "RAT card shows display name 'Rat'")
		_check(found_hazard, "RAT card shows 'Hazard — no yield'")

	# IRON_ORE card: display name "Iron Ore" (multi-word).
	var iron_card: Variant = screen._cards.get(Constants.Tile.IRON_ORE)
	_check(iron_card != null, "IRON_ORE has a rendered card")
	if iron_card != null:
		var labels := _collect_labels(iron_card as Node)
		var found_iron_ore := false
		for lbl in labels:
			if (lbl as Label).text == "Iron Ore":
				found_iron_ore = true
		_check(found_iron_ore, "IRON_ORE card shows display name 'Iron Ore'")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "tile collection screen hidden after close")

	# Re-opening (open() called again) still shows the same card count (reuses screen).
	screen.open()
	await process_frame
	_check(screen._cards.size() == total, "re-open still renders %d cards" % total)

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

	# The screen renders exactly Constants.STRING_KEYS.size() tile entries.
	main._open_tiles()
	await process_frame
	var tc_screen = main._tile_collection_screen
	_check(tc_screen._cards.size() == Constants.STRING_KEYS.size(),
		"live screen renders exactly STRING_KEYS.size() (%d) cards" % Constants.STRING_KEYS.size())

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

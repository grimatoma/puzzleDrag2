extends SceneTree
## B1 — layout invariants for the PRIMARY nav VIEWS (Craft = the crafting screen, Inventory,
## Town map, Cartography, Townsfolk + the relocated Town ledger). Each was a floating parchment
## card with a "✖ Close" button that painted over the persistent HUD top bar; B1 promotes them
## to full-brightness VIEWS: their opaque view backdrop now reserves UiKit.TOPBAR_RESERVE at the
## TOP (so the layer-1 HUD top bar shows above the view) and stops UiKit.NAV_RESERVE short of the
## bottom (so the persistent nav bar shows through), with NO visible card "✖ Close" and a board-
## return affordance on the Town map view.
##
## review-3 — the 🔨 Craft bottom-nav tab now opens the CRAFTING screen (RecipeWikiScreen),
## promoted to a B1 PRIMARY (hidden close), so it's asserted here. The Town ledger (TownScreen)
## is no longer a nav tab (it moved to the ☰ menu + a town-map button) but stays a hidden-close
## VIEW in this family, so it's still asserted.
##
## This suite asserts, for each of the five screens:
##   • the view backdrop is an opaque ColorRect with offset_top == UiKit.TOPBAR_RESERVE and
##     offset_bottom == -UiKit.NAV_RESERVE (the reveal-top-bar / clear-nav contract),
##   • a "close" Button is still registered in _action_buttons (ESC/back + deep-link + the
##     existing per-screen tests rely on it) but is NOT visible (the card close is dropped),
##   • the TownMapScreen additionally exposes a board_requested signal and a visible "board"
##     overlay button (the required board-return affordance, since Close is gone).
##
## Dependency-free harness (mirrors run_router_tests / run_townsfolk_view_tests). Run from
## the godot/ project root:
##   godot --headless --script res://tests/run_primary_views_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const InventoryScreenScript := preload("res://scenes/InventoryScreen.gd")
const TownScreenScript := preload("res://scenes/TownScreen.gd")
const TownMapScreenScript := preload("res://scenes/town/TownMapScreen.gd")
const CartographyScreenScript := preload("res://scenes/CartographyScreen.gd")
const TownsfolkScreenScript := preload("res://scenes/TownsfolkScreen.gd")
const RecipeWikiScreenScript := preload("res://scenes/RecipeWikiScreen.gd")

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Primary nav VIEW layout tests (B1) ──────────────")
	await _run()
	print("────────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## The view backdrop is the opaque full-rect ColorRect filled with the app frame — the FIRST
## ColorRect child of the screen CanvasLayer. Returns null if none is found.
func _find_backdrop(screen: Node) -> ColorRect:
	for child in screen.get_children():
		if child is ColorRect and (child as ColorRect).color == Palette.FRAME_BG:
			return child as ColorRect
	return null

## Assert the reveal-top-bar / clear-nav offsets on a screen's view backdrop.
func _assert_backdrop(screen: Node, label: String) -> void:
	var backdrop := _find_backdrop(screen)
	_check(backdrop != null, "%s: has an opaque FRAME_BG view backdrop" % label)
	if backdrop == null:
		return
	_check(is_equal_approx(backdrop.offset_top, float(UiKit.TOPBAR_RESERVE)),
		"%s: backdrop.offset_top == UiKit.TOPBAR_RESERVE (%d), got %.1f" % [
			label, UiKit.TOPBAR_RESERVE, backdrop.offset_top])
	_check(is_equal_approx(backdrop.offset_bottom, -float(UiKit.NAV_RESERVE)),
		"%s: backdrop.offset_bottom == -UiKit.NAV_RESERVE (%d), got %.1f" % [
			label, UiKit.NAV_RESERVE, backdrop.offset_bottom])

## Assert a "close" Button is still registered (back / ESC / deep-link / per-screen tests
## rely on it) but is NOT visible (the visible card close is dropped on a promoted view).
func _assert_hidden_close(screen: Node, label: String) -> void:
	var close_btn: Variant = screen._action_buttons.get("close")
	_check(close_btn != null, "%s: _action_buttons still has 'close'" % label)
	if close_btn != null:
		_check(not (close_btn as Button).visible,
			"%s: the 'close' button is NOT visible (card close dropped)" % label)

func _run() -> void:
	# A generously-stocked Village-tier game so every screen renders real content.
	var game := GameState.new()
	game.settlement.tier = TownConfig.TIER_VILLAGE
	game.coins = 200
	game.inventory = {"flour": 20, "eggs": 12, "hay_bundle": 20, "plank": 20, "bread": 4, "block": 6}

	# ── 1. Inventory view ─────────────────────────────────────────────────────
	var inv = InventoryScreenScript.new()
	root.add_child(inv)
	inv.setup(game)
	await process_frame
	_assert_backdrop(inv, "Inventory")
	_assert_hidden_close(inv, "Inventory")
	inv.queue_free()

	# ── 2. Town ledger view (TownScreen — now menu/town-map routed, still a B1 view) ──
	var town = TownScreenScript.new()
	root.add_child(town)
	town.setup(game)
	await process_frame
	_assert_backdrop(town, "Town ledger")
	_assert_hidden_close(town, "Town ledger")
	town.queue_free()

	# ── 2b. Craft view (RecipeWikiScreen — the 🔨 Craft bottom-nav tab's target) ──────
	var craft = RecipeWikiScreenScript.new()
	root.add_child(craft)
	craft.setup(game)
	await process_frame
	_assert_backdrop(craft, "Craft")
	_assert_hidden_close(craft, "Craft")
	craft.queue_free()
	await process_frame

	# ── 3. Cartography (world map) view ────────────────────────────────────────
	var carto = CartographyScreenScript.new()
	root.add_child(carto)
	carto.setup(game)
	await process_frame
	_assert_backdrop(carto, "Cartography")
	_assert_hidden_close(carto, "Cartography")
	carto.queue_free()

	# ── 4. Townsfolk roster view ───────────────────────────────────────────────
	var folk = TownsfolkScreenScript.new()
	root.add_child(folk)
	folk.setup(game)
	await process_frame
	_assert_backdrop(folk, "Townsfolk")
	_assert_hidden_close(folk, "Townsfolk")
	folk.queue_free()

	# ── 5. Town map view + the REQUIRED board-return affordance ────────────────
	var townmap = TownMapScreenScript.new()
	root.add_child(townmap)
	townmap.setup(game)
	await process_frame
	_assert_backdrop(townmap, "TownMap")
	_assert_hidden_close(townmap, "TownMap")
	# The Town view also reserves the top band on its map host so the map re-fits below the bar.
	_check(townmap._map_host != null, "TownMap: exposes its map host Control")
	if townmap._map_host != null:
		_check(is_equal_approx(townmap._map_host.offset_top, float(UiKit.TOPBAR_RESERVE)),
			"TownMap: _map_host.offset_top == UiKit.TOPBAR_RESERVE (%d), got %.1f" % [
				UiKit.TOPBAR_RESERVE, townmap._map_host.offset_top])
		_check(is_equal_approx(townmap._map_host.offset_bottom, -float(UiKit.NAV_RESERVE)),
			"TownMap: _map_host.offset_bottom == -UiKit.NAV_RESERVE (%d), got %.1f" % [
				UiKit.NAV_RESERVE, townmap._map_host.offset_bottom])
	# Board-return affordance: a board_requested signal + a visible "board" overlay button.
	_check(townmap.has_signal("board_requested"), "TownMap: has a board_requested signal")
	var board_btn: Variant = townmap._action_buttons.get("board")
	_check(board_btn != null, "TownMap: _action_buttons has a 'board' return button")
	if board_btn != null:
		_check((board_btn as Button).visible, "TownMap: the 'board' button IS visible (discoverable)")
	# Pressing it emits board_requested (the path Main routes to apply_deeplink('board')).
	var emitted := {"v": false}
	townmap.connect("board_requested", func() -> void: emitted["v"] = true)
	if board_btn != null:
		(board_btn as Button).emit_signal("pressed")
		await process_frame
	_check(emitted["v"], "TownMap: pressing 'board' emits board_requested")

	# review-3 — the relocated Town ledger affordance: a visible "📋 Town Ledger" button that
	# emits ledger_requested (Main routes it to apply_deeplink('town') → the TownScreen).
	_check(townmap.has_signal("ledger_requested"), "TownMap: has a ledger_requested signal")
	var ledger_btn: Variant = townmap._action_buttons.get("ledger")
	_check(ledger_btn != null, "TownMap: _action_buttons has a 'ledger' button")
	if ledger_btn != null:
		_check((ledger_btn as Button).visible, "TownMap: the 'ledger' button IS visible (discoverable)")
	var led_emitted := {"v": false}
	townmap.connect("ledger_requested", func() -> void: led_emitted["v"] = true)
	if ledger_btn != null:
		(ledger_btn as Button).emit_signal("pressed")
		await process_frame
	_check(led_emitted["v"], "TownMap: pressing 'Town Ledger' emits ledger_requested")
	townmap.queue_free()
	await process_frame

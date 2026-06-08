extends SceneTree
## B2 — layout invariants for the EIGHT promoted SECONDARY VIEWS (Achievements, Tile
## collection, Recipes, Chronicle, Castle, Charter, Decorations, Portal). Each was a
## semi-transparent SCRIM modal (a parchment card floating over a DIMMED board) reached
## from the ☰ menu "More" section; B2 promotes them to full-brightness VIEWS: their opaque
## view backdrop now reserves UiKit.TOPBAR_RESERVE at the TOP (so the layer-1 HUD top bar
## shows above the view) and stops UiKit.NAV_RESERVE short of the bottom (so the persistent
## nav bar shows through), full-bleed content, and — UNLIKE the B1 PRIMARY views — they KEEP
## a VISIBLE "✕ Close" button (these are menu sub-pages, Close is the legit back-to-board).
##
## This suite asserts, for each of the eight screens:
##   • the view backdrop is an opaque ColorRect (FRAME_BG, alpha 1.0) with
##     offset_top == UiKit.TOPBAR_RESERVE and offset_bottom == -UiKit.NAV_RESERVE,
##   • a "close" Button is registered in _action_buttons AND is VISIBLE (the menu sub-page
##     back-to-board affordance is kept — the opposite of B1's hidden-close primaries).
## Plus a Main integration check that _switch_primary_view (the bottom-nav tab handler)
## hides an open SECONDARY view before opening the target PRIMARY, so tapping a nav tab while
## a secondary is up doesn't leave the higher layer-4 secondary painting over the primary.
##
## Dependency-free harness (mirrors run_primary_views_tests). Run from the godot/ root:
##   godot --headless --script res://tests/run_secondary_views_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const AchievementsScreenScript := preload("res://scenes/AchievementsScreen.gd")
const TileCollectionScreenScript := preload("res://scenes/TileCollectionScreen.gd")
const RecipeWikiScreenScript := preload("res://scenes/RecipeWikiScreen.gd")
const ChronicleScreenScript := preload("res://scenes/ChronicleScreen.gd")
const CastleScreenScript := preload("res://scenes/CastleScreen.gd")
const CharterScreenScript := preload("res://scenes/CharterScreen.gd")
const DecorationsScreenScript := preload("res://scenes/DecorationsScreen.gd")
const PortalScreenScript := preload("res://scenes/PortalScreen.gd")

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
	print("\n── Secondary VIEW layout tests (B2) ────────────────")
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

## Assert the reveal-top-bar / clear-nav offsets + full opacity on a screen's view backdrop.
func _assert_backdrop(screen: Node, label: String) -> void:
	var backdrop := _find_backdrop(screen)
	_check(backdrop != null, "%s: has an opaque FRAME_BG view backdrop" % label)
	if backdrop == null:
		return
	# Opaque (not a dim scrim) — the board no longer shows DIMMED behind the page.
	_check(is_equal_approx(backdrop.color.a, 1.0),
		"%s: backdrop is opaque (alpha == 1.0), got %.3f" % [label, backdrop.color.a])
	_check(is_equal_approx(backdrop.offset_top, float(UiKit.TOPBAR_RESERVE)),
		"%s: backdrop.offset_top == UiKit.TOPBAR_RESERVE (%d), got %.1f" % [
			label, UiKit.TOPBAR_RESERVE, backdrop.offset_top])
	_check(is_equal_approx(backdrop.offset_bottom, -float(UiKit.NAV_RESERVE)),
		"%s: backdrop.offset_bottom == -UiKit.NAV_RESERVE (%d), got %.1f" % [
			label, UiKit.NAV_RESERVE, backdrop.offset_bottom])

## Assert a "close" Button is registered AND visible (menu sub-pages KEEP the back-to-board
## affordance — the opposite of B1's hidden-close primary views).
func _assert_visible_close(screen: Node, label: String) -> void:
	var close_btn: Variant = screen._action_buttons.get("close")
	_check(close_btn != null, "%s: _action_buttons has 'close'" % label)
	if close_btn != null:
		_check((close_btn as Button).visible,
			"%s: the 'close' button IS visible (menu sub-page keeps it)" % label)

## Build a screen, render it, and assert the B2 contract.
func _assert_screen(screen: Node, label: String) -> void:
	root.add_child(screen)
	screen.setup(_game)
	await process_frame
	screen.open()
	await process_frame
	_assert_backdrop(screen, label)
	_assert_visible_close(screen, label)
	screen.queue_free()
	await process_frame

var _game: GameState

func _run() -> void:
	# A generously-stocked Village-tier game so every screen renders real content.
	_game = GameState.new()
	_game.settlement.tier = TownConfig.TIER_VILLAGE
	_game.coins = 4000
	_game.inventory = {"flour": 20, "eggs": 12, "hay_bundle": 20, "plank": 20,
		"bread": 4, "block": 6, "soup": 8, "supplies": 6}

	# ── 1. Each secondary screen, in isolation ─────────────────────────────────
	await _assert_screen(AchievementsScreenScript.new(), "Achievements")
	await _assert_screen(TileCollectionScreenScript.new(), "Tile collection")
	await _assert_screen(RecipeWikiScreenScript.new(), "Recipes")
	await _assert_screen(ChronicleScreenScript.new(), "Chronicle")
	await _assert_screen(CastleScreenScript.new(), "Castle")
	await _assert_screen(CharterScreenScript.new(), "Charter")
	await _assert_screen(DecorationsScreenScript.new(), "Decorations")
	await _assert_screen(PortalScreenScript.new(), "Portal")

	# ── 2. Main integration — a nav-tab switch hides an open secondary view ─────
	# Opening a secondary (Achievements) then switching to a PRIMARY (Town) via the bottom-nav
	# handler _switch_primary_view must dismiss the secondary first, otherwise the higher
	# layer-4 secondary would paint over the primary the nav just opened.
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_switch_primary_view"), "Main has _switch_primary_view()")

	# Open the Achievements secondary view.
	var ok_ach: bool = main.apply_deeplink("achievements")
	_check(ok_ach, "apply_deeplink('achievements') opens the secondary view")
	_check(main._achievements_screen != null and main._achievements_screen.visible,
		"achievements secondary is visible before the nav switch")

	# Tap the Craft/Town primary nav tab (routes through _switch_primary_view).
	main._switch_primary_view("_open_town")
	await process_frame
	_check(not main._achievements_screen.visible,
		"_switch_primary_view hides the open secondary (achievements)")
	_check(main._town_screen != null and main._town_screen.visible,
		"_switch_primary_view opens the target primary (Town) on top")

	# A second secondary (Charter) → switch to a DIFFERENT primary (Inventory) also dismisses it.
	main.apply_deeplink("charter")
	await process_frame
	_check(main._charter_screen != null and main._charter_screen.visible,
		"charter secondary is visible before the second nav switch")
	main._switch_primary_view("_open_inventory")
	await process_frame
	_check(not main._charter_screen.visible,
		"_switch_primary_view hides the open secondary (charter)")
	_check(main._inventory_screen != null and main._inventory_screen.visible,
		"_switch_primary_view opens the target primary (Inventory) on top")

	# The ☰ menu still opens each secondary correctly via the shared deep-link path, and
	# ESC/back (apply_deeplink('board')) still closes them.
	for id in ["achievements", "tiles", "recipes", "chronicle", "castle", "charter",
			"decorations", "portal"]:
		var opened: bool = main.apply_deeplink(id)
		_check(opened, "apply_deeplink('%s') opens the secondary" % id)
		var back: bool = main.apply_deeplink("board")
		_check(back, "apply_deeplink('board') closes '%s' (ESC/back)" % id)
		_check(main._router.current_modal() == ViewRouter.Modal.NONE,
			"router resets to NONE after closing '%s'" % id)

	main.queue_free()
	await process_frame
	SaveManager.clear()

extends SceneTree
## Headless tests for the CARTOGRAPHY world map — the 3-zone world view + the alternate
## travel-to-expedition entry. Run from the godot/ project root:
##   godot --headless --script res://tests/run_cartography_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Layers:
##   1. CartographyConfig pure data — 3 zones (home/mine/harbor) with the right biomes,
##      the 2 hub edges, by_id(), and current_id() mapping (farm→home / mine→mine /
##      harbor→harbor, unknown→home).
##   2. ViewRouter pure-state — the new CARTOGRAPHY modal + resolve("cartography"/"world"),
##      modal_id(CARTOGRAPHY), and known_ids() coverage. "map" still → TOWNMAP (untouched).
##   3. Main integration (like run_townmap_tests) — _open_cartography() lazily creates +
##      shows _cartography_screen and reuses it; apply_deeplink("cartography") shows it with
##      the router in CARTOGRAPHY; apply_deeplink("board") closes it; the screen marks the
##      CURRENT zone from active_biome; the mine/harbor travel buttons are DISABLED when
##      town2_complete is false and ENABLED when town2_complete + supplies + on the farm;
##      and pressing an enabled mine button actually enters the mine (board pool swapped).

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
	print("\n── Cartography world map tests ────────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. CartographyConfig pure data ────────────────────────────────────────
	var zones := CartographyConfig.all()
	_check(zones.size() == 3, "CartographyConfig.all() has 3 zones (got %d)" % zones.size())
	var ids: Array = []
	for z in zones:
		ids.append(String(z.get("id", "")))
	_check(ids.has("home") and ids.has("mine") and ids.has("harbor"),
		"zones are home / mine / harbor (got %s)" % str(ids))
	# biome mapping per zone
	_check(String(CartographyConfig.by_id("home").get("biome", "")) == "farm",
		"home zone maps to the 'farm' biome")
	_check(String(CartographyConfig.by_id("mine").get("biome", "")) == "mine",
		"mine zone maps to the 'mine' biome")
	_check(String(CartographyConfig.by_id("harbor").get("biome", "")) == "harbor",
		"harbor zone maps to the 'harbor' biome")
	_check(CartographyConfig.by_id("nope").is_empty(), "by_id('nope') returns an empty dict")
	# kinds drive the screen tint
	_check(String(CartographyConfig.by_id("home").get("kind", "")) == "home", "home kind == 'home'")
	_check(String(CartographyConfig.by_id("mine").get("kind", "")) == "mine", "mine kind == 'mine'")
	_check(String(CartographyConfig.by_id("harbor").get("kind", "")) == "harbor", "harbor kind == 'harbor'")
	# edges: home is the hub for both expeditions
	var edges := CartographyConfig.EDGES
	_check(edges.size() == 2, "CartographyConfig.EDGES has 2 edges (got %d)" % edges.size())
	_check(_has_edge(edges, "home", "mine"), "EDGES contains [home, mine]")
	_check(_has_edge(edges, "home", "harbor"), "EDGES contains [home, harbor]")
	# current_id mapping
	_check(CartographyConfig.current_id("farm") == "home", "current_id('farm') == 'home'")
	_check(CartographyConfig.current_id("mine") == "mine", "current_id('mine') == 'mine'")
	_check(CartographyConfig.current_id("harbor") == "harbor", "current_id('harbor') == 'harbor'")
	_check(CartographyConfig.current_id("???") == "home", "current_id(unknown) falls back to 'home'")

	# ── 2. ViewRouter pure-state for the new CARTOGRAPHY modal ─────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.CARTOGRAPHY)
	_check(r.current_modal() == ViewRouter.Modal.CARTOGRAPHY,
		"open_modal(CARTOGRAPHY) → current_modal() == CARTOGRAPHY")
	_check(r.is_open(ViewRouter.Modal.CARTOGRAPHY), "is_open(CARTOGRAPHY) == true after open")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() → NONE")

	var d_carto := ViewRouter.resolve("cartography")
	_check(bool(d_carto.get("ok", false)), "resolve('cartography') ok")
	_check(int(d_carto.get("modal", -1)) == ViewRouter.Modal.CARTOGRAPHY,
		"resolve('cartography') modal == CARTOGRAPHY")
	var d_world := ViewRouter.resolve("world")
	_check(bool(d_world.get("ok", false)), "resolve('world') ok")
	_check(int(d_world.get("modal", -1)) == ViewRouter.Modal.CARTOGRAPHY,
		"resolve('world') modal == CARTOGRAPHY")
	_check(ViewRouter.modal_id(ViewRouter.Modal.CARTOGRAPHY) == "cartography",
		"modal_id(CARTOGRAPHY) == 'cartography'")
	var known := ViewRouter.known_ids()
	_check(known.has("cartography"), "known_ids() contains 'cartography'")
	_check(known.has("world"), "known_ids() contains 'world'")
	# The existing "map" → TOWNMAP routing is UNTOUCHED.
	_check(int(ViewRouter.resolve("map").get("modal", -1)) == ViewRouter.Modal.TOWNMAP,
		"resolve('map') still → TOWNMAP (town building map untouched)")

	# ── 3. Main integration ────────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

	_check(main.has_method("_open_cartography"), "Main has _open_cartography()")
	_check(main.has_method("_on_cartography_closed"), "Main has _on_cartography_closed()")
	_check(main.has_method("_on_cartography_travel"), "Main has _on_cartography_travel()")
	_check(main._cartography_screen == null, "cartography screen is lazily created (null before open)")

	# Opening lazily creates + shows it.
	main._open_cartography()
	await process_frame
	_check(main._cartography_screen != null, "_open_cartography() lazily created the screen")
	_check(main._cartography_screen.visible, "cartography screen visible after _open_cartography()")
	_check(main._router.current_modal() == ViewRouter.Modal.CARTOGRAPHY,
		"_router.current_modal() == CARTOGRAPHY after _open_cartography()")

	# A second open() reuses the SAME screen (no duplicate child).
	var first_ref = main._cartography_screen
	main._open_cartography()
	_check(main._cartography_screen == first_ref, "_open_cartography() reuses the one screen")

	# apply_deeplink("cartography") shows it; router in CARTOGRAPHY.
	main._cartography_screen.visible = false      # reset so the deeplink re-shows it
	var ok_carto: bool = main.apply_deeplink("cartography")
	_check(ok_carto, "apply_deeplink('cartography') returns true")
	_check(main._cartography_screen.visible, "screen visible after apply_deeplink('cartography')")
	_check(main._router.current_modal() == ViewRouter.Modal.CARTOGRAPHY,
		"_router.current_modal() == CARTOGRAPHY after apply_deeplink('cartography')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._cartography_screen.visible, "screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	# ── 3b. the screen marks the CURRENT zone from active_biome ────────────────
	var screen = main._cartography_screen
	# On the farm → home is current.
	main.game.active_biome = "farm"
	screen.open()
	await process_frame
	_check(screen.current_zone_id() == "home", "active_biome 'farm' → current zone 'home'")
	_check(screen.is_current("home"), "is_current('home') true on the farm")
	_check(not screen.is_current("mine"), "is_current('mine') false on the farm")
	# In the mine → mine is current.
	main.game.active_biome = "mine"
	screen.open()
	await process_frame
	_check(screen.current_zone_id() == "mine", "active_biome 'mine' → current zone 'mine'")
	_check(screen.is_current("mine"), "is_current('mine') true in the mine")
	# Back to the farm for the gating + travel checks.
	main.game.active_biome = "farm"

	# ── 3c. travel buttons gate on town2_complete + the launch guard ───────────
	# town2_complete FALSE → both expedition buttons disabled (locked), regardless of supplies.
	main.game.town2_complete = false
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory = {"supplies": 5}
	screen.open()
	await process_frame
	_check(not screen.zone_is_travelable("mine"), "mine NOT travelable when town2_complete false")
	_check(not screen.zone_is_travelable("harbor"), "harbor NOT travelable when town2_complete false")
	_check(screen._action_buttons.get("travel:mine", null) == null,
		"no enabled travel:mine button when locked")
	_check(screen._action_buttons.get("travel:harbor", null) == null,
		"no enabled travel:harbor button when locked")
	# zone_state (map node tint + legend + road style): home is the lit hearth, the two
	# expeditions read LOCKED (dashed waiting roads) while the boss is up.
	_check(screen.zone_state("home") == "current", "zone_state('home') == 'current' on the farm")
	_check(screen.zone_state("mine") == "locked", "zone_state('mine') == 'locked' (boss not down)")
	_check(screen.zone_state("harbor") == "locked", "zone_state('harbor') == 'locked' (boss not down)")

	# town2_complete TRUE + City tier + supplies + on the farm → both ENABLED.
	main.game.town2_complete = true
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory = {"supplies": 5}
	main.game.active_biome = "farm"
	screen.open()
	await process_frame
	_check(screen.zone_is_travelable("mine"), "mine travelable when town2_complete + City + supplies + on farm")
	_check(screen.zone_is_travelable("harbor"), "harbor travelable when town2_complete + supplies + on farm")
	_check(screen._action_buttons.has("travel:mine"), "enabled travel:mine button registered")
	_check(screen._action_buttons.has("travel:harbor"), "enabled travel:harbor button registered")
	_check(not screen._action_buttons["travel:mine"].disabled, "travel:mine button is enabled")
	_check(not screen._action_buttons["travel:harbor"].disabled, "travel:harbor button is enabled")
	# zone_state now reads the two expeditions as READY (gold-rimmed nodes, solid roads).
	_check(screen.zone_state("mine") == "ready", "zone_state('mine') == 'ready' (boss down)")
	_check(screen.zone_state("harbor") == "ready", "zone_state('harbor') == 'ready' (boss down)")

	# ── 3d. pressing an enabled mine travel button enters the mine ─────────────
	_check(not main.game.is_in_mine(), "not in the mine before travel")
	# Drive the travel button the way a click would (emits travel_requested → Main handler).
	screen._action_buttons["travel:mine"].emit_signal("pressed")
	await process_frame
	_check(main.game.is_in_mine(), "game.is_in_mine() true after pressing travel:mine")
	# The biome refresh (_on_town_changed) pushed the active-biome pool onto the board. While
	# in the mine that pool is MINE_POOL (+ rubble slots), so it differs from FARM_POOL and
	# matches the live active_biome_pool() — assert both so the swap is unambiguous.
	_check(main.board.tile_pool == main.game.active_biome_pool(),
		"board pool swapped to the mine pool after travel (biome refresh ran)")
	_check(main.board.tile_pool != Constants.FARM_POOL,
		"board pool is no longer the farm pool after travel")
	_check(not main._cartography_screen.visible, "the world map closed itself on travel")

	SaveManager.clear()

# True when `edges` contains [a, b] in either order.
func _has_edge(edges: Array, a: String, b: String) -> bool:
	for e in edges:
		var ea: String = String(e[0])
		var eb: String = String(e[1])
		if (ea == a and eb == b) or (ea == b and eb == a):
			return true
	return false

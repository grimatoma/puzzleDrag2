extends SceneTree
## Headless tests for M5b — ViewRouter nav state machine + deep-link entry.
##
##   1. Pure state machine on ViewRouter.new() — initial state, open_modal,
##      close_modal, is_open, current_modal.
##   2. Deep-link resolve() — all known ids map to the right intent; unknown id
##      returns not-ok; modal_id() round-trips; known_ids() is complete.
##   3. Main integration — apply_deeplink() creates + shows the right screen;
##      "board" closes the open modal and resets router state.
##
## Same dependency-free harness as the other run_*.gd suites.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_router_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

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
	print("\n── ViewRouter (M5b) tests ──────────────────────────")

	# ── 1. Pure state machine ─────────────────────────────────────────────────
	var r := ViewRouter.new()

	# Initial state
	_check(r.view  == ViewRouter.View.BOARD,  "initial view == BOARD")
	_check(r.modal == ViewRouter.Modal.NONE,  "initial modal == NONE")
	_check(r.current_modal() == ViewRouter.Modal.NONE, "current_modal() == NONE initially")
	_check(not r.is_open(ViewRouter.Modal.TOWN), "is_open(TOWN) == false initially")

	# open_modal(TOWN)
	r.open_modal(ViewRouter.Modal.TOWN)
	_check(r.current_modal() == ViewRouter.Modal.TOWN, "current_modal() == TOWN after open")
	_check(r.is_open(ViewRouter.Modal.TOWN),  "is_open(TOWN) == true after open_modal(TOWN)")
	_check(not r.is_open(ViewRouter.Modal.MENU), "is_open(MENU) == false while TOWN open")

	# open_modal(MENU) switches modal
	r.open_modal(ViewRouter.Modal.MENU)
	_check(r.current_modal() == ViewRouter.Modal.MENU, "current_modal() switches to MENU")
	_check(r.is_open(ViewRouter.Modal.MENU),  "is_open(MENU) == true after switch")
	_check(not r.is_open(ViewRouter.Modal.TOWN), "is_open(TOWN) == false after switch to MENU")

	# open_modal(INVENTORY)
	r.open_modal(ViewRouter.Modal.INVENTORY)
	_check(r.current_modal() == ViewRouter.Modal.INVENTORY, "current_modal() == INVENTORY")
	_check(r.is_open(ViewRouter.Modal.INVENTORY), "is_open(INVENTORY) == true")

	# close_modal -> NONE
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "current_modal() == NONE after close")
	_check(not r.is_open(ViewRouter.Modal.INVENTORY), "is_open(INVENTORY) == false after close")

	# view field is unchanged throughout modal operations
	_check(r.view == ViewRouter.View.BOARD, "view stays BOARD throughout modal operations")

	# ── 2. Deep-link resolve() ────────────────────────────────────────────────
	# "" → board / NONE
	var d_empty := ViewRouter.resolve("")
	_check(bool(d_empty.get("ok", false)),  "resolve('') ok")
	_check(int(d_empty.get("view",  -1)) == ViewRouter.View.BOARD,  "resolve('') view == BOARD")
	_check(int(d_empty.get("modal", -1)) == ViewRouter.Modal.NONE, "resolve('') modal == NONE")

	# "board" → board / NONE
	var d_board := ViewRouter.resolve("board")
	_check(bool(d_board.get("ok", false)),  "resolve('board') ok")
	_check(int(d_board.get("modal", -1)) == ViewRouter.Modal.NONE, "resolve('board') modal == NONE")

	# "town" → TOWN modal
	var d_town := ViewRouter.resolve("town")
	_check(bool(d_town.get("ok", false)),  "resolve('town') ok")
	_check(int(d_town.get("modal", -1)) == ViewRouter.Modal.TOWN,  "resolve('town') modal == TOWN")
	_check(int(d_town.get("view",  -1)) == ViewRouter.View.BOARD,  "resolve('town') view == BOARD")

	# "menu" → MENU modal
	var d_menu := ViewRouter.resolve("menu")
	_check(bool(d_menu.get("ok", false)),  "resolve('menu') ok")
	_check(int(d_menu.get("modal", -1)) == ViewRouter.Modal.MENU,  "resolve('menu') modal == MENU")

	# "inventory" → INVENTORY modal
	var d_inv := ViewRouter.resolve("inventory")
	_check(bool(d_inv.get("ok", false)),   "resolve('inventory') ok")
	_check(int(d_inv.get("modal", -1)) == ViewRouter.Modal.INVENTORY, "resolve('inventory') modal == INVENTORY")

	# "items" is an alias for inventory
	var d_items := ViewRouter.resolve("items")
	_check(bool(d_items.get("ok", false)), "resolve('items') ok")
	_check(int(d_items.get("modal", -1)) == ViewRouter.Modal.INVENTORY, "resolve('items') modal == INVENTORY")

	# review-3 — "craft"/"crafting" resolve to the CRAFTING UI (RecipeWikiScreen = RECIPES modal),
	# matching the 🔨 Craft bottom-nav tab. The ledger ("town"/"ledger") is its own TOWN modal.
	var d_craft := ViewRouter.resolve("craft")
	_check(bool(d_craft.get("ok", false)), "resolve('craft') ok")
	_check(int(d_craft.get("modal", -1)) == ViewRouter.Modal.RECIPES,
		"resolve('craft') modal == RECIPES (crafting UI)")
	var d_crafting := ViewRouter.resolve("crafting")
	_check(int(d_crafting.get("modal", -1)) == ViewRouter.Modal.RECIPES,
		"resolve('crafting') modal == RECIPES (alias)")
	var d_ledger := ViewRouter.resolve("ledger")
	_check(bool(d_ledger.get("ok", false)), "resolve('ledger') ok")
	_check(int(d_ledger.get("modal", -1)) == ViewRouter.Modal.TOWN,
		"resolve('ledger') modal == TOWN (town ledger, alias of 'town')")

	# Unknown id → not-ok
	var d_bad := ViewRouter.resolve("unknown_xyz")
	_check(not bool(d_bad.get("ok", true)), "resolve(unknown) returns ok=false")

	# modal_id() round-trips
	_check(ViewRouter.modal_id(ViewRouter.Modal.NONE)      == "board",     "modal_id(NONE) == 'board'")
	_check(ViewRouter.modal_id(ViewRouter.Modal.TOWN)      == "town",      "modal_id(TOWN) == 'town'")
	_check(ViewRouter.modal_id(ViewRouter.Modal.MENU)      == "menu",      "modal_id(MENU) == 'menu'")
	_check(ViewRouter.modal_id(ViewRouter.Modal.INVENTORY) == "inventory", "modal_id(INVENTORY) == 'inventory'")

	# id_from_hash() — the web Back/Forward bridge's hash parser (pure + static).
	_check(ViewRouter.id_from_hash("#/inventory") == "inventory", "id_from_hash('#/inventory') == 'inventory'")
	_check(ViewRouter.id_from_hash("#inventory")  == "inventory", "id_from_hash('#inventory') == 'inventory' (no slash)")
	_check(ViewRouter.id_from_hash("#/town")      == "town",      "id_from_hash('#/town') == 'town'")
	_check(ViewRouter.id_from_hash("#/items")     == "items",     "id_from_hash keeps the 'items' alias verbatim")
	_check(ViewRouter.id_from_hash("")            == "board",     "id_from_hash('') falls back to 'board'")
	_check(ViewRouter.id_from_hash("#/")          == "board",     "id_from_hash('#/') falls back to 'board'")
	_check(ViewRouter.id_from_hash("#/board")     == "board",     "id_from_hash('#/board') == 'board'")
	_check(ViewRouter.id_from_hash("#/garbage")   == "board",     "id_from_hash(unknown id) falls back to 'board'")
	_check(ViewRouter.id_from_hash("  #/menu  ")  == "menu",      "id_from_hash trims surrounding whitespace")

	# known_ids() contains the canonical set
	var ids := ViewRouter.known_ids()
	_check(ids.has(""),          "known_ids() contains ''")
	_check(ids.has("board"),     "known_ids() contains 'board'")
	_check(ids.has("town"),      "known_ids() contains 'town'")
	_check(ids.has("ledger"),    "known_ids() contains 'ledger'")
	_check(ids.has("craft"),     "known_ids() contains 'craft'")
	_check(ids.has("crafting"),  "known_ids() contains 'crafting'")
	_check(ids.has("menu"),      "known_ids() contains 'menu'")
	_check(ids.has("inventory"), "known_ids() contains 'inventory'")
	_check(ids.has("items"),     "known_ids() contains 'items'")

	# ── 3. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame

	_check(main.has_method("apply_deeplink"), "Main has apply_deeplink()")

	# apply_deeplink("inventory") → creates + shows _inventory_screen; router updated
	var ok_inv: bool = main.apply_deeplink("inventory")
	_check(ok_inv, "apply_deeplink('inventory') returns true")
	_check(main._inventory_screen != null, "apply_deeplink('inventory') created _inventory_screen")
	_check(main._inventory_screen is InventoryScreen, "_inventory_screen is InventoryScreen")
	_check(main._inventory_screen.visible, "_inventory_screen is visible after deeplink")
	_check(main._router.current_modal() == ViewRouter.Modal.INVENTORY,
		"_router.current_modal() == INVENTORY after apply_deeplink('inventory')")

	# apply_deeplink("town") → creates + shows _town_screen; router updated
	var ok_town: bool = main.apply_deeplink("town")
	_check(ok_town, "apply_deeplink('town') returns true")
	_check(main._town_screen != null, "apply_deeplink('town') created _town_screen")
	_check(main._town_screen.visible, "_town_screen is visible after deeplink")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWN,
		"_router.current_modal() == TOWN after apply_deeplink('town')")

	# ── review-3 — the 🔨 Craft nav tab opens the CRAFTING UI, NOT the Town ledger ──
	# Simulate tapping the bottom-nav "craft" tab (the path the HUD emits → _on_nav_selected).
	# It must open the RecipeWikiScreen crafting screen (RECIPES modal) and NOT the TownScreen.
	main._on_nav_selected("craft")
	await process_frame
	_check(main._recipe_wiki_screen != null and main._recipe_wiki_screen.visible,
		"craft nav tap opens the crafting screen (RecipeWikiScreen)")
	_check(main._router.current_modal() == ViewRouter.Modal.RECIPES,
		"craft nav tap → _router.current_modal() == RECIPES (crafting UI, not TOWN)")
	_check(main._town_screen == null or not main._town_screen.visible,
		"craft nav tap does NOT open the Town ledger (TownScreen hidden)")

	# The Town ledger is still reachable via the deep-link (the ☰ menu + town-map button route here).
	main.apply_deeplink("town")
	await process_frame
	_check(main._town_screen != null and main._town_screen.visible,
		"Town ledger reachable via apply_deeplink('town') after the craft re-route")
	_check(not main._recipe_wiki_screen.visible,
		"opening the Town ledger (a sibling primary) hides the crafting screen")
	# The town-map "📋 Town Ledger" button emits ledger_requested → Main opens the TownScreen.
	main.apply_deeplink("map")
	await process_frame
	main._townmap_screen.emit_signal("ledger_requested")
	await process_frame
	_check(main._town_screen != null and main._town_screen.visible,
		"town-map 'Town Ledger' button (ledger_requested) opens the TownScreen")
	_check(main._townmap_screen == null or not main._townmap_screen.visible,
		"opening the ledger from the map hides the town map (sibling primary)")

	# Task C — board RUN-GATE. The board is only reachable while a bounded farm run is live (town
	# is home). With NO run active, apply_deeplink("board") redirects to the town home (and leaves
	# the board inert) rather than landing on an empty board, so it routes to TOWNMAP, not NONE.
	main.game.farm_run_active = false
	var ok_board_no_run: bool = main.apply_deeplink("board")
	_check(ok_board_no_run, "apply_deeplink('board') returns true even with no run")
	_check(main._router.current_modal() == ViewRouter.Modal.TOWNMAP,
		"no run: apply_deeplink('board') redirects to the town home (TOWNMAP)")
	_check(not main.board.active, "no run: the board is left INERT (board.active == false)")

	# With a run ACTIVE, apply_deeplink("board") reaches the board: closes the open modal, resets
	# the router to NONE, and flips the board live.
	main.game.farm_run_active = true
	main._open_town()   # re-open a modal so the board return has something to close
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"run active: _router.current_modal() == NONE after apply_deeplink('board')")
	_check(main._town_screen == null or not main._town_screen.visible,
		"run active: _town_screen hidden after apply_deeplink('board')")
	_check(main.board.active, "run active: the board is LIVE (board.active == true)")

	# apply_deeplink with an unknown id returns false
	var ok_bad: bool = main.apply_deeplink("totally_unknown")
	_check(not ok_bad, "apply_deeplink(unknown) returns false")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

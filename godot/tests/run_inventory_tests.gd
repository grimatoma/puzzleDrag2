extends SceneTree
## Headless tests for the M4g dedicated Inventory ledger (scenes/InventoryScreen.gd +
## its wiring into scenes/Main.gd). Three layers:
##
##   1. InventoryScreen ledger math — total_value() sums count × MarketConfig.sell_price
##      over owned SELLABLE resources (non-sellable like `supplies` contribute 0);
##      kinds() / total_units() count distinct owned resources + total individual units;
##      group_of(res) routes each resource to "Farm Goods" / "Refined" / "Mine" / "Other".
##   2. InventoryScreen wiring — the modal builds, exposes the "close" action button,
##      and pressing it fires `closed` + hides the modal. An empty inventory yields a
##      zeroed ledger and refresh() doesn't error.
##   3. Main integration — the real Main scene wires _open_inventory(), which lazily
##      creates a non-null InventoryScreen member.
##
## Same dependency-free harness as tests/run_menu_tests.gd; `class_name` globals are
## referenced directly (GameState/InventoryScreen/MarketConfig are registered after
## --import). Run from the godot/ project root:
##   godot --headless --script res://tests/run_inventory_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

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
	print("\n── Inventory ledger (M4g) tests ───────────────────")

	# ── 1. InventoryScreen ledger math + wiring ───────────────────────────────
	# A test inventory with one resource per group + a non-sellable (supplies).
	#   hay_bundle 12  → Farm goods, sell 1  → 12
	#   bread       3  → Refined,    sell 5  → 15
	#   block       5  → Mine,       sell 10 → 50
	#   supplies    2  → Refined,    NOT sellable → 0
	# total_value = 12 + 15 + 50 + 0 = 77 ; kinds = 4 ; total_units = 12+3+5+2 = 22
	var game := GameState.new()
	game.inventory = {"hay_bundle": 12, "bread": 3, "block": 5, "supplies": 2}

	var inv := InventoryScreen.new()
	root.add_child(inv)
	inv.setup(game)
	await process_frame
	inv.open()
	inv.connect("closed", Callable(self, "_on_closed"))

	_check(inv.visible, "inventory screen is visible after open()")
	_check(inv._action_buttons.has("close"), "_action_buttons has 'close'")

	# Grouping — one assertion per group + an unknown key routes to "Other".
	_check(inv.group_of("hay_bundle") == "Farm Goods", "group_of(hay_bundle) == 'Farm Goods'")
	_check(inv.group_of("flour") == "Farm Goods", "group_of(flour) == 'Farm Goods'")
	_check(inv.group_of("horseshoe") == "Farm Goods", "group_of(horseshoe) == 'Farm Goods'")
	_check(inv.group_of("bread") == "Refined", "group_of(bread) == 'Refined'")
	_check(inv.group_of("supplies") == "Refined", "group_of(supplies) == 'Refined'")
	_check(inv.group_of("block") == "Mine", "group_of(block) == 'Mine'")
	_check(inv.group_of("iron_bar") == "Mine", "group_of(iron_bar) == 'Mine'")
	_check(inv.group_of("cut_gem") == "Mine", "group_of(cut_gem) == 'Mine'")
	_check(inv.group_of("dirt") == "Mine", "group_of(dirt) == 'Mine'")
	_check(inv.group_of("widget_xyz") == "Other", "group_of(unknown) == 'Other'")

	# Ledger math on the test inventory.
	_check(inv.total_value() == 77, "total_value() == 77 (12 + 15 + 50, supplies = 0)")
	_check(inv.kinds() == 4, "kinds() == 4")
	_check(inv.total_units() == 22, "total_units() == 22 (12 + 3 + 5 + 2)")

	# Sanity-pin the price assumptions the 77 relies on (so a price retune flags here).
	_check(MarketConfig.sell_price("hay_bundle") == 1, "MarketConfig hay_bundle sell == 1")
	_check(MarketConfig.sell_price("bread") == 5, "MarketConfig bread sell == 5")
	_check(MarketConfig.sell_price("block") == 10, "MarketConfig block sell == 10")
	_check(not MarketConfig.can_sell("supplies"), "supplies is NOT sellable")
	_check(inv.total_value() == 12 * 1 + 3 * 5 + 5 * 10, "total_value() == hand-computed line sum")

	# A zero-count entry never inflates kinds()/total_units()/total_value().
	game.inventory["pie"] = 0
	inv.refresh()
	_check(inv.kinds() == 4, "kinds() ignores a zero-count entry")
	_check(inv.total_units() == 22, "total_units() ignores a zero-count entry")
	_check(inv.total_value() == 77, "total_value() ignores a zero-count entry")
	game.inventory.erase("pie")

	# refresh() rebuilt the body without error and produced at least the three group
	# sections + footer (so the body has real children, not an empty/placeholder list).
	inv.refresh()
	_check(inv._body != null and inv._body.get_child_count() > 0, "refresh() populated the body")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(inv, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not inv.visible, "inventory hidden after close")

	# ── 1b. Category tabs + per-tab search (C1) ───────────────────────────────
	# A game with resources AND owned tools so every tab + the search has real data.
	var tabbed_game := GameState.new()
	tabbed_game.inventory = {"hay_bundle": 12, "bread": 3, "block": 5}
	tabbed_game.grant_tool("scythe", 2)
	tabbed_game.grant_tool("bomb", 1)
	tabbed_game.grant_tool("rake", 1)

	var tab_inv := InventoryScreen.new()
	root.add_child(tab_inv)
	tab_inv.setup(tabbed_game)
	await process_frame
	tab_inv.open()

	# Tab set — All / Resources / Tools / Items, in order, and the buttons are registered.
	# The Items tab surfaces the port's real special valuables (runes / influence).
	_check(tab_inv.tab_ids() == ["all", "resources", "tools", "items"],
		"tab_ids() == [all, resources, tools, items]")
	_check(tab_inv._tab_buttons.has("all") and tab_inv._tab_buttons.has("resources")
		and tab_inv._tab_buttons.has("tools") and tab_inv._tab_buttons.has("items"),
		"_tab_buttons has all four tab buttons")
	_check(tab_inv._tab == "all", "default tab is 'all'")

	# View toggle (list ↔ grid) — present + defaults to list; switching re-renders.
	_check(tab_inv._action_buttons.has("view_toggle"), "_action_buttons has 'view_toggle'")
	_check(tab_inv.view_mode() == "list", "default view mode is 'list'")
	tab_inv.set_view("grid")
	_check(tab_inv.view_mode() == "grid", "set_view('grid') switched the view mode")
	# The grid view renders a VBox of GRID_COLS-wide chip rows for the active (All) tab.
	var grid_kids := tab_inv._body.get_child_count()
	_check(grid_kids >= 1, "grid view populated the body")
	_check(not tab_inv._grid_entries().is_empty(), "grid view has chip entries on the All tab")

	# Grid expansion (same treatment as the crafting grid): tapping a chip drops a full-width
	# detail card below its row, with an ▲ pointing back at the originating chip — the surrounding
	# chips never shift. The card reuses the list-row detail body (eyebrow + live Sell/Buy actions).
	tab_inv.toggle_expand("res:bread")
	_check(tab_inv.expanded_key() == "res:bread", "grid: toggle_expand('res:bread') expands the chip")
	_check(tab_inv._cards.has("res:bread"), "grid: the tapped chip is tracked in _cards")
	_check(tab_inv._action_buttons.has("sell:bread"), "grid: the detail registers the live Sell action")
	var gtexts: Array = _collect_label_texts(tab_inv._body)
	var g_has_eyebrow := false
	var g_has_arrow := false
	for t in gtexts:
		var gs := String(t)
		if gs.to_upper().begins_with("RESOURCE ·"): g_has_eyebrow = true
		if gs == "▲": g_has_arrow = true
	_check(g_has_eyebrow, "grid: the inline detail card shows the 'Resource · …' eyebrow")
	_check(g_has_arrow, "grid: an ▲ points back at the originating chip")
	# Tapping the SAME chip again collapses; the detail card + Sell action go away.
	tab_inv.toggle_expand("res:bread")
	_check(tab_inv.expanded_key() == "", "grid: tapping the expanded chip again collapses it")
	_check(not tab_inv._action_buttons.has("sell:bread"), "grid: collapsing drops the Sell action")

	tab_inv.set_view("list")
	_check(tab_inv.view_mode() == "list", "set_view('list') restored the list view")

	# Owned tools — the Tools tab data. owned_tool_ids lists every charged tool in
	# ToolConfig order (scythe, bomb, rake all granted above).
	var owned: Array = tab_inv.owned_tool_ids()
	_check(owned.has("scythe") and owned.has("bomb") and owned.has("rake"),
		"owned_tool_ids() lists the granted scythe/bomb/rake")
	_check(owned.size() == 3, "owned_tool_ids() == 3 owned tools")
	_check(tabbed_game.tool_count("scythe") == 2, "scythe charges == 2 (granted)")

	# Switching to the Tools tab filters the body to tools only — visible_tool_ids drives it.
	tab_inv.set_tab("tools")
	_check(tab_inv._tab == "tools", "set_tab('tools') switched the active tab")
	_check(tab_inv.visible_tool_ids().size() == 3, "Tools tab shows all 3 owned tools (no query)")
	# The body rendered tool rows (header + 3 rows + rule + subline → > 3 children).
	_check(tab_inv._body.get_child_count() > 3, "Tools tab populated the body with tool rows")

	# Search filters WITHIN the active (Tools) tab — by name, so "bomb" leaves only Bomb.
	tab_inv._on_search_changed("bomb")
	_check(tab_inv.visible_tool_ids() == ["bomb"], "search 'bomb' filters Tools to [bomb]")
	# A name-substring that no tool matches yields an empty set (and the no-match hint).
	tab_inv._on_search_changed("zzz")
	_check(tab_inv.visible_tool_ids().is_empty(), "search 'zzz' filters Tools to empty")
	tab_inv._on_search_changed("")   # clear the query

	# The Resources tab filters tools OUT (resource ledger only) and search filters within it.
	tab_inv.set_tab("resources")
	_check(tab_inv._tab == "resources", "set_tab('resources') switched the active tab")
	tab_inv._on_search_changed("bread")
	# group_of(bread) == Refined; the Refined group survives, Farm/Mine are filtered away.
	_check(tab_inv._apply_query(["hay_bundle", "bread", "block"]) == ["bread"],
		"search 'bread' filters resources to [bread] within Resources tab")
	tab_inv._on_search_changed("")

	# The All tab includes BOTH resources and tools — visible_tool_ids still non-empty there.
	tab_inv.set_tab("all")
	_check(tab_inv.visible_tool_ids().size() == 3, "All tab includes the 3 owned tools")
	_check(tab_inv.kinds() == 3, "All tab resource ledger still counts 3 resource kinds")

	# A game with NO tools — the Tools tab shows its empty state (no rows), not a crash.
	var no_tools_game := GameState.new()
	no_tools_game.inventory = {"flour": 4}
	var nt_inv := InventoryScreen.new()
	root.add_child(nt_inv)
	nt_inv.setup(no_tools_game)
	await process_frame
	_check(nt_inv.owned_tool_ids().is_empty(), "no-tools game: owned_tool_ids() empty")
	nt_inv.set_tab("tools")
	_check(nt_inv._body.get_child_count() == 1, "no-tools Tools tab renders a single empty-state line")

	# ── 1c. Items tab (runes / influence special valuables) ───────────────────
	# A game holding both special items — the Items tab lists them; All includes them too.
	var item_game := GameState.new()
	item_game.runes = 2
	item_game.influence = 7
	var item_inv := InventoryScreen.new()
	root.add_child(item_inv)
	item_inv.setup(item_game)
	await process_frame
	# item_count reads the real GameState counters.
	_check(item_inv.item_count("runes") == 2, "item_count('runes') == 2 (game.runes)")
	_check(item_inv.item_count("influence") == 7, "item_count('influence') == 7 (game.influence)")
	# item_ids lists BOTH held items (ITEM_DEFS order: runes, influence).
	_check(item_inv.item_ids() == ["runes", "influence"], "item_ids() lists both held items in order")
	# Switching to the Items tab renders them (header + 2 rows → > 2 children).
	item_inv.set_tab("items")
	_check(item_inv._tab == "items", "set_tab('items') switched the active tab")
	_check(item_inv.visible_item_ids().size() == 2, "Items tab shows both held items (no query)")
	_check(item_inv._body.get_child_count() > 2, "Items tab populated the body with item rows")
	# Search filters within the Items tab by name (or id) — "rune" leaves only runes.
	item_inv._on_search_changed("rune")
	_check(item_inv.visible_item_ids() == ["runes"], "search 'rune' filters Items to [runes]")
	item_inv._on_search_changed("")
	# The All tab includes the items alongside resources + tools.
	item_inv.set_tab("all")
	_check(item_inv.visible_item_ids().size() == 2, "All tab includes both special items")

	# A game holding NO special items — the Items tab shows its empty state (one line), not a crash.
	var no_item_game := GameState.new()
	no_item_game.inventory = {"flour": 3}
	var ni_inv := InventoryScreen.new()
	root.add_child(ni_inv)
	ni_inv.setup(no_item_game)
	await process_frame
	_check(ni_inv.item_ids().is_empty(), "no-items game: item_ids() empty (runes/influence 0)")
	ni_inv.set_tab("items")
	_check(ni_inv._body.get_child_count() == 1, "no-items Items tab renders a single empty-state line")

	# ── 2. Empty inventory — zeroed ledger + a non-erroring refresh ────────────
	var empty_game := GameState.new()
	var empty_inv := InventoryScreen.new()
	root.add_child(empty_inv)
	empty_inv.setup(empty_game)
	await process_frame
	empty_inv.open()
	_check(empty_inv.total_value() == 0, "empty inventory total_value() == 0")
	_check(empty_inv.kinds() == 0, "empty inventory kinds() == 0")
	_check(empty_inv.total_units() == 0, "empty inventory total_units() == 0")
	# refresh() over an empty inventory shows the muted hint and does not error.
	empty_inv.refresh()
	_check(empty_inv._body != null and empty_inv._body.get_child_count() == 1,
		"empty refresh() renders a single placeholder line")

	# A coins-only / unsellable-only spread: value 0 but kinds/units still count.
	var odd_game := GameState.new()
	odd_game.inventory = {"supplies": 4}
	var odd_inv := InventoryScreen.new()
	root.add_child(odd_inv)
	odd_inv.setup(odd_game)
	await process_frame
	_check(odd_inv.total_value() == 0, "unsellable-only inventory total_value() == 0")
	_check(odd_inv.kinds() == 1, "unsellable-only inventory kinds() == 1")
	_check(odd_inv.total_units() == 4, "unsellable-only inventory total_units() == 4")
	_check(odd_inv.group_of("supplies") == "Refined", "supplies still groups under 'Refined'")

	# ── 3. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_inventory"), "Main has _open_inventory()")
	_check(main.has_method("_on_inventory_closed"), "Main has _on_inventory_closed()")
	_check(main._inventory_screen == null, "inventory screen is lazily created (null before open)")

	# Opening the inventory lazily creates + wires it.
	main._open_inventory()
	_check(main._inventory_screen != null, "_open_inventory() lazily created the InventoryScreen")
	_check(main._inventory_screen is InventoryScreen, "_inventory_screen is an InventoryScreen")
	_check(main._inventory_screen.visible, "inventory is visible after _open_inventory()")
	# A second open() reuses the SAME screen (no duplicate child) — read it via the member.
	var first_ref = main._inventory_screen
	main._open_inventory()
	_check(main._inventory_screen == first_ref, "_open_inventory() reuses the one screen")
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

extends SceneTree
## Headless tests for the M4g dedicated Inventory ledger (scenes/InventoryScreen.gd +
## its wiring into scenes/Main.gd). Three layers:
##
##   1. InventoryScreen ledger math — total_value() sums count × MarketConfig.sell_price
##      over owned SELLABLE resources (non-sellable like `supplies` contribute 0);
##      kinds() / total_units() count distinct owned resources + total individual units;
##      group_of(res) routes each resource to "Farm goods" / "Refined" / "Mine" / "Other".
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
	_check(inv.group_of("hay_bundle") == "Farm goods", "group_of(hay_bundle) == 'Farm goods'")
	_check(inv.group_of("flour") == "Farm goods", "group_of(flour) == 'Farm goods'")
	_check(inv.group_of("horseshoe") == "Farm goods", "group_of(horseshoe) == 'Farm goods'")
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

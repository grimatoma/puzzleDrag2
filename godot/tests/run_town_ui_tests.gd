extends SceneTree
## Headless UI-WIRING test for the M3e TownScreen panel. Proves the on-screen
## Town buttons actually drive GameState WITHOUT a human, by locating a specific
## button in TownScreen._action_buttons and emitting its `pressed` signal, then
## asserting the underlying economy changed. No rendering is needed — CanvasLayer
## + Control + Button instantiate and emit signals fine headless, and emitting
## `pressed` invokes the connected callback directly.
##
## Covers: Build → Demolish swap, Tier-up, Craft (Bakery → bread), Sell, Fill
## order (+ refill to MAX), and Close. Also verifies `state_changed` fires on each
## real mutation. Run from the godot/ project root:
##   godot --headless --script res://tests/run_town_ui_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_scene_smoke.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6.

# class_name globals → plain member vars (not const; see header note).
var TC := TownConfig
var BC := BuildingConfig
var RC := RecipeConfig
var MC := MarketConfig

var _checks: int = 0
var _failures: int = 0
var _changes: int = 0          ## state_changed counter
var _closed: bool = false       ## set when the panel emits `closed`

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_state_changed() -> void:
	_changes += 1

func _on_closed() -> void:
	_closed = true

## Press the action button registered under `key`. Returns true if it existed.
func _press(town, key: String) -> bool:
	var btn: Variant = town._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Town UI wiring tests ───────────────────────────")

	# A Village-tier GameState so every building + recipe is unlockable, with a
	# generous inventory + coins and a full order board.
	var game := GameState.new()
	game.settlement.tier = TC.TIER_VILLAGE
	game.inventory = {
		"flour": 30, "eggs": 12, "hay_bundle": 30, "plank": 30, "soup": 12,
	}
	game.coins = 200
	game.seed_orders(1)
	game.refill_orders()

	# Instantiate the panel and wire its signals.
	var town := TownScreen.new()
	root.add_child(town)
	town.setup(game)
	await process_frame
	town.open()
	town.refresh()
	town.connect("state_changed", Callable(self, "_on_state_changed"))
	town.connect("closed", Callable(self, "_on_closed"))

	_check(town.visible, "panel is visible after open()")

	# ── Build: coop ───────────────────────────────────────────────────────────
	_check(not game.has_building("coop"), "(pre) coop not yet built")
	var build_btn: Variant = town._action_buttons.get("build:coop")
	_check(build_btn != null, "build:coop button exists")
	_check(build_btn != null and not build_btn.disabled, "build:coop button enabled (affordable)")
	var before_changes := _changes
	_check(_press(town, "build:coop"), "pressed build:coop")
	_check(game.has_building("coop"), "coop is now built")
	_check(_changes == before_changes + 1, "state_changed fired once on build")
	_check(town._action_buttons.has("demolish:coop"), "row now shows demolish:coop")
	_check(not town._action_buttons.has("build:coop"), "build:coop replaced after building")

	# ── Demolish: coop ────────────────────────────────────────────────────────
	_check(_press(town, "demolish:coop"), "pressed demolish:coop")
	_check(not game.has_building("coop"), "coop demolished")
	_check(town._action_buttons.has("build:coop"), "row reverted to build:coop")

	# ── Tier-up ───────────────────────────────────────────────────────────────
	# At Village the →Town cost is {eggs:8, soup:6, plank:10}; top it up so it's
	# affordable, then refresh so the tier-up button re-evaluates disabled.
	game.inventory["eggs"] = int(game.inventory.get("eggs", 0)) + 8
	game.inventory["soup"] = int(game.inventory.get("soup", 0)) + 6
	game.inventory["plank"] = int(game.inventory.get("plank", 0)) + 10
	town.refresh()
	var tier_before: int = game.settlement.tier
	var tier_btn: Variant = town._action_buttons.get("tierup")
	_check(tier_btn != null, "tierup button exists below max tier")
	_check(tier_btn != null and not tier_btn.disabled, "tierup button enabled (affordable)")
	_check(_press(town, "tierup"), "pressed tierup")
	_check(game.settlement.tier == tier_before + 1, "settlement tier advanced by 1")

	# ── Craft: bread (build a Bakery first) ───────────────────────────────────
	# We are now at Town tier (Bakery already unlocked at Village). Ensure the
	# Bakery cost {plank:8, flour:6} is covered, build it, then craft bread.
	game.inventory["plank"] = int(game.inventory.get("plank", 0)) + 8
	game.inventory["flour"] = int(game.inventory.get("flour", 0)) + 6
	town.refresh()
	_check(not game.has_building("bakery"), "(pre) bakery not yet built")
	_check(_press(town, "build:bakery"), "pressed build:bakery")
	_check(game.has_building("bakery"), "bakery is now built")
	# Bread needs 3 flour + 1 eggs; guarantee stock, then refresh + craft.
	game.inventory["flour"] = int(game.inventory.get("flour", 0)) + 3
	game.inventory["eggs"] = int(game.inventory.get("eggs", 0)) + 1
	town.refresh()
	var bread_before: int = game.qty("bread")
	var craft_btn: Variant = town._action_buttons.get("craft:bread")
	_check(craft_btn != null, "craft:bread button exists")
	_check(craft_btn != null and not craft_btn.disabled, "craft:bread enabled (Bakery + inputs)")
	_check(_press(town, "craft:bread"), "pressed craft:bread")
	_check(game.qty("bread") == bread_before + RC.recipe_qty(RC.BREAD),
		"bread qty rose by the recipe output (%d)" % RC.recipe_qty(RC.BREAD))

	# ── Sell: soup ────────────────────────────────────────────────────────────
	town.refresh()
	var soup_before: int = game.qty("soup")
	_check(soup_before > 0, "(pre) own at least 1 soup to sell")
	var coins_before: int = game.coins
	var sell_btn: Variant = town._action_buttons.get("sell:soup")
	_check(sell_btn != null, "sell:soup button exists (soup owned + sellable)")
	_check(_press(town, "sell:soup"), "pressed sell:soup")
	_check(game.coins == coins_before + MC.sell_price("soup"),
		"coins rose by sell_price(soup) (%d)" % MC.sell_price("soup"))
	_check(game.qty("soup") == soup_before - 1, "soup qty dropped by 1")

	# ── Fill order ────────────────────────────────────────────────────────────
	town.refresh()
	var fill_idx: int = -1
	for i in game.orders.size():
		if game.can_fill_order(i):
			fill_idx = i
			break
	if fill_idx < 0:
		# Guarantee a fillable order by stocking the first order's resource.
		fill_idx = 0
		var ord: Dictionary = game.orders[0]
		game.inventory[String(ord["resource"])] = int(ord["qty"])
		town.refresh()
	_check(fill_idx >= 0 and game.can_fill_order(fill_idx),
		"have a fillable order at index %d" % fill_idx)
	var reward: int = int(game.orders[fill_idx]["reward"])
	var fcoins_before: int = game.coins
	_check(_press(town, "fill:" + str(fill_idx)), "pressed fill:%d" % fill_idx)
	_check(game.coins == fcoins_before + reward, "coins rose by the order reward (%d)" % reward)
	_check(game.orders.size() == OrderConfig.MAX_ORDERS,
		"orders refilled back to MAX_ORDERS (%d)" % OrderConfig.MAX_ORDERS)

	# ── Buy: hay_bundle (affordable) ─────────────────────────────────────────
	# Give the player enough coins and a known buyable resource to exercise the
	# buy surface. hay_bundle costs MC.buy_price("hay_bundle") = 40 coins.
	var buy_res := "hay_bundle"
	var buy_price: int = MC.buy_price(buy_res)
	game.coins = buy_price + 100          # clearly affordable
	game.inventory[buy_res] = 0           # start at 0 so we can track the +1
	town.refresh()

	var buy_btn_check: Variant = town._action_buttons.get("buy:" + buy_res)
	_check(buy_btn_check != null, "buy:%s button exists after refresh()" % buy_res)
	_check(buy_btn_check != null and not buy_btn_check.disabled,
		"buy:%s button enabled when coins >= buy_price" % buy_res)

	var coins_before_buy: int = game.coins
	var qty_before_buy: int = game.qty(buy_res)
	var buy_changes_before := _changes
	_check(_press(town, "buy:" + buy_res), "pressed buy:%s" % buy_res)
	_check(game.qty(buy_res) == qty_before_buy + 1,
		"inventory[%s] rose by 1 after buy" % buy_res)
	_check(game.coins == coins_before_buy - buy_price,
		"coins fell by buy_price(%s) = %d after buy" % [buy_res, buy_price])
	_check(_changes == buy_changes_before + 1,
		"state_changed fired once on successful buy")

	# ── Buy: insufficient coins → button disabled ─────────────────────────────
	# For a different buyable resource (plank, buy price 40), set coins to 0 so
	# the button should be disabled.
	var poor_res := "plank"
	game.coins = 0
	town.refresh()
	var poor_btn: Variant = town._action_buttons.get("buy:" + poor_res)
	_check(poor_btn != null, "buy:%s button exists even when unaffordable" % poor_res)
	_check(poor_btn != null and poor_btn.disabled,
		"buy:%s button disabled when coins < buy_price" % poor_res)

	# ── All buyable resources have a buy:<res> button after refresh() ─────────
	town.refresh()
	var missing_buy_btns: Array = []
	for r in MC.buyable_resources():
		if not town._action_buttons.has("buy:" + r):
			missing_buy_btns.append(r)
	_check(missing_buy_btns.is_empty(),
		"all buyable resources have buy:<res> buttons (missing: %s)" % str(missing_buy_btns))

	# ── Workers: hire a Farmer ─
	# The Workers section lists every WorkerConfig type with a hire:<id> button.
	# Give the player coins + the farmer's resource cost, then press hire and assert
	# the count rose and coins fell by the ramped cost.
	game.coins = 1000
	game.inventory["hay_bundle"] = int(game.inventory.get("hay_bundle", 0)) + 10
	town.refresh()
	_check(town._action_buttons.has("hire:" + WorkerConfig.FARMER),
		"Workers section has a hire:farmer button")
	for wid in WorkerConfig.all_ids():
		_check(town._action_buttons.has("hire:" + wid),
			"Workers section has a hire button for %s" % wid)
	var hire_btn: Variant = town._action_buttons.get("hire:" + WorkerConfig.FARMER)
	_check(hire_btn != null and not hire_btn.disabled,
		"hire:farmer enabled (affordable)")
	var farmers_before: int = game.worker_count(WorkerConfig.FARMER)
	var coins_before_hire: int = game.coins
	var hire_cost: int = game.worker_hire_coins(WorkerConfig.FARMER)
	var changes_before_hire := _changes
	_check(_press(town, "hire:" + WorkerConfig.FARMER), "pressed hire:farmer")
	_check(game.worker_count(WorkerConfig.FARMER) == farmers_before + 1,
		"farmer count rose by 1 after hire")
	_check(game.coins == coins_before_hire - hire_cost,
		"coins fell by the ramped hire cost (%d)" % hire_cost)
	_check(_changes == changes_before_hire + 1, "state_changed fired once on hire")
	# A hired worker exposes a Fire button.
	_check(town._action_buttons.has("fire:" + WorkerConfig.FARMER),
		"row now shows fire:farmer after hiring")

	# ── Workers: fire the Farmer ─
	var farmers_pre_fire: int = game.worker_count(WorkerConfig.FARMER)
	_check(_press(town, "fire:" + WorkerConfig.FARMER), "pressed fire:farmer")
	_check(game.worker_count(WorkerConfig.FARMER) == farmers_pre_fire - 1,
		"farmer count fell by 1 after fire")

	# ── Expedition: enter / leave the HARBOR (M3j) ─────────────────────────────
	# The harbor enter row is gated by can_enter_harbor() AND town2_complete (the Town-3
	# framing). With Town 2 NOT done it's disabled even with supplies; once town2_complete is
	# set and supplies exist it enables, pressing it enters the harbor, the row swaps to a
	# "Leave the harbor" button, and pressing that returns to the farm.
	game.active_biome = "farm"
	game.harbor_turns_left = 0
	game.town2_complete = false
	game.inventory["supplies"] = 4
	town.refresh()
	var harbor_btn_locked: Variant = town._action_buttons.get("enter_harbor")
	_check(harbor_btn_locked != null, "enter_harbor button exists (Expedition section)")
	_check(harbor_btn_locked != null and harbor_btn_locked.disabled,
		"enter_harbor disabled before Town 2 is complete (even with supplies)")

	game.town2_complete = true
	town.refresh()
	var harbor_btn: Variant = town._action_buttons.get("enter_harbor")
	_check(harbor_btn != null and not harbor_btn.disabled,
		"enter_harbor enabled once town2_complete + supplies present")
	var harbor_changes_before := _changes
	_check(not game.is_in_harbor(), "(pre) not in the harbor on the farm")
	_check(_press(town, "enter_harbor"), "pressed enter_harbor")
	_check(game.is_in_harbor(), "entering the harbor put the game on the harbor biome")
	_check(game.harbor_turns_left == 4, "all 4 supplies converted to harbor turns")
	_check(_changes == harbor_changes_before + 1, "state_changed fired once on enter_harbor")
	# Now on the harbor, the row offers a Leave button (and the enter button is gone).
	_check(town._action_buttons.has("leave_harbor"), "row now shows leave_harbor while on the harbor")
	_check(not town._action_buttons.has("enter_harbor"), "enter_harbor replaced while on the harbor")
	_check(_press(town, "leave_harbor"), "pressed leave_harbor")
	_check(not game.is_in_harbor(), "leaving the harbor returned to the farm")
	_check(town._action_buttons.has("enter_harbor"), "row reverted to enter_harbor on the farm")

	# ── Close ─────────────────────────────────────────────────────────────────
	_check(_press(town, "close"), "pressed close")
	_check(_closed, "closed signal fired")
	_check(not town.visible, "panel hidden after close")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

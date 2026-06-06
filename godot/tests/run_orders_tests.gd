extends SceneTree
## Headless unit-test runner for the M3d Orders system — the Direction's coin
## sink. Covers OrderConfig (reward math), and the GameState orders API:
## orderable_resources (production-derived), generate_order (seeded rolls),
## refill_orders (top-up to MAX_ORDERS), can_fill_order / fill_order (deduct +
## reward + remove + refill), the "fill beats Market" incentive, save/load
## round-trip with malformed-entry rejection, and that order coins are uncapped.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_orders_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_economy_tests.gd. `class_name`
## globals are aliased with `var` (not `const`) because a class_name ref is not a
## constant expression in 4.6.

# class_name globals → plain member vars (not const; see header note).
var OC := OrderConfig
var MC := MarketConfig
var BC := BuildingConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Orders (coin-sink) tests ───────────────────────")
	_test_reward_for()
	_test_orderable_resources()
	_test_generate_order()
	_test_refill_orders()
	_test_fill_order()
	_test_fill_beats_market()
	_test_save_round_trip()
	_test_coins_uncapped()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + setup helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

func _give_all(g: GameState, cost: Dictionary) -> void:
	for k in cost.keys():
		_give(g, k, int(cost[k]))

# ── OrderConfig.reward_for ────────────────────────────────────────────────────

func _test_reward_for() -> void:
	_check(OC.MAX_ORDERS == 3, "MAX_ORDERS is 3")
	_check(OC.MIN_QTY == 3 and OC.MAX_QTY == 8, "qty range is [3, 8]")
	_check(OC.REWARD_MULT == 3, "REWARD_MULT is 3")

	var expected_eggs: int = MC.sell_price("eggs") * 5 * OC.REWARD_MULT
	_check(OC.reward_for("eggs", 5) == expected_eggs,
		"reward_for(eggs, 5) == sell_price(eggs)×5×3 (%d)" % expected_eggs)
	_check(OC.reward_for("flour", 3) == MC.sell_price("flour") * 3 * 3,
		"reward_for(flour, 3) == sell_price(flour)×3×3")
	# A zero-Market-price resource still floors the reward at 1.
	_check(MC.sell_price("rock") == 0, "(precondition) rock has no Market price")
	_check(OC.reward_for("rock", 5) == 1, "reward floors at 1 for a zero-price resource")

# ── orderable_resources ───────────────────────────────────────────────────────

func _test_orderable_resources() -> void:
	var fresh := GameState.new()
	_check(fresh.orderable_resources() == ["hay_bundle", "flour"],
		"fresh GameState orderable_resources == [hay_bundle, flour]")

	# Build a Coop at Village → "eggs" joins the orderable set.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	# A Coop needs plank + flour; grant the cost and build.
	_give_all(g, BC.building_cost(BC.COOP))
	_check(g.build(BC.COOP)["ok"], "(setup) build Coop at Village")
	var with_coop: Array = g.orderable_resources()
	_check(with_coop.has("eggs"), "orderable_resources includes 'eggs' after a Coop")
	_check(with_coop.has("hay_bundle") and with_coop.has("flour"),
		"staples still present alongside the Coop's eggs")

	# Add a Bakery (refiner) → "bread" joins too.
	_give_all(g, BC.building_cost(BC.BAKERY))
	_check(g.build(BC.BAKERY)["ok"], "(setup) build Bakery at Village")
	var with_bakery: Array = g.orderable_resources()
	_check(with_bakery.has("bread"), "orderable_resources includes 'bread' after a Bakery")

	# No duplicates anywhere, and the two staples always lead.
	var seen: Dictionary = {}
	var dupes := false
	for r in with_bakery:
		if seen.has(r):
			dupes = true
		seen[r] = true
	_check(not dupes, "orderable_resources has no duplicates")
	_check(with_bakery[0] == "hay_bundle" and with_bakery[1] == "flour",
		"staples lead the orderable list in stable order")

# ── generate_order ────────────────────────────────────────────────────────────

func _test_generate_order() -> void:
	var g := GameState.new()
	g.seed_orders(12345)
	var pool: Array = g.orderable_resources()
	for i in 20:
		var o: Dictionary = g.generate_order()
		_check(o["resource"] in pool, "generate_order #%d resource is orderable" % i)
		var q: int = int(o["qty"])
		_check(q >= OC.MIN_QTY and q <= OC.MAX_QTY,
			"generate_order #%d qty %d in [%d, %d]" % [i, q, OC.MIN_QTY, OC.MAX_QTY])
		_check(int(o["reward"]) == OC.reward_for(String(o["resource"]), q),
			"generate_order #%d reward matches reward_for" % i)
	# Pure: generate_order must NOT mutate the orders array.
	_check(g.orders.is_empty(), "generate_order did not mutate orders")

# ── refill_orders ─────────────────────────────────────────────────────────────

func _test_refill_orders() -> void:
	var g := GameState.new()
	g.seed_orders(99)
	g.refill_orders()
	_check(g.orders.size() == OC.MAX_ORDERS,
		"refill_orders fills to exactly MAX_ORDERS (%d)" % OC.MAX_ORDERS)
	# Calling again is a no-op once full.
	g.refill_orders()
	_check(g.orders.size() == OC.MAX_ORDERS, "second refill_orders is a no-op (stays at MAX_ORDERS)")
	# Every generated order is well-formed.
	var all_well := true
	for o in g.orders:
		if not (o is Dictionary and o["resource"] is String and int(o["qty"]) > 0 and int(o["reward"]) >= 0):
			all_well = false
	_check(all_well, "every refilled order is well-formed")

# ── can_fill_order / fill_order ───────────────────────────────────────────────

func _test_fill_order() -> void:
	var g := GameState.new()
	g.seed_orders(7)
	# Construct a single KNOWN order so the deduction is deterministic.
	g.orders = [{"resource": "hay_bundle", "qty": 5, "reward": 15}]
	g.inventory["hay_bundle"] = 5
	g.coins = 0

	_check(g.can_fill_order(0), "can_fill_order(0) true with exactly enough stock")
	_check(not g.can_fill_order(1), "can_fill_order(1) false (out of range)")
	_check(not g.can_fill_order(-1), "can_fill_order(-1) false (negative index)")

	var res: Dictionary = g.fill_order(0)
	_check(bool(res["ok"]), "fill_order(0) succeeds")
	_check(int(res["reward"]) == 15, "fill result carries reward 15")
	_check(res["resource"] == "hay_bundle", "fill result carries resource")
	_check(int(res["qty"]) == 5, "fill result carries qty 5")
	_check(g.qty("hay_bundle") == 0, "fill deducted 5 hay_bundle to 0")
	_check(not g.inventory.has("hay_bundle"), "fully-consumed hay_bundle key erased")
	_check(g.coins == 15, "coins credited by the reward (15)")
	# After a fill the board tops back up to MAX_ORDERS.
	_check(g.orders.size() == OC.MAX_ORDERS, "orders refilled to MAX_ORDERS after a fill")

	# Insufficient inventory → no mutation.
	var g2 := GameState.new()
	g2.orders = [{"resource": "flour", "qty": 4, "reward": 24}]
	g2.inventory["flour"] = 2
	g2.coins = 99
	var ins: Dictionary = g2.fill_order(0)
	_check(not bool(ins["ok"]), "fill with too little stock fails")
	_check(ins.get("reason", "") == "insufficient", "reason is 'insufficient'")
	_check(g2.qty("flour") == 2 and g2.coins == 99 and g2.orders.size() == 1,
		"no mutation on insufficient fill (inventory, coins, orders all untouched)")

	# Out-of-range index → bad_index, no mutation.
	var g3 := GameState.new()
	g3.orders = [{"resource": "flour", "qty": 3, "reward": 18}]
	g3.coins = 5
	var bad: Dictionary = g3.fill_order(7)
	_check(not bool(bad["ok"]), "fill at out-of-range index fails")
	_check(bad.get("reason", "") == "bad_index", "reason is 'bad_index'")
	_check(g3.coins == 5 and g3.orders.size() == 1, "no mutation on bad_index")

# ── filling pays more than the raw Market ─────────────────────────────────────

func _test_fill_beats_market() -> void:
	for r in ["hay_bundle", "flour", "eggs", "soup", "bread"]:
		for q in [3, 5, 8]:
			var order_pay: int = OC.reward_for(r, q)
			var market_pay: int = MC.sell_price(r) * q
			_check(order_pay > market_pay,
				"order reward (%d) > market sale (%d) for %d×%s" % [order_pay, market_pay, q, r])

# ── save / load round-trip (+ malformed-entry rejection) ──────────────────────

func _test_save_round_trip() -> void:
	SaveManager.clear()
	var g := GameState.new()
	g.seed_orders(2024)
	g.refill_orders()
	g.coins = 50
	var before: Array = g.orders.duplicate(true)
	_check(SaveManager.save(g), "SaveManager.save() reports success")

	var loaded := SaveManager.load_state()
	_check(loaded.orders.size() == before.size(),
		"save→load preserves order count (%d)" % before.size())
	var all_match := true
	for i in before.size():
		var a: Dictionary = before[i]
		var b: Dictionary = loaded.orders[i]
		if a["resource"] != b["resource"] or int(a["qty"]) != int(b["qty"]) or int(a["reward"]) != int(b["reward"]):
			all_match = false
	_check(all_match, "each loaded order matches its saved resource/qty/reward")
	SaveManager.clear()

	# Direct from_dict: malformed order entries are dropped while valid ones survive.
	var d: Dictionary = {
		"orders": [
			{"resource": "flour", "qty": 4, "reward": 24},   # valid
			{"resource": "eggs", "reward": 100},              # missing qty → drop
			{"resource": "soup", "qty": 0, "reward": 5},      # qty 0 → drop
			{"qty": 3, "reward": 9},                          # missing resource → drop
			{"resource": 42, "qty": 3, "reward": 9},          # non-String resource → drop
			"not_a_dict",                                     # non-Dictionary → drop
			{"resource": "bread", "qty": 2, "reward": 30},    # valid
		],
	}
	var rebuilt := GameState.from_dict(d)
	_check(rebuilt.orders.size() == 2, "from_dict keeps only the 2 well-formed orders, drops 5 malformed")
	_check(rebuilt.orders[0]["resource"] == "flour" and int(rebuilt.orders[0]["qty"]) == 4,
		"first surviving order is the valid flour order")
	_check(rebuilt.orders[1]["resource"] == "bread" and int(rebuilt.orders[1]["reward"]) == 30,
		"second surviving order is the valid bread order")
	# from_dict does NOT auto-refill (Main calls refill_orders after load).
	_check(rebuilt.orders.size() < OC.MAX_ORDERS, "from_dict did not auto-refill (size < MAX_ORDERS)")

# ── order coins are uncapped (only inventory is capped) ───────────────────────

func _test_coins_uncapped() -> void:
	var g := GameState.new()
	# Camp cap is 200 — a deliberately huge reward must push coins well past it,
	# proving coins are uncapped while only inventory resources are bounded.
	var cap: int = g.settlement.cap()
	_check(cap == 200, "(precondition) Camp cap is 200")
	g.orders = [{"resource": "honey", "qty": 8, "reward": 100000}]
	g.inventory["honey"] = 8
	g.coins = 0
	var res: Dictionary = g.fill_order(0)
	_check(bool(res["ok"]), "fill a large-reward order succeeds")
	_check(g.coins == 100000, "coins rose to 100000 — far past the %d settlement cap (coins uncapped)" % cap)

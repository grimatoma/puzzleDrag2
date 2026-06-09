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
	_test_value_scaled_reward()
	_test_qty_scaling()
	_test_crafted_pool()
	_test_orderable_resources()
	_test_generate_order()
	_test_no_dupe_slots()
	_test_crafted_pool_gating()
	_test_refill_orders()
	_test_fill_order()
	_test_fill_bond_multiplier()
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
	_check(OC.REWARD_MULT == 6, "REWARD_MULT is 6 (T19 value-scaled)")
	_check(OC.MIN_RESOURCE_REWARD == 20, "MIN_RESOURCE_REWARD floor is 20")
	_check(is_equal_approx(OC.CRAFTED_REWARD_MULT, 1.5), "CRAFTED_REWARD_MULT is 1.5")
	_check(OC.CRAFTED_ORDER_LEVEL == 3, "crafted-good orders gate at level 3")
	_check(is_equal_approx(OC.CRAFTED_ORDER_CHANCE, 0.30), "crafted-good order chance is 0.30")

	# Resource reward = max(20, sell_price × qty × 6). eggs sell_price 12 → 12×5×6 = 360.
	var expected_eggs: int = max(20, MC.sell_price("eggs") * 5 * OC.REWARD_MULT)
	_check(OC.reward_for("eggs", 5) == expected_eggs,
		"reward_for(eggs, 5) == max(20, sell_price(eggs)×5×6) (%d)" % expected_eggs)
	# A cheap resource is FLOORED at 20: hay_bundle sell_price 1 × 3 × 6 = 18 → floored to 20.
	_check(MC.sell_price("hay_bundle") == 1, "(precondition) hay_bundle sell_price is 1")
	_check(OC.reward_for("hay_bundle", 3) == 20,
		"reward_for(hay_bundle, 3) floors at 20 (1×3×6=18 < 20)")
	# A zero-Market-price resource still pays the 20 floor.
	_check(MC.sell_price("rock") == 0, "(precondition) rock has no Market price")
	_check(OC.reward_for("rock", 5) == 20, "reward floors at 20 for a zero-price resource")

# ── T19: value-scaled reward (resource + crafted) ─────────────────────────────

func _test_value_scaled_reward() -> void:
	# Resource: max(20, value × qty × 6). soup sell_price 20 → 20×3×6 = 360.
	_check(OC.reward_for("soup", 3) == 20 * 3 * 6, "soup×3 resource reward = value×qty×6 (360)")
	# Crafted: round(value × qty × 1.5). honeyroll sell_price 175 → round(175×2×1.5) = 525.
	_check(MC.sell_price("honeyroll") == 175, "(precondition) honeyroll sell_price 175")
	_check(OC.crafted_reward_for("honeyroll", 2) == int(round(175.0 * 2.0 * 1.5)),
		"honeyroll×2 crafted reward = round(value×qty×1.5) (525)")
	# An unpriced crafted good still floors at 1.
	_check(OC.crafted_reward_for("nonesuch", 3) == 1, "crafted reward floors at 1 for an unpriced good")
	# Crucially the resource ×6 beats a raw market sale (×1) for the SAME goods (the sink incentive).
	_check(OC.reward_for("eggs", 5) > MC.sell_price("eggs") * 5, "resource order ×6 beats raw market sale")

# ── T19: level-scaled quantity ────────────────────────────────────────────────

func _test_qty_scaling() -> void:
	# qty_for(value, level, roll_small) = baseNeed + floor(roll×4) + floor(level/3)×2.
	# A cheap resource (value < 3) has baseNeed 8; a valuable one baseNeed 4.
	_check(OC.qty_for(1, 1, 0.0) == 8, "cheap resource (value 1) baseNeed 8 at level 1, roll 0")
	_check(OC.qty_for(20, 1, 0.0) == 4, "valuable resource (value 20) baseNeed 4 at level 1, roll 0")
	# Level ramp: +2 per 3 levels. At level 6 → +4.
	_check(OC.qty_for(20, 6, 0.0) == 4 + 4, "valuable resource at level 6 → baseNeed 4 + level ramp 4")
	# The random spread adds 0..3.
	_check(OC.qty_for(20, 1, 0.99) == 4 + 3, "roll 0.99 adds the full +3 spread")
	# Crafted qty is 1..3.
	_check(OC.crafted_qty(0.0) == 1, "crafted_qty(0.0) == 1")
	_check(OC.crafted_qty(0.99) == 3, "crafted_qty(0.99) == 3")

# ── T19: crafted-good order pool ──────────────────────────────────────────────

func _test_crafted_pool() -> void:
	var pool: Array = OC.crafted_order_pool()
	_check(not pool.is_empty(), "crafted_order_pool is non-empty")
	# Every entry is a Market-sellable crafted GOOD (bread is the staple crafted good).
	_check(pool.has("bread"), "crafted pool includes 'bread' (a KIND_GOOD recipe output)")
	var all_sellable := true
	var all_goods := true
	var seen: Dictionary = {}
	var dupes := false
	for g in pool:
		if not MC.can_sell(String(g)):
			all_sellable = false
		if seen.has(g):
			dupes = true
		seen[g] = true
	_check(all_sellable, "every crafted-pool entry is Market-sellable")
	_check(not dupes, "crafted pool has no duplicates")
	# Tools (KIND_TOOL outputs) are excluded — 'axe' is a tool recipe, not in the pool.
	_check(not pool.has("axe"), "crafted pool excludes tool outputs (axe)")

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
	# A fresh GameState is at almanac_level 1 (< CRAFTED_ORDER_LEVEL), so EVERY order is a
	# value-scaled RESOURCE order — kind == "resource", reward == reward_for(resource, qty).
	_check(g.almanac_level < OC.CRAFTED_ORDER_LEVEL, "(precondition) fresh almanac_level below crafted gate")
	var pool: Array = g.orderable_resources()
	for i in 20:
		var o: Dictionary = g.generate_order()
		_check(o["resource"] in pool, "generate_order #%d resource is orderable" % i)
		_check(String(o.get("kind", "")) == "resource",
			"generate_order #%d is a resource order at level 1" % i)
		var q: int = int(o["qty"])
		_check(q > 0, "generate_order #%d qty %d is positive" % [i, q])
		_check(int(o["reward"]) == OC.reward_for(String(o["resource"]), q),
			"generate_order #%d reward matches value-scaled reward_for" % i)
		_check(int(o["base_reward"]) == int(o["reward"]), "generate_order #%d base_reward == reward" % i)
	# Pure: generate_order must NOT mutate the orders array.
	_check(g.orders.is_empty(), "generate_order did not mutate orders")

# ── T19: the 3-order board never duplicates an NPC or a requested resource ─────

func _test_no_dupe_slots() -> void:
	# refill_orders accumulates exclusions, so across MANY seeded boards the 3 slots never
	# share an NPC, and never a requested resource/good WHEN enough distinct keys exist.
	# A fresh GameState has only 2 orderable resources (hay_bundle, flour) for 3 slots, so a
	# resource repeat is unavoidable there (React has the same constraint with a tiny pool) —
	# the no-dupe guarantee is best-effort and only firm once the pool is big enough. Build out
	# production so >= MAX_ORDERS distinct orderable resources exist, then assert no key dupes.
	var any_npc_dupe := false
	var any_key_dupe := false
	for seed in [1, 2, 3, 7, 11, 42, 99, 100, 256, 1000]:
		var g := GameState.new()
		# Give a large orderable pool: Village tier + a Coop (eggs) + Bakery (bread) so the set is
		# {hay_bundle, flour, eggs, bread} — 4 distinct keys for 3 slots.
		g.settlement.tier = TownConfig.TIER_VILLAGE
		_give_all(g, BC.building_cost(BC.COOP))
		g.build(BC.COOP)
		_give_all(g, BC.building_cost(BC.BAKERY))
		g.build(BC.BAKERY)
		_check(g.orderable_resources().size() >= OC.MAX_ORDERS,
			"seed %d has >= MAX_ORDERS distinct orderable resources" % seed)
		g.seed_orders(seed)
		g.refill_orders()
		_check(g.orders.size() == OC.MAX_ORDERS, "seed %d filled to MAX_ORDERS" % seed)
		var npcs: Dictionary = {}
		var keys: Dictionary = {}
		for o in g.orders:
			var npc := String((o as Dictionary).get("npc", ""))
			var key := String((o as Dictionary).get("resource", ""))
			if npcs.has(npc):
				any_npc_dupe = true
			if keys.has(key):
				any_key_dupe = true
			npcs[npc] = true
			keys[key] = true
	_check(not any_npc_dupe, "no NPC is requested by two order slots (across 10 seeded boards)")
	_check(not any_key_dupe, "no resource/good is requested by two order slots when the pool is large enough")

	# And the NPC no-dupe ALWAYS holds even with the tiny fresh pool (5 NPCs >= 3 slots).
	var fresh_npc_dupe := false
	for seed in [5, 50, 500]:
		var gf := GameState.new()
		gf.seed_orders(seed)
		gf.refill_orders()
		var seen: Dictionary = {}
		for o in gf.orders:
			var npc := String((o as Dictionary).get("npc", ""))
			if seen.has(npc):
				fresh_npc_dupe = true
			seen[npc] = true
	_check(not fresh_npc_dupe, "NPC no-dupe holds even on a fresh tiny-pool board")

# ── T19: crafted-good orders are gated to level 3+ ─────────────────────────────

func _test_crafted_pool_gating() -> void:
	# At level 1 (below the gate) NO order is ever crafted, across many rolls.
	var g1 := GameState.new()
	g1.almanac_level = 1
	g1.seed_orders(555)
	var any_crafted_low := false
	for i in 60:
		if String(g1.generate_order().get("kind", "")) == "crafted":
			any_crafted_low = true
	_check(not any_crafted_low, "no crafted order below level 3 (60 rolls)")

	# At level 5 (above the gate) crafted orders DO appear (30% chance) across many rolls.
	var g2 := GameState.new()
	g2.almanac_level = 5
	g2.seed_orders(777)
	var crafted_count := 0
	for i in 200:
		if String(g2.generate_order().get("kind", "")) == "crafted":
			crafted_count += 1
	_check(crafted_count > 0, "crafted orders appear at level 5 (%d/200 rolls were crafted)" % crafted_count)
	# Roughly the 30% rate (loose bounds so the seeded run isn't brittle).
	_check(crafted_count > 20 and crafted_count < 100,
		"crafted rate is roughly 30%% (%d/200, expect ~60)" % crafted_count)

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

# ── T19: the bond multiplier still applies on fill ────────────────────────────

func _test_fill_bond_multiplier() -> void:
	# A KNOWN order from a Liked NPC (bond 8 → ×1.15). The payout must be the bond-adjusted
	# base, proving the value-scaled order layer still routes through the bond multiplier.
	var g := GameState.new()
	g.gain_bond("mira", 3.0)   # 5.0 → 8.0 (Liked, ×1.15)
	_check(g.npc_bond("mira") == 8.0, "(setup) mira bond pushed to 8.0 (Liked)")
	g.orders = [{"resource": "flour", "qty": 4, "reward": 200, "base_reward": 200, "npc": "mira", "kind": "resource"}]
	g.inventory["flour"] = 4
	g.coins = 0
	var res: Dictionary = g.fill_order(0)
	_check(bool(res["ok"]), "fill from a Liked NPC succeeds")
	_check(int(res["reward"]) == int(round(200.0 * 1.15)),
		"Liked payout == round(base 200 × 1.15) == 230 (bond multiplier still applies)")
	_check(g.coins == 230, "coins credited the bond-adjusted payout")

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

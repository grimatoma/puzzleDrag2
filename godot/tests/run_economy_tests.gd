extends SceneTree
## Headless unit-test runner for the M3c refining + market economy:
## RecipeConfig (the recipe catalog + helpers), MarketConfig (sell/buy price
## tables), BuildingConfig building KINDS (spawner vs refiner + the Bakery), and
## the GameState economy API — can_craft/craft, sell, buy (with cap discipline),
## plus the refiner guard on active_tile_pool/active_categories and a refined-good
## save round-trip. Run from the godot/ project root:
##   godot --headless --script res://tests/run_economy_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_building_tests.gd. `class_name`
## globals are aliased with `var` (not `const`) because a class_name ref is not a
## constant expression in 4.6.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var BC := BuildingConfig
var RC := RecipeConfig
var MC := MarketConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Economy (refining / market) tests ──────────────")
	_test_recipe_config()
	_test_building_kinds()
	_test_craft_gating()
	_test_refiner_not_in_pool()
	_test_market_sell()
	_test_market_buy()
	_test_refined_good_round_trip()
	_test_bake_then_sell_integration()
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

## Add `amount` of `resource` to a GameState inventory directly (test helper).
func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

func _give_all(g: GameState, cost: Dictionary) -> void:
	for k in cost.keys():
		_give(g, k, int(cost[k]))

## Build a GameState at Village (tier 3) with the Bakery placed and `extra` added.
func _state_with_bakery(extra: Dictionary = {}) -> GameState:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	_give_all(g, BC.building_cost(BC.BAKERY))
	_check(g.build(BC.BAKERY)["ok"], "(setup) build Bakery at Village")
	_give_all(g, extra)
	return g

# ── RecipeConfig ──────────────────────────────────────────────────────────────

func _test_recipe_config() -> void:
	# M3f added the Kitchen's SUPPLIES recipe, so the catalog now holds two recipes
	# (bread first, supplies second). Bread's own attributes are still asserted below.
	_check(RC.RECIPE_IDS == [RC.BREAD, RC.SUPPLIES], "two recipes in the catalog (bread, supplies)")
	_check(RC.is_recipe(RC.BREAD), "bread is a real recipe")
	_check(not RC.is_recipe("nope"), "'nope' is not a recipe")

	_check(RC.recipe_name(RC.BREAD) == "Bread", "bread recipe name")
	_check(RC.recipe_station(RC.BREAD) == BC.BAKERY, "bread station is the Bakery")
	_check(RC.recipe_inputs(RC.BREAD) == {"flour": 3, "eggs": 1}, "bread inputs are flour 3 + eggs 1")
	_check(RC.recipe_output(RC.BREAD) == "bread", "bread output is 'bread'")
	_check(RC.recipe_qty(RC.BREAD) == 1, "bread qty is 1")

	# recipes_for_station maps the Bakery to its single recipe.
	_check(RC.recipes_for_station(BC.BAKERY) == [RC.BREAD], "recipes_for_station(bakery) == [bread]")
	_check(RC.recipes_for_station(BC.LUMBER_CAMP) == [], "spawner has no recipes")
	_check(RC.recipes_for_station("nope") == [], "unknown station has no recipes")

	# recipe_inputs returns a defensive copy — mutating it can't change the const.
	var inp := RC.recipe_inputs(RC.BREAD)
	inp["flour"] = 999
	_check(RC.recipe_inputs(RC.BREAD) == {"flour": 3, "eggs": 1},
		"recipe_inputs returns a defensive copy")

	# Unknown ids degrade gracefully.
	_check(RC.recipe_name("nope") == "", "unknown recipe_name is empty")
	_check(RC.recipe_inputs("nope") == {}, "unknown recipe_inputs is empty")
	_check(RC.recipe_output("nope") == "", "unknown recipe_output is empty")
	_check(RC.recipe_qty("nope") == 0, "unknown recipe_qty is 0")
	_check(RC.recipe_station("nope") == "", "unknown recipe_station is empty")

# ── BuildingConfig kinds ──────────────────────────────────────────────────────

func _test_building_kinds() -> void:
	_check(BC.is_spawner(BC.LUMBER_CAMP), "lumber_camp is a spawner")
	_check(BC.is_spawner(BC.COOP), "coop is a spawner")
	_check(BC.is_spawner(BC.GARDEN), "garden is a spawner")
	_check(not BC.is_spawner(BC.BAKERY), "bakery is NOT a spawner")
	_check(BC.is_refiner(BC.BAKERY), "bakery IS a refiner")
	_check(not BC.is_refiner(BC.LUMBER_CAMP), "lumber_camp is not a refiner")
	_check(BC.building_kind(BC.BAKERY) == "refiner", "bakery kind is 'refiner'")
	_check(BC.building_kind(BC.GARDEN) == "spawner", "garden kind is 'spawner'")
	_check(BC.building_kind("nope") == "", "unknown kind is empty")

	# Bakery is a real building, unlocked at Village, with the spec'd attributes.
	_check(BC.is_building(BC.BAKERY), "bakery is a real building")
	_check(BC.building_name(BC.BAKERY) == "Bakery", "bakery name")
	_check(BC.unlock_tier(BC.BAKERY) == TownConfig.TIER_VILLAGE, "bakery unlocks at Village (3)")
	_check(BC.building_cost(BC.BAKERY) == {"plank": 8, "flour": 6}, "bakery cost")
	_check(BC.building_category(BC.BAKERY) == "", "bakery has no category")
	_check(BC.building_tile(BC.BAKERY) == Constants.EMPTY, "bakery has no tile (EMPTY)")
	_check(BC.building_resource(BC.BAKERY) == "bread", "bakery resource is bread")

	# available_at_tier now iterates ALL_BUILD_IDS, so the Bakery is offered. M3f
	# appended the Kitchen (refiner) after the Bakery; M3h appended the two rats-
	# hazard buildings (Ratcatcher, Master Ratcatcher) after the Kitchen — seven total.
	_check(BC.ALL_BUILD_IDS == [BC.LUMBER_CAMP, BC.COOP, BC.GARDEN, BC.BAKERY, BC.KITCHEN,
			BC.RATCATCHER, BC.MASTER_RATCATCHER],
		"ALL_BUILD_IDS is the seven buildings in stable order")
	_check(BC.SPAWNER_IDS == [BC.LUMBER_CAMP, BC.COOP, BC.GARDEN],
		"SPAWNER_IDS stays the three spawners only")
	# At Village (tier 3) the Kitchen (Town-tier) is NOT yet offered, so the Bakery
	# is the fourth — the count here is unchanged by M3f (Kitchen needs tier 4).
	var at3: Array = BC.available_at_tier(3)
	_check(at3.has(BC.BAKERY), "available_at_tier(3) includes the Bakery")
	_check(at3.size() == 4, "all four pre-Kitchen buildings available at Village (tier 3)")
	_check(not BC.available_at_tier(2).has(BC.BAKERY), "Bakery NOT offered at Hamlet (tier 2)")
	_check(not at3.has(BC.KITCHEN), "Kitchen NOT offered at Village — it's a Town-tier building")

	# Bakery is gated at Village: it can't be built at Hamlet even if affordable.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_HAMLET
	_give_all(g, BC.building_cost(BC.BAKERY))
	_check(not g.can_build(BC.BAKERY), "can_build(bakery) false at Hamlet (needs Village)")
	var res := g.build(BC.BAKERY)
	_check(res.get("reason", "") == "locked", "bakery build at Hamlet fails with reason 'locked'")

# ── craft gating ──────────────────────────────────────────────────────────────

func _test_craft_gating() -> void:
	# Fresh GameState: no Bakery → can't craft, craft reason "no_station".
	var fresh := GameState.new()
	_give_all(fresh, {"flour": 3, "eggs": 1})
	_check(not fresh.can_craft(RC.BREAD), "can_craft false with no Bakery built")
	var no_station := fresh.craft(RC.BREAD)
	_check(not bool(no_station["ok"]), "craft fails with no Bakery")
	_check(no_station.get("reason", "") == "no_station", "reason is 'no_station' with no Bakery")
	_check(fresh.qty("flour") == 3 and fresh.qty("eggs") == 1, "no mutation when craft has no station")

	# unknown recipe id → reason "unknown".
	var g := _state_with_bakery()
	var unknown := g.craft("nope")
	_check(unknown.get("reason", "") == "unknown", "craft of unknown recipe → reason 'unknown'")

	# Bakery built but flour < 3 → still can't craft.
	_give_all(g, {"flour": 2, "eggs": 5})
	_check(not g.can_craft(RC.BREAD), "can_craft false with flour < 3 (only 2)")

	# Top up to exactly 3 flour + 1 egg present → can_craft true, craft consumes them.
	g.inventory["flour"] = 3
	g.inventory["eggs"] = 1
	_check(g.can_craft(RC.BREAD), "can_craft true with flour 3 + eggs 1")
	var ok := g.craft(RC.BREAD)
	_check(bool(ok["ok"]), "craft(bread) succeeds")
	_check(ok.get("output", "") == "bread", "craft result output is bread")
	_check(int(ok.get("qty", 0)) == 1, "craft result qty is 1")
	_check(ok.get("recipe", "") == RC.BREAD, "craft result carries recipe id")
	_check(g.qty("flour") == 0, "craft deducted 3 flour to 0")
	_check(g.qty("eggs") == 0, "craft deducted 1 egg to 0")
	_check(g.qty("bread") == 1, "craft added 1 bread")
	_check(not g.inventory.has("flour"), "fully-consumed flour key erased")
	_check(not g.inventory.has("eggs"), "fully-consumed eggs key erased")

	# Crafting again with no inputs → insufficient, no mutation.
	var again := g.craft(RC.BREAD)
	_check(not bool(again["ok"]), "second craft with no inputs fails")
	_check(again.get("reason", "") == "insufficient", "reason is 'insufficient' with no inputs")
	_check(g.qty("bread") == 1, "bread count unchanged after failed craft")
	_check(not g.inventory.has("flour"), "no phantom flour after failed craft")

# ── refiner is invisible to the board pool ────────────────────────────────────

func _test_refiner_not_in_pool() -> void:
	var g := _state_with_bakery()
	# A built Bakery must NOT touch the board pool or categories.
	var pool := g.active_tile_pool()
	_check(not pool.has(Constants.EMPTY), "active_tile_pool has no EMPTY after building a Bakery")
	# A1: the farm pool is now the season-weighted, zone-restricted base pool (no longer the
	# flat FARM_POOL). A refiner (Bakery, no category) adds NOTHING, so the pool equals what a
	# fresh same-tier farm with no spawners would produce. Compare to that, not FARM_POOL.
	var baseline := GameState.new()
	baseline.settlement.tier = g.settlement.tier
	_check(pool == baseline.active_tile_pool(),
		"pool equals the spawner-less season pool (Bakery adds nothing)")
	var cats := g.active_categories()
	_check(cats == ["grass", "grain"], "active_categories unchanged by the Bakery (no blank entry)")
	_check(not cats.has(""), "no empty-string category leaked in from the refiner")

	# Sanity: a spawner DOES change the pool, so the guard isn't just no-op'ing both.
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_check(g.build(BC.LUMBER_CAMP)["ok"], "build a Lumber Camp alongside the Bakery")
	var pool2 := g.active_tile_pool()
	_check(pool2.has(T.OAK), "spawner still adds its tile (OAK) even with a Bakery present")
	_check(not pool2.has(Constants.EMPTY), "pool STILL has no EMPTY with both a spawner and a refiner")

# ── Market: sell ──────────────────────────────────────────────────────────────

func _test_market_sell() -> void:
	# Price table spot-checks.
	_check(MC.sell_price("hay_bundle") == 1, "hay_bundle sells for 1")
	_check(MC.sell_price("bread") == 5, "bread sells for 5")
	_check(MC.sell_price("honey") == 40, "honey sells for 40")
	_check(MC.sell_price("rock") == 0, "unlisted resource sell_price is 0")
	_check(MC.can_sell("flour"), "flour is sellable")
	_check(not MC.can_sell("rock"), "rock is not sellable")

	var g := GameState.new()
	g.inventory["hay_bundle"] = 5
	g.coins = 0
	var res := g.sell("hay_bundle", 3)
	_check(bool(res["ok"]), "sell 3 hay_bundle succeeds")
	_check(int(res["coins_gain"]) == 3, "coins_gain is 3 (sell_price 1 × 3)")
	_check(res.get("resource", "") == "hay_bundle", "sell result carries resource")
	_check(int(res.get("qty", 0)) == 3, "sell result carries qty")
	_check(g.coins == 3, "coins credited to 3")
	_check(g.qty("hay_bundle") == 2, "hay_bundle deducted (5-3) to 2")

	# Sell exactly the remainder → key erased.
	_check(g.sell("hay_bundle", 2)["ok"], "sell the remaining 2 hay_bundle")
	_check(not g.inventory.has("hay_bundle"), "fully-sold hay_bundle key erased")
	_check(g.coins == 5, "coins now 5 after selling all 5")

	# Sell more than owned → insufficient, no mutation.
	g.inventory["flour"] = 1
	var ins := g.sell("flour", 4)
	_check(not bool(ins["ok"]), "selling more than owned fails")
	_check(ins.get("reason", "") == "insufficient", "reason is 'insufficient'")
	_check(g.qty("flour") == 1 and g.coins == 5, "no mutation on insufficient sell")

	# Unlisted resource and bad qty give the right reasons.
	var notsell := g.sell("rock", 1)
	_check(notsell.get("reason", "") == "not_sellable", "unlisted resource → reason 'not_sellable'")
	var badqty := g.sell("flour", 0)
	_check(badqty.get("reason", "") == "bad_qty", "qty 0 → reason 'bad_qty'")
	var negqty := g.sell("flour", -3)
	_check(negqty.get("reason", "") == "bad_qty", "negative qty → reason 'bad_qty'")
	_check(g.qty("flour") == 1 and g.coins == 5, "inventory + coins untouched by failed sells")

# ── Market: buy (with cap discipline) ─────────────────────────────────────────

func _test_market_buy() -> void:
	_check(MC.buy_price("flour") == 30, "flour buys for 30")
	_check(MC.can_buy("flour"), "flour is buyable")
	_check(not MC.can_buy("rock"), "rock is not buyable")
	_check(MC.buy_price("rock") == 0, "unlisted resource buy_price is 0")

	# Plain buy.
	var g := GameState.new()
	g.coins = 100
	var res := g.buy("flour", 2)
	_check(bool(res["ok"]), "buy 2 flour succeeds")
	_check(int(res["coins_spent"]) == 60, "coins_spent is 60 (buy_price 30 × 2)")
	_check(int(res.get("added", -1)) == 2, "added is 2 (no cap clip)")
	_check(g.coins == 40, "coins debited to 100-60=40")
	_check(g.qty("flour") == 2, "flour added to inventory")

	# Can't afford the full requested qty → rejected outright, no mutation.
	var poor := GameState.new()
	poor.coins = 50          # 2 × flour = 60 > 50
	var cant := poor.buy("flour", 2)
	_check(not bool(cant["ok"]), "buy fails when coins can't cover full qty")
	_check(cant.get("reason", "") == "cant_afford", "reason is 'cant_afford'")
	_check(poor.coins == 50 and poor.qty("flour") == 0, "no mutation when can't afford")

	# Bad qty / not buyable reasons.
	_check(g.buy("flour", 0).get("reason", "") == "bad_qty", "buy qty 0 → reason 'bad_qty'")
	_check(g.buy("rock", 1).get("reason", "") == "not_buyable", "buy unlisted → reason 'not_buyable'")

	# Cap discipline: at Camp (cap 200) with 199 flour, buying 10 only fits 1.
	var cap := GameState.new()
	_check(cap.settlement.cap() == 200, "Camp cap is 200 for the buy-cap test")
	cap.inventory["flour"] = 199
	cap.coins = 100000        # plenty of coins
	var clip := cap.buy("flour", 10)
	_check(bool(clip["ok"]), "buy succeeds when at least one unit fits")
	_check(int(clip["added"]) == 1, "only 1 unit fits (room = 200-199)")
	_check(int(clip["coins_spent"]) == 30, "charged only for the 1 unit that fit (30, not 300)")
	_check(int(clip.get("qty", 0)) == 10, "buy result echoes the requested qty (10)")
	_check(cap.qty("flour") == 200, "flour clamped to the cap (200)")
	_check(cap.coins == 100000 - 30, "coins debited only for the unit that fit")

	# Inventory exactly at cap → nothing fits → cap_full, no charge.
	var full := GameState.new()
	full.inventory["flour"] = 200    # exactly the Camp cap
	full.coins = 100000
	var cf := full.buy("flour", 5)
	_check(not bool(cf["ok"]), "buy fails when inventory is exactly at cap")
	_check(cf.get("reason", "") == "cap_full", "reason is 'cap_full' at the cap")
	_check(full.qty("flour") == 200 and full.coins == 100000, "no mutation when cap_full")

# ── refined good round-trips through save/load ────────────────────────────────

func _test_refined_good_round_trip() -> void:
	SaveManager.clear()              # isolation: start from no save
	var g := _state_with_bakery({"flour": 3, "eggs": 1})
	_check(g.craft(RC.BREAD)["ok"], "bake one bread for the round-trip")
	g.coins = 77
	_check(g.qty("bread") == 1, "1 bread present pre-save")
	_check(SaveManager.save(g), "SaveManager.save() reports success")

	var loaded := SaveManager.load_state()
	_check(loaded.qty("bread") == 1, "save→load preserves the bread count")
	_check(loaded.coins == 77, "save→load preserves coins")
	_check(loaded.has_building(BC.BAKERY), "save→load preserves the placed Bakery")
	SaveManager.clear()

# ── integration: bake several breads, then sell them for coins ────────────────

func _test_bake_then_sell_integration() -> void:
	# At Village with Coop + Garden + Bakery and ample flour/eggs, bake 4 breads,
	# then sell them all and assert coins rose by bread_count × sell_price(bread).
	var g := _state_with_bakery()
	_give_all(g, BC.building_cost(BC.COOP))
	_check(g.build(BC.COOP)["ok"], "build Coop alongside the Bakery")
	_give_all(g, BC.building_cost(BC.GARDEN))
	_check(g.build(BC.GARDEN)["ok"], "build Garden alongside the Bakery")

	var loaves := 4
	_give_all(g, {"flour": 3 * loaves, "eggs": 1 * loaves})
	for i in loaves:
		_check(g.craft(RC.BREAD)["ok"], "bake bread #%d" % (i + 1))
	_check(g.qty("bread") == loaves, "baked %d breads total" % loaves)
	_check(g.qty("flour") == 0 and g.qty("eggs") == 0, "all flour + eggs consumed by baking")

	var coins_before := g.coins
	var sale := g.sell("bread", loaves)
	_check(bool(sale["ok"]), "sell all baked bread")
	var expected_gain := MC.sell_price("bread") * loaves
	_check(int(sale["coins_gain"]) == expected_gain,
		"coins_gain == bread_count × sell_price(bread) (%d)" % expected_gain)
	_check(g.coins == coins_before + expected_gain, "coins increased by the full bread proceeds")
	_check(g.qty("bread") == 0, "bread inventory drained after the sale")
	_check(not g.inventory.has("bread"), "fully-sold bread key erased")

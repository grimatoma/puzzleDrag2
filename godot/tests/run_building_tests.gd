extends SceneTree
## Headless unit-test runner for the M3b building-gated category spawners:
## BuildingConfig (the spawner catalog + helpers), the GameState build/demolish/
## plot/pool API, save-load round-tripping of placed buildings, and the key
## integration test — that the revised Town-1 ladder is NOT deadlocked. Run from
## the godot/ project root:
##   godot --headless --script res://tests/run_building_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_town_tests.gd.

const T := Constants.Tile
# `BuildingConfig` is a class_name global, not a constant expression, so it can't
# be aliased with `const`. A plain member var holds the type reference instead.
var BC := BuildingConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Building / spawner tests ───────────────────────")
	_test_building_config_values()
	_test_available_at_tier()
	_test_cost_returns_copy()
	_test_gating()
	_test_build_deducts_and_appends()
	_test_build_exists_no_mutation()
	_test_plot_cap()
	_test_demolish()
	_test_active_pool_and_categories()
	_test_save_load_round_trip()
	_test_town1_not_deadlocked()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ────────────────────────────────────────────────────────

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

## Add every (resource, amount) pair in `cost` to `g`'s inventory.
func _give_all(g: GameState, cost: Dictionary) -> void:
	for k in cost.keys():
		_give(g, k, int(cost[k]))

# ── BuildingConfig values ─────────────────────────────────────────────────────

func _test_building_config_values() -> void:
	_check(BC.SPAWNER_IDS.size() == 3, "3 spawner buildings in the catalog")
	_check(BC.is_building(BC.LUMBER_CAMP), "lumber_camp is a real building")
	_check(not BC.is_building("nope"), "'nope' is not a building")

	# Lumber Camp
	_check(BC.building_name(BC.LUMBER_CAMP) == "Lumber Camp", "lumber_camp name")
	_check(BC.unlock_tier(BC.LUMBER_CAMP) == TownConfig.TIER_HAMLET, "lumber_camp unlocks at Hamlet (2)")
	_check(BC.building_cost(BC.LUMBER_CAMP) == {"hay_bundle": 8, "flour": 4}, "lumber_camp cost")
	_check(BC.building_category(BC.LUMBER_CAMP) == "trees", "lumber_camp category is trees")
	_check(BC.building_tile(BC.LUMBER_CAMP) == T.OAK, "lumber_camp tile is OAK")
	_check(BC.building_resource(BC.LUMBER_CAMP) == "plank", "lumber_camp resource is plank")

	# Coop
	_check(BC.building_name(BC.COOP) == "Coop", "coop name")
	_check(BC.unlock_tier(BC.COOP) == TownConfig.TIER_VILLAGE, "coop unlocks at Village (3)")
	_check(BC.building_cost(BC.COOP) == {"plank": 6, "flour": 6}, "coop cost")
	_check(BC.building_category(BC.COOP) == "birds", "coop category is birds")
	_check(BC.building_tile(BC.COOP) == T.PHEASANT, "coop tile is PHEASANT")
	_check(BC.building_resource(BC.COOP) == "eggs", "coop resource is eggs")

	# Garden
	_check(BC.building_name(BC.GARDEN) == "Garden", "garden name")
	_check(BC.unlock_tier(BC.GARDEN) == TownConfig.TIER_VILLAGE, "garden unlocks at Village (3)")
	_check(BC.building_cost(BC.GARDEN) == {"plank": 6, "hay_bundle": 10}, "garden cost")
	_check(BC.building_category(BC.GARDEN) == "veg", "garden category is veg")
	_check(BC.building_tile(BC.GARDEN) == T.CARROT, "garden tile is CARROT")
	_check(BC.building_resource(BC.GARDEN) == "soup", "garden resource is soup")

	# Unknown ids degrade gracefully.
	_check(BC.building_name("nope") == "", "unknown building_name is empty")
	_check(BC.unlock_tier("nope") == 0, "unknown unlock_tier is 0")
	_check(BC.building_tile("nope") == Constants.EMPTY, "unknown building_tile is EMPTY")
	_check(BC.building_cost("nope") == {}, "unknown building_cost is empty")

func _test_available_at_tier() -> void:
	_check(BC.available_at_tier(1) == [], "no buildings available at Camp (tier 1)")
	_check(BC.available_at_tier(2) == [BC.LUMBER_CAMP], "only lumber_camp at Hamlet (tier 2)")
	var at3: Array = BC.available_at_tier(3)
	_check(at3.has(BC.LUMBER_CAMP) and at3.has(BC.COOP) and at3.has(BC.GARDEN),
		"all three buildings available at Village (tier 3)")
	_check(at3.size() == 3, "exactly three buildings available at Village")

func _test_cost_returns_copy() -> void:
	# Mutating a returned cost must not mutate the const catalog.
	var c := BC.building_cost(BC.LUMBER_CAMP)
	c["hay_bundle"] = 999
	_check(BC.building_cost(BC.LUMBER_CAMP) == {"hay_bundle": 8, "flour": 4},
		"building_cost returns a defensive copy")

# ── gating + build ────────────────────────────────────────────────────────────

func _test_gating() -> void:
	# Fresh GameState is at Camp (tier 1): lumber_camp is locked even if affordable.
	var g := GameState.new()
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_check(not g.can_build(BC.LUMBER_CAMP), "can_build false at Camp (locked: needs Hamlet)")

	# Raise to Hamlet with the cost present → buildable.
	g.settlement.tier = TownConfig.TIER_HAMLET
	_check(g.can_build(BC.LUMBER_CAMP), "can_build true at Hamlet with cost present")

	# Strip the cost → no longer affordable.
	var g2 := GameState.new()
	g2.settlement.tier = TownConfig.TIER_HAMLET
	g2.inventory["hay_bundle"] = 8           # flour missing
	_check(not g2.can_build(BC.LUMBER_CAMP), "can_build false with insufficient inventory")

func _test_build_deducts_and_appends() -> void:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_HAMLET
	g.inventory["hay_bundle"] = 10           # cost 8 → 2 left
	g.inventory["flour"] = 5                 # cost 4 → 1 left
	var res := g.build(BC.LUMBER_CAMP)
	_check(bool(res["ok"]), "build(lumber_camp) succeeds")
	_check(res.get("id", "") == BC.LUMBER_CAMP, "build result carries id")
	_check(res.get("name", "") == "Lumber Camp", "build result carries name")
	_check(g.has_building(BC.LUMBER_CAMP), "has_building true after build")
	_check(g.plots_used() == 1, "plots_used == 1 after one build")
	_check(g.qty("hay_bundle") == 2, "hay_bundle deducted exactly (10-8)")
	_check(g.qty("flour") == 1, "flour deducted exactly (5-4)")

func _test_build_exists_no_mutation() -> void:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_HAMLET
	g.inventory["hay_bundle"] = 20
	g.inventory["flour"] = 20
	_check(g.build(BC.LUMBER_CAMP)["ok"], "first build succeeds")
	var inv_hay := g.qty("hay_bundle")
	var inv_flour := g.qty("flour")
	var res := g.build(BC.LUMBER_CAMP)
	_check(not bool(res["ok"]), "second build of same id fails")
	_check(res.get("reason", "") == "exists", "reason is 'exists'")
	_check(g.plots_used() == 1, "plots_used unchanged after failed re-build")
	_check(g.qty("hay_bundle") == inv_hay and g.qty("flour") == inv_flour,
		"inventory unchanged after failed re-build")

func _test_plot_cap() -> void:
	# At Village (tier 3) there are 7 plots. Pre-fill `buildings` with 7 DUMMY ids
	# (bypassing build()) to simulate a full town, then try to build lumber_camp:
	# the plot guard must trip with reason "no_plot".
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	_check(g.settlement.plots() == 7, "Village has 7 plots")
	g.buildings = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"]   # 7 dummy occupants
	_check(g.plots_used() == 7, "plots_used == 7 (full)")
	_check(g.plots_free() == 0, "plots_free == 0 (full)")
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))            # affordable + unlocked
	_check(not g.can_build(BC.LUMBER_CAMP), "can_build false when plots are full")
	var res := g.build(BC.LUMBER_CAMP)
	_check(not bool(res["ok"]), "build fails when plots are full")
	_check(res.get("reason", "") == "no_plot", "failure reason is 'no_plot'")
	_check(g.plots_used() == 7, "plots_used still 7 after failed build")

func _test_demolish() -> void:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_HAMLET
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_check(g.build(BC.LUMBER_CAMP)["ok"], "build lumber_camp for demolish test")
	_check(g.plots_used() == 1, "one plot used before demolish")
	var inv_before := g.inventory.duplicate()

	var res := g.demolish(BC.LUMBER_CAMP)
	_check(bool(res["ok"]), "demolish(lumber_camp) succeeds")
	_check(res.get("id", "") == BC.LUMBER_CAMP, "demolish result carries id")
	_check(not g.has_building(BC.LUMBER_CAMP), "building gone after demolish")
	_check(g.plots_used() == 0, "plot freed after demolish")
	_check(g.inventory == inv_before, "no refund — inventory unchanged by demolish")

	# Plot freed → buildable again (given affordability).
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_check(g.can_build(BC.LUMBER_CAMP), "can_build true again after demolish frees the plot")

	# Demolishing something not built fails cleanly.
	var res2 := g.demolish(BC.COOP)
	_check(not bool(res2["ok"]), "demolish of not-built id fails")
	_check(res2.get("reason", "") == "not_built", "reason is 'not_built'")

# ── pool + categories ────────────────────────────────────────────────────────

func _test_active_pool_and_categories() -> void:
	var g := GameState.new()
	_check(g.active_categories() == ["grass", "grain"], "fresh categories are the two staples")
	var pool0 := g.active_tile_pool()
	_check(pool0.has(T.GRASS) and pool0.has(T.WHEAT), "fresh pool has both staples")
	_check(not pool0.has(T.OAK), "fresh pool has no trees (OAK)")

	# Build lumber_camp → trees category + OAK appears TWICE in the pool.
	g.settlement.tier = TownConfig.TIER_HAMLET
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_check(g.build(BC.LUMBER_CAMP)["ok"], "build lumber_camp for pool test")
	_check(g.active_categories().has("trees"), "categories include 'trees' after lumber_camp")
	var pool1 := g.active_tile_pool()
	_check(pool1.has(T.OAK), "pool contains OAK after lumber_camp")
	var oak_count := 0
	for t in pool1:
		if t == T.OAK:
			oak_count += 1
	_check(oak_count == 2, "OAK appears exactly twice (a moderate slice)")
	# Staples still present.
	_check(pool1.has(T.GRASS) and pool1.has(T.WHEAT), "staples still in the pool after a build")

# ── persistence ──────────────────────────────────────────────────────────────

func _test_save_load_round_trip() -> void:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	_give_all(g, BC.building_cost(BC.LUMBER_CAMP))
	_give_all(g, BC.building_cost(BC.COOP))
	_check(g.build(BC.LUMBER_CAMP)["ok"], "build lumber_camp pre-save")
	_check(g.build(BC.COOP)["ok"], "build coop pre-save")

	var d := g.to_dict()
	_check(d.has("buildings"), "to_dict includes a buildings array")
	var g2 := GameState.from_dict(d)
	_check(g2.buildings == [BC.LUMBER_CAMP, BC.COOP], "round-trip preserves buildings in order")
	_check(g2.plots_used() == 2, "round-trip preserves plot usage")

	# A bogus building id in a save dict is dropped on load.
	var bogus := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 3},
		"buildings": [BC.LUMBER_CAMP, "fake_building", BC.LUMBER_CAMP, BC.GARDEN],
	}
	var g3 := GameState.from_dict(bogus)
	_check(g3.buildings == [BC.LUMBER_CAMP, BC.GARDEN],
		"from_dict drops unknown ids AND duplicates")

# ── integration: the ladder is deadlock-free ─────────────────────────────────

func _test_town1_not_deadlocked() -> void:
	# Walk the entire Town-1 ladder from a fresh state, asserting every gated step
	# is affordable from resources available at the prior tier. The whole point of
	# the revised costs: no step requires a resource the player can't yet make.
	# (Cap at City is 600; every amount here is well under, so no clamp interferes.)
	var g := GameState.new()
	_check(g.settlement.tier == TownConfig.TIER_CAMP, "start at Camp")

	# 1. Camp → Hamlet (staples only).
	_give_all(g, {"hay_bundle": 12, "flour": 6})
	_check(g.try_tier_up()["ok"], "Camp → Hamlet tier-up")
	_check(g.settlement.tier == TownConfig.TIER_HAMLET, "now Hamlet")

	# 2. Build Lumber Camp (unlocked at Hamlet; staples afford it).
	_give_all(g, {"hay_bundle": 8, "flour": 4})
	_check(g.build(BC.LUMBER_CAMP)["ok"], "build Lumber Camp at Hamlet")

	# 3. Hamlet → Village (needs plank, now producible via Lumber Camp).
	_give_all(g, {"plank": 8, "hay_bundle": 16, "flour": 8})
	_check(g.try_tier_up()["ok"], "Hamlet → Village tier-up")
	_check(g.settlement.tier == TownConfig.TIER_VILLAGE, "now Village")

	# 4. Build Coop + Garden (both unlocked at Village).
	_give_all(g, {"plank": 6, "flour": 6})
	_check(g.build(BC.COOP)["ok"], "build Coop at Village")
	_give_all(g, {"plank": 6, "hay_bundle": 10})
	_check(g.build(BC.GARDEN)["ok"], "build Garden at Village")

	# 5. Village → Town (eggs/soup now producible via Coop + Garden).
	_give_all(g, {"eggs": 8, "soup": 6, "plank": 10})
	_check(g.try_tier_up()["ok"], "Village → Town tier-up")
	_check(g.settlement.tier == TownConfig.TIER_TOWN, "now Town")

	# 6. Town → City.
	_give_all(g, {"soup": 10, "eggs": 12, "plank": 14})
	_check(g.try_tier_up()["ok"], "Town → City tier-up")
	_check(g.settlement.tier == TownConfig.TIER_CITY, "now City")
	_check(g.settlement.is_max_tier(), "City is the max tier")

	# End state: City with all three spawners placed.
	_check(g.buildings == [BC.LUMBER_CAMP, BC.COOP, BC.GARDEN],
		"all three spawners built at the end of the ladder")

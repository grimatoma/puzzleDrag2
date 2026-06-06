extends SceneTree
## Headless unit-test runner for the M3f mine biome + Kitchen/supplies + the
## expedition loop. Covers the Constants mine-tile additions, biome-agnostic
## crediting of mine chains, the Kitchen refiner + supplies recipe, the expedition
## gating + enter/turn/leave lifecycle on GameState, save/load of the biome state,
## and the building/recipe catalog deltas. Run from the godot/ project root:
##   godot --headless --script res://tests/run_mine_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_economy_tests.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var BC := BuildingConfig
var RC := RecipeConfig
var MC := MarketConfig
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Mine / expedition tests ────────────────────────")
	_test_mine_tiles()
	_test_mine_market()
	_test_credit_chain_in_mine()
	_test_kitchen_supplies_recipe()
	_test_expedition_gating()
	_test_enter_mine()
	_test_note_mine_turn()
	_test_leave_mine()
	_test_save_load()
	_test_building_recipe_catalogs()
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

## A GameState parked at City tier (where the expedition unlocks), with `extra`
## resources added. Defaults to no extra goods.
func _city_state(extra: Dictionary = {}) -> GameState:
	var g := GameState.new()
	g.settlement.tier = TC.TIER_CITY
	_give_all(g, extra)
	return g

# ── mine tiles ────────────────────────────────────────────────────────────────

func _test_mine_tiles() -> void:
	# Produced resources.
	_check(Constants.produced_resource(T.STONE) == "block", "STONE produces block")
	_check(Constants.produced_resource(T.IRON_ORE) == "iron_bar", "IRON_ORE produces iron_bar")
	_check(Constants.produced_resource(T.COAL) == "coke", "COAL produces coke")
	_check(Constants.produced_resource(T.DIRT) == "dirt", "DIRT produces dirt")
	_check(Constants.produced_resource(T.GEM) == "cut_gem", "GEM produces cut_gem")

	# Thresholds.
	_check(Constants.threshold_for(T.STONE) == 6, "STONE threshold 6")
	_check(Constants.threshold_for(T.IRON_ORE) == 6, "IRON_ORE threshold 6")
	_check(Constants.threshold_for(T.COAL) == 8, "COAL threshold 8")
	_check(Constants.threshold_for(T.DIRT) == 5, "DIRT threshold 5")
	_check(Constants.threshold_for(T.GEM) == 10, "GEM threshold 10")

	# String keys + categories.
	_check(Constants.string_key(T.STONE) == "tile_mine_stone", "STONE string key")
	_check(Constants.string_key(T.DIRT) == "tile_special_dirt", "DIRT string key")
	_check(Constants.category_of(T.STONE) == "stone", "STONE category is 'stone'")
	_check(Constants.category_of(T.IRON_ORE) == "iron", "IRON_ORE category is 'iron'")

	# MINE_POOL membership.
	_check(Constants.MINE_POOL.has(T.STONE), "MINE_POOL contains STONE")
	_check(Constants.MINE_POOL.has(T.GEM), "MINE_POOL contains GEM (rare)")
	_check(not Constants.MINE_POOL.has(T.GRASS), "MINE_POOL does NOT contain farm GRASS")
	_check(not Constants.MINE_POOL.has(T.WHEAT), "MINE_POOL does NOT contain farm WHEAT")

	# Existing farm enum ordinals are UNCHANGED (appending mine members must not
	# shift them — save keys + every prior test depend on this).
	_check(int(T.GRASS) == 0, "farm GRASS ordinal still 0")
	_check(int(T.HORSE) == 9, "farm HORSE ordinal still 9")
	_check(int(T.STONE) == 10, "mine STONE appended at ordinal 10")

# ── mine market prices ────────────────────────────────────────────────────────

func _test_mine_market() -> void:
	_check(MC.sell_price("block") == 10, "block sells for 10")
	_check(MC.sell_price("iron_bar") == 11, "iron_bar sells for 11")
	_check(MC.sell_price("coke") == 40, "coke sells for 40")
	_check(MC.sell_price("cut_gem") == 60, "cut_gem sells for 60")
	_check(MC.sell_price("dirt") == 1, "dirt sells for 1")
	_check(MC.buy_price("cut_gem") == 600, "cut_gem buys for 600")
	# supplies is intentionally NOT market-traded.
	_check(not MC.can_sell("supplies"), "supplies is NOT sellable")
	_check(not MC.can_buy("supplies"), "supplies is NOT buyable")

# ── credit_chain in the mine (biome-agnostic) ─────────────────────────────────

func _test_credit_chain_in_mine() -> void:
	# A chain of 6 STONE (threshold 6) yields exactly 1 block into the shared inv.
	var g := GameState.new()
	var res := g.credit_chain(T.STONE, 6)
	_check(res.get("resource", "") == "block", "credit_chain(STONE) resource is block")
	_check(int(res.get("units", -1)) == 1, "chain of 6 STONE → 1 block (threshold 6)")
	_check(g.qty("block") == 1, "1 block landed in the shared inventory")

	# Carry-over: 4 then 4 STONE (threshold 6) → 1 block, leftover progress 2.
	var g2 := GameState.new()
	_check(int(g2.credit_chain(T.STONE, 4).get("units", -1)) == 0, "first 4 STONE yields 0 (progress 4)")
	var r2 := g2.credit_chain(T.STONE, 4)
	_check(int(r2.get("units", -1)) == 1, "second 4 STONE crosses 6 → 1 block")
	_check(g2.qty("block") == 1, "carry-over produced exactly 1 block")
	_check(int(g2.progress.get("block", -1)) == 2, "leftover progress is 2 (8 % 6)")

# ── Kitchen + supplies recipe ─────────────────────────────────────────────────

func _test_kitchen_supplies_recipe() -> void:
	# Without a Kitchen → can't craft supplies; craft reason "no_station".
	var fresh := GameState.new()
	_give_all(fresh, {"bread": 1, "flour": 2})
	_check(not fresh.can_craft(RC.SUPPLIES), "can_craft(supplies) false with no Kitchen")
	var no_station := fresh.craft(RC.SUPPLIES)
	_check(no_station.get("reason", "") == "no_station", "supplies craft reason 'no_station' with no Kitchen")

	# Town tier (Kitchen unlocks there), build a Kitchen, then craft supplies.
	var g := GameState.new()
	g.settlement.tier = TC.TIER_TOWN
	_give_all(g, BC.building_cost(BC.KITCHEN))
	_check(g.build(BC.KITCHEN)["ok"], "build Kitchen at Town tier")
	_give_all(g, {"bread": 1, "flour": 2})
	_check(g.can_craft(RC.SUPPLIES), "can_craft(supplies) true with Kitchen + 1 bread + 2 flour")
	var ok := g.craft(RC.SUPPLIES)
	_check(bool(ok["ok"]), "craft(supplies) succeeds")
	_check(ok.get("output", "") == "supplies", "craft output is supplies")
	_check(g.qty("supplies") == 1, "1 supplies added")
	_check(g.qty("bread") == 0, "1 bread consumed")
	_check(g.qty("flour") == 0, "2 flour consumed")

# ── expedition gating ─────────────────────────────────────────────────────────

func _test_expedition_gating() -> void:
	# Fresh GameState: farm, Camp tier, no supplies → can't enter.
	var fresh := GameState.new()
	_check(not fresh.can_enter_mine(), "fresh state can't enter the mine (Camp, no supplies)")
	_check(fresh.enter_mine().get("reason", "") == "locked",
		"enter_mine on a Camp state → reason 'locked' (below City)")

	# City tier but 0 supplies → can't enter, reason 'no_supplies'.
	var no_sup := _city_state()
	_check(not no_sup.can_enter_mine(), "City with 0 supplies can't enter")
	_check(no_sup.enter_mine().get("reason", "") == "no_supplies",
		"City + 0 supplies → reason 'no_supplies'")

	# Below City WITH supplies → locked (tier guard precedes the supply guard).
	var low := GameState.new()
	low.settlement.tier = TC.TIER_TOWN
	_give(low, "supplies", 3)
	_check(not low.can_enter_mine(), "Town tier with supplies still can't enter (needs City)")
	_check(low.enter_mine().get("reason", "") == "locked",
		"below City with supplies → reason 'locked'")

	# City + supplies > 0 → can enter.
	var ready := _city_state({"supplies": 2})
	_check(ready.can_enter_mine(), "City + supplies>0 → can_enter_mine true")

# ── enter_mine ────────────────────────────────────────────────────────────────

func _test_enter_mine() -> void:
	var g := _city_state({"supplies": 5})
	_check(not g.is_in_mine(), "(pre) not in the mine on the farm")
	var res := g.enter_mine()
	_check(bool(res["ok"]), "enter_mine succeeds at City with 5 supplies")
	_check(int(res.get("turns", -1)) == 5, "enter_mine grants 5 turns (1 per supplies)")
	_check(g.mine_turns_left == 5, "mine_turns_left == 5 after entering")
	_check(g.is_in_mine(), "is_in_mine() true after entering")
	_check(g.qty("supplies") == 0, "all supplies consumed into turns")
	_check(not g.inventory.has("supplies"), "supplies key erased from inventory")
	# The active biome pool is now the mine pool: MINE_POOL plus the M3i rubble hazard
	# slots (RUBBLE_POOL_SLOTS copies of RUBBLE appended — the cave-in clutter). It is
	# no longer EXACTLY MINE_POOL, so assert MINE_POOL's tiles are present + the size delta.
	var pool := g.active_biome_pool()
	_check(pool.size() == Constants.MINE_POOL.size() + Constants.RUBBLE_POOL_SLOTS,
		"active_biome_pool() == MINE_POOL + RUBBLE_POOL_SLOTS in the mine")
	for mine_tile in Constants.MINE_POOL:
		_check(pool.has(mine_tile), "mine pool still contains MINE_POOL tile %d" % int(mine_tile))
	_check(pool.has(T.STONE), "mine pool contains STONE")
	_check(not pool.has(T.GRASS), "mine pool contains no farm GRASS")

	# Entering again while already mining → reason 'already_mining', no mutation.
	_give(g, "supplies", 2)        # even with supplies, re-entry is blocked
	var again := g.enter_mine()
	_check(again.get("reason", "") == "already_mining", "re-enter while mining → 'already_mining'")
	_check(g.mine_turns_left == 5, "turns unchanged by the blocked re-entry")

# ── note_mine_turn (the soft-fail loop) ───────────────────────────────────────

func _test_note_mine_turn() -> void:
	var g := _city_state({"supplies": 5})
	_check(g.enter_mine()["ok"], "(setup) enter the mine with 5 turns")
	# Gather some mine goods mid-run so we can prove they survive the exit.
	g.credit_chain(T.STONE, 6)     # → 1 block
	_check(g.qty("block") == 1, "(setup) gathered 1 block during the run")

	# Four turns: exited stays false, turns count down 4 → 1.
	for expected in [4, 3, 2, 1]:
		var r := g.note_mine_turn()
		_check(not bool(r.get("exited", true)), "turn with %d left does NOT exit" % expected)
		_check(int(r.get("turns_left", -1)) == expected, "turns_left == %d" % expected)
		_check(g.is_in_mine(), "still mining at %d turns" % expected)

	# Fifth turn: exit. Back to the farm, turns 0, farm pool restored.
	var last := g.note_mine_turn()
	_check(bool(last.get("exited", false)), "fifth turn EXITS the expedition")
	_check(int(last.get("turns_left", -1)) == 0, "turns_left == 0 on exit")
	_check(not g.is_in_mine(), "back on the farm after the last turn")
	_check(g.active_biome == "farm", "active_biome reset to 'farm'")
	# active_biome_pool now matches the farm pool again (no buildings → staple pool).
	_check(g.active_biome_pool() == g.active_tile_pool(),
		"active_biome_pool() falls back to the farm pool after exit")
	_check(g.active_biome_pool() == Constants.STAPLE_POOL,
		"farm pool is the staples-only pool (no spawners placed)")
	# Collected goods are KEPT (soft-fail).
	_check(g.qty("block") == 1, "block gathered during the run survives the exit")

# ── leave_mine (manual early exit) ────────────────────────────────────────────

func _test_leave_mine() -> void:
	var g := _city_state({"supplies": 4})
	_check(g.enter_mine()["ok"], "(setup) enter the mine with 4 turns")
	g.credit_chain(T.IRON_ORE, 6)  # → 1 iron_bar
	g.note_mine_turn()             # spend one (3 left)
	_check(g.mine_turns_left == 3, "(setup) 3 turns left mid-run")
	g.leave_mine()
	_check(not g.is_in_mine(), "leave_mine returns to the farm")
	_check(g.mine_turns_left == 0, "leave_mine zeroes the remaining turns")
	_check(g.active_biome == "farm", "active_biome is 'farm' after leaving")
	_check(g.qty("iron_bar") == 1, "iron_bar gathered before leaving is kept")

# ── save / load of the biome state ────────────────────────────────────────────

func _test_save_load() -> void:
	# Enter a mine with N turns, round-trip through to_dict/from_dict → preserved.
	var g := _city_state({"supplies": 3})
	_check(g.enter_mine()["ok"], "(setup) enter the mine with 3 turns for save test")
	g.credit_chain(T.COAL, 8)      # → 1 coke, so inventory also round-trips
	var d := g.to_dict()
	_check(d.get("active_biome", "") == "mine", "to_dict carries active_biome 'mine'")
	_check(int(d.get("mine_turns_left", -1)) == 3, "to_dict carries mine_turns_left 3")
	var loaded := GameState.from_dict(d)
	_check(loaded.active_biome == "mine", "from_dict restores active_biome 'mine'")
	_check(loaded.mine_turns_left == 3, "from_dict restores mine_turns_left 3")
	_check(loaded.is_in_mine(), "loaded state reports is_in_mine() true")
	_check(loaded.qty("coke") == 1, "shared inventory (coke) round-trips alongside the biome")

	# A corrupt save (biome 'mine' but 0 turns) snaps back to the farm.
	var corrupt := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "mine", "mine_turns_left": 0,
	}
	var c := GameState.from_dict(corrupt)
	_check(c.active_biome == "farm", "corrupt mine-with-0-turns save loads as 'farm'")
	_check(c.mine_turns_left == 0, "corrupt save's turns clamp to 0")

	# An unknown biome string also falls back to the farm.
	var bad_biome := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "void", "mine_turns_left": 4,
	}
	var b := GameState.from_dict(bad_biome)
	_check(b.active_biome == "farm", "unknown biome string falls back to 'farm'")

	# A negative turn count clamps to 0 (and thus snaps the biome to farm).
	var neg := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "mine", "mine_turns_left": -7,
	}
	var n := GameState.from_dict(neg)
	_check(n.mine_turns_left == 0, "negative mine_turns_left clamps to 0")
	_check(n.active_biome == "farm", "negative-turn mine save snaps to the farm")

# ── building / recipe catalogs ────────────────────────────────────────────────

func _test_building_recipe_catalogs() -> void:
	# Kitchen is a Town-tier refiner.
	_check(BC.is_building(BC.KITCHEN), "kitchen is a real building")
	_check(BC.building_name(BC.KITCHEN) == "Kitchen", "kitchen name")
	_check(BC.is_refiner(BC.KITCHEN), "kitchen is a refiner")
	_check(not BC.is_spawner(BC.KITCHEN), "kitchen is NOT a spawner")
	_check(BC.unlock_tier(BC.KITCHEN) == TC.TIER_TOWN, "kitchen unlocks at Town (4)")
	_check(BC.building_resource(BC.KITCHEN) == "supplies", "kitchen produces supplies")
	_check(BC.building_tile(BC.KITCHEN) == Constants.EMPTY, "kitchen has no tile (EMPTY)")

	# available_at_tier: Kitchen is offered at Town (4) but not Village (3).
	_check(BC.available_at_tier(4).has(BC.KITCHEN), "available_at_tier(4) includes the Kitchen")
	_check(not BC.available_at_tier(3).has(BC.KITCHEN), "available_at_tier(3) does NOT include the Kitchen")

	# Supplies recipe lives at the Kitchen station.
	_check(RC.is_recipe(RC.SUPPLIES), "supplies is a real recipe")
	_check(RC.recipe_station(RC.SUPPLIES) == BC.KITCHEN, "supplies station is the Kitchen")
	_check(RC.recipe_inputs(RC.SUPPLIES) == {"bread": 1, "flour": 2}, "supplies inputs are bread 1 + flour 2")
	_check(RC.recipe_output(RC.SUPPLIES) == "supplies", "supplies output is 'supplies'")
	_check(RC.recipes_for_station(BC.KITCHEN) == [RC.SUPPLIES], "recipes_for_station(kitchen) == [supplies]")
	_check(RC.recipes_for_station(BC.BAKERY) == [RC.BREAD], "Bakery still maps to [bread] only")

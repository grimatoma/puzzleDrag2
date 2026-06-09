extends SceneTree
## Headless integration-test runner for the BUILDING ABILITIES wiring (T17/T21): building an
## ability-bearing landmark must move the economy at its wired site, and a FRESH game (no such
## building) must stay byte-identical. Covers every wired channel end-to-end:
##   Granary inventory_cap_bonus → effective_cap rises (+300)
##   Granary / Mining Camp turn_budget_bonus → farm_run_turn_budget bigger
##   Sawmill bonus_yield → credit_chain banks an extra unit of the produced resource
##   Chapel season_bonus → close_season grants extra coins
##   Powder Store grant_tool → bomb granted at season end
##   Observatory threshold_reduce_category → credit_chain yields gem units sooner
##   Mill recipe_input_reduce → crafting consumes less flour (stacks with the Baker)
##   compute_ability_channels cache invalidates on build / demolish
## Plus the NO-OP fresh-game guarantee for the cap / turn budget / season / yield sites.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_building_abilities_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const T := Constants.Tile
var BC := BuildingConfig
var WC := WorkerConfig
var RC := RecipeConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Building abilities wiring tests ─────────────────")
	_test_fresh_game_noop()
	_test_granary_cap_bonus()
	_test_turn_budget_bonus()
	_test_sawmill_bonus_yield()
	_test_chapel_season_bonus()
	_test_powder_store_grant_tool()
	_test_observatory_threshold_reduce()
	_test_mill_recipe_input_reduce()
	_test_cache_invalidation()
	_test_save_load_preserves_channels()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

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

## Build `id` on a fresh state at the building's unlock tier with its cost satisfied.
func _state_with(id: String) -> GameState:
	var g := GameState.new()
	g.settlement.tier = BC.unlock_tier(id)
	for k in BC.building_cost(id).keys():
		_give(g, String(k), int(BC.building_cost(id)[k]))
	var res := g.build(id)
	_check(bool(res.get("ok", false)), "(setup) built %s at tier %d" % [id, BC.unlock_tier(id)])
	return g

# ── FRESH GAME → every channel a NO-OP (byte-identical) ────────────────────────

func _test_fresh_game_noop() -> void:
	var g := GameState.new()
	var ch: Dictionary = g.compute_ability_channels()
	_check(ch["threshold_reduce"] == {}, "fresh: threshold_reduce empty")
	_check(int(ch["inventory_cap_bonus"]) == 0, "fresh: inventory_cap_bonus 0")
	_check(int(ch["turn_budget_bonus"]) == 0, "fresh: turn_budget_bonus 0")
	_check(ch["season_bonus"] == {}, "fresh: season_bonus empty")
	_check(ch["bonus_yield"] == {}, "fresh: bonus_yield empty")
	_check(ch["season_end_tools"] == {}, "fresh: season_end_tools empty")
	# effective_cap == tier cap; turn budget == base.
	_check(g.effective_cap() == g.settlement.cap(), "fresh: effective_cap == tier cap")
	_check(g.farm_run_turn_budget(false) == ZoneConfig.base_turns(ZoneConfig.HOME_ZONE),
		"fresh: farm_run_turn_budget == base turns (no bonus)")
	# A grass chain credits exactly the baseline (no bonus units).
	var r := g.credit_chain(T.GRASS, 6)   # grass threshold 6 → 1 unit
	_check(int(r["units"]) == 1 and int(r["bonus_units"]) == 0, "fresh: grass n=6 → 1 unit, 0 bonus (baseline)")

# ── Granary inventory_cap_bonus → effective_cap +300 ───────────────────────────

func _test_granary_cap_bonus() -> void:
	var base_cap := GameState.new()
	base_cap.settlement.tier = BC.unlock_tier(BC.GRANARY)
	var tier_cap: int = base_cap.settlement.cap()
	var g := _state_with(BC.GRANARY)
	_check(int(g.compute_ability_channels()["inventory_cap_bonus"]) == 300, "Granary → inventory_cap_bonus 300")
	_check(g.effective_cap() == tier_cap + 300, "Granary → effective_cap is tier cap + 300")
	# A chain can now store past the old tier cap. Seed inventory near the tier cap, credit a unit.
	g.inventory["hay_bundle"] = tier_cap   # at the OLD cap
	# grass produces hay_bundle, threshold 6 → n=6 gives 1 unit. With the raised cap it's stored.
	g.credit_chain(T.GRASS, 6)
	_check(g.qty("hay_bundle") == tier_cap + 1, "Granary: a chain stores PAST the old tier cap (cap raised)")

# ── turn_budget_bonus → bigger farm run budget ─────────────────────────────────

func _test_turn_budget_bonus() -> void:
	var base: int = ZoneConfig.base_turns(ZoneConfig.HOME_ZONE)
	var g := _state_with(BC.GRANARY)   # Granary carries turn_budget_bonus +1
	_check(int(g.compute_ability_channels()["turn_budget_bonus"]) == 1, "Granary → turn_budget_bonus 1")
	_check(g.farm_run_turn_budget(false) == base + 1, "Granary → farm_run_turn_budget is base+1")
	# Fertilizer multiplier applies AFTER the additive: (base+1)*2.
	_check(g.farm_run_turn_budget(true) == (base + 1) * 2, "Granary → fertilizer budget is (base+1)*2")

# ── Sawmill bonus_yield → extra plank per oak chain ────────────────────────────

func _test_sawmill_bonus_yield() -> void:
	# Baseline: oak (threshold 6) n=6 → 1 plank unit, 0 bonus.
	var base := GameState.new()
	var rb := base.credit_chain(T.OAK, 6)
	_check(int(rb["units"]) == 1 and int(rb["bonus_units"]) == 0, "baseline: oak n=6 → 1 plank, 0 bonus")
	_check(base.qty("plank") == 1, "baseline: 1 plank banked")
	# With a Sawmill the bonus_yield channel adds +1 plank on the same chain.
	var g := _state_with(BC.SAWMILL)
	_check(_approxf(float(g.compute_ability_channels()["bonus_yield"].get("tile_tree_oak", 0.0)), 1.0),
		"Sawmill → bonus_yield tile_tree_oak 1")
	var rg := g.credit_chain(T.OAK, 6)
	_check(int(rg["units"]) == 1 and int(rg["bonus_units"]) == 1, "Sawmill: oak n=6 → 1 unit + 1 bonus unit")
	_check(g.qty("plank") == 2, "Sawmill: 2 plank banked (1 threshold + 1 bonus)")

func _approxf(a: float, b: float) -> bool:
	return absf(a - b) < 0.0001

# ── Chapel season_bonus → +50 coins at close_season ────────────────────────────

func _test_chapel_season_bonus() -> void:
	# Baseline close: only the flat SEASON_END_BONUS_COINS.
	var base := GameState.new()
	base.coins = 1000
	base.start_farm_run([], false)
	var coins_after_entry := base.coins
	var rb := base.close_season()
	_check(int(rb["coins_granted"]) == Constants.SEASON_END_BONUS_COINS, "baseline close grants only the flat bonus")
	_check(base.coins == coins_after_entry + Constants.SEASON_END_BONUS_COINS, "baseline close coins == flat bonus")
	# With a Chapel the season_bonus channel adds +50 on top.
	var g := _state_with(BC.CHAPEL)
	_check(_approxf(float(g.compute_ability_channels()["season_bonus"].get("coins", 0.0)), 50.0),
		"Chapel → season_bonus coins 50")
	g.coins = 1000
	g.start_farm_run([], false)
	var coins_pre := g.coins
	var rg := g.close_season()
	_check(int(rg["coins_granted"]) == Constants.SEASON_END_BONUS_COINS + 50, "Chapel close grants flat + 50")
	_check(g.coins == coins_pre + Constants.SEASON_END_BONUS_COINS + 50, "Chapel close adds flat + 50 coins")

# ── Powder Store grant_tool → bomb at season end ───────────────────────────────

func _test_powder_store_grant_tool() -> void:
	var g := _state_with(BC.POWDER_STORE)
	_check(int(g.compute_ability_channels()["season_end_tools"].get("bomb", 0)) == 2, "Powder Store → season_end_tools bomb 2")
	var bombs_before := g.tool_count("bomb")
	g.coins = 100
	g.start_farm_run([], false)
	var res := g.close_season()
	_check(g.tool_count("bomb") == bombs_before + 2, "Powder Store: +2 bombs granted at season end")
	_check(int(res.get("tools_granted", {}).get("bomb", 0)) == 2, "close_season result reports 2 bombs granted")

# ── Observatory threshold_reduce_category gem → gem units sooner ────────────────

func _test_observatory_threshold_reduce() -> void:
	# GEM (category gem) threshold 10, produces cut_gem. Baseline chain of 9 → 0 units (below 10).
	var base := GameState.new()
	var rb := base.credit_chain(T.GEM, 9)
	_check(int(rb["units"]) == 0, "baseline: gem n=9 → 0 units (threshold 10)")
	# With an Observatory the gem threshold drops to 9 → the same chain now yields 1 cut_gem.
	var g := _state_with(BC.OBSERVATORY)
	var reduce: float = float(g.compute_ability_channels()["threshold_reduce"].get("cut_gem", 0.0))
	_check(_approxf(reduce, 1.0), "Observatory → threshold_reduce cut_gem 1 (category gem expanded to its resource)")
	var rg := g.credit_chain(T.GEM, 9)
	_check(int(rg["units"]) == 1, "Observatory: gem n=9 → 1 cut_gem at the reduced threshold 9")
	_check(g.qty("cut_gem") == 1, "Observatory: 1 cut_gem banked from a chain that yielded 0 baseline")

# ── Mill recipe_input_reduce → less flour for bread (stacks with the Baker) ─────

func _test_mill_recipe_input_reduce() -> void:
	# Build BOTH a Bakery (the bread station) and a Mill on one state at Village tier.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	for k in BC.building_cost(BC.BAKERY).keys():
		_give(g, String(k), int(BC.building_cost(BC.BAKERY)[k]))
	_check(g.build(BC.BAKERY)["ok"], "(setup) built Bakery")
	for k in BC.building_cost(BC.MILL).keys():
		_give(g, String(k), int(BC.building_cost(BC.MILL)[k]))
	_check(g.build(BC.MILL)["ok"], "(setup) built Mill")
	# Mill alone reduces the bread/flour input by 1.
	_check(_approxf(float(g.compute_ability_channels()["recipe_input_reduce"].get(RC.BREAD, {}).get("flour", 0.0)), 1.0),
		"Mill → recipe_input_reduce bread/flour 1")
	var eff_inputs: Dictionary = g._effective_recipe_inputs(RC.BREAD)
	var base_flour: int = int(RC.recipe_inputs(RC.BREAD).get("flour", 0))
	_check(int(eff_inputs["flour"]) == maxi(1, base_flour - 1), "Mill: bread flour input reduced by 1")
	# Stacking the Baker WORKER (dedicated path) on top reduces by 1 MORE — proving the two paths
	# ADD without double-counting (the aggregate excludes workers; the dedicated path adds them).
	g.workers[WC.BAKER] = 1
	var eff2: Dictionary = g._effective_recipe_inputs(RC.BREAD)
	_check(int(eff2["flour"]) == maxi(1, base_flour - 2), "Mill + 1 Baker: bread flour reduced by 2 (additive, no double-count)")

# ── cache invalidation on build / demolish ─────────────────────────────────────

func _test_cache_invalidation() -> void:
	var g := GameState.new()
	g.settlement.tier = BC.unlock_tier(BC.GRANARY)
	_check(int(g.compute_ability_channels()["inventory_cap_bonus"]) == 0, "pre-build: cap bonus 0 (cache primed)")
	for k in BC.building_cost(BC.GRANARY).keys():
		_give(g, String(k), int(BC.building_cost(BC.GRANARY)[k]))
	g.build(BC.GRANARY)
	_check(int(g.compute_ability_channels()["inventory_cap_bonus"]) == 300, "post-build: cache invalidated → cap bonus 300")
	g.demolish(BC.GRANARY)
	_check(int(g.compute_ability_channels()["inventory_cap_bonus"]) == 0, "post-demolish: cache invalidated → cap bonus 0")

# ── save/load preserves the channel-bearing buildings ──────────────────────────

func _test_save_load_preserves_channels() -> void:
	var g := _state_with(BC.GRANARY)
	var d := g.to_dict()
	var loaded := GameState.from_dict(d)
	_check(loaded.has_building(BC.GRANARY), "save/load preserves the Granary")
	_check(int(loaded.compute_ability_channels()["inventory_cap_bonus"]) == 300,
		"save/load: loaded state recomputes the cap bonus from the persisted building")

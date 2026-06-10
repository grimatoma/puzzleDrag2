extends SceneTree
## Headless unit-test runner for the WORKERS system: WorkerConfig (the 4-type
## catalog + ramped cost math), GameState.worker_threshold_reduction, the
## credit_chain threshold reduction (0 hired == baseline; farmers hired yield more
## grain units at the reduced threshold), hire_worker (deducts ramped cost,
## increments, respects max_count + affordability), fire_worker, the Baker recipe-
## input reduction (1 baker shaves a flour off bread; 0 bakers leave craft
## unchanged), and a workers save/load round-trip. Run from the godot/ project root:
##   godot --headless --script res://tests/run_workers_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_state_tests.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var WC := WorkerConfig
var RC := RecipeConfig
var BC := BuildingConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Workers system tests ───────────────────────────")
	_test_worker_config()
	_test_hire_cost_ramp()
	_test_threshold_reduction()
	_test_credit_chain_baseline_vs_reduced()
	_test_upgrade_spawn_reduced_threshold()
	_test_threshold_floor()
	_test_hire_worker()
	_test_hire_affordability_and_max()
	_test_fire_worker()
	_test_baker_recipe_reduce()
	_test_zero_workers_economy_identical()
	_test_save_load_round_trip()
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

# ── WorkerConfig catalog ──────────────────────────────────────────────────────

func _test_worker_config() -> void:
	_check(WC.all_ids() == [WC.FARMER, WC.LUMBERJACK, WC.MINER, WC.BAKER],
		"four workers in stable order (farmer, lumberjack, miner, baker)")
	_check(WC.all_ids().size() == 4, "exactly four worker types")
	_check(WC.has_worker(WC.FARMER), "farmer is a real worker")
	_check(not WC.has_worker("nope"), "'nope' is not a worker")

	# Names + roles.
	_check(WC.worker_name(WC.FARMER) == "Farmer", "farmer name")
	_check(WC.worker_name(WC.BAKER) == "Baker", "baker name")
	_check(WC.worker_name("nope") == "", "unknown worker name is empty")

	# max_count is 10 for every type.
	for id in WC.all_ids():
		_check(WC.max_count(id) == 10, "%s max_count is 10" % id)
	_check(WC.max_count("nope") == 0, "unknown max_count is 0")

	# Ability mappings to REAL port categories / recipe.
	_check(WC.ability_kind(WC.FARMER) == WC.KIND_THRESHOLD_REDUCE_CATEGORY,
		"farmer is a threshold_reduce_category worker")
	_check(WC.ability_category(WC.FARMER) == "grain", "farmer targets the grain category")
	_check(WC.ability_amount(WC.FARMER) == 1, "farmer amount is 1")
	_check(WC.ability_category(WC.LUMBERJACK) == "trees", "lumberjack targets trees")
	_check(WC.ability_category(WC.MINER) == "stone", "miner targets the stone mine category")

	# grain/trees/stone are all REAL port categories (Constants.CATEGORY) — sanity that
	# the mappings line up with an actual tile so the reduction can ever apply.
	_check(Constants.category_of(T.WHEAT) == "grain", "WHEAT really is the grain category")
	_check(Constants.category_of(T.OAK) == "trees", "OAK really is the trees category")
	_check(Constants.category_of(T.STONE) == "stone", "STONE really is the stone category")

	# Baker is the recipe_input_reduce worker for bread/flour.
	_check(WC.ability_kind(WC.BAKER) == WC.KIND_RECIPE_INPUT_REDUCE,
		"baker is a recipe_input_reduce worker")
	_check(WC.ability_recipe(WC.BAKER) == RC.BREAD, "baker targets the bread recipe")
	_check(WC.ability_input(WC.BAKER) == "flour", "baker reduces the flour input")
	_check(WC.ability_amount(WC.BAKER) == 1, "baker amount is 1")
	# The bread recipe really HAS a flour input the baker can shave.
	_check(RC.recipe_inputs(RC.BREAD).has("flour"), "bread recipe really has a flour input")

	# get_def() returns a defensive copy — mutating it can't corrupt the const.
	var f := WC.get_def(WC.FARMER)
	f["max_count"] = 999
	_check(WC.max_count(WC.FARMER) == 10, "WorkerConfig.get_def returns a defensive copy")

# ── hire-cost ramp math ───────────────────────────────────────────────────────

func _test_hire_cost_ramp() -> void:
	# Farmer: coins 50 + 25*N; resources {hay_bundle:2} × (1 + floor(N/3)).
	var c0 := WC.hire_cost_at(WC.FARMER, 0)
	_check(int(c0["coins"]) == 50, "farmer hire #0 (N=0) costs 50 coins")
	_check(c0["resources"] == {"hay_bundle": 2}, "farmer hire #0 costs 2 hay_bundle")

	var c1 := WC.hire_cost_at(WC.FARMER, 1)
	_check(int(c1["coins"]) == 75, "farmer hire #1 (N=1) costs 50+25 = 75 coins")
	_check(c1["resources"] == {"hay_bundle": 2}, "farmer hire #1 still 2 hay_bundle (under step_every 3)")

	var c3 := WC.hire_cost_at(WC.FARMER, 3)
	_check(int(c3["coins"]) == 125, "farmer hire #3 (N=3) costs 50+75 = 125 coins")
	_check(c3["resources"] == {"hay_bundle": 4}, "farmer hire #3 doubles resources (floor(3/3)=1 → ×2)")

	var c6 := WC.hire_cost_at(WC.FARMER, 6)
	_check(c6["resources"] == {"hay_bundle": 6}, "farmer hire #6 triples resources (floor(6/3)=2 → ×3)")

	# Baker has two resource inputs that BOTH ramp together.
	var b0 := WC.hire_cost_at(WC.BAKER, 0)
	_check(int(b0["coins"]) == 75, "baker hire #0 costs 75 coins")
	_check(b0["resources"] == {"flour": 1, "eggs": 1}, "baker hire #0 costs 1 flour + 1 eggs")
	var b3 := WC.hire_cost_at(WC.BAKER, 3)
	_check(b3["resources"] == {"flour": 2, "eggs": 2}, "baker hire #3 doubles both inputs")

	# Unknown id degrades gracefully.
	_check(WC.hire_cost_at("nope", 0) == {"coins": 0, "resources": {}},
		"unknown worker hire cost is {coins:0, resources:{}}")

# ── worker_threshold_reduction ────────────────────────────────────────────────

func _test_threshold_reduction() -> void:
	var g := GameState.new()
	# 0 hired → 0 reduction for every tile/category.
	_check(g.worker_threshold_reduction(T.WHEAT) == 0, "0 farmers → 0 grain reduction")
	_check(g.worker_threshold_reduction(T.OAK) == 0, "0 lumberjacks → 0 trees reduction")
	_check(g.worker_threshold_reduction(T.STONE) == 0, "0 miners → 0 stone reduction")

	# 3 farmers → reduction 3 for grain (WHEAT), 0 for any OTHER category.
	g.workers[WC.FARMER] = 3
	_check(g.worker_threshold_reduction(T.WHEAT) == 3, "3 farmers → 3 reduction on grain (WHEAT)")
	_check(g.worker_threshold_reduction(T.OAK) == 0, "3 farmers → 0 reduction on trees (OAK)")
	_check(g.worker_threshold_reduction(T.GRASS) == 0, "3 farmers → 0 reduction on grass")
	_check(g.worker_threshold_reduction(T.STONE) == 0, "3 farmers → 0 reduction on stone")

	# Lumberjacks stack on trees independently.
	g.workers[WC.LUMBERJACK] = 2
	_check(g.worker_threshold_reduction(T.OAK) == 2, "2 lumberjacks → 2 reduction on trees")
	_check(g.worker_threshold_reduction(T.WHEAT) == 3, "grain reduction unaffected by lumberjacks")

	# A hazard tile (no category) never gets a reduction.
	_check(g.worker_threshold_reduction(T.RAT) == 0, "hazard tile (RAT, no category) → 0 reduction")

# ── credit_chain: baseline vs reduced threshold ───────────────────────────────

func _test_credit_chain_baseline_vs_reduced() -> void:
	# WHEAT (grain) threshold 5. Baseline chain of 4 → 0 units, progress 4.
	var base := GameState.new()
	var rb := base.credit_chain(T.WHEAT, 4)
	_check(int(rb["units"]) == 0, "baseline: wheat n=4 yields 0 units (threshold 5)")
	_check(int(base.progress.get("flour", 0)) == 4, "baseline: wheat n=4 leaves progress 4")

	# With 3 farmers hired the grain threshold drops 5 → 2. A chain of 4 now yields
	# 4/2 = 2 units (progress 0) — strictly MORE than the baseline 0 units.
	var farmed := GameState.new()
	farmed.workers[WC.FARMER] = 3
	var rf := farmed.credit_chain(T.WHEAT, 4)
	_check(int(rf["units"]) == 2, "3 farmers: wheat n=4 yields 2 units at eff_threshold 2")
	_check(int(farmed.progress.get("flour", 0)) == 0, "3 farmers: wheat n=4 leaves progress 0")
	_check(farmed.qty("flour") == 2, "3 farmers: 2 flour banked from one chain")
	_check(int(rf["units"]) > int(rb["units"]),
		"farmers hired → MORE grain units than baseline for the same chain")

	# A worker of a DIFFERENT category must not touch this chain. 3 lumberjacks leave
	# the grain (wheat) credit IDENTICAL to the baseline.
	var other := GameState.new()
	other.workers[WC.LUMBERJACK] = 3
	var ro := other.credit_chain(T.WHEAT, 4)
	_check(int(ro["units"]) == int(rb["units"]) and int(other.progress.get("flour", 0)) == 4,
		"lumberjacks (wrong category) leave the wheat chain identical to baseline")

# ── upgrade_spawn uses the SAME reduced threshold credit_chain banks with ──────
# A threshold-reduction worker must spawn as many UPGRADE tiles as it credits UNITS:
# both go through GameState.effective_threshold. Before the fix upgrade_spawn divided by
# the RAW Constants threshold, so a hired farmer credited extra grain units but the board
# spawned FEWER upgrade tiles than the units (and fewer than the HUD's "+N" badge showed).
# React keeps these in lockstep by counting upgrades over its effectiveThresholds registry
# (src/GameScene.ts upgradeCountForChain); this asserts the port now does the same.
func _test_upgrade_spawn_reduced_threshold() -> void:
	var H := ZoneConfig.HOME_ZONE
	# WHEAT (grain) raw threshold 5, upgrade target veg → CARROT. A 4-chain is below the raw
	# threshold, so the baseline (0 farmers) credits 0 units AND spawns 0 upgrade tiles.
	_check(int(GameState.new().credit_chain(T.WHEAT, 4)["units"]) == 0,
		"0 farmers: 4-wheat → 0 units (raw thr 5)")
	_check(int(GameState.new().upgrade_spawn_active(H, T.WHEAT, 4)["count"]) == 0,
		"0 farmers: 4-wheat → 0 upgrade tiles (effective == raw)")

	# 3 farmers → grain eff_threshold 5-3 = 2. The SAME 4-wheat chain credits 4/2 = 2 units AND
	# spawns 2 CARROT upgrade tiles — the spawn count tracks the units (the parity the fix
	# guarantees, and what the HUD's "+N" badge already reads off effective_threshold). A fresh
	# instance for each call so credit_chain's mutations can't perturb the spawn computation.
	var spawner := GameState.new()
	spawner.workers[WC.FARMER] = 3
	_check(spawner.effective_threshold(T.WHEAT) == 2, "3 farmers → wheat eff_threshold 2")
	var up := spawner.upgrade_spawn_active(H, T.WHEAT, 4)
	_check(int(up["tile"]) == T.CARROT, "3 farmers: the wheat upgrade tile is CARROT (grain→veg)")

	var crediter := GameState.new()
	crediter.workers[WC.FARMER] = 3
	var units := int(crediter.credit_chain(T.WHEAT, 4)["units"])
	_check(units == 2, "3 farmers: 4-wheat → 2 units credited")
	_check(int(up["count"]) == units,
		"3 farmers: upgrade-tile count (%d) == units credited (%d) — spawn ↔ credit ↔ HUD parity" % [int(up["count"]), units])

	# The static RAW helper still under-counts (0) for the same chain — proving the instance
	# path's effective threshold is what closed the gap, not a test fluke.
	_check(int(GameState.upgrade_spawn(H, T.WHEAT, 4)["count"]) == 0,
		"static raw upgrade_spawn still spawns 0 for the same 4-wheat chain (the regression)")

# ── threshold floor ────────────────────────────────────────────────────────────

func _test_threshold_floor() -> void:
	# WHEAT threshold 5; 10 farmers would reduce by 10 → raw 5-10 = -5, but the
	# WORKER_MIN_THRESHOLD floor (2) keeps eff_threshold at 2. A chain of 6 yields
	# 6/2 = 3 units (NOT 6/0 = explosion / divide-by-zero).
	var g := GameState.new()
	g.workers[WC.FARMER] = 10
	_check(g.worker_threshold_reduction(T.WHEAT) == 10, "10 farmers → reduction 10")
	var r := g.credit_chain(T.WHEAT, 6)
	_check(int(r["units"]) == 3, "floor: wheat n=6 at eff_threshold 2 yields 3 units (floored, not exploded)")
	_check(WorkerConfig.WORKER_MIN_THRESHOLD == 2, "WorkerConfig.WORKER_MIN_THRESHOLD is 2")

# ── hire_worker ────────────────────────────────────────────────────────────────

func _test_hire_worker() -> void:
	var g := GameState.new()
	g.coins = 200
	_give(g, "hay_bundle", 10)
	_check(g.worker_count(WC.FARMER) == 0, "(pre) 0 farmers hired")
	_check(g.can_hire_worker(WC.FARMER), "can hire a farmer with 200c + 10 hay_bundle")

	var coins_before := g.coins
	var hay_before := g.qty("hay_bundle")
	var res := g.hire_worker(WC.FARMER)
	_check(bool(res["ok"]), "hire_worker(farmer) succeeds")
	_check(int(res["count"]) == 1, "hire result reports count 1")
	_check(g.worker_count(WC.FARMER) == 1, "farmer count is now 1")
	_check(g.coins == coins_before - 50, "hire deducted the ramped coins (50)")
	_check(g.qty("hay_bundle") == hay_before - 2, "hire deducted 2 hay_bundle")

	# Second hire costs the ramped 75 coins (50 + 25*1).
	var coins_before2 := g.coins
	_give(g, "hay_bundle", 10)   # ensure resources cover the next hire
	var res2 := g.hire_worker(WC.FARMER)
	_check(bool(res2["ok"]), "second hire succeeds")
	_check(g.coins == coins_before2 - 75, "second hire deducted the RAMPED 75 coins")
	_check(g.worker_count(WC.FARMER) == 2, "farmer count is now 2")

	# Unknown worker → reason "unknown", no mutation.
	var coins_pre := g.coins
	var unk := g.hire_worker("nope")
	_check(unk.get("reason", "") == "unknown", "hire of unknown worker → reason 'unknown'")
	_check(g.coins == coins_pre, "no coins spent on unknown-worker hire")

# ── affordability + max_count guards ──────────────────────────────────────────

func _test_hire_affordability_and_max() -> void:
	# Can't afford the coins → cant_afford, no mutation.
	var poor := GameState.new()
	poor.coins = 10               # farmer #0 needs 50
	_give(poor, "hay_bundle", 10)
	_check(not poor.can_hire_worker(WC.FARMER), "can_hire false when coins short")
	var ca := poor.hire_worker(WC.FARMER)
	_check(ca.get("reason", "") == "cant_afford", "hire fails with reason 'cant_afford' (coins)")
	_check(poor.worker_count(WC.FARMER) == 0 and poor.coins == 10, "no mutation on coins-short hire")

	# Coins fine but resources short → cant_afford too.
	var nores := GameState.new()
	nores.coins = 1000            # plenty of coins
	# no hay_bundle at all → farmer needs 2
	_check(not nores.can_hire_worker(WC.FARMER), "can_hire false when resources short")
	var cr := nores.hire_worker(WC.FARMER)
	_check(cr.get("reason", "") == "cant_afford", "hire fails 'cant_afford' (resources)")
	_check(nores.coins == 1000, "no coins spent when resources short")

	# max_count: at 10 farmers a further hire is rejected with "maxed".
	var maxed := GameState.new()
	maxed.coins = 1000000
	_give(maxed, "hay_bundle", 1000)
	maxed.workers[WC.FARMER] = WC.max_count(WC.FARMER)   # 10
	_check(not maxed.can_hire_worker(WC.FARMER), "can_hire false at max_count")
	var mx := maxed.hire_worker(WC.FARMER)
	_check(mx.get("reason", "") == "maxed", "hire at cap fails with reason 'maxed'")
	_check(maxed.worker_count(WC.FARMER) == 10, "count stays at the cap (10)")

# ── fire_worker ────────────────────────────────────────────────────────────────

func _test_fire_worker() -> void:
	var g := GameState.new()
	g.workers[WC.FARMER] = 2
	var coins_before := g.coins
	var res := g.fire_worker(WC.FARMER)
	_check(bool(res["ok"]), "fire_worker(farmer) succeeds")
	_check(int(res["count"]) == 1, "fire decremented the count to 1")
	_check(g.worker_count(WC.FARMER) == 1, "farmer count is now 1")
	_check(g.coins == coins_before, "fire grants NO refund (coins unchanged)")

	# Firing down to 0 then once more → reason "none".
	_check(g.fire_worker(WC.FARMER)["ok"], "fire the last farmer")
	_check(g.worker_count(WC.FARMER) == 0, "farmer count is now 0")
	var none := g.fire_worker(WC.FARMER)
	_check(none.get("reason", "") == "none", "firing with 0 hired → reason 'none'")
	# Unknown id.
	_check(g.fire_worker("nope").get("reason", "") == "unknown", "fire unknown → reason 'unknown'")

# ── Baker recipe-input reduction ──────────────────────────────────────────────

func _build_state_with_bakery() -> GameState:
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_VILLAGE
	for k in BC.building_cost(BC.BAKERY).keys():
		_give(g, String(k), int(BC.building_cost(BC.BAKERY)[k]))
	_check(g.build(BC.BAKERY)["ok"], "(setup) build Bakery for the baker test")
	return g

func _test_baker_recipe_reduce() -> void:
	# 0 bakers → reduction 0, craft consumes the FULL recipe (flour 3 + eggs 1).
	var g0 := _build_state_with_bakery()
	_check(g0.worker_recipe_input_reduction(RC.BREAD, "flour") == 0, "0 bakers → 0 flour reduction")
	_give(g0, "flour", 3)
	_give(g0, "eggs", 1)
	_check(g0.craft(RC.BREAD)["ok"], "0 bakers: craft bread with the full 3 flour + 1 eggs")
	_check(g0.qty("flour") == 0 and g0.qty("eggs") == 0, "0 bakers: full inputs consumed (unchanged craft)")
	_check(g0.qty("bread") == 1, "0 bakers: 1 bread produced")

	# 1 baker → flour input reduced by 1 (3 → 2). A craft with only 2 flour + 1 eggs
	# now SUCCEEDS (it would FAIL at 0 bakers).
	var g1 := _build_state_with_bakery()
	g1.workers[WC.BAKER] = 1
	_check(g1.worker_recipe_input_reduction(RC.BREAD, "flour") == 1, "1 baker → flour reduction 1")
	_give(g1, "flour", 2)
	_give(g1, "eggs", 1)
	_check(g1.can_craft(RC.BREAD), "1 baker: can_craft with only 2 flour (reduced from 3)")
	var r1 := g1.craft(RC.BREAD)
	_check(bool(r1["ok"]), "1 baker: craft bread with the reduced 2 flour + 1 eggs")
	_check(g1.qty("flour") == 0 and g1.qty("eggs") == 0, "1 baker: 2 flour + 1 eggs consumed")
	_check(g1.qty("bread") == 1, "1 baker: 1 bread produced")

	# Sanity: at 0 bakers the same 2-flour stock CANNOT craft (proves the reduction
	# is what unlocked the 1-baker craft above, not a stock fluke).
	var gctrl := _build_state_with_bakery()
	_give(gctrl, "flour", 2)
	_give(gctrl, "eggs", 1)
	_check(not gctrl.can_craft(RC.BREAD), "0 bakers: 2 flour is NOT enough for bread (needs 3)")

	# Floor: even with many bakers the flour input never drops below 1.
	var gmax := _build_state_with_bakery()
	gmax.workers[WC.BAKER] = 10
	var eff := gmax._effective_recipe_inputs(RC.BREAD)
	_check(int(eff["flour"]) == 1, "10 bakers: flour input floored at 1 (not 0/negative)")
	_check(int(eff["eggs"]) == 1, "10 bakers: eggs input (untargeted) stays 1")

# ── zero workers → economy byte-identical ─────────────────────────────────────

func _test_zero_workers_economy_identical() -> void:
	# A fresh GameState (all workers 0) must credit a known sweep of chains EXACTLY
	# like the pre-workers reducer. Spot-check several tile types end to end.
	var g := GameState.new()
	# grass threshold 6, wheat 5, oak 6, stone 6.
	var r_grass := g.credit_chain(T.GRASS, 4)
	_check(int(r_grass["units"]) == 0 and int(g.progress.get("hay_bundle", 0)) == 4,
		"0 workers: grass n=4 → 0 units, progress 4 (baseline)")
	var r_wheat := g.credit_chain(T.WHEAT, 5)
	_check(int(r_wheat["units"]) == 1 and int(g.progress.get("flour", 0)) == 0,
		"0 workers: wheat n=5 → 1 unit, progress 0 (baseline threshold 5)")
	var r_oak := g.credit_chain(T.OAK, 6)
	_check(int(r_oak["units"]) == 1, "0 workers: oak n=6 → 1 unit (baseline threshold 6)")
	var r_stone := g.credit_chain(T.STONE, 6)
	_check(int(r_stone["units"]) == 1, "0 workers: stone n=6 → 1 unit (baseline threshold 6)")

# ── save / load round-trip ────────────────────────────────────────────────────

func _test_save_load_round_trip() -> void:
	var g := GameState.new()
	g.workers[WC.FARMER] = 3
	g.workers[WC.MINER] = 1
	var d := g.to_dict()
	_check(d.has("workers"), "to_dict includes the workers map")

	var loaded := GameState.from_dict(d)
	_check(loaded.worker_count(WC.FARMER) == 3, "save→load preserves 3 farmers")
	_check(loaded.worker_count(WC.MINER) == 1, "save→load preserves 1 miner")
	_check(loaded.worker_count(WC.LUMBERJACK) == 0, "save→load: un-hired type stays 0")

	# A save written before workers existed (no "workers" key) loads all 0.
	var old := GameState.from_dict({"coins": 5})
	for id in WC.all_ids():
		_check(old.worker_count(id) == 0, "old save (no workers key): %s defaults to 0" % id)

	# A corrupt over-large count is clamped to max_count; an unknown id is dropped.
	var corrupt := GameState.from_dict({"workers": {WC.FARMER: 999, "nope": 4}})
	_check(corrupt.worker_count(WC.FARMER) == WC.max_count(WC.FARMER),
		"corrupt over-large count clamped to max_count (10)")
	_check(not corrupt.workers.has("nope"), "unknown worker id dropped on load")

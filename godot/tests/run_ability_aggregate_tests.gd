extends SceneTree
## Headless unit-test runner for the unified ability-aggregation ENGINE (T17/T21):
## AbilityConfig (the id→trigger/scope/channel catalog) + AbilityAggregate (empty_channels /
## apply_ability_to_channels / aggregate_abilities). Each ability id is folded into the CORRECT
## channel with the right weight math; the per-hire-discrete pre-multiply + category expansion
## are exercised; the empty-source NO-OP default is asserted. Pure / headless — no GameState, no
## scene. Run from the godot/ project root:
##   godot --headless --script res://tests/run_ability_aggregate_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_workers_tests.gd. `class_name` globals are
## aliased with `var` (not const) because a class_name ref is not a constant expression in 4.6.

var AC := AbilityConfig
var AA := AbilityAggregate

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Ability-aggregation engine tests ───────────────")
	_test_catalog()
	_test_empty_channels_noop()
	_test_threshold_reduce()
	_test_threshold_reduce_category_expansion()
	_test_pool_weight_floor()
	_test_bonus_yield()
	_test_season_bonus()
	_test_recipe_input_reduce()
	_test_chain_redirect()
	_test_hazard_spawn_reduce_cap()
	_test_hazard_coin_multiplier()
	_test_free_moves_and_coin()
	_test_grant_tool_and_preserve()
	_test_turn_budget_and_cap()
	_test_per_hire_discrete_collapse()
	_test_multi_source_fold()
	_test_weight_clamp_and_zero()
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

func _approx(a: float, b: float) -> bool:
	return absf(a - b) < 0.0001

# A single-source list with one ability of `id`/`params` at `weight`.
func _src(id: String, params: Dictionary, weight: float) -> Array:
	return [{"abilities": [{"id": id, "params": params}], "weight": weight}]

# ── AbilityConfig catalog ──────────────────────────────────────────────────────

func _test_catalog() -> void:
	_check(AC.has_ability("threshold_reduce"), "threshold_reduce is a real ability")
	_check(not AC.has_ability("nope"), "'nope' is not an ability")
	_check(AC.get_ability("nope") == {}, "get_ability(unknown) is {}")
	_check(AC.trigger_of("season_bonus") == AC.TRIGGER_SEASON_END, "season_bonus triggers at season_end")
	_check(AC.trigger_of("grant_tool") == AC.TRIGGER_SEASON_END, "grant_tool triggers at season_end")
	_check(AC.trigger_of("preserve_board") == AC.TRIGGER_SESSION_END, "preserve_board triggers at session_end")
	_check(AC.trigger_of("turn_budget_bonus") == AC.TRIGGER_PASSIVE, "turn_budget_bonus is passive")
	_check(AC.channel_of("inventory_cap_bonus") == "inventory_cap_bonus", "cap bonus channel name")
	_check(AC.channel_of("pool_weight") == "effective_pool_weights", "pool_weight folds into effective_pool_weights")
	# Scope.
	_check(AC.allowed_in_scope("grant_tool", "building"), "grant_tool allowed on a building")
	_check(not AC.allowed_in_scope("grant_tool", "tile"), "grant_tool NOT allowed on a tile")
	_check(AC.allowed_in_scope("free_moves", "tile"), "free_moves allowed on a tile")
	# Tile-aggregator-trigger filter: passive/on_board_fill yes, chain-time no.
	_check(AC.is_tile_aggregator_trigger("threshold_reduce"), "passive ability is a tile-aggregator trigger")
	_check(AC.is_tile_aggregator_trigger("pool_weight"), "on_board_fill ability is a tile-aggregator trigger")
	_check(not AC.is_tile_aggregator_trigger("free_moves"), "on_chain_collect ability is NOT a tile-aggregator trigger")
	_check(not AC.is_tile_aggregator_trigger("coin_bonus_flat"), "on_chain_commit ability is NOT a tile-aggregator trigger")
	# Catalog size sanity: all 19 React abilities ported (src/config/abilities.ts ABILITIES list).
	_check(AC.ABILITIES.size() == 19, "19 abilities in the catalog (ported from src/config/abilities.ts)")

# ── empty channels → NO-OP default ─────────────────────────────────────────────

func _test_empty_channels_noop() -> void:
	var e: Dictionary = AA.empty_channels()
	_check(e["threshold_reduce"] == {}, "empty: threshold_reduce {}")
	_check(int(e["free_moves"]) == 0, "empty: free_moves 0")
	_check(int(e["turn_budget_bonus"]) == 0, "empty: turn_budget_bonus 0")
	_check(int(e["inventory_cap_bonus"]) == 0, "empty: inventory_cap_bonus 0")
	_check(e["board_preserve_biomes"] == {}, "empty: board_preserve_biomes {}")
	_check(e["free_moves_if_chain"] == {}, "empty: free_moves_if_chain {}")
	# aggregate of [] == empty_channels.
	var agg: Dictionary = AA.aggregate_abilities([])
	_check(agg["threshold_reduce"] == {} and int(agg["free_moves"]) == 0,
		"aggregate([]) == empty_channels (the NO-OP default keeping a fresh game byte-identical)")
	_check(AA.aggregate_abilities(null)["threshold_reduce"] == {}, "aggregate(null) is the empty default")

# ── threshold_reduce: amount * weight on the resource key ───────────────────────

func _test_threshold_reduce() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("threshold_reduce", {"target": "flour", "amount": 2}, 1.0))
	_check(_approx(float(o["threshold_reduce"]["flour"]), 2.0), "threshold_reduce: amount 2 × weight 1 = 2 on flour")
	# weight 0.5 → 1.0.
	var o2: Dictionary = AA.aggregate_abilities(_src("threshold_reduce", {"target": "flour", "amount": 2}, 0.5))
	_check(_approx(float(o2["threshold_reduce"]["flour"]), 1.0), "threshold_reduce: amount 2 × weight 0.5 = 1.0")
	# missing target / 0 amount → no-op.
	var o3: Dictionary = AA.aggregate_abilities(_src("threshold_reduce", {"amount": 2}, 1.0))
	_check(o3["threshold_reduce"] == {}, "threshold_reduce with no target is a no-op")

# ── threshold_reduce_category: expands to every species' base_resource ──────────

func _test_threshold_reduce_category_expansion() -> void:
	var ctx := {"species_by_category": {"grain": [{"base_resource": "flour"}, {"base_resource": "bread"}]}}
	var sources := _src("threshold_reduce_category", {"category": "grain", "amount": 1}, 1.0)
	var o: Dictionary = AA.aggregate_abilities(sources, ctx)
	_check(_approx(float(o["threshold_reduce"]["flour"]), 1.0), "category expansion: flour reduced by 1")
	_check(_approx(float(o["threshold_reduce"]["bread"]), 1.0), "category expansion: bread reduced by 1")
	# Unknown category → empty expansion → no-op.
	var o2: Dictionary = AA.aggregate_abilities(_src("threshold_reduce_category", {"category": "ghost", "amount": 1}, 1.0), ctx)
	_check(o2["threshold_reduce"] == {}, "category expansion: unknown category is a no-op")

# ── pool_weight: per-source FLOOR into effective_pool_weights ───────────────────

func _test_pool_weight_floor() -> void:
	# weight 1 → floor(1*1)=1.
	var o: Dictionary = AA.aggregate_abilities(_src("pool_weight", {"target": "tile_tree_oak", "amount": 1}, 1.0))
	_check(int(o["effective_pool_weights"]["tile_tree_oak"]) == 1, "pool_weight: weight 1 → 1 slot (floored)")
	# weight 0.5, amount 1 → floor(0.5)=0 → NOT added (the Phase-9 floor semantics).
	var o2: Dictionary = AA.aggregate_abilities(_src("pool_weight", {"target": "tile_tree_oak", "amount": 1}, 0.5))
	_check(not o2["effective_pool_weights"].has("tile_tree_oak"), "pool_weight: floor(0.5)=0 contributes nothing")
	# amount 3 weight 0.5 → floor(1.5)=1.
	var o3: Dictionary = AA.aggregate_abilities(_src("pool_weight", {"target": "tile_tree_oak", "amount": 3}, 0.5))
	_check(int(o3["effective_pool_weights"]["tile_tree_oak"]) == 1, "pool_weight: floor(3*0.5)=1")
	# legacy pool_weight folds into the continuous poolWeight channel, not effective.
	var ol: Dictionary = AA.aggregate_abilities(_src("pool_weight_legacy", {"target": "x", "amount": 2}, 0.5))
	_check(_approx(float(ol["pool_weight"]["x"]), 1.0), "pool_weight_legacy: continuous 2*0.5=1.0 (no floor)")

# ── bonus_yield ────────────────────────────────────────────────────────────────

func _test_bonus_yield() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("bonus_yield", {"target": "tile_tree_oak", "amount": 1}, 1.0))
	_check(_approx(float(o["bonus_yield"]["tile_tree_oak"]), 1.0), "bonus_yield: +1 on tile_tree_oak")

# ── season_bonus ───────────────────────────────────────────────────────────────

func _test_season_bonus() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("season_bonus", {"resource": "coins", "amount": 50}, 1.0))
	_check(_approx(float(o["season_bonus"]["coins"]), 50.0), "season_bonus: +50 coins")
	# default resource == coins.
	var o2: Dictionary = AA.aggregate_abilities(_src("season_bonus", {"amount": 10}, 1.0))
	_check(_approx(float(o2["season_bonus"]["coins"]), 10.0), "season_bonus: default resource is coins")

# ── recipe_input_reduce: nested { recipe -> { input -> amount } } ───────────────

func _test_recipe_input_reduce() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("recipe_input_reduce", {"recipe": "bread", "input": "flour", "amount": 1}, 1.0))
	_check(_approx(float(o["recipe_input_reduce"]["bread"]["flour"]), 1.0), "recipe_input_reduce: bread/flour -1")
	# missing input → no-op.
	var o2: Dictionary = AA.aggregate_abilities(_src("recipe_input_reduce", {"recipe": "bread", "amount": 1}, 1.0))
	_check(o2["recipe_input_reduce"] == {}, "recipe_input_reduce with no input is a no-op")

# ── chain_redirect_category: linear effective threshold, lowest wins ────────────

func _test_chain_redirect() -> void:
	var params := {"fromCategory": "grain", "toCategory": "trees", "baseThreshold": 6, "minThreshold": 4}
	# weight 1 → eff = 6 - (6-4)*1 = 4.
	var o: Dictionary = AA.aggregate_abilities(_src("chain_redirect_category", params, 1.0))
	_check(_approx(float(o["chain_redirect"]["grain"]["threshold"]), 4.0), "chain_redirect: weight 1 → minThreshold 4")
	_check(String(o["chain_redirect"]["grain"]["to_category"]) == "trees", "chain_redirect: to_category trees")
	# weight 0.5 → eff = 6 - 2*0.5 = 5.
	var o2: Dictionary = AA.aggregate_abilities(_src("chain_redirect_category", params, 0.5))
	_check(_approx(float(o2["chain_redirect"]["grain"]["threshold"]), 5.0), "chain_redirect: weight 0.5 → 5")
	# Two sources redirecting grain → the LOWEST (most generous) threshold wins.
	var two := [
		{"abilities": [{"id": "chain_redirect_category", "params": params}], "weight": 0.5},
		{"abilities": [{"id": "chain_redirect_category", "params": params}], "weight": 1.0},
	]
	var o3: Dictionary = AA.aggregate_abilities(two)
	_check(_approx(float(o3["chain_redirect"]["grain"]["threshold"]), 4.0), "chain_redirect: lowest threshold (4) wins across sources")

# ── hazard_spawn_reduce: additive, capped at 1.0 ───────────────────────────────

func _test_hazard_spawn_reduce_cap() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("hazard_spawn_reduce", {"hazard": "gas_vent", "amount": 0.5}, 1.0))
	_check(_approx(float(o["hazard_spawn_reduce"]["gas_vent"]), 0.5), "hazard_spawn_reduce: 0.5")
	# Two sources of 0.7 each → capped at 1.0.
	var two := [
		{"abilities": [{"id": "hazard_spawn_reduce", "params": {"hazard": "gas_vent", "amount": 0.7}}], "weight": 1.0},
		{"abilities": [{"id": "hazard_spawn_reduce", "params": {"hazard": "gas_vent", "amount": 0.7}}], "weight": 1.0},
	]
	var o2: Dictionary = AA.aggregate_abilities(two)
	_check(_approx(float(o2["hazard_spawn_reduce"]["gas_vent"]), 1.0), "hazard_spawn_reduce: stacked + capped at 1.0")

# ── hazard_coin_multiplier: additive past 1× ───────────────────────────────────

func _test_hazard_coin_multiplier() -> void:
	# multiplier 2 weight 1 → 1 + (2-1)*1 = 2.0.
	var o: Dictionary = AA.aggregate_abilities(_src("hazard_coin_multiplier", {"hazard": "rats", "multiplier": 2.0}, 1.0))
	_check(_approx(float(o["hazard_coin_multiplier"]["rats"]), 2.0), "hazard_coin_multiplier: 2× at full weight")
	# multiplier 2 weight 0.5 → 1 + 1*0.5 = 1.5.
	var o2: Dictionary = AA.aggregate_abilities(_src("hazard_coin_multiplier", {"hazard": "rats", "multiplier": 2.0}, 0.5))
	_check(_approx(float(o2["hazard_coin_multiplier"]["rats"]), 1.5), "hazard_coin_multiplier: 1.5× at half weight")
	# multiplier <= 1 → no-op.
	var o3: Dictionary = AA.aggregate_abilities(_src("hazard_coin_multiplier", {"hazard": "rats", "multiplier": 1.0}, 1.0))
	_check(o3["hazard_coin_multiplier"] == {}, "hazard_coin_multiplier of 1× is a no-op")

# ── free_moves / coin bonuses (floored int channels) ───────────────────────────

func _test_free_moves_and_coin() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("free_moves", {"count": 2}, 1.0))
	_check(int(o["free_moves"]) == 2, "free_moves: +2")
	# floor at weight.
	var o2: Dictionary = AA.aggregate_abilities(_src("free_moves", {"count": 3}, 0.5))
	_check(int(o2["free_moves"]) == 1, "free_moves: floor(3*0.5)=1")
	# free_turn_if_chain → lowest minChain wins.
	var two := [
		{"abilities": [{"id": "free_turn_if_chain", "params": {"minChain": 8}}], "weight": 1.0},
		{"abilities": [{"id": "free_turn_if_chain", "params": {"minChain": 5}}], "weight": 1.0},
	]
	var of: Dictionary = AA.aggregate_abilities(two)
	_check(int(of["free_moves_if_chain"]["min_chain"]) == 5, "free_turn_if_chain: lowest minChain (5) wins")
	# coin bonuses.
	var oc: Dictionary = AA.aggregate_abilities(_src("coin_bonus_flat", {"amount": 5}, 1.0))
	_check(int(oc["coin_bonus_flat"]) == 5, "coin_bonus_flat: +5")
	var ocp: Dictionary = AA.aggregate_abilities(_src("coin_bonus_per_tile", {"amount": 2}, 1.0))
	_check(int(ocp["coin_bonus_per_tile"]) == 2, "coin_bonus_per_tile: +2/tile")

# ── grant_tool / preserve_board / worker_pool_step ─────────────────────────────

func _test_grant_tool_and_preserve() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("grant_tool", {"tool": "bomb", "amount": 2}, 1.0))
	_check(int(o["season_end_tools"]["bomb"]) == 2, "grant_tool: bomb ×2 in season_end_tools")
	var op: Dictionary = AA.aggregate_abilities(_src("preserve_board", {"biome": "farm"}, 1.0))
	_check(op["board_preserve_biomes"].has("farm"), "preserve_board: farm in board_preserve_biomes")
	var ow: Dictionary = AA.aggregate_abilities(_src("worker_pool_step", {"amount": 1}, 1.0))
	_check(int(ow["season_end_pool_step"]) == 1, "worker_pool_step: +1 season_end_pool_step")

# ── turn_budget_bonus / inventory_cap_bonus ────────────────────────────────────

func _test_turn_budget_and_cap() -> void:
	var o: Dictionary = AA.aggregate_abilities(_src("turn_budget_bonus", {"amount": 1}, 1.0))
	_check(int(o["turn_budget_bonus"]) == 1, "turn_budget_bonus: +1")
	var oc: Dictionary = AA.aggregate_abilities(_src("inventory_cap_bonus", {"amount": 300}, 1.0))
	_check(int(oc["inventory_cap_bonus"]) == 300, "inventory_cap_bonus: +300")

# ── PER-HIRE-DISCRETE pre-multiply collapse (the WorkerConfig aggregate behaviour) ──

func _test_per_hire_discrete_collapse() -> void:
	# The aggregate.ts trick: for a per-hire-discrete ability, amount is pre-multiplied by maxCount,
	# and weight = count/maxCount, so amount*weight collapses to amount*count. Verify the math:
	# base amount 1, maxCount 10, count 3 → pre-multiplied amount 10, weight 0.3 → 10*0.3 = 3.
	var pre := {"target": "flour", "amount": 1 * 10}   # pre-multiplied by maxCount
	var o: Dictionary = AA.aggregate_abilities(_src("threshold_reduce", pre, 3.0 / 10.0))
	_check(_approx(float(o["threshold_reduce"]["flour"]), 3.0),
		"per-hire-discrete: pre-multiplied amount × (count/maxCount) collapses to amount*count (3)")

# ── multi-source fold (buildings + tiles in one aggregate) ─────────────────────

func _test_multi_source_fold() -> void:
	var sources := [
		{"kind": "building", "abilities": [{"id": "inventory_cap_bonus", "params": {"amount": 300}}], "weight": 1.0},
		{"kind": "building", "abilities": [{"id": "turn_budget_bonus", "params": {"amount": 1}}], "weight": 1.0},
		{"kind": "tile", "abilities": [{"id": "bonus_yield", "params": {"target": "tile_tree_oak", "amount": 1}}], "weight": 1.0},
	]
	var o: Dictionary = AA.aggregate_abilities(sources)
	_check(int(o["inventory_cap_bonus"]) == 300, "multi-fold: cap bonus from building")
	_check(int(o["turn_budget_bonus"]) == 1, "multi-fold: turn budget from a second building")
	_check(_approx(float(o["bonus_yield"]["tile_tree_oak"]), 1.0), "multi-fold: bonus_yield from a tile")

# ── weight clamp + zero/empty guards ───────────────────────────────────────────

func _test_weight_clamp_and_zero() -> void:
	# weight > 1 clamps to 1.
	var o: Dictionary = AA.aggregate_abilities(_src("turn_budget_bonus", {"amount": 1}, 5.0))
	_check(int(o["turn_budget_bonus"]) == 1, "weight > 1 clamps to 1 (turn_budget_bonus stays +1)")
	# weight <= 0 → source skipped.
	var oz: Dictionary = AA.aggregate_abilities(_src("turn_budget_bonus", {"amount": 1}, 0.0))
	_check(int(oz["turn_budget_bonus"]) == 0, "weight 0 → source skipped")
	# Unknown ability id → skipped (no crash).
	var ou: Dictionary = AA.aggregate_abilities(_src("ghost_ability", {"amount": 1}, 1.0))
	_check(int(ou["turn_budget_bonus"]) == 0 and ou["threshold_reduce"] == {}, "unknown ability id is skipped")
	# Empty abilities array on a source → skipped.
	var oe: Dictionary = AA.aggregate_abilities([{"abilities": [], "weight": 1.0}])
	_check(oe["threshold_reduce"] == {}, "source with empty abilities is skipped")

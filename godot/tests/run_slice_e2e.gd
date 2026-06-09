extends SceneTree
## End-to-end integration test: drives a SINGLE GameState through the WHOLE
## introductory slice (the locked Direction's Town 1 → Town 2 → Town 3 arc) in
## order, asserting each stage composes with the next. Unlike the per-feature
## suites (run_town_tests, run_building_tests, run_economy_tests, run_mine_tests,
## run_boss_tests, run_rats_tests, …), which each unit-test one system against a
## hand-built state, this walks the systems in PLAY ORDER on one shared state so a
## regression in how the stages hand off (a consumed resource, a missed unlock
## gate, a save round-trip) shows up here even when every unit suite stays green.
##
## Run from the godot/ project root (assets must be imported first):
##   godot --headless --path godot --import
##   godot --headless --path godot --script res://tests/run_slice_e2e.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_boss_tests.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6. NO `class_name` on this script.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var BLD := BuildingConfig
var REC := RecipeConfig
var TC := TownConfig
var BOSS := BossConfig
var ORD := OrderConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Slice end-to-end integration test ──────────────")
	_run_slice()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── helpers ───────────────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## Add `amount` of `resource` straight into a GameState inventory (test helper).
## The ONLY private poke this test makes — it tops up between real stages so a
## stage isn't starved by what an EARLIER real step legitimately consumed. Every
## other transition uses the real GameState methods + real config costs.
func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## Top inventory up so it covers every key in `cost` at its required quantity
## (only adds the shortfall, so it never over-stuffs). Used right before a real
## try_tier_up / build / craft to prove the FLOW composes without re-deriving each
## intermediate by hand.
func _ensure(g: GameState, cost: Dictionary) -> void:
	for k in cost.keys():
		var need: int = int(cost[k])
		var have: int = int(g.inventory.get(k, 0))
		if have < need:
			_give(g, k, need - have)

# ── the walk ──────────────────────────────────────────────────────────────────

func _run_slice() -> void:
	var g := GameState.new()
	g.seed_orders(1)   # deterministic order rolls

	# ── 1. Farm chains: the staple economy. ──────────────────────────────────
	# GRASS threshold 6 → a chain of 6 yields exactly 1 hay_bundle; WHEAT
	# threshold 5 → a chain of 5 yields exactly 1 flour.
	g.credit_chain(T.GRASS, 6)
	g.credit_chain(T.WHEAT, 5)
	_check(g.qty("hay_bundle") == 1, "1. farm chain credits hay_bundle (grass 6 → 1)")
	_check(g.qty("flour") == 1, "1. farm chain credits flour (wheat 5 → 1)")

	# ── 2. Camp → Hamlet (staples only). ──────────────────────────────────────
	_ensure(g, TC.tier_up_cost(TC.TIER_HAMLET))   # {hay_bundle:12, flour:6}
	_check(g.can_tier_up(), "2. can tier up to Hamlet once the cost is met")
	var t2 := g.try_tier_up()
	_check(bool(t2.get("ok", false)), "2. try_tier_up() to Hamlet ok")
	_check(g.settlement.tier == TC.TIER_HAMLET, "2. settlement is Hamlet (tier 2)")
	_check(g.settlement.tier_name() == "Hamlet", "2. tier_name() reads 'Hamlet'")

	# ── 3. Build the Lumber Camp (unlocks trees → plank). ─────────────────────
	_ensure(g, BLD.building_cost(BLD.LUMBER_CAMP))   # {hay_bundle:8, flour:4}
	_check(g.can_build(BLD.LUMBER_CAMP), "3. can build Lumber Camp at Hamlet")
	var b_lumber := g.build(BLD.LUMBER_CAMP)
	_check(bool(b_lumber.get("ok", false)), "3. build(LUMBER_CAMP) ok")
	_check(g.has_building(BLD.LUMBER_CAMP), "3. Lumber Camp is placed")
	_check(g.active_tile_pool().has(T.OAK), "3. active_tile_pool() now contains OAK (trees unlocked)")

	# Now that trees spawn, earn enough plank for the next stages.
	# OAK threshold 6: two chains of 6 → 2 plank; do several so plank isn't a
	# bottleneck (everything downstream tops up anyway).
	for _i in 6:
		g.credit_chain(T.OAK, 6)
	_check(g.qty("plank") >= 6, "3. chaining OAK credits plank (>=6 banked)")

	# ── 4. Hamlet → Village. ──────────────────────────────────────────────────
	_ensure(g, TC.tier_up_cost(TC.TIER_VILLAGE))   # {plank:8, hay_bundle:16, flour:8}
	var t3 := g.try_tier_up()
	_check(bool(t3.get("ok", false)), "4. try_tier_up() to Village ok")
	_check(g.settlement.tier == TC.TIER_VILLAGE, "4. settlement is Village (tier 3)")

	# ── 5. Build Coop + Garden + Bakery (Village unlocks). ────────────────────
	_ensure(g, BLD.building_cost(BLD.COOP))     # {plank:6, flour:6}
	_check(bool(g.build(BLD.COOP).get("ok", false)), "5. build(COOP) ok")
	_ensure(g, BLD.building_cost(BLD.GARDEN))    # {plank:6, hay_bundle:10}
	_check(bool(g.build(BLD.GARDEN).get("ok", false)), "5. build(GARDEN) ok")
	_ensure(g, BLD.building_cost(BLD.BAKERY))    # {plank:8, flour:6}
	_check(bool(g.build(BLD.BAKERY).get("ok", false)), "5. build(BAKERY) ok")
	_check(g.has_building(BLD.COOP) and g.has_building(BLD.GARDEN) and g.has_building(BLD.BAKERY),
		"5. Coop, Garden and Bakery all placed")
	_check(g.active_tile_pool().has(T.PHEASANT), "5. Coop adds bird tiles to the pool")
	_check(g.active_tile_pool().has(T.CARROT), "5. Garden adds veg tiles to the pool")

	# ── 6. Refine bread at the Bakery. ────────────────────────────────────────
	var bread_before: int = g.qty("bread")
	_ensure(g, REC.recipe_inputs(REC.BREAD))   # {flour:3, eggs:1}
	_check(g.can_craft(REC.BREAD), "6. can craft BREAD with the Bakery + inputs")
	var c_bread := g.craft(REC.BREAD)
	_check(bool(c_bread.get("ok", false)), "6. craft(BREAD) ok")
	_check(g.qty("bread") == bread_before + 1, "6. bread +1 after the craft")

	# ── 7. Village → Town. ────────────────────────────────────────────────────
	_ensure(g, TC.tier_up_cost(TC.TIER_TOWN))   # {eggs:8, soup:6, plank:10}
	var t4 := g.try_tier_up()
	_check(bool(t4.get("ok", false)), "7. try_tier_up() to Town ok")
	_check(g.settlement.tier == TC.TIER_TOWN, "7. settlement is Town (tier 4)")

	# ── 8. Build the Kitchen, craft supplies. ─────────────────────────────────
	_ensure(g, BLD.building_cost(BLD.KITCHEN))   # {plank:8, flour:8}
	_check(g.can_build(BLD.KITCHEN), "8. can build Kitchen at Town")
	_check(bool(g.build(BLD.KITCHEN).get("ok", false)), "8. build(KITCHEN) ok")
	var supplies_before: int = g.qty("supplies")
	_ensure(g, REC.recipe_inputs(REC.SUPPLIES))   # {bread:1, flour:2}
	_check(g.can_craft(REC.SUPPLIES), "8. can craft SUPPLIES with the Kitchen + inputs")
	_check(bool(g.craft(REC.SUPPLIES).get("ok", false)), "8. craft(SUPPLIES) ok")
	_check(g.qty("supplies") == supplies_before + 1, "8. supplies +1 after the craft")

	# ── 9. Orders (the coin sink). ────────────────────────────────────────────
	g.seed_orders(1)
	g.refill_orders()
	_check(g.orders.size() == ORD.MAX_ORDERS, "9. order board fills to MAX_ORDERS")
	# Pick the first order and satisfy its request from inventory (top up if short),
	# then fill it and confirm coins rose by the order's reward.
	var idx: int = 0
	var order: Dictionary = g.orders[idx]
	var req_res: String = String(order["resource"])
	var req_qty: int = int(order["qty"])
	var reward: int = int(order["reward"])
	if g.qty(req_res) < req_qty:
		_give(g, req_res, req_qty - g.qty(req_res))
	_check(g.can_fill_order(idx), "9. order 0 is fillable after stocking its resource")
	var coins_before_order: int = g.coins
	var f := g.fill_order(idx)
	_check(bool(f.get("ok", false)), "9. fill_order(0) ok")
	_check(g.coins == coins_before_order + reward, "9. coins rose by the order reward")
	_check(g.orders.size() == ORD.MAX_ORDERS, "9. order board refills back to MAX_ORDERS")

	# ── 10. Town → City (max tier; unlocks the expedition + boss). ────────────
	_ensure(g, TC.tier_up_cost(TC.TIER_CITY))   # {soup:10, eggs:12, plank:14}
	var t5 := g.try_tier_up()
	_check(bool(t5.get("ok", false)), "10. try_tier_up() to City ok")
	_check(g.settlement.tier == TC.TIER_CITY, "10. settlement is City (tier 5)")
	_check(g.settlement.is_max_tier(), "10. City is the max tier")

	# ── 11. Expedition: pack supplies into mine turns and gather. ─────────────
	# Make sure there's a healthy supply count to spend as turns (the boss step
	# below wants several mine goods, and 1 turn = 1 chain).
	if g.qty("supplies") < 5:
		_give(g, "supplies", 5 - g.qty("supplies"))
	_check(g.can_enter_mine(), "11. can enter the mine (City + supplies + on farm)")
	var supplies_for_turns: int = g.qty("supplies")
	var em := g.enter_mine()
	_check(bool(em.get("ok", false)), "11. enter_mine() ok")
	_check(int(em.get("turns", 0)) == supplies_for_turns, "11. all supplies became mine turns")
	_check(g.is_in_mine(), "11. now mining (active_biome == 'mine')")
	_check(g.qty("supplies") == 0, "11. supplies were spent entering the mine")
	# Gather block + iron_bar over the run; spend turns until the expedition exits.
	var exited: bool = false
	while g.mine_turns_left > 0:
		g.credit_chain(T.STONE, 6)      # → block
		g.credit_chain(T.IRON_ORE, 6)   # → iron_bar
		var nt := g.note_mine_turn()
		if bool(nt.get("exited", false)):
			exited = true
	_check(exited, "11. expedition exits when the turns run out")
	_check(not g.is_in_mine(), "11. back on the farm after the expedition")
	_check(g.qty("block") > 0, "11. block gathered on the expedition is kept")
	_check(g.qty("iron_bar") > 0, "11. iron_bar gathered on the expedition is kept")

	# ── 12. Capstone boss (T24 — the seasonal timed-target model). ────────────────
	# The gate wants 12+ combined block + iron_bar. Top up if the run was short.
	if g.qty("block") + g.qty("iron_bar") < 12:
		_give(g, "block", 12 - (g.qty("block") + g.qty("iron_bar")))
	# Force the CAPSTONE (storm, summer) so defeating it sets town2_complete (step 13 needs it). With
	# town2 not yet done, the summer season offers the capstone (pending_boss_id).
	var budget: int = g.farm_turn_budget()
	g.farm_turns_used = int(float(budget) * 1.5 / 4.0)   # land in the summer quarter
	_check(g.pending_boss_id() == BossConfig.CAPSTONE, "12. summer + town2 not done → the capstone (storm) is offered")
	_check(g.can_challenge_boss(), "12. can challenge the boss (City + 12 mine goods)")
	var coins_before_boss: int = g.coins
	var sb := g.start_boss()
	_check(bool(sb.get("ok", false)), "12. start_boss() ok")
	_check(g.is_boss_active(), "12. boss fight is active")
	_check(g.boss_min_chain() == 4, "12. storm raises the min chain to 4")
	# Win it: meet the fish_fillet ×6 target with a fish chain producing 6 units.
	var dr := g.note_boss_chain(T.FISH_SARDINE, 6, 6)
	_check(bool(dr.get("defeated", false)), "12. boss defeated by meeting the target")
	var reward_coins: int = int(dr.get("reward_coins", 0))
	_check(g.town2_complete, "12. town2_complete set on the CAPSTONE defeat")
	_check(reward_coins > 0, "12. defeat returned a reward")
	# M10 (additive): this first boss defeat also unlocks `first_blood` (+200 coins) on top of the
	# boss reward (the achievement bonus stacking; reward_coins above is the pure boss reward).
	_check(g.coins == coins_before_boss + reward_coins + 200,
		"12. boss reward + first_blood achievement coins credited")
	_check(not g.is_boss_active(), "12. boss cleared after defeat")

	# ── 13. Rats hazard + Ratcatcher (Town 3 lesson). ────────────────────────
	_check(g.rats_enabled(), "13. rats are enabled once Town 2 is complete")
	# T9: rats are POSITIONAL now (spawn-roll per fill + eat plants), NOT pool-seeded — the farm
	# pool stays rat-free. A chain through 3+ rats clears them for coins (clear_rat_chain).
	_check(not g.active_tile_pool().has(T.RAT), "13. T9: RAT tiles are NOT seeded into the farm pool")
	g.hazards["rats"] = [{"row": 0, "col": 0, "age": 0}, {"row": 0, "col": 1, "age": 0}, {"row": 0, "col": 2, "age": 0}]
	var coins_pre_rats: int = g.coins
	var rat_clear: Dictionary = g.clear_rat_chain([
		{"row": 0, "col": 0, "tile": T.RAT}, {"row": 0, "col": 1, "tile": T.RAT}, {"row": 0, "col": 2, "tile": T.RAT}])
	_check(bool(rat_clear.get("ok", false)) and g.coins == coins_pre_rats + 15,
		"13. chaining 3 rats clears them for +15 coins")
	_ensure(g, BLD.building_cost(BLD.RATCATCHER))   # {plank:6, hay_bundle:8}
	_check(g.can_build(BLD.RATCATCHER), "13. can build the Ratcatcher (rats enabled)")
	_check(bool(g.build(BLD.RATCATCHER).get("ok", false)), "13. build(RATCATCHER) ok")
	_check(g.has_ratcatcher(), "13. Ratcatcher is placed")
	_check(g.can_shoo_rats(), "13. can shoo rats with a fresh Ratcatcher")
	_check(g.use_ratcatcher_charge(), "13. spend one shoo charge ok")
	_check(g.ratcatcher_charges_left() == 4, "13. 4 shoo charges remain after one use")

	# ── 14. Persistence finale: the END state round-trips. ───────────────────
	# Snapshot a couple of inventory counts BEFORE saving so we can assert they
	# survive the JSON round-trip exactly.
	var block_end: int = g.qty("block")
	var iron_end: int = g.qty("iron_bar")
	_check(SaveManager.save(g), "14. SaveManager.save(g) ok")
	var loaded := SaveManager.load_state()
	_check(loaded.settlement.tier == TC.TIER_CITY, "14. loaded state is City tier")
	_check(loaded.town2_complete, "14. loaded state keeps town2_complete")
	_check(loaded.has_building(BLD.RATCATCHER), "14. loaded state keeps the Ratcatcher")
	_check(loaded.qty("block") == block_end, "14. loaded block count matches")
	_check(loaded.qty("iron_bar") == iron_end, "14. loaded iron_bar count matches")

	# Tidy up the save file we wrote (keep the user:// dir clean between runs).
	SaveManager.clear()

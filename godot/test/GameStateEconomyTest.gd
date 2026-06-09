# GdUnit4 starter suite — GameState economy (the credit_chain accumulator).
#
# Re-expresses the resourceProgress carry-over invariants from
# godot/tests/run_state_tests.gd in GdUnit4 style. The legacy runner stays the
# comprehensive harness; this is the framework-adoption slice. Expected values
# mirror run_state_tests.gd exactly.
extends GdUnitTestSuite

const T := Constants.Tile

func test_below_threshold_accumulates() -> void:
	# GRASS threshold 6; a chain of 4 yields 0 units but leaves progress 4.
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 4)
	assert_int(int(res["units"])).is_equal(0)
	assert_int(int(g.progress.get("hay_bundle", 0))).is_equal(4)
	assert_int(g.qty("hay_bundle")).is_equal(0)

func test_carry_over_across_chains() -> void:
	# Two grass chains of 4 → second crosses threshold 6: 1 unit, progress 2.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 4)                 # progress 4
	var res := g.credit_chain(T.GRASS, 4)      # 4+4=8 → 1 unit, remainder 2
	assert_int(int(res["units"])).is_equal(1)
	assert_int(int(g.progress.get("hay_bundle", 0))).is_equal(2)
	assert_int(g.qty("hay_bundle")).is_equal(1)

func test_exact_threshold() -> void:
	# GRASS n=6 → exactly 1 unit, progress 0.
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 6)
	assert_int(int(res["units"])).is_equal(1)
	assert_int(int(g.progress.get("hay_bundle", 0))).is_equal(0)

func test_multiple_units_one_chain() -> void:
	# GRASS n=13 → 2 units, progress 1 (13 = 2*6 + 1).
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 13)
	assert_int(int(res["units"])).is_equal(2)
	assert_int(int(g.progress.get("hay_bundle", 0))).is_equal(1)
	assert_int(g.qty("hay_bundle")).is_equal(2)

func test_resource_buckets_are_independent() -> void:
	# Grass (hay_bundle, thresh 6) and wheat (flour, thresh 5) accumulate in
	# separate buckets and do not bleed into each other.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 4)                 # hay_bundle progress 4
	var res := g.credit_chain(T.WHEAT, 5)      # flour 5 → 1 unit, progress 0
	assert_str(String(res["resource"])).is_equal("flour")
	assert_int(int(res["units"])).is_equal(1)
	assert_int(int(g.progress.get("hay_bundle", 0))).is_equal(4)
	assert_int(int(g.progress.get("flour", 0))).is_equal(0)
	assert_int(g.qty("flour")).is_equal(1)
	assert_int(g.qty("hay_bundle")).is_equal(0)

func test_high_threshold_wrap() -> void:
	# PANSY threshold 10 (honey): n=9 → 0 units; +1 more wraps to a unit.
	var g := GameState.new()
	var res := g.credit_chain(T.PANSY, 9)
	assert_int(int(res["units"])).is_equal(0)
	assert_int(int(g.progress.get("honey", 0))).is_equal(9)
	var res2 := g.credit_chain(T.PANSY, 1)     # 9+1=10 → 1 unit, progress 0
	assert_int(int(res2["units"])).is_equal(1)
	assert_int(int(g.progress.get("honey", 0))).is_equal(0)
	assert_int(g.qty("honey")).is_equal(1)

func test_coins_and_turn_increment() -> void:
	# coins += max(1, n/2) per chain; turn += 1 per chain. The FIRST chain also
	# unlocks the additive 'first_steps' achievement (+25 coins) on top of the
	# chain payout — so the running coins total includes that bonus.
	var g := GameState.new()
	var r1 := g.credit_chain(T.GRASS, 3)       # max(1, 1) = 1 coin (+ first_steps +25)
	assert_int(int(r1["coins_gain"])).is_equal(1)
	assert_int(g.coins).is_equal(1 + 25)
	assert_int(g.turn).is_equal(1)
	var r2 := g.credit_chain(T.WHEAT, 8)       # max(1, 4) = 4 coins (no new achievement)
	assert_int(int(r2["coins_gain"])).is_equal(4)
	assert_int(g.coins).is_equal(5 + 25)
	assert_int(g.turn).is_equal(2)

func test_start_farm_run_deducts_entry_cost() -> void:
	# Starting a bounded farm run pays the home zone's coin entry cost (50) and arms the
	# six run fields: a fresh 10-turn budget (no fertilizer), the run marked active.
	var cost: int = ZoneConfig.entry_cost("home")
	var g := GameState.new()
	g.coins = 80                                   # comfortably above the 50 entry cost
	var res := g.start_farm_run([], false)
	assert_bool(bool(res["ok"])).is_true()
	assert_int(g.coins).is_equal(80 - cost)        # decreased by EXACTLY the entry cost
	assert_bool(g.farm_run_active).is_true()
	assert_int(g.farm_run_budget).is_equal(10)
	assert_int(g.farm_run_turns_left).is_equal(10)
	# Too poor → rejected with reason "no_coins" and NO mutation of coins / run state.
	var poor := GameState.new()
	poor.coins = cost - 1                           # one coin short
	var res2 := poor.start_farm_run([], false)
	assert_bool(bool(res2["ok"])).is_false()
	assert_str(String(res2["reason"])).is_equal("no_coins")
	assert_int(poor.coins).is_equal(cost - 1)      # untouched
	assert_bool(poor.farm_run_active).is_false()

func test_close_season_grants_return_bonus() -> void:
	# Closing an active run grants the season-end bonus (25 coins), clears the run, and
	# resets the season counter. A SECOND close (no active run) is an idempotent no-op.
	var g := GameState.new()
	g.coins = 100
	g.start_farm_run([], false)                     # spends the 50 entry cost
	var coins_before_close: int = g.coins
	var res := g.close_season()
	assert_int(int(res["coins_granted"])).is_equal(Constants.SEASON_END_BONUS_COINS)
	assert_int(g.coins).is_equal(coins_before_close + Constants.SEASON_END_BONUS_COINS)
	assert_bool(g.farm_run_active).is_false()
	assert_int(g.farm_turns_used).is_equal(0)
	# Idempotency: with no active run, a second close grants nothing and does not mutate coins.
	var coins_after_first: int = g.coins
	var res2 := g.close_season()
	assert_int(int(res2["coins_granted"])).is_equal(0)
	assert_int(g.coins).is_equal(coins_after_first)

func test_to_dict_round_trip_and_detachment() -> void:
	# to_dict()/from_dict() preserves inventory, progress, coins, turn; the dict
	# snapshot is detached from later mutations of the source state.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 13)                # hay_bundle: 2 units, progress 1
	g.credit_chain(T.WHEAT, 4)                 # flour: 0 units, progress 4
	var d := g.to_dict()
	var g2 := GameState.from_dict(d)
	assert_int(g2.qty("hay_bundle")).is_equal(g.qty("hay_bundle"))
	assert_int(int(g2.progress.get("hay_bundle", 0))).is_equal(int(g.progress.get("hay_bundle", 0)))
	assert_int(int(g2.progress.get("flour", 0))).is_equal(int(g.progress.get("flour", 0)))
	assert_int(g2.coins).is_equal(g.coins)
	assert_int(g2.turn).is_equal(g.turn)
	# Snapshot is a copy — mutating the original must not bleed into the dict.
	g.inventory["hay_bundle"] = 999
	assert_int(int(d["inventory"].get("hay_bundle", 0))).is_not_equal(999)

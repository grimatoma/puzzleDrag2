extends SceneTree
## Headless unit-test runner for GameState (the run-economy accumulator) and
## SaveManager (JSON persistence). Run from the godot/ project root:
##   godot --headless --script res://tests/run_state_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_tests.gd.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── GameState / SaveManager tests ──────────────────")
	_test_below_threshold_accumulates()
	_test_carry_over_across_chains()
	_test_exact_threshold()
	_test_multiple_units_one_chain()
	_test_resource_buckets_independent()
	_test_coins_and_turn_increment()
	_test_high_threshold_wrap()
	_test_round_trip_dict()
	_test_save_manager_round_trip()
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

# ── GameState.credit_chain tests ────────────────────────────────────────────

func _test_below_threshold_accumulates() -> void:
	# GRASS threshold 6; a chain of 4 yields 0 units but leaves progress 4.
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 4)
	_check(res["units"] == 0, "grass n=4 yields 0 units (below threshold 6)")
	_check(int(g.progress.get("hay_bundle", 0)) == 4, "grass n=4 leaves progress 4")
	_check(g.qty("hay_bundle") == 0, "grass n=4 collects no whole units")

func _test_carry_over_across_chains() -> void:
	# Two grass chains of 4 → second crosses threshold 6: 1 unit, progress 2.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 4)                 # progress 4
	var res := g.credit_chain(T.GRASS, 4)      # 4+4=8 → 1 unit, remainder 2
	_check(res["units"] == 1, "second grass n=4 yields 1 unit (carry-over)")
	_check(int(g.progress.get("hay_bundle", 0)) == 2, "carry leaves progress 2")
	_check(g.qty("hay_bundle") == 1, "inventory hay_bundle == 1 after carry-over")

func _test_exact_threshold() -> void:
	# GRASS n=6 → exactly 1 unit, progress 0.
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 6)
	_check(res["units"] == 1, "grass n=6 yields exactly 1 unit")
	_check(int(g.progress.get("hay_bundle", 0)) == 0, "grass n=6 leaves progress 0")

func _test_multiple_units_one_chain() -> void:
	# GRASS n=13 → 2 units, progress 1 (13 = 2*6 + 1).
	var g := GameState.new()
	var res := g.credit_chain(T.GRASS, 13)
	_check(res["units"] == 2, "grass n=13 yields 2 units in one chain")
	_check(int(g.progress.get("hay_bundle", 0)) == 1, "grass n=13 leaves progress 1")
	_check(g.qty("hay_bundle") == 2, "inventory hay_bundle == 2 from single big chain")

func _test_resource_buckets_independent() -> void:
	# Grass (hay_bundle, thresh 6) and wheat (flour, thresh 5) accumulate in
	# separate buckets and do not bleed into each other.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 4)                 # hay_bundle progress 4
	var res := g.credit_chain(T.WHEAT, 5)      # flour 5 → 1 unit, progress 0
	_check(res["resource"] == "flour", "wheat credits the flour bucket")
	_check(res["units"] == 1, "wheat n=5 yields 1 unit (threshold 5)")
	_check(int(g.progress.get("hay_bundle", 0)) == 4, "grass progress untouched by wheat chain")
	_check(int(g.progress.get("flour", 0)) == 0, "wheat n=5 leaves flour progress 0")
	_check(g.qty("flour") == 1, "inventory flour == 1")
	_check(g.qty("hay_bundle") == 0, "no hay_bundle units yet (still below threshold)")

func _test_coins_and_turn_increment() -> void:
	# coins += max(1, n/2) per chain; turn += 1 per chain. The per-chain `coins_gain`
	# field is the UNCHANGED economy payout (the chain coins only) and is asserted
	# directly. The running `coins` total now also includes the M10 (additive)
	# `first_steps` achievement reward (+25), which the FIRST chain unlocks — that is
	# the achievement bonus stacking on top, not a change to credit_chain's payout.
	var g := GameState.new()
	var r1 := g.credit_chain(T.GRASS, 3)       # max(1, 1) = 1 coin (+ first_steps +25)
	_check(r1["coins_gain"] == 1, "chain of 3 grants max(1, 3/2)=1 coin")
	_check(g.coins == 1 + 25, "coins == 1 chain + 25 first_steps after the first chain")
	_check(g.turn == 1, "turn == 1 after first chain")
	var r2 := g.credit_chain(T.WHEAT, 8)       # max(1, 4) = 4 coins (no new achievement)
	_check(r2["coins_gain"] == 4, "chain of 8 grants max(1, 8/2)=4 coins")
	_check(g.coins == 5 + 25, "coins accumulate to 5 chain-coins + 25 first_steps bonus")
	_check(g.turn == 2, "turn == 2 after two chains")

func _test_high_threshold_wrap() -> void:
	# PANSY threshold 10 (honey): n=9 → 0 units, progress 9; +1 more wraps to a unit.
	var g := GameState.new()
	var res := g.credit_chain(T.PANSY, 9)
	_check(res["units"] == 0, "pansy n=9 yields 0 units (threshold 10)")
	_check(int(g.progress.get("honey", 0)) == 9, "pansy n=9 leaves progress 9")
	var res2 := g.credit_chain(T.PANSY, 1)     # 9+1=10 → 1 unit, progress 0
	_check(res2["units"] == 1, "pansy +1 (total 10) wraps to 1 unit")
	_check(int(g.progress.get("honey", 0)) == 0, "pansy wrap leaves progress 0")
	_check(g.qty("honey") == 1, "inventory honey == 1 after wrap")

func _test_round_trip_dict() -> void:
	# to_dict()/from_dict() preserves inventory, progress, coins, turn.
	var g := GameState.new()
	g.credit_chain(T.GRASS, 13)                # hay_bundle: 2 units, progress 1
	g.credit_chain(T.WHEAT, 4)                 # flour: 0 units, progress 4
	var d := g.to_dict()
	var g2 := GameState.from_dict(d)
	_check(g2.qty("hay_bundle") == g.qty("hay_bundle"), "round-trip preserves inventory")
	_check(int(g2.progress.get("hay_bundle", 0)) == int(g.progress.get("hay_bundle", 0)),
		"round-trip preserves hay_bundle progress")
	_check(int(g2.progress.get("flour", 0)) == int(g.progress.get("flour", 0)),
		"round-trip preserves flour progress")
	_check(g2.coins == g.coins, "round-trip preserves coins")
	_check(g2.turn == g.turn, "round-trip preserves turn")
	# Snapshot is a copy — mutating the original must not bleed into the dict.
	g.inventory["hay_bundle"] = 999
	_check(int(d["inventory"].get("hay_bundle", 0)) != 999, "to_dict() snapshot is detached")

# ── SaveManager round-trip ──────────────────────────────────────────────────

func _test_save_manager_round_trip() -> void:
	SaveManager.clear()                        # isolation: start from no save
	var fresh := SaveManager.load_state()
	_check(fresh.inventory.is_empty() and fresh.coins == 0 and fresh.turn == 0,
		"load_state() with no file returns a fresh empty state")

	var s := GameState.new()
	s.credit_chain(T.GRASS, 13)                # hay_bundle 2 units, progress 1
	s.credit_chain(T.WHEAT, 5)                 # flour 1 unit
	var saved := SaveManager.save(s)
	_check(saved, "SaveManager.save() reports success")

	var loaded := SaveManager.load_state()
	_check(loaded.qty("hay_bundle") == s.qty("hay_bundle"), "save→load preserves hay_bundle")
	_check(loaded.qty("flour") == s.qty("flour"), "save→load preserves flour")
	_check(int(loaded.progress.get("hay_bundle", 0)) == int(s.progress.get("hay_bundle", 0)),
		"save→load preserves progress")
	_check(loaded.coins == s.coins, "save→load preserves coins")
	_check(loaded.turn == s.turn, "save→load preserves turn")

	SaveManager.clear()
	var after_clear := SaveManager.load_state()
	_check(after_clear.inventory.is_empty() and after_clear.coins == 0 and after_clear.turn == 0,
		"after clear() load_state() returns a fresh empty state")

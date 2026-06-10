extends SceneTree
## Headless unit-test runner for the Batch-4 balance-constant extractions — a pure
## constant-extraction refactor (ZERO behavior change). Locks the extracted symbols to
## their pre-extraction literals so a future edit can't silently drift a balance number:
##   • Constants.STARTING_COINS (== 150; new_game seeds it)
##   • Constants.CHAIN_COIN_MIN / CHAIN_COIN_DIVISOR (the M2 placeholder coin formula)
##   • BossConfig.MINE_MASTERY_THRESHOLD / MINE_MASTERY_GOODS + mine_mastery_met()
##   • BossConfig.target_resource(EMBER_DRAKE) (== "iron_bar", the note_boss_craft target)
##   • ZoneConfig.HOME_STAPLE_RESOURCES / HOME_BASE_CATEGORIES (the home-zone staple seeds)
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_balance_constants_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_economy_tests.gd. `class_name` globals
## are referenced directly (their consts/statics are constant-foldable at the call site).

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Balance-constants extraction tests ─────────────")
	_test_starting_coins()
	_test_chain_coin_formula()
	_test_mine_mastery_gate()
	_test_boss_target_reference()
	_test_home_staple_seeds()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ──────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# ── #2 — starting coins ─────────────────────────────────────────────────────

func _test_starting_coins() -> void:
	# Locked to the React init.ts:71 value; new_game() must seed exactly this.
	_check(Constants.STARTING_COINS == 150, "STARTING_COINS == 150")
	var g := GameState.new_game()
	_check(g.coins == 150, "new_game() seeds coins == 150")
	# The bare field default stays 0 (the suites rely on the 0-coin baseline).
	_check(GameState.new().coins == 0, "GameState.new() keeps the 0-coin field default")

# ── #1 — M2 placeholder chain-coin formula ───────────────────────────────────

func _test_chain_coin_formula() -> void:
	_check(Constants.CHAIN_COIN_MIN == 1, "CHAIN_COIN_MIN == 1")
	_check(Constants.CHAIN_COIN_DIVISOR == 2, "CHAIN_COIN_DIVISOR == 2")
	# The named-const formula must reproduce the old `maxi(1, chain_len / 2)` exactly,
	# including integer-division truncation. (Bonuses are 0 for a base chain.)
	for pair in [[3, 1], [6, 3], [10, 5], [2, 1], [5, 2]]:
		var chain_len: int = int(pair[0])
		var expected: int = int(pair[1])
		var got: int = maxi(Constants.CHAIN_COIN_MIN, chain_len / Constants.CHAIN_COIN_DIVISOR)
		_check(got == expected, "coin base for chain_len %d == %d" % [chain_len, expected])

# ── #3 — mine-mastery boss gate ──────────────────────────────────────────────

func _test_mine_mastery_gate() -> void:
	_check(BossConfig.MINE_MASTERY_THRESHOLD == 12, "MINE_MASTERY_THRESHOLD == 12")
	_check(BossConfig.MINE_MASTERY_GOODS == ["block", "iron_bar"],
		"MINE_MASTERY_GOODS == [block, iron_bar]")
	# The helper inverts the old `qty(block)+qty(iron_bar) < 12` gate: NOT met below 12, met at/above.
	_check(not BossConfig.mine_mastery_met(5, 6), "11 combined goods → NOT met (gate fails)")
	_check(BossConfig.mine_mastery_met(6, 6), "12 combined goods → met (gate passes)")
	_check(BossConfig.mine_mastery_met(12, 0), "12 from one good → met")
	_check(not BossConfig.mine_mastery_met(0, 0), "0 combined goods → NOT met")

# ── #4 — note_boss_craft target resource ─────────────────────────────────────

func _test_boss_target_reference() -> void:
	# The literal "iron_bar" in note_boss_craft is the Ember Drake's target resource id.
	_check(BossConfig.target_resource(BossConfig.EMBER_DRAKE) == "iron_bar",
		"BossConfig.target_resource(EMBER_DRAKE) == iron_bar")

# ── #5 — home-zone staple seeds ──────────────────────────────────────────────

func _test_home_staple_seeds() -> void:
	_check(ZoneConfig.HOME_STAPLE_RESOURCES == ["hay_bundle", "flour"],
		"HOME_STAPLE_RESOURCES == [hay_bundle, flour]")
	_check(ZoneConfig.HOME_BASE_CATEGORIES == ["grass", "grain"],
		"HOME_BASE_CATEGORIES == [grass, grain]")
	# The seed sites must NOT mutate the shared const (orderable_resources/active_categories
	# duplicate before appending). A building-less fresh game returns just the staples.
	var g := GameState.new()
	_check(g.orderable_resources() == ["hay_bundle", "flour"],
		"building-less orderable_resources() == the staples")
	_check(g.active_categories() == ["grass", "grain"],
		"building-less active_categories() == the staples")
	# Calling twice still yields the staples → the const wasn't mutated by the first call.
	g.orderable_resources()
	g.active_categories()
	_check(ZoneConfig.HOME_STAPLE_RESOURCES == ["hay_bundle", "flour"],
		"HOME_STAPLE_RESOURCES const unchanged after calls")
	_check(ZoneConfig.HOME_BASE_CATEGORIES == ["grass", "grain"],
		"HOME_BASE_CATEGORIES const unchanged after calls")

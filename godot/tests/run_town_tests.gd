extends SceneTree
## Headless unit-test runner for the Camp→City town tier ladder (M3a):
## TownConfig (the ladder data + helpers), Settlement (per-town progression),
## and the GameState tier-up API + storage-cap enforcement. Run from the godot/
## project root:
##   godot --headless --script res://tests/run_town_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_state_tests.gd.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Town tier ladder tests ─────────────────────────")
	_test_fresh_settlement()
	_test_townconfig_table()
	_test_cannot_tier_up_empty()
	_test_tier_up_exact_cost()
	_test_partial_funds_blocked()
	_test_surplus_funds_remain()
	_test_max_tier_blocked()
	_test_cap_clamp()
	_test_save_load_round_trip()
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

# ── tests ───────────────────────────────────────────────────────────────────

func _test_fresh_settlement() -> void:
	# A brand-new settlement starts at Camp (tier 1).
	var s := Settlement.new()
	_check(s.tier == TownConfig.TIER_CAMP, "fresh settlement is tier 1 (Camp)")
	_check(s.tier_name() == "Camp", "fresh settlement name is 'Camp'")
	_check(s.cap() == 200, "Camp cap is 200")
	_check(s.plots() == 25, "Camp has 25 plots")
	_check(not s.is_max_tier(), "Camp is not the max tier")
	_check(s.next_tier_cost() == {"hay_bundle": 12, "flour": 6},
		"Camp's next-tier cost is the Hamlet cost (staples only)")

func _test_townconfig_table() -> void:
	# TownConfig helpers return the Direction-spec table values for every tier.
	var names := ["", "Camp", "Hamlet", "Village", "Town", "City"]
	var caps := [0, 200, 300, 400, 500, 600]
	var plots := [0, 25, 27, 29, 31, 33]
	for t in range(1, TownConfig.MAX_TIER + 1):
		_check(TownConfig.tier_name(t) == names[t], "tier %d name is '%s'" % [t, names[t]])
		_check(TownConfig.tier_cap(t) == caps[t], "tier %d cap is %d" % [t, caps[t]])
		_check(TownConfig.tier_plots(t) == plots[t], "tier %d plots is %d" % [t, plots[t]])
	_check(TownConfig.is_max_tier(TownConfig.TIER_CITY), "City (tier 5) is the max tier")
	_check(not TownConfig.is_max_tier(TownConfig.TIER_TOWN), "Town (tier 4) is not the max tier")
	# Out-of-range tiers degrade gracefully.
	_check(TownConfig.tier_name(0) == "" and TownConfig.tier_name(99) == "",
		"out-of-range tier_name returns empty string")
	_check(TownConfig.tier_cap(99) == 0, "out-of-range tier_cap returns 0")
	_check(TownConfig.tier_up_cost(1) == {}, "tier 1 (Camp) has no tier-up cost")
	_check(TownConfig.tier_up_cost(99) == {}, "out-of-range tier_up_cost returns empty")

func _test_cannot_tier_up_empty() -> void:
	# Empty inventory cannot afford the Hamlet cost.
	var g := GameState.new()
	_check(not g.can_tier_up(), "empty inventory cannot tier up")
	var res := g.try_tier_up()
	_check(not bool(res["ok"]), "try_tier_up on empty inventory returns ok=false")
	_check(res.get("reason", "") == "insufficient", "failure reason is 'insufficient'")
	_check(g.settlement.tier == 1, "tier unchanged after failed tier-up")
	_check(g.inventory.is_empty(), "inventory untouched after failed tier-up")

func _test_tier_up_exact_cost() -> void:
	# Give EXACTLY the Hamlet cost (hay_bundle 12 + flour 6); tier-up succeeds and
	# deducts to zero.
	var g := GameState.new()
	g.inventory["hay_bundle"] = 12
	g.inventory["flour"] = 6
	_check(g.can_tier_up(), "exact Hamlet cost can tier up")
	var res := g.try_tier_up()
	_check(bool(res["ok"]), "try_tier_up returns ok=true with exact funds")
	_check(int(res["tier"]) == 2, "result tier is 2")
	_check(res["name"] == "Hamlet", "result name is 'Hamlet'")
	_check(g.settlement.tier == 2, "settlement advanced to tier 2")
	_check(g.settlement.tier_name() == "Hamlet", "settlement name is 'Hamlet'")
	_check(g.settlement.cap() == 300, "Hamlet cap is 300")
	_check(g.settlement.plots() == 27, "Hamlet has 27 plots")
	_check(g.qty("hay_bundle") == 0, "hay_bundle deducted to 0")
	_check(g.qty("flour") == 0, "flour deducted to 0")

func _test_partial_funds_blocked() -> void:
	# hay_bundle covered but flour short — cannot tier up, inventory untouched.
	var g := GameState.new()
	g.inventory["hay_bundle"] = 12
	g.inventory["flour"] = 0
	_check(not g.can_tier_up(), "partial funds cannot tier up")
	var res := g.try_tier_up()
	_check(not bool(res["ok"]), "try_tier_up with partial funds returns ok=false")
	_check(g.settlement.tier == 1, "tier unchanged with partial funds")
	_check(g.qty("hay_bundle") == 12, "hay_bundle untouched after failed tier-up")

func _test_surplus_funds_remain() -> void:
	# Extra resources beyond the cost remain after a successful tier-up.
	var g := GameState.new()
	g.inventory["hay_bundle"] = 25    # cost 12 → 13 remain
	g.inventory["flour"] = 10         # cost 6  → 4 remain
	g.inventory["plank"] = 7          # not part of the cost → untouched
	_check(g.can_tier_up(), "surplus funds can tier up")
	var res := g.try_tier_up()
	_check(bool(res["ok"]), "surplus tier-up succeeds")
	_check(g.qty("hay_bundle") == 13, "surplus hay_bundle (25-12) remains")
	_check(g.qty("flour") == 4, "surplus flour (10-6) remains")
	_check(g.qty("plank") == 7, "non-cost resource untouched")

func _test_max_tier_blocked() -> void:
	# A settlement at City (tier 5) is maxed: cannot tier up even when flush.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_CITY
	g.inventory["honey"] = 999
	g.inventory["horseshoe"] = 999
	g.inventory["milk"] = 999
	g.inventory["soup"] = 999
	_check(g.settlement.is_max_tier(), "City settlement reports is_max_tier")
	_check(not g.can_tier_up(), "maxed settlement cannot tier up even when flush")
	var res := g.try_tier_up()
	_check(not bool(res["ok"]), "try_tier_up at max returns ok=false")
	_check(res.get("reason", "") == "maxed", "failure reason at max is 'maxed'")
	_check(g.settlement.tier == 5, "tier stays at 5 after maxed tier-up attempt")

func _test_cap_clamp() -> void:
	# At Camp (cap 200), a resource can never exceed 200. Seed near the cap, then
	# credit a chain that would cross it, and assert it clamps.
	var g := GameState.new()
	_check(g.settlement.cap() == 200, "Camp cap is 200 for clamp test")
	# 198 hay_bundle already collected; progress 5 (one short of the threshold-6
	# wrap). A chain of 13 grass adds 18 → 3 units would push to 201, but the cap
	# clamps it to 200.
	g.inventory["hay_bundle"] = 198
	g.progress["hay_bundle"] = 5
	var res := g.credit_chain(T.GRASS, 13)   # 5+13=18 → 3 units, progress 0
	_check(int(res["units"]) == 3, "chain credited 3 raw units before clamp")
	_check(g.qty("hay_bundle") == 200, "hay_bundle clamped to cap 200 (not 201)")
	# A further chain stays pinned at the cap.
	g.credit_chain(T.GRASS, 12)              # would add 2 more units
	_check(g.qty("hay_bundle") == 200, "hay_bundle stays pinned at cap 200")

func _test_save_load_round_trip() -> void:
	# Advance a GameState to Village (tier 3) and confirm the tier — plus the rest
	# of the economy — survives a SaveManager save/load round-trip.
	SaveManager.clear()                      # isolation: start from no save
	var g := GameState.new()
	# Pay the Hamlet then Village costs to reach tier 3 the real way.
	#   → Hamlet : hay_bundle 12, flour 6
	#   → Village : plank 8, hay_bundle 16, flour 8
	g.inventory["hay_bundle"] = 30            # 12 for Hamlet, 16 for Village → 2 left
	g.inventory["flour"] = 14                 # 6 for Hamlet, 8 for Village → 0 left
	g.inventory["plank"] = 12                 # 8 for Village → 4 left
	_check(g.try_tier_up()["ok"], "advance to Hamlet (tier 2)")
	_check(g.try_tier_up()["ok"], "advance to Village (tier 3)")
	_check(g.settlement.tier == 3, "settlement is tier 3 (Village) pre-save")
	g.coins = 42
	var saved := SaveManager.save(g)
	_check(saved, "SaveManager.save() reports success")

	var loaded := SaveManager.load_state()
	_check(loaded.settlement.tier == 3, "save→load preserves tier 3 (Village)")
	_check(loaded.settlement.tier_name() == "Village", "loaded settlement name is 'Village'")
	_check(loaded.qty("plank") == 4, "save→load preserves leftover plank (12-8)")
	_check(loaded.coins == 42, "save→load preserves coins")

	# A save with no settlement block (legacy/missing) defaults to Camp.
	var legacy := GameState.from_dict({"inventory": {}, "coins": 0, "turn": 0})
	_check(legacy.settlement.tier == 1, "missing settlement block defaults to Camp")

	SaveManager.clear()

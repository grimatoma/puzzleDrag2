extends SceneTree
## Headless unit-test runner for the bounded FARM RUN lifecycle (Task A, ported from React
## FARM/ENTER + CLOSE_SEASON). Covers GameState.start_farm_run (entry-cost gate, fertilizer
## NO-FAKE rejection, run-state set), farm_run_turn_budget (the ×2 fertilizer formula),
## note_farm_turn while a run is live (countdown → run end, NOT the legacy wrap), close_season
## (the +25 bonus, NPC bond decay, quest reroll, run clear), the active_tile_pool selection
## BOOST, and the save round-trip of the six new run fields.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_farm_run_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_seasons_tests.gd. `class_name` globals
## (ZoneConfig / NpcConfig) are referenced statically (no instance needed).

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Farm run lifecycle tests ───────────────────────")
	_test_entry_cost_insufficient_coins()
	_test_entry_cost_afford()
	_test_fertilizer_rejected()
	_test_budget_formula()
	_test_tick_to_run_end()
	_test_close_season()
	_test_selection_bias_boost()
	_test_save_round_trip()
	_test_save_round_trip_ended_run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + count helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## Count occurrences of `tile` in a pool Array.
func _count(pool: Array, tile: int) -> int:
	var n := 0
	for x in pool:
		if int(x) == tile:
			n += 1
	return n

# ── insufficient coins → rejected, no mutation ─────────────────────────────────

func _test_entry_cost_insufficient_coins() -> void:
	var g := GameState.new()
	g.coins = 49   # below the 50-coin home entry cost
	var r := g.start_farm_run([], false)
	_check(not bool(r.get("ok", true)), "insufficient coins → ok == false")
	_check(String(r.get("reason", "")) == "no_coins", "insufficient coins → reason == no_coins")
	# No mutation: coins + every run field unchanged.
	_check(g.coins == 49, "insufficient coins → coins unchanged (49)")
	_check(not g.farm_run_active, "insufficient coins → no run started")
	_check(g.farm_run_budget == 0, "insufficient coins → budget still 0")
	_check(g.farm_run_turns_left == 0, "insufficient coins → turns_left still 0")
	_check(g.farm_turns_used == 0, "insufficient coins → farm_turns_used still 0")

# ── afford → run starts, coins spent, run state set ────────────────────────────

func _test_entry_cost_afford() -> void:
	var g := GameState.new()
	g.coins = 50
	var r := g.start_farm_run([], false)
	_check(bool(r.get("ok", false)), "afford → ok == true")
	_check(g.coins == 0, "afford → coins decreased by the 50-coin entry cost")
	_check(g.farm_run_active, "afford → farm_run_active")
	_check(g.farm_run_budget == 10, "afford → farm_run_budget == 10 (no fertilizer)")
	_check(g.farm_run_turns_left == 10, "afford → farm_run_turns_left == 10")
	_check(g.farm_turns_used == 0, "afford → farm_turns_used reset to 0")
	_check(int(r.get("budget", -1)) == 10, "afford → result carries budget 10")
	_check(g.active_biome == "farm", "afford → active_biome == farm")
	# farm_turn_budget() now routes the per-run budget.
	_check(g.farm_turn_budget() == 10, "afford → farm_turn_budget() returns the run budget")
	# Starting again while a run is live is rejected.
	g.coins = 100
	var r2 := g.start_farm_run([], false)
	_check(not bool(r2.get("ok", true)) and String(r2.get("reason", "")) == "already_running",
		"second start while live → ok false, reason already_running")
	_check(g.coins == 100, "already_running rejection does NOT charge coins")

# ── fertilizer requested but no primitive → rejected (NO-FAKE) ──────────────────

func _test_fertilizer_rejected() -> void:
	var g := GameState.new()
	g.coins = 100
	var r := g.start_farm_run([], true)
	_check(not bool(r.get("ok", true)), "fertilizer requested → ok == false (NO-FAKE: no primitive)")
	_check(String(r.get("reason", "")) == "no_fertilizer", "fertilizer requested → reason == no_fertilizer")
	# Rejection is pre-mutation: coins + run state untouched.
	_check(g.coins == 100, "fertilizer rejection does NOT charge coins")
	_check(not g.farm_run_active, "fertilizer rejection starts no run")

# ── budget formula: ×1 vs ×2 ───────────────────────────────────────────────────

func _test_budget_formula() -> void:
	var g := GameState.new()
	_check(g.farm_run_turn_budget(false) == 10, "farm_run_turn_budget(false) == 10")
	_check(g.farm_run_turn_budget(true) == 20, "farm_run_turn_budget(true) == 20 (×2)")

# ── tick to run end: countdown, then end (NOT the legacy wrap) ──────────────────

func _test_tick_to_run_end() -> void:
	var g := GameState.new()
	g.coins = 50
	_check(bool(g.start_farm_run([], false).get("ok", false)), "(setup) started a budget-10 run")
	# Calls 1..9: never an end, turns_left counts down 9,8,…,1.
	for k in range(1, 10):
		var r := g.note_farm_turn()
		_check(not bool(r.get("ended", true)), "tick #%d is NOT a run end" % k)
		_check(int(r.get("turns_left", -1)) == 10 - k, "after tick #%d turns_left == %d" % [k, 10 - k])
		_check(g.active_biome == "farm", "tick #%d keeps the farm biome" % k)
	# The 10th tick REACHES the budget → run end (harvest + ended), turns_left 0.
	var h := g.note_farm_turn()
	_check(bool(h.get("harvest", false)), "10th tick IS a harvest (reached the budget)")
	_check(bool(h.get("ended", false)), "10th tick IS a run end (ended == true)")
	_check(int(h.get("turns_left", -1)) == 0, "10th tick → turns_left == 0")
	_check(g.farm_run_turns_left == 0, "run end zeroes farm_run_turns_left")
	# A live run does NOT wrap farm_turns_used (close_season resets it).
	_check(g.farm_turns_used == 10, "run end does NOT wrap farm_turns_used (still 10)")
	_check(g.farm_run_active, "run end leaves farm_run_active true until close_season")

# ── close_season: +25 coins, clear run, reset counter, reroll quests, decay bond ─

func _test_close_season() -> void:
	var g := GameState.new()
	g.coins = 50
	_check(bool(g.start_farm_run([], false).get("ok", false)), "(setup) started a run")
	# Drive a Warm-band NPC above 5 so the decay has something to bite.
	g.gain_bond("wren", 1.0)   # 5.0 → 6.0
	_check(is_equal_approx(g.npc_bond("wren"), 6.0), "(setup) wren bond raised to 6.0")
	# Park the quest board so reroll has a baseline day to bump.
	g.ensure_quests()
	var day_before: int = g.quest_day
	var coins_before: int = g.coins
	var res := g.close_season()
	_check(int(res.get("coins_granted", 0)) == 25, "close_season grants +25 coins")
	_check(g.coins == coins_before + 25, "close_season adds 25 to coins")
	_check(not g.farm_run_active, "close_season clears farm_run_active")
	_check(g.farm_run_budget == 0, "close_season clears farm_run_budget")
	_check(g.farm_run_turns_left == 0, "close_season clears farm_run_turns_left")
	_check(g.farm_run_selected.is_empty(), "close_season clears farm_run_selected")
	_check(g.farm_turns_used == 0, "close_season resets farm_turns_used to 0")
	_check(g.active_biome == "farm", "close_season returns to the farm biome")
	_check(g.quest_day == day_before + 1, "close_season rerolls quests (quest_day bumped)")
	# Bond decay: wren (was 6.0, > 5) drops by 0.1 to 5.9.
	_check(is_equal_approx(g.npc_bond("wren"), 5.9), "close_season decays wren bond 6.0 → 5.9")
	# An NPC left at the Warm default (5.0, not > 5) is NOT decayed.
	_check(is_equal_approx(g.npc_bond("mira"), 5.0), "close_season leaves a 5.0 bond untouched")
	# Floor at 5.0: a bond of 5.05 (just above Warm) must decay to exactly 5.0, NOT 4.95.
	var g2 := GameState.new()
	g2.gain_bond("wren", 0.05)   # 5.0 → 5.05
	_check(abs(g2.npc_bond("wren") - 5.05) < 0.0001, "(setup) wren bond set to 5.05")
	g2.close_season()
	var b_after: float = g2.npc_bond("wren")
	_check(abs(b_after - 5.0) < 0.0001, "close_season floors 5.05 bond to exactly 5.0 (not 4.95)")

# ── selection bias: chosen category gets SPAWNER_BOOST_SLOTS more slots ──────────

func _test_selection_bias_boost() -> void:
	# Unbiased run: baseline count of the trees tile (OAK) in the Spring pool.
	var base_g := GameState.new()
	base_g.coins = 50
	_check(bool(base_g.start_farm_run([], false).get("ok", false)), "(setup) unbiased run started")
	var base_oak := _count(base_g.active_tile_pool(), T.OAK)
	# Biased run: select "trees" → its tile (OAK) gets SPAWNER_BOOST_SLOTS more slots.
	var bias_g := GameState.new()
	bias_g.coins = 50
	_check(bool(bias_g.start_farm_run(["trees"], false).get("ok", false)), "(setup) biased run started")
	_check(bias_g.farm_run_selected == ["trees"], "selection sanitised to ['trees']")
	var biased_oak := _count(bias_g.active_tile_pool(), T.OAK)
	_check(biased_oak == base_oak + GameState.SPAWNER_BOOST_SLOTS,
		"selecting 'trees' boosts OAK by SPAWNER_BOOST_SLOTS (%d)" % GameState.SPAWNER_BOOST_SLOTS)
	# The boost never smuggles an ineligible tile, and an ineligible selection is dropped.
	var off_g := GameState.new()
	off_g.coins = 50
	_check(bool(off_g.start_farm_run(["mount", "trees"], false).get("ok", false)), "(setup) mixed selection")
	_check(off_g.farm_run_selected == ["trees"], "ineligible 'mount' dropped from the selection")
	_check(_count(off_g.active_tile_pool(), T.HORSE) == 0, "selection never smuggles HORSE onto the farm")

# ── save round-trip: the six new fields survive ─────────────────────────────────

func _test_save_round_trip() -> void:
	var g := GameState.new()
	g.coins = 50
	_check(bool(g.start_farm_run(["trees", "grass"], false).get("ok", false)), "(setup) started a run")
	# Spend a couple of turns so used / turns_left are mid-run (not at the defaults).
	g.note_farm_turn()
	g.note_farm_turn()
	_check(g.farm_turns_used == 2, "(setup) 2 farm turns spent")
	_check(g.farm_run_turns_left == 8, "(setup) 8 turns left mid-run")
	var d := g.to_dict()
	# All six new keys present in the snapshot.
	for key in ["farm_run_active", "farm_run_budget", "farm_run_turns_left",
			"farm_run_zone", "farm_run_used_fertilizer", "farm_run_selected"]:
		_check(d.has(key), "to_dict carries '%s'" % key)
	var loaded := GameState.from_dict(d)
	_check(loaded.farm_run_active == true, "round-trip: farm_run_active true")
	_check(loaded.farm_run_budget == 10, "round-trip: farm_run_budget 10")
	_check(loaded.farm_run_turns_left == 8, "round-trip: farm_run_turns_left 8 (consistent with used 2)")
	_check(loaded.farm_run_zone == "home", "round-trip: farm_run_zone home")
	_check(loaded.farm_run_used_fertilizer == false, "round-trip: farm_run_used_fertilizer false")
	_check(loaded.farm_run_selected == ["trees", "grass"], "round-trip: farm_run_selected preserved")
	_check(loaded.farm_turns_used == 2, "round-trip: farm_turns_used 2 (clamped against the run budget)")

# ── save round-trip at the ended boundary: ended run stays ended ────────────────
# Regression test: from_dict must NOT wrap farm_turns_used back to 0 and resurrect
# a fresh full-budget run when the saved state is farm_run_active==true, farm_turns_used==budget,
# farm_run_turns_left==0 (the "ended, awaiting close_season" sentinel).

func _test_save_round_trip_ended_run() -> void:
	var g := GameState.new()
	g.coins = 50
	_check(bool(g.start_farm_run([], false).get("ok", false)), "(setup) started a budget-10 run")
	# Burn all 10 turns to reach the ended boundary.
	for _i in range(10):
		g.note_farm_turn()
	# Verify the ended state before serialising.
	_check(g.farm_run_active, "pre-serialise: farm_run_active still true after 10 ticks")
	_check(g.farm_turns_used == 10, "pre-serialise: farm_turns_used == 10 (budget, NOT wrapped)")
	_check(g.farm_run_turns_left == 0, "pre-serialise: farm_run_turns_left == 0 (run ended)")
	# Serialise + restore.
	var d := g.to_dict()
	var g2 := GameState.from_dict(d)
	# The restored run must STILL be ended — not a fresh full-budget run.
	_check(g2.farm_run_active == true, "ended round-trip: farm_run_active still true")
	_check(g2.farm_turns_used == 10, "ended round-trip: farm_turns_used == 10 (NOT wrapped to 0)")
	_check(g2.farm_run_budget == 10, "ended round-trip: farm_run_budget == 10")
	_check(g2.farm_run_turns_left == 0, "ended round-trip: farm_run_turns_left == 0 (still ended)")

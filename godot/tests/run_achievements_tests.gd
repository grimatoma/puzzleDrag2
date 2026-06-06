extends SceneTree
## Headless unit-test runner for the M10 achievements system: AchievementConfig
## (the ported catalog + helpers) and the GameState bump_counter / reward / save-load
## API wired ADDITIVELY into the existing event sites (credit_chain / fill_order /
## build / damage_boss). Run from the godot/ project root:
##   godot --headless --script res://tests/run_achievements_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_building_tests.gd.

const T := Constants.Tile
# class_name globals aren't constant expressions, so they can't be `const`-aliased.
var AC := AchievementConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Achievements tests ─────────────────────────────")
	_test_config_loads()
	_test_for_counter()
	_test_counter_for_category()
	_test_first_steps_unlock_and_reward()
	_test_patient_hands_at_ten()
	_test_no_regrant_when_unlocked()
	_test_bump_returns_newly_unlocked()
	_test_distinct_buildings_count_once()
	_test_distinct_resources_distinct_keys()
	_test_hazard_chain_no_category_counter()
	_test_category_chain_quantity_semantics()
	_test_mine_category_collapse()
	_test_tool_reward_grants_real_tool()
	_test_save_load_round_trip_no_regrant()
	_test_integration_credit_chain_path()
	_test_integration_fill_order_path()
	_test_integration_boss_defeat_path()
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

## Add `amount` of `resource` to a GameState inventory directly (test helper).
func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

func _give_all(g: GameState, cost: Dictionary) -> void:
	for k in cost.keys():
		_give(g, k, int(cost[k]))

# ── AchievementConfig (catalog + helpers) ─────────────────────────────────────

func _test_config_loads() -> void:
	var all := AC.all()
	_check(all.size() == 19, "catalog has the 19 ported achievements")
	# Spot-check expected ids are present.
	for id in ["first_steps", "patient_hands", "tireless", "trusted_friend",
			"village_voice", "first_blood", "naturalist", "polymath",
			"town_planner", "first_strike", "deep_digger", "mine_master",
			"forester", "veg_patron", "orchard_friend", "pollinator",
			"herder", "dairyman", "stable_hand"]:
		_check(AC.has_achievement(id), "catalog includes '%s'" % id)
	# And that the UNREACHABLE React ids were OMITTED (no fakes).
	for omitted in ["champion", "supply_chain", "first_catch", "tide_runner",
			"master_angler", "fowler", "powerful_keep", "ability_artisan"]:
		_check(not AC.has_achievement(omitted), "unreachable '%s' is OMITTED" % omitted)

	# all() / get_achievement return defensive copies (mutating must not corrupt).
	all[0]["threshold"] = 999
	_check(int(AC.get_achievement("first_steps")["threshold"]) == 1,
		"all() returns a defensive copy (catalog unchanged)")

func _test_for_counter() -> void:
	var chains := AC.for_counter("chains_committed")
	_check(chains.size() == 3, "for_counter(chains_committed) → 3 (first_steps/patient_hands/tireless)")
	var orders := AC.for_counter("orders_fulfilled")
	_check(orders.size() == 2, "for_counter(orders_fulfilled) → 2")
	var bosses := AC.for_counter("bosses_defeated")
	_check(bosses.size() == 1, "for_counter(bosses_defeated) → 1 (first_blood only; champion omitted)")
	var mine := AC.for_counter("mine_chained")
	_check(mine.size() == 3, "for_counter(mine_chained) → 3")
	_check(AC.for_counter("fish_chained").is_empty(), "for_counter(fish_chained) → empty (no harbor)")

func _test_counter_for_category() -> void:
	_check(AC.counter_for_category("trees") == "tree_chained", "trees → tree_chained")
	_check(AC.counter_for_category("veg") == "veg_chained", "veg → veg_chained")
	_check(AC.counter_for_category("flower") == "flower_chained", "flower → flower_chained")
	_check(AC.counter_for_category("stone") == "mine_chained", "stone → mine_chained")
	_check(AC.counter_for_category("gem") == "mine_chained", "gem → mine_chained")
	_check(AC.counter_for_category("grass") == "", "grass (staple) → no counter")
	_check(AC.counter_for_category("rat") == "", "rat (hazard) → no counter")
	_check(AC.counter_for_category("birds") == "", "birds → no counter (fowler omitted from this slice)")

# ── bump_counter: unlocks, rewards, idempotence ───────────────────────────────

func _test_first_steps_unlock_and_reward() -> void:
	var g := GameState.new()
	var coins0 := g.coins
	var newly := g.bump_counter("chains_committed")
	_check(int(g.achievement_counters.get("chains_committed", 0)) == 1, "counter == 1 after one bump")
	_check(bool(g.achievements_unlocked.get("first_steps", false)), "first_steps unlocked at 1")
	_check(g.coins == coins0 + 25, "first_steps grants +25 coins")
	_check(newly.size() == 1 and String(newly[0]["id"]) == "first_steps",
		"bump returns [first_steps]")

func _test_patient_hands_at_ten() -> void:
	var g := GameState.new()
	# Bump to 9 — patient_hands (threshold 10) still locked; first_steps unlocked at 1.
	for _i in 9:
		g.bump_counter("chains_committed")
	_check(not bool(g.achievements_unlocked.get("patient_hands", false)),
		"patient_hands still locked at 9 chains")
	var coins_before := g.coins
	var newly := g.bump_counter("chains_committed")   # 10th
	_check(bool(g.achievements_unlocked.get("patient_hands", false)),
		"patient_hands unlocks at the 10th chain")
	_check(g.coins == coins_before + 50, "patient_hands grants +50 coins")
	_check(newly.size() == 1 and String(newly[0]["id"]) == "patient_hands",
		"the 10th bump returns [patient_hands] only")

func _test_no_regrant_when_unlocked() -> void:
	var g := GameState.new()
	g.bump_counter("chains_committed")                 # first_steps → +25
	var coins_after_first := g.coins
	var newly := g.bump_counter("chains_committed")    # 2nd chain — nothing new crosses
	_check(newly.is_empty(), "no new unlock on the 2nd chain")
	_check(g.coins == coins_after_first, "already-unlocked first_steps does NOT re-grant coins")

func _test_bump_returns_newly_unlocked() -> void:
	# A single bump that crosses MULTIPLE thresholds at once returns all of them.
	# distinct_resources_chained: naturalist(8) — get to 7 distinct, then the 8th.
	var g := GameState.new()
	var keys := ["a", "b", "c", "d", "e", "f", "g"]
	for k in keys:
		g.bump_counter("distinct_resources_chained", 1, k)
	_check(int(g.achievement_counters.get("distinct_resources_chained", 0)) == 7,
		"7 distinct resources counted")
	_check(not bool(g.achievements_unlocked.get("naturalist", false)), "naturalist locked at 7 distinct")
	var newly := g.bump_counter("distinct_resources_chained", 1, "h")   # 8th distinct
	_check(newly.size() == 1 and String(newly[0]["id"]) == "naturalist",
		"8th distinct returns [naturalist]")

func _test_distinct_buildings_count_once() -> void:
	var g := GameState.new()
	g.bump_counter("distinct_buildings_built", 1, "lumber_camp")
	g.bump_counter("distinct_buildings_built", 1, "lumber_camp")   # same id again
	_check(int(g.achievement_counters.get("distinct_buildings_built", 0)) == 1,
		"distinct_buildings_built stays 1 when the same id is bumped twice")
	g.bump_counter("distinct_buildings_built", 1, "coop")          # a new id
	_check(int(g.achievement_counters.get("distinct_buildings_built", 0)) == 2,
		"a NEW distinct id bumps the count to 2")

func _test_distinct_resources_distinct_keys() -> void:
	var g := GameState.new()
	g.bump_counter("distinct_resources_chained", 1, "flour")
	g.bump_counter("distinct_resources_chained", 1, "flour")   # repeat — no bump
	g.bump_counter("distinct_resources_chained", 1, "")        # empty key — no bump
	_check(int(g.achievement_counters.get("distinct_resources_chained", 0)) == 1,
		"distinct resources only count new, non-empty keys")

func _test_hazard_chain_no_category_counter() -> void:
	# A hazard tile (RAT) produces "" and maps to no category counter. Chaining it
	# bumps chains_committed (it IS a chain) but no category / distinct-resource counter.
	var g := GameState.new()
	g.credit_chain(T.RAT, 4)
	_check(int(g.achievement_counters.get("chains_committed", 0)) == 1,
		"a rat chain still counts as a committed chain")
	_check(int(g.achievement_counters.get("distinct_resources_chained", 0)) == 0,
		"rat (empty produced resource) does NOT bump distinct resources")
	_check(int(g.achievement_counters.get("rat_chained", 0)) == 0,
		"rat (hazard category) bumps no category counter")

func _test_category_chain_quantity_semantics() -> void:
	# Category counters count TILES → bump by chain_len. veg_patron threshold is 50.
	var g := GameState.new()
	g.credit_chain(T.CARROT, 6)    # veg category → veg_chained += 6
	_check(int(g.achievement_counters.get("veg_chained", 0)) == 6,
		"a veg chain of 6 bumps veg_chained by chain_len (6), not by 1")
	# Reach the threshold and confirm the unlock.
	g.credit_chain(T.CARROT, 50)   # 6 + 50 = 56 → crosses 50
	_check(bool(g.achievements_unlocked.get("veg_patron", false)),
		"veg_patron unlocks once veg_chained crosses 50")

func _test_mine_category_collapse() -> void:
	# The five mine categories all sum into mine_chained. first_strike unlocks at 1.
	# (credit_chain returns its own economy summary, not the unlock list, so the unlock
	# is verified via the unlocked SET — and bump_counter's return list is covered by
	# the direct-call tests above.)
	var g := GameState.new()
	g.credit_chain(T.STONE, 1)   # stone → mine_chained += 1
	_check(int(g.achievement_counters.get("mine_chained", 0)) == 1, "stone chain bumps mine_chained")
	_check(bool(g.achievements_unlocked.get("first_strike", false)),
		"first_strike unlocks on the first mine chain (via the wired credit_chain path)")
	g.credit_chain(T.GEM, 10)    # gem also → mine_chained (collapse) += 10
	_check(int(g.achievement_counters.get("mine_chained", 0)) == 11,
		"gem chain ALSO bumps the shared mine_chained (1 + 10 = 11)")

func _test_tool_reward_grants_real_tool() -> void:
	# polymath (15 distinct resources) rewards a real tool via grant_tool.
	var g := GameState.new()
	for i in 15:
		g.bump_counter("distinct_resources_chained", 1, "res_%d" % i)
	_check(bool(g.achievements_unlocked.get("polymath", false)), "polymath unlocks at 15 distinct")
	_check(g.tool_count(AchievementConfig.REWARD_TOOL) == 1,
		"polymath grants 1 charge of the real reward tool (%s) via grant_tool" % AchievementConfig.REWARD_TOOL)

# ── persistence: round-trip + no double-grant on load ─────────────────────────

func _test_save_load_round_trip_no_regrant() -> void:
	var g := GameState.new()
	# Earn first_steps + some distinct buildings + a category counter.
	g.bump_counter("chains_committed")                                  # first_steps + count 1
	g.bump_counter("distinct_buildings_built", 1, "lumber_camp")
	g.bump_counter("distinct_buildings_built", 1, "coop")
	g.bump_counter("veg_chained", 6)
	var coins_at_save := g.coins

	var d := g.to_dict()
	_check(d.has("achievement_counters") and d.has("achievements_unlocked") and d.has("_distinct_seen"),
		"to_dict includes the three achievement maps")

	var g2 := GameState.from_dict(d)
	_check(int(g2.achievement_counters.get("chains_committed", 0)) == 1, "round-trip preserves counters")
	_check(bool(g2.achievements_unlocked.get("first_steps", false)), "round-trip preserves unlocked set")
	_check(int(g2.achievement_counters.get("distinct_buildings_built", 0)) == 2,
		"round-trip preserves distinct count")
	_check(g2._distinct_seen.get("distinct_buildings_built", {}).has("lumber_camp"),
		"round-trip preserves _distinct_seen keys")
	# Loading must NOT re-grant: coins are restored, not re-credited.
	_check(g2.coins == coins_at_save, "load does not re-credit reward coins")

	# A fresh bump on the loaded state for an ALREADY-unlocked achievement re-grants
	# nothing (the unlocked set was restored).
	var coins_before := g2.coins
	var newly := g2.bump_counter("chains_committed")   # count → 2, first_steps already earned
	_check(newly.is_empty(), "bump after load yields no new unlock for an earned achievement")
	_check(g2.coins == coins_before, "bump after load does not re-grant first_steps coins")

	# A distinct key already seen pre-save must stay counted-once after load.
	g2.bump_counter("distinct_buildings_built", 1, "lumber_camp")   # already seen
	_check(int(g2.achievement_counters.get("distinct_buildings_built", 0)) == 2,
		"a pre-save distinct key stays counted-once after load (no re-bump)")

	# A pre-M10 save (no achievement keys) loads with empty maps.
	var old_save := {"inventory": {}, "progress": {}, "coins": 0, "turn": 0}
	var g3 := GameState.from_dict(old_save)
	_check(g3.achievement_counters.is_empty() and g3.achievements_unlocked.is_empty()
			and g3._distinct_seen.is_empty(),
		"a pre-M10 save loads with empty achievement maps")

# ── integration: the real wired event-site paths ─────────────────────────────

func _test_integration_credit_chain_path() -> void:
	# Drive credit_chain enough to unlock the chains achievements through the WIRED
	# path (not by calling bump_counter directly). 10 grass chains → first_steps + patient_hands.
	var g := GameState.new()
	for _i in 10:
		g.credit_chain(T.GRASS, 3)
	_check(int(g.achievement_counters.get("chains_committed", 0)) == 10,
		"credit_chain ×10 drives chains_committed to 10 via the wired path")
	_check(bool(g.achievements_unlocked.get("first_steps", false)), "first_steps unlocked via credit_chain")
	_check(bool(g.achievements_unlocked.get("patient_hands", false)),
		"patient_hands unlocked via credit_chain")
	# Grass also feeds distinct_resources_chained (hay_bundle) — exactly one distinct key.
	_check(int(g.achievement_counters.get("distinct_resources_chained", 0)) == 1,
		"10 grass chains register exactly ONE distinct resource (hay_bundle)")

func _test_integration_fill_order_path() -> void:
	# Fill 5 orders through the wired fill_order path → trusted_friend.
	var g := GameState.new()
	g.seed_orders(42)
	# Seed inventory generously so any rolled order is fillable.
	for r in ["hay_bundle", "flour"]:
		_give(g, r, 1000)
	g.refill_orders()
	var filled := 0
	# Fill orders until 5 succeed (orders refill after each fill).
	var guard := 0
	while filled < 5 and guard < 100:
		guard += 1
		# Find any fillable order index.
		var idx := -1
		for i in g.orders.size():
			if g.can_fill_order(i):
				idx = i
				break
		if idx < 0:
			break
		if bool(g.fill_order(idx)["ok"]):
			filled += 1
	_check(filled == 5, "filled 5 orders through the wired path")
	_check(int(g.achievement_counters.get("orders_fulfilled", 0)) == 5,
		"fill_order ×5 drives orders_fulfilled to 5")
	_check(bool(g.achievements_unlocked.get("trusted_friend", false)),
		"trusted_friend unlocked via fill_order")

func _test_integration_boss_defeat_path() -> void:
	# Only a DEFEAT bumps bosses_defeated through the wired damage_boss path.
	var g := GameState.new()
	g.boss_active = BossConfig.FROSTMAW
	g.boss_hp = 5
	var coins_before := g.coins
	var r1 := g.damage_boss(2)   # 5 - 2 = 3, NOT defeated
	_check(not bool(r1.get("defeated", false)), "non-fatal hit does not defeat")
	_check(int(g.achievement_counters.get("bosses_defeated", 0)) == 0,
		"a non-fatal hit does NOT bump bosses_defeated")
	var r2 := g.damage_boss(10)  # over-kill → defeated
	_check(bool(r2.get("defeated", false)), "the fatal hit defeats the boss")
	_check(int(g.achievement_counters.get("bosses_defeated", 0)) == 1,
		"the DEFEAT bumps bosses_defeated to 1 via the wired path")
	_check(bool(g.achievements_unlocked.get("first_blood", false)),
		"first_blood unlocked on boss defeat")
	# first_blood grants +200 coins ON TOP of the boss reward already credited by damage_boss.
	_check(g.coins >= coins_before + 200, "first_blood's +200 coin reward is granted")

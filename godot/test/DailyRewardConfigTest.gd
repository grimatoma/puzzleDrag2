# GdUnit4 starter suite — DailyRewardConfig + GameState.login_tick (login streak).
#
# Re-expresses the pure-logic invariants from
# godot/tests/run_daily_rewards_tests.gd in GdUnit4 style: the 1..30 reward
# ladder (with the tool-id remap + {coins:25} default) and the login_tick streak
# state machine (idempotent same-day, consecutive +1, gap reset, cap at 30).
# Legacy runner stays the comprehensive harness (it also covers the modal /
# router / Main wiring). Expected values mirror run_daily_rewards_tests.gd.
extends GdUnitTestSuite

# ── DailyRewardConfig: the reward ladder + remap + default ───────────────────

func test_reward_ladder_coins_and_tool_remap() -> void:
	assert_int(DailyRewardConfig.MAX_DAY).is_equal(30)
	assert_int(int(DailyRewardConfig.reward_for_day(1).get("coins", 0))).is_equal(25)
	assert_int(int(DailyRewardConfig.reward_for_day(2).get("coins", 0))).is_equal(50)
	# Day 3 = tool basic→scythe ×1, no coins.
	var r3 := DailyRewardConfig.reward_for_day(3)
	assert_str(String(r3.get("tool", ""))).is_equal("scythe")
	assert_int(int(r3.get("amount", 0))).is_equal(1)
	assert_int(int(r3.get("coins", 0))).is_equal(0)
	# Day 5 = tool rare→bomb. Day 7 = 150 coins + shuffle→rake.
	assert_str(String(DailyRewardConfig.reward_for_day(5).get("tool", ""))).is_equal("bomb")
	var r7 := DailyRewardConfig.reward_for_day(7)
	assert_int(int(r7.get("coins", 0))).is_equal(150)
	assert_str(String(r7.get("tool", ""))).is_equal("rake")

func test_runes_and_unlisted_default() -> void:
	# Day 6 unlisted → {coins:25} default.
	var r6 := DailyRewardConfig.reward_for_day(6)
	assert_int(int(r6.get("coins", 0))).is_equal(25)
	assert_bool(r6.has("tool")).is_false()
	# Day 14 = 300 coins + 1 rune.
	var r14 := DailyRewardConfig.reward_for_day(14)
	assert_int(int(r14.get("coins", 0))).is_equal(300)
	assert_int(int(r14.get("runes", 0))).is_equal(1)
	# Day 30 = 1000 coins + 3 runes + the Triceratops unlock_tile (React unlockTile — the port HAS the tile), no tool.
	var r30 := DailyRewardConfig.reward_for_day(30)
	assert_int(int(r30.get("coins", 0))).is_equal(1000)
	assert_int(int(r30.get("runes", 0))).is_equal(3)
	assert_str(String(r30.get("unlock_tile", ""))).is_equal("tile_cattle_triceratops")
	assert_bool(r30.has("tool")).is_false()
	# Day past 30 (defensive) → {coins:25} default.
	assert_int(int(DailyRewardConfig.reward_for_day(31).get("coins", 0))).is_equal(25)

func test_reward_for_day_is_defensive_copy() -> void:
	var mutate := DailyRewardConfig.reward_for_day(1)
	mutate["coins"] = 9999
	assert_int(int(DailyRewardConfig.reward_for_day(1).get("coins", 0))).is_equal(25)

# ── GameState.login_tick: the streak state machine ──────────────────────────

func test_first_claim_grants_day_one() -> void:
	var g := GameState.new()
	assert_str(g.daily_last_claimed).is_equal("")
	assert_int(g.daily_streak_day).is_equal(0)
	var coins0 := g.coins
	var res := g.login_tick("2026-06-06")
	assert_bool(bool(res.get("claimed", false))).is_true()
	assert_int(int(res.get("day", 0))).is_equal(1)
	assert_int(int(res.get("reward", {}).get("coins", 0))).is_equal(25)
	assert_int(g.coins).is_equal(coins0 + 25)
	assert_str(g.daily_last_claimed).is_equal("2026-06-06")
	assert_int(g.daily_streak_day).is_equal(1)

func test_same_day_is_idempotent() -> void:
	var g := GameState.new()
	g.login_tick("2026-06-06")
	var coins_after := g.coins
	var res := g.login_tick("2026-06-06")
	assert_bool(bool(res.get("claimed", false))).is_false()
	assert_int(int(res.get("day", 0))).is_equal(1)
	assert_dict(res.get("reward", {})).is_empty()
	assert_int(g.coins).is_equal(coins_after)         # no double grant
	assert_int(g.daily_streak_day).is_equal(1)

func test_consecutive_next_day_advances() -> void:
	var g := GameState.new()
	g.login_tick("2026-06-06")
	var coins_before := g.coins
	var res := g.login_tick("2026-06-07")
	assert_bool(bool(res.get("claimed", false))).is_true()
	assert_int(int(res.get("day", 0))).is_equal(2)
	assert_int(g.coins).is_equal(coins_before + 50)   # day-2 reward
	assert_int(g.daily_streak_day).is_equal(2)

func test_gap_resets_streak_to_day_one() -> void:
	var g := GameState.new()
	g.login_tick("2026-06-01")          # day 1
	g.login_tick("2026-06-02")          # day 2 (consecutive)
	# A 2-day gap (only diff==1 extends) resets to day 1.
	var res := g.login_tick("2026-06-04")
	assert_int(int(res.get("day", 0))).is_equal(1)
	assert_int(g.daily_streak_day).is_equal(1)

func test_streak_caps_at_thirty() -> void:
	var g := GameState.new()
	var day30 := {}
	for i in range(30):
		day30 = g.login_tick("2026-01-%02d" % (i + 1))
	assert_int(int(day30.get("day", 0))).is_equal(30)
	assert_int(g.daily_streak_day).is_equal(30)
	assert_int(int(day30.get("reward", {}).get("coins", 0))).is_equal(1000)
	assert_int(int(day30.get("reward", {}).get("runes", 0))).is_equal(3)
	# The 31st consecutive day stays at day 30 (capped) but still grants the reward.
	var coins_at_30 := g.coins
	var runes_at_30 := g.runes
	var res31 := g.login_tick("2026-01-31")
	assert_int(int(res31.get("day", 0))).is_equal(30)
	assert_int(g.daily_streak_day).is_equal(30)
	assert_int(g.coins).is_equal(coins_at_30 + 1000)
	assert_int(g.runes).is_equal(runes_at_30 + 3)

func test_tool_day_grants_remapped_tool() -> void:
	var g := GameState.new()
	g.login_tick("2026-03-01")          # day 1
	g.login_tick("2026-03-02")          # day 2
	g.login_tick("2026-03-03")          # day 3 → scythe ×1
	assert_int(g.tool_count("scythe")).is_equal(1)
	g.login_tick("2026-03-04")          # day 4
	g.login_tick("2026-03-05")          # day 5 → bomb ×1
	assert_int(g.tool_count("bomb")).is_equal(1)

func test_streak_state_round_trips() -> void:
	var g := GameState.new()
	g.login_tick("2026-06-01")
	g.login_tick("2026-06-02")          # day 2, last claimed 2026-06-02
	var snap := g.to_dict()
	assert_str(String(snap["daily_last_claimed"])).is_equal("2026-06-02")
	assert_int(int(snap["daily_streak_day"])).is_equal(2)
	var g2 := GameState.from_dict(snap)
	assert_str(g2.daily_last_claimed).is_equal("2026-06-02")
	assert_int(g2.daily_streak_day).is_equal(2)
	# Restored state is idempotent on its last day and extends on the next.
	assert_bool(bool(g2.login_tick("2026-06-02").get("claimed", false))).is_false()
	assert_int(int(g2.login_tick("2026-06-03").get("day", 0))).is_equal(3)

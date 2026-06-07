# GdUnit4 starter suite — AlmanacConfig (XP curve + tier catalog + claim gate).
#
# Re-expresses the pure-logic AlmanacConfig invariants from
# godot/tests/run_quests_tests.gd in GdUnit4 style. Legacy runner stays the
# comprehensive harness; this is the framework-adoption slice. Expected values
# mirror run_quests_tests.gd.
extends GdUnitTestSuite

func test_catalog_has_ten_ordered_tiers() -> void:
	var tiers := AlmanacConfig.all_tiers()
	assert_array(tiers).has_size(10)
	assert_int(AlmanacConfig.tier_count()).is_equal(10)
	# Tier ids are 1..10 in order, each requiring level == tier.
	for i in 10:
		var t: Dictionary = tiers[i]
		assert_int(int(t.get("tier", 0))).is_equal(i + 1)
		assert_int(int(t.get("level", 0))).is_equal(i + 1)

func test_tier_def_hit_miss_and_defensive_copy() -> void:
	assert_bool(AlmanacConfig.has_tier(5)).is_true()
	assert_bool(AlmanacConfig.has_tier(11)).is_false()
	assert_dict(AlmanacConfig.tier_def(99)).is_empty()
	# all_tiers() returns a defensive copy — mutating it can't corrupt the catalog.
	var copy := AlmanacConfig.all_tiers()
	copy[0]["level"] = 999
	assert_int(int(AlmanacConfig.tier_def(1)["level"])).is_equal(1)

func test_tier_tool_rewards_are_real_tool_ids() -> void:
	# Every tool reward id across all tiers must be a real ToolConfig member.
	for t in AlmanacConfig.all_tiers():
		var tools_reward: Dictionary = t.get("reward", {}).get("tools", {})
		for tid in tools_reward.keys():
			assert_bool(ToolConfig.has_tool(String(tid))).is_true()

func test_xp_curve_level_boundaries() -> void:
	# 150 XP per level, linear: level = max(1, floor(xp/150)+1).
	assert_int(AlmanacConfig.XP_PER_LEVEL).is_equal(150)
	assert_int(AlmanacConfig.level_for_xp(0)).is_equal(1)
	assert_int(AlmanacConfig.level_for_xp(149)).is_equal(1)    # just under
	assert_int(AlmanacConfig.level_for_xp(150)).is_equal(2)    # boundary
	assert_int(AlmanacConfig.level_for_xp(299)).is_equal(2)
	assert_int(AlmanacConfig.level_for_xp(300)).is_equal(3)    # boundary
	assert_int(AlmanacConfig.level_for_xp(1500)).is_equal(11)
	assert_int(AlmanacConfig.level_for_xp(-5)).is_equal(1)     # negative floors to 1

func test_can_claim_tier_gate() -> void:
	# Level too low → cannot claim tier 5 (needs level 5).
	assert_bool(AlmanacConfig.can_claim_tier(5, 4, [])).is_false()
	# Level exactly required → can claim.
	assert_bool(AlmanacConfig.can_claim_tier(5, 5, [])).is_true()
	# Already claimed → cannot claim again.
	assert_bool(AlmanacConfig.can_claim_tier(5, 9, [5])).is_false()
	# Unknown tier → cannot claim.
	assert_bool(AlmanacConfig.can_claim_tier(99, 99, [])).is_false()

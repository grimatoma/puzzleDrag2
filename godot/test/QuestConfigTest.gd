# GdUnit4 starter suite — QuestConfig (seeded RNG + roll determinism + tick).
#
# Re-expresses the pure-logic invariants from godot/tests/run_quests_tests.gd
# (the QuestConfig portions) in GdUnit4 style. The legacy runner stays the
# comprehensive harness (it also covers the screen/router/Main wiring); this is
# the framework-adoption slice over the deterministic logic. Expected values
# mirror run_quests_tests.gd.
extends GdUnitTestSuite

# Build a synthetic quest dict the way the legacy runner does, for tick tests.
func _make_quest(category: String, fields: Dictionary, target: int) -> Dictionary:
	var q: Dictionary = {
		"id": "test", "template": "test", "category": category,
		"key": "", "item": "", "tool": "", "min_length": -1,
		"target": target, "progress": 0, "claimed": false,
		"reward": {"coins": 10, "xp": 20},
	}
	for k in fields.keys():
		q[k] = fields[k]
	return q

# ── seeded RNG determinism ──────────────────────────────────────────────────

func test_rng_same_seed_is_deterministic() -> void:
	var s1 := QuestConfig.rng_state("abc")
	var s2 := QuestConfig.rng_state("abc")
	var seq1: Array = []
	var seq2: Array = []
	for _i in 5:
		seq1.append(QuestConfig.rng_next(s1))
		seq2.append(QuestConfig.rng_next(s2))
	assert_array(seq1).is_equal(seq2)

func test_rng_different_seeds_diverge() -> void:
	var first_a: float = QuestConfig.rng_next(QuestConfig.rng_state("abc"))
	var first_x: float = QuestConfig.rng_next(QuestConfig.rng_state("xyz"))
	assert_float(first_a).is_not_equal(first_x)

func test_rng_draws_in_unit_range() -> void:
	var s := QuestConfig.rng_state("range")
	for _i in 20:
		var v: float = QuestConfig.rng_next(s)
		assert_float(v).is_between(0.0, 1.0)   # [0, 1] inclusive bound; draws are [0, 1)
		assert_bool(v < 1.0).is_true()

# ── roll determinism + variation ────────────────────────────────────────────

func test_roll_yields_six_quests() -> void:
	var a := QuestConfig.roll_quests("seedA", 0)
	assert_array(a).has_size(6)

func test_roll_same_seed_day_is_identical() -> void:
	var a := QuestConfig.roll_quests("seedA", 0)
	var b := QuestConfig.roll_quests("seedA", 0)
	for i in a.size():
		assert_str(String(a[i].get("template", ""))).is_equal(String(b[i].get("template", "")))
		assert_int(int(a[i].get("target", 0))).is_equal(int(b[i].get("target", 0)))

func test_roll_different_day_differs() -> void:
	var a := QuestConfig.roll_quests("seedA", 0)
	var c := QuestConfig.roll_quests("seedA", 1)
	var templ_a: Array = []
	var templ_c: Array = []
	for q in a:
		templ_a.append(String(q.get("template", "")))
	for q in c:
		templ_c.append(String(q.get("template", "")))
	assert_array(templ_a).is_not_equal(templ_c)

func test_roll_has_no_duplicate_templates() -> void:
	var a := QuestConfig.roll_quests("seedA", 0)
	var seen := {}
	for q in a:
		var tid := String(q.get("template", ""))
		assert_bool(seen.has(tid)).is_false()   # splice semantics → each template once
		seen[tid] = true

func test_roll_reward_shape() -> void:
	var quests := QuestConfig.roll_quests("shape", 3)
	for q in quests:
		var tpl := QuestConfig.template_by_id(String(q.get("template", "")))
		var target: int = int(q.get("target", 0))
		# Target within the template's [min, max].
		assert_int(target).is_greater_equal(int(tpl.get("target_min", 0)))
		assert_int(target).is_less_equal(int(tpl.get("target_max", 0)))
		# Reward coins = coin_base + floor(target * coin_per_unit); xp == QUEST_CLAIM_XP.
		var expected_coins: int = int(tpl.get("coin_base", 0)) \
			+ int(floor(float(target) * float(tpl.get("coin_per_unit", 0))))
		assert_int(int(q.get("reward", {}).get("coins", -1))).is_equal(expected_coins)
		assert_int(int(q.get("reward", {}).get("xp", -1))).is_equal(QuestConfig.QUEST_CLAIM_XP)
		# Fresh quests start unclaimed at progress 0; the id encodes the quest_day.
		assert_int(int(q.get("progress", -1))).is_equal(0)
		assert_bool(bool(q.get("claimed", true))).is_false()
		assert_str(String(q.get("id", ""))).contains("-3-")

# ── tick_quest is a pure, category-keyed accumulator ────────────────────────

func test_tick_collect_matches_key() -> void:
	var q := _make_quest("collect", {"key": "tile_grass_grass"}, 50)
	var r := QuestConfig.tick_quest(q, {"type": "collect", "key": "tile_grass_grass", "amount": 6})
	assert_int(int(r.get("progress", 0))).is_equal(6)
	# Wrong key / wrong event → no progress.
	var r2 := QuestConfig.tick_quest(q, {"type": "collect", "key": "tile_grain_wheat", "amount": 6})
	assert_int(int(r2.get("progress", 0))).is_equal(0)
	var r3 := QuestConfig.tick_quest(q, {"type": "order"})
	assert_int(int(r3.get("progress", 0))).is_equal(0)
	# tick is PURE — the input quest is untouched.
	assert_int(int(q.get("progress", 0))).is_equal(0)

func test_tick_chain_respects_min_length() -> void:
	var q := _make_quest("chain", {"min_length": 8}, 3)
	# Below min → no progress (7 < 8).
	assert_int(int(QuestConfig.tick_quest(q, {"type": "chain", "length": 7}).get("progress", 0))).is_equal(0)
	# At min → +1 (8 >= 8).
	assert_int(int(QuestConfig.tick_quest(q, {"type": "chain", "length": 8}).get("progress", 0))).is_equal(1)
	# Above min → +1.
	assert_int(int(QuestConfig.tick_quest(q, {"type": "chain", "length": 20}).get("progress", 0))).is_equal(1)

func test_tick_claimed_never_progresses_and_clamps() -> void:
	# A claimed quest never progresses.
	var claimed := _make_quest("collect", {"key": "k", "claimed": true}, 5)
	assert_int(int(QuestConfig.tick_quest(claimed, {"type": "collect", "key": "k", "amount": 3}).get("progress", 0))).is_equal(0)
	# Progress clamps to target (4 + 10 → 5, no overshoot).
	var near := _make_quest("collect", {"key": "k", "progress": 4}, 5)
	assert_int(int(QuestConfig.tick_quest(near, {"type": "collect", "key": "k", "amount": 10}).get("progress", 0))).is_equal(5)

func test_is_claimable_gate() -> void:
	assert_bool(QuestConfig.is_claimable(_make_quest("collect", {"key": "k", "progress": 5}, 5))).is_true()
	assert_bool(QuestConfig.is_claimable(_make_quest("collect", {"key": "k", "progress": 4}, 5))).is_false()
	assert_bool(QuestConfig.is_claimable(_make_quest("collect", {"key": "k", "progress": 5, "claimed": true}, 5))).is_false()

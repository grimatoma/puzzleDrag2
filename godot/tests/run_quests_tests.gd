extends SceneTree
## Headless unit-test runner for the Quests + Almanac system: QuestConfig (the ported
## template pool + seeded rngFrom + roll/tick/claim logic), AlmanacConfig (the XP curve +
## tier catalog + gates), the GameState quest/almanac mutations wired ADDITIVELY into the
## existing event sites (credit_chain / fill_order / craft / use_tool_on_grid), the
## QuestsScreen rendering, the ViewRouter.QUESTS modal, and the Main integration.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_quests_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_achievements_tests.gd /
## run_charter_tests.gd.

const T := Constants.Tile
const QuestsScreenScript := preload("res://scenes/QuestsScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_closed() -> void:
	_closed_count += 1

func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

## Find the quest dict whose template == `template_id` in `quests`, or {} if none.
func _quest_by_template(quests: Array, template_id: String) -> Dictionary:
	for q in quests:
		if String(q.get("template", "")) == template_id:
			return q
	return {}

func _initialize() -> void:
	print("\n── Quests + Almanac tests ─────────────────────────")
	_test_template_catalog()
	_test_rng_determinism()
	_test_roll_determinism()
	_test_roll_shape_and_reward()
	_test_tick_collect()
	_test_tick_craft()
	_test_tick_order()
	_test_tick_tool()
	_test_tick_chain()
	_test_tick_claimed_and_clamp()
	_test_is_claimable()
	_test_almanac_catalog()
	_test_almanac_level_curve()
	_test_almanac_can_claim_gate()
	_test_gamestate_ensure_and_reroll()
	_test_gamestate_claim_quest()
	_test_gamestate_award_xp()
	_test_gamestate_claim_tier()
	_test_gamestate_claim_tier_structural()
	_test_additive_no_quests()
	_test_wired_credit_chain_collect_and_chain()
	_test_wired_fill_order()
	_test_wired_craft()
	_test_wired_tool()
	_test_save_load_round_trip()
	await _test_screen_and_router_and_main()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── QuestConfig: template catalog ─────────────────────────────────────────────

func _test_template_catalog() -> void:
	var all := QuestConfig.all_templates()
	_check(all.size() >= 12, "template pool has >= 12 entries (has %d)" % all.size())
	# Every INCLUDED template id is present.
	for id in ["collect_hay", "collect_wheat", "collect_log", "collect_oak",
			"collect_sardine", "collect_mackerel", "collect_clam", "collect_kelp",
			"collect_stone", "collect_ore", "collect_coal", "collect_gem", "collect_dirt",
			"collect_pig", "collect_cow", "collect_horse",
			"craft_bread", "orders_any",
			"tool_scythe", "tool_bomb", "tool_drill", "chain_8", "chain_12"]:
		_check(QuestConfig.has_template(id), "template pool includes '%s'" % id)
	# Every OMITTED unreachable React template id is absent (no fakes).
	for omitted in ["collect_berry", "collect_sheep", "collect_flour",
			"craft_jam", "craft_plank", "craft_chowder", "craft_fish_oil",
			"craft_lantern", "craft_goldring", "craft_cobblepath",
			"craft_pie", "craft_meat", "craft_milk",
			"tool_seedpack", "tool_lockbox"]:
		_check(not QuestConfig.has_template(omitted), "unreachable '%s' is OMITTED" % omitted)
	# Every collect template's key is a REAL tile STRING key (no dead collect quests).
	var valid_keys: Array = []
	for tile in Constants.STRING_KEYS.keys():
		valid_keys.append(String(Constants.STRING_KEYS[tile]))
	for t in all:
		if String(t.get("category", "")) == "collect":
			_check(valid_keys.has(String(t.get("key", ""))),
				"collect '%s' key '%s' is a real tile key" % [t.get("id"), t.get("key")])
		if String(t.get("category", "")) == "tool":
			_check(ToolConfig.has_tool(String(t.get("tool", ""))),
				"tool '%s' tool '%s' is a real ToolConfig id" % [t.get("id"), t.get("tool")])
		if String(t.get("category", "")) == "craft":
			# The crafted item must be producible by some RecipeConfig recipe output.
			var producible := false
			for rid in RecipeConfig.RECIPE_IDS:
				if RecipeConfig.recipe_output(rid) == String(t.get("item", "")):
					producible = true
			_check(producible, "craft '%s' item '%s' is a real recipe output" % [t.get("id"), t.get("item")])
	# all_templates returns a defensive copy.
	all[0]["target_min"] = 999
	_check(int(QuestConfig.template_by_id("collect_hay")["target_min"]) == 20,
		"all_templates() returns a defensive copy (catalog unchanged)")

# ── QuestConfig: seeded RNG determinism ────────────────────────────────────────

func _test_rng_determinism() -> void:
	# Same seed string → identical draw sequence.
	var s1 := QuestConfig.rng_state("abc")
	var s2 := QuestConfig.rng_state("abc")
	var seq1: Array = []
	var seq2: Array = []
	for _i in 5:
		seq1.append(QuestConfig.rng_next(s1))
		seq2.append(QuestConfig.rng_next(s2))
	_check(seq1 == seq2, "rng_state(same seed) yields identical draws")
	# Different seeds → different streams (overwhelmingly likely).
	var s3 := QuestConfig.rng_state("xyz")
	var first_a := QuestConfig.rng_next(QuestConfig.rng_state("abc"))
	var first_x := QuestConfig.rng_next(s3)
	_check(first_a != first_x, "different seeds yield different first draws")
	# All draws are in [0, 1).
	var s4 := QuestConfig.rng_state("range")
	var in_range := true
	for _i in 20:
		var v: float = QuestConfig.rng_next(s4)
		if v < 0.0 or v >= 1.0:
			in_range = false
	_check(in_range, "rng_next draws are all in [0, 1)")

# ── QuestConfig: roll determinism + variation ──────────────────────────────────

func _test_roll_determinism() -> void:
	var a := QuestConfig.roll_quests("seedA", 0)
	var b := QuestConfig.roll_quests("seedA", 0)
	_check(a.size() == 6, "roll_quests yields exactly 6 quests")
	# Same (seed, day) → identical template selection + targets.
	var same := true
	for i in a.size():
		if String(a[i].get("template", "")) != String(b[i].get("template", "")):
			same = false
		if int(a[i].get("target", 0)) != int(b[i].get("target", 0)):
			same = false
	_check(same, "same (seed, day) → identical roll (templates + targets)")
	# Different day → a different roll (template order or targets differ).
	var c := QuestConfig.roll_quests("seedA", 1)
	var templ_a: Array = []
	var templ_c: Array = []
	for q in a:
		templ_a.append(String(q.get("template", "")))
	for q in c:
		templ_c.append(String(q.get("template", "")))
	_check(templ_a != templ_c, "different quest_day → a different roll")
	# Different seed → a different roll too.
	var d := QuestConfig.roll_quests("seedB", 0)
	var templ_d: Array = []
	for q in d:
		templ_d.append(String(q.get("template", "")))
	_check(templ_a != templ_d, "different seed → a different roll")
	# No duplicate templates within one roll (splice removes the picked template).
	var seen := {}
	var no_dupes := true
	for q in a:
		var tid := String(q.get("template", ""))
		if seen.has(tid):
			no_dupes = false
		seen[tid] = true
	_check(no_dupes, "a single roll has no duplicate templates (splice semantics)")

func _test_roll_shape_and_reward() -> void:
	var quests := QuestConfig.roll_quests("shape", 3)
	for q in quests:
		var tpl := QuestConfig.template_by_id(String(q.get("template", "")))
		var target: int = int(q.get("target", 0))
		# Target is within the template's [min, max] range.
		_check(target >= int(tpl.get("target_min", 0)) and target <= int(tpl.get("target_max", 0)),
			"quest '%s' target %d within [%d, %d]" % [q.get("template"), target,
				tpl.get("target_min"), tpl.get("target_max")])
		# Reward = coin_base + floor(target * coin_per_unit), xp == QUEST_CLAIM_XP.
		var expected_coins: int = int(tpl.get("coin_base", 0)) + int(floor(float(target) * float(tpl.get("coin_per_unit", 0))))
		_check(int(q.get("reward", {}).get("coins", -1)) == expected_coins,
			"quest '%s' coin reward == base + floor(target*per)" % q.get("template"))
		_check(int(q.get("reward", {}).get("xp", -1)) == QuestConfig.QUEST_CLAIM_XP,
			"quest '%s' xp reward == 20" % q.get("template"))
		# Fresh quests start at 0 progress, unclaimed; the id encodes day + slot.
		_check(int(q.get("progress", -1)) == 0 and not bool(q.get("claimed", true)),
			"quest '%s' starts at progress 0, unclaimed" % q.get("template"))
		_check(String(q.get("id", "")).contains("-3-"), "quest id encodes the quest_day")

# ── QuestConfig: tick per category ─────────────────────────────────────────────

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

func _test_tick_collect() -> void:
	var q := _make_quest("collect", {"key": "tile_grass_grass"}, 50)
	# Matching key → progress += amount.
	var r := QuestConfig.tick_quest(q, {"type": "collect", "key": "tile_grass_grass", "amount": 6})
	_check(int(r.get("progress", 0)) == 6, "collect match bumps progress by amount (6)")
	# Mismatched key → no progress.
	var r2 := QuestConfig.tick_quest(q, {"type": "collect", "key": "tile_grain_wheat", "amount": 6})
	_check(int(r2.get("progress", 0)) == 0, "collect mismatch (wrong key) does not progress")
	# Mismatched event type → no progress.
	var r3 := QuestConfig.tick_quest(q, {"type": "order"})
	_check(int(r3.get("progress", 0)) == 0, "collect quest unaffected by an order event")
	# tick is PURE — the input quest is not mutated.
	_check(int(q.get("progress", 0)) == 0, "tick_quest does not mutate the input quest")

func _test_tick_craft() -> void:
	var q := _make_quest("craft", {"item": "bread"}, 5)
	var r := QuestConfig.tick_quest(q, {"type": "craft", "item": "bread", "count": 2})
	_check(int(r.get("progress", 0)) == 2, "craft match bumps progress by count (2)")
	var r2 := QuestConfig.tick_quest(q, {"type": "craft", "item": "supplies", "count": 2})
	_check(int(r2.get("progress", 0)) == 0, "craft mismatch (wrong item) does not progress")
	# Default count is 1 when omitted.
	var r3 := QuestConfig.tick_quest(q, {"type": "craft", "item": "bread"})
	_check(int(r3.get("progress", 0)) == 1, "craft default count is 1")

func _test_tick_order() -> void:
	var q := _make_quest("order", {}, 6)
	var r := QuestConfig.tick_quest(q, {"type": "order"})
	_check(int(r.get("progress", 0)) == 1, "order event bumps an order quest by 1")
	# A collect event does not progress an order quest.
	var r2 := QuestConfig.tick_quest(q, {"type": "collect", "key": "x", "amount": 5})
	_check(int(r2.get("progress", 0)) == 0, "order quest unaffected by a collect event")

func _test_tick_tool() -> void:
	var q := _make_quest("tool", {"tool": "scythe"}, 5)
	var r := QuestConfig.tick_quest(q, {"type": "tool", "tool": "scythe"})
	_check(int(r.get("progress", 0)) == 1, "tool match bumps by 1")
	var r2 := QuestConfig.tick_quest(q, {"type": "tool", "tool": "bomb"})
	_check(int(r2.get("progress", 0)) == 0, "tool mismatch (wrong tool) does not progress")

func _test_tick_chain() -> void:
	var q := _make_quest("chain", {"min_length": 8}, 3)
	# Length below min → no progress (boundary: 7 < 8).
	var r_low := QuestConfig.tick_quest(q, {"type": "chain", "length": 7})
	_check(int(r_low.get("progress", 0)) == 0, "chain below min_length (7 < 8) does not progress")
	# Length == min → +1 (boundary: 8 >= 8).
	var r_eq := QuestConfig.tick_quest(q, {"type": "chain", "length": 8})
	_check(int(r_eq.get("progress", 0)) == 1, "chain at min_length (8 >= 8) bumps by 1")
	# Length above min → +1.
	var r_hi := QuestConfig.tick_quest(q, {"type": "chain", "length": 20})
	_check(int(r_hi.get("progress", 0)) == 1, "chain above min_length bumps by 1")

func _test_tick_claimed_and_clamp() -> void:
	# A claimed quest never progresses.
	var claimed := _make_quest("collect", {"key": "k", "claimed": true}, 5)
	var r := QuestConfig.tick_quest(claimed, {"type": "collect", "key": "k", "amount": 3})
	_check(int(r.get("progress", 0)) == 0, "a claimed quest does not progress")
	# Progress clamps to the target (no overshoot).
	var near := _make_quest("collect", {"key": "k", "progress": 4}, 5)
	var r2 := QuestConfig.tick_quest(near, {"type": "collect", "key": "k", "amount": 10})
	_check(int(r2.get("progress", 0)) == 5, "progress clamps to the target (4 + 10 → 5)")

func _test_is_claimable() -> void:
	var done := _make_quest("collect", {"key": "k", "progress": 5}, 5)
	_check(QuestConfig.is_claimable(done), "is_claimable true when progress >= target, unclaimed")
	var partial := _make_quest("collect", {"key": "k", "progress": 4}, 5)
	_check(not QuestConfig.is_claimable(partial), "is_claimable false when incomplete")
	var claimed := _make_quest("collect", {"key": "k", "progress": 5, "claimed": true}, 5)
	_check(not QuestConfig.is_claimable(claimed), "is_claimable false when already claimed")

# ── AlmanacConfig: catalog ─────────────────────────────────────────────────────

func _test_almanac_catalog() -> void:
	var tiers := AlmanacConfig.all_tiers()
	_check(tiers.size() == 10, "almanac has 10 tiers")
	_check(AlmanacConfig.tier_count() == 10, "tier_count() == 10")
	# Tier ids are 1..10 in order, each with a required level.
	for i in 10:
		var t: Dictionary = tiers[i]
		_check(int(t.get("tier", 0)) == i + 1, "tier %d is in order" % (i + 1))
		_check(int(t.get("level", 0)) == i + 1, "tier %d requires level %d" % [i + 1, i + 1])
	# Every tool reward id is a REAL ToolConfig id (no fakes).
	for t in tiers:
		var reward: Dictionary = t.get("reward", {})
		var tools_reward: Dictionary = reward.get("tools", {})
		for tid in tools_reward.keys():
			_check(ToolConfig.has_tool(String(tid)),
				"tier %d tool reward '%s' is a real ToolConfig id" % [t.get("tier"), tid])
	# tier_def hit + miss; defensive copy.
	_check(AlmanacConfig.has_tier(5), "has_tier(5) true")
	_check(not AlmanacConfig.has_tier(11), "has_tier(11) false")
	_check(AlmanacConfig.tier_def(99).is_empty(), "tier_def(99) → {}")
	var copy := AlmanacConfig.all_tiers()
	copy[0]["level"] = 999
	_check(int(AlmanacConfig.tier_def(1)["level"]) == 1, "all_tiers() returns a defensive copy")

# ── AlmanacConfig: XP curve ────────────────────────────────────────────────────

func _test_almanac_level_curve() -> void:
	# 150 XP per level, linear. level = max(1, floor(xp/150)+1).
	_check(AlmanacConfig.level_for_xp(0) == 1, "0 xp → level 1")
	_check(AlmanacConfig.level_for_xp(149) == 1, "149 xp → level 1 (just under)")
	_check(AlmanacConfig.level_for_xp(150) == 2, "150 xp → level 2 (boundary)")
	_check(AlmanacConfig.level_for_xp(299) == 2, "299 xp → level 2")
	_check(AlmanacConfig.level_for_xp(300) == 3, "300 xp → level 3 (boundary)")
	_check(AlmanacConfig.level_for_xp(1500) == 11, "1500 xp → level 11")
	_check(AlmanacConfig.level_for_xp(-5) == 1, "negative xp floors to level 1")
	_check(AlmanacConfig.XP_PER_LEVEL == 150, "XP_PER_LEVEL == 150")

func _test_almanac_can_claim_gate() -> void:
	# Level too low → cannot claim tier 5 (needs level 5).
	_check(not AlmanacConfig.can_claim_tier(5, 4, []), "can_claim_tier false when level < required")
	# Level exactly required → can claim.
	_check(AlmanacConfig.can_claim_tier(5, 5, []), "can_claim_tier true when level == required")
	# Already claimed → cannot claim again.
	_check(not AlmanacConfig.can_claim_tier(5, 9, [5]), "can_claim_tier false when already claimed")
	# Unknown tier → cannot claim.
	_check(not AlmanacConfig.can_claim_tier(99, 99, []), "can_claim_tier false for an unknown tier")

# ── GameState: ensure / reroll ─────────────────────────────────────────────────

func _test_gamestate_ensure_and_reroll() -> void:
	var g := GameState.new()
	_check(g.quests.is_empty(), "a fresh GameState has an empty quest board")
	g.ensure_quests()
	_check(g.quests.size() == 6, "ensure_quests rolls 6 quests")
	# ensure_quests is idempotent (does not clobber an existing board).
	g.quests[0]["progress"] = 3
	g.ensure_quests()
	_check(int(g.quests[0]["progress"]) == 3, "ensure_quests is idempotent (keeps progress)")
	# ensure_quests is deterministic from (seed, day) — matches QuestConfig.roll_quests.
	var g2 := GameState.new()
	g2.ensure_quests()
	var expected := QuestConfig.roll_quests(g2.quest_seed, g2.quest_day)
	_check(String(g2.quests[0]["template"]) == String(expected[0]["template"]),
		"ensure_quests roll matches QuestConfig.roll_quests(seed, day)")
	# reroll bumps quest_day + re-rolls.
	var day0 := g.quest_day
	g.reroll_quests()
	_check(g.quest_day == day0 + 1, "reroll_quests bumps quest_day")
	_check(int(g.quests[0]["progress"]) == 0, "reroll_quests produces a fresh (progress 0) board")

# ── GameState: claim_quest ─────────────────────────────────────────────────────

func _test_gamestate_claim_quest() -> void:
	var g := GameState.new()
	g.ensure_quests()
	var qid := String(g.quests[0]["id"])
	# Incomplete → claim rejected.
	var r_inc := g.claim_quest(qid)
	_check(not bool(r_inc.get("ok", true)) and String(r_inc.get("reason", "")) == "incomplete",
		"claim_quest rejects an incomplete quest")
	# Unknown id → rejected.
	var r_unk := g.claim_quest("nope")
	_check(not bool(r_unk.get("ok", true)) and String(r_unk.get("reason", "")) == "unknown",
		"claim_quest rejects an unknown id")
	# Complete the quest, then claim → grants coins + 20 XP.
	g.quests[0]["progress"] = int(g.quests[0]["target"])
	var coins0 := g.coins
	var xp0 := g.almanac_xp
	var reward_coins := int(g.quests[0]["reward"]["coins"])
	var r_ok := g.claim_quest(qid)
	_check(bool(r_ok.get("ok", false)), "claim_quest succeeds for a complete quest")
	_check(g.coins == coins0 + reward_coins, "claim_quest grants the coin reward")
	_check(g.almanac_xp == xp0 + 20, "claim_quest awards 20 almanac XP")
	_check(bool(g.quests[0]["claimed"]), "the claimed quest is marked claimed")
	# Re-claim → rejected (already claimed).
	var r_again := g.claim_quest(qid)
	_check(not bool(r_again.get("ok", true)) and String(r_again.get("reason", "")) == "claimed",
		"claim_quest rejects an already-claimed quest")

# ── GameState: award_xp ────────────────────────────────────────────────────────

func _test_gamestate_award_xp() -> void:
	var g := GameState.new()
	_check(g.almanac_xp == 0 and g.almanac_level == 1, "fresh almanac starts at 0 xp / level 1")
	# Award below a level boundary → no level-up (returns 0).
	var l1 := g.award_xp(100)
	_check(g.almanac_xp == 100 and g.almanac_level == 1, "100 xp keeps level 1")
	_check(l1 == 0, "award_xp returns 0 (sentinel) when no level-up")
	# Cross the boundary → level-up returns the new level.
	var l2 := g.award_xp(60)   # 160 → level 2
	_check(g.almanac_xp == 160 and g.almanac_level == 2, "160 xp → level 2")
	_check(l2 == 2, "award_xp returns the new level (2) on a level-up")
	# Non-positive award is a no-op.
	var l3 := g.award_xp(0)
	_check(g.almanac_xp == 160 and l3 == 0, "award_xp(0) is a no-op")

# ── GameState: claim_almanac_tier ──────────────────────────────────────────────

func _test_gamestate_claim_tier() -> void:
	var g := GameState.new()
	# Level too low → locked.
	var r_lock := g.claim_almanac_tier(2)   # needs level 2; we're level 1
	_check(not bool(r_lock.get("ok", true)) and String(r_lock.get("reason", "")) == "locked",
		"claim_almanac_tier rejects a tier above the current level")
	# Unknown tier → rejected.
	var r_unk := g.claim_almanac_tier(99)
	_check(not bool(r_unk.get("ok", true)) and String(r_unk.get("reason", "")) == "unknown",
		"claim_almanac_tier rejects an unknown tier")
	# Tier 1 (needs level 1) → succeeds + grants +50 coins.
	var coins0 := g.coins
	var r1 := g.claim_almanac_tier(1)
	_check(bool(r1.get("ok", false)), "claim_almanac_tier(1) succeeds at level 1")
	_check(g.coins == coins0 + 50, "tier 1 grants +50 coins")
	_check(g.almanac_claimed.has(1), "tier 1 is recorded claimed")
	# Re-claim tier 1 → rejected.
	var r1b := g.claim_almanac_tier(1)
	_check(not bool(r1b.get("ok", true)) and String(r1b.get("reason", "")) == "claimed",
		"claim_almanac_tier rejects an already-claimed tier")
	# Level up to 3, claim tier 3 → grants +75 coins + 1 bomb (mapped from React 'rare').
	g.award_xp(300)   # → level 3
	var coins_b := g.coins
	var bomb0 := g.tool_count("bomb")
	var r3 := g.claim_almanac_tier(3)
	_check(bool(r3.get("ok", false)), "claim_almanac_tier(3) succeeds at level 3")
	_check(g.coins == coins_b + 75, "tier 3 grants +75 coins")
	_check(g.tool_count("bomb") == bomb0 + 1, "tier 3 grants 1 bomb (real ToolConfig tool)")

func _test_gamestate_claim_tier_structural() -> void:
	# Tier 5 grants the 'startingExtraScythe' structural honour (latched, no fake effect).
	var g := GameState.new()
	g.award_xp(150 * 9)   # plenty → level 10
	_check(g.almanac_level == 10, "9*150 xp → level 10")
	var r5 := g.claim_almanac_tier(5)
	_check(bool(r5.get("ok", false)), "claim_almanac_tier(5) succeeds")
	_check(g.has_almanac_structural("startingExtraScythe"),
		"tier 5 latches the 'startingExtraScythe' structural flag")
	# Tier 10 grants coins + runes + tools.
	var runes0 := g.runes
	var coins0 := g.coins
	var scythe0 := g.tool_count("scythe")
	var r10 := g.claim_almanac_tier(10)
	_check(bool(r10.get("ok", false)), "claim_almanac_tier(10) succeeds at level 10")
	_check(g.coins == coins0 + 1000, "tier 10 grants +1000 coins")
	_check(g.runes == runes0 + 1, "tier 10 grants +1 rune (direct grant)")
	_check(g.tool_count("scythe") == scythe0 + 5, "tier 10 grants 5 scythes (mapped from React 'basic')")

# ── Additive guarantee: no quests → no economy change ──────────────────────────

func _test_additive_no_quests() -> void:
	# With an un-rolled board (quests []), every tick site is a no-op loop — credit_chain
	# yields exactly the same economy as before quests existed.
	var g := GameState.new()
	_check(g.quests.is_empty(), "GameState.new() has no quests (additive precondition)")
	var r := g.credit_chain(T.GRASS, 6)
	_check(g.quests.is_empty(), "credit_chain with no quest board leaves the board empty")
	_check(int(r.get("units", 0)) == 1, "credit_chain economy unchanged (grass chain of 6 → 1 unit)")
	# The full economy (coins, including achievement rewards) is byte-identical to a
	# parallel GameState run WITHOUT the quest tick — the quest path adds nothing.
	var baseline := GameState.new()
	baseline.credit_chain(T.GRASS, 6)
	_check(g.coins == baseline.coins, "credit_chain coins identical to the pre-quests baseline")
	_check(g.inventory == baseline.inventory, "credit_chain inventory identical to the baseline")

# ── Wired event sites (credit_chain / fill_order / craft / use_tool_on_grid) ───

func _test_wired_credit_chain_collect_and_chain() -> void:
	var g := GameState.new()
	g.ensure_quests()
	# Force a known board: a grass collect quest + a chain quest, both fresh.
	g.quests = [
		_make_quest("collect", {"id": "c1", "template": "collect_hay", "key": "tile_grass_grass"}, 50),
		_make_quest("chain", {"id": "ch1", "template": "chain_8", "min_length": 8}, 3),
	]
	# A grass chain of 10 ticks BOTH: collect (+10 grass) and chain (+1, since 10 >= 8).
	g.credit_chain(T.GRASS, 10)
	_check(int(_quest_by_template(g.quests, "collect_hay").get("progress", 0)) == 10,
		"credit_chain ticks the collect quest by chain length (10)")
	_check(int(_quest_by_template(g.quests, "chain_8").get("progress", 0)) == 1,
		"credit_chain ticks the chain quest (chain of 10 >= 8)")
	# A short grass chain (5) ticks collect (+5) but NOT the chain-8 quest (5 < 8).
	g.credit_chain(T.GRASS, 5)
	_check(int(_quest_by_template(g.quests, "collect_hay").get("progress", 0)) == 15,
		"a second grass chain accumulates collect progress (15)")
	_check(int(_quest_by_template(g.quests, "chain_8").get("progress", 0)) == 1,
		"a short chain (5 < 8) does NOT tick the chain-8 quest")
	# A wheat chain does NOT tick the grass collect quest (key mismatch).
	g.credit_chain(T.WHEAT, 6)
	_check(int(_quest_by_template(g.quests, "collect_hay").get("progress", 0)) == 15,
		"a wheat chain does not tick the grass-keyed collect quest")

func _test_wired_fill_order() -> void:
	var g := GameState.new()
	g.quests = [_make_quest("order", {"id": "o1", "template": "orders_any"}, 6)]
	g.seed_orders(7)
	g.refill_orders()
	# Seed inventory so an order is fillable.
	g.inventory["hay_bundle"] = 1000
	g.inventory["flour"] = 1000
	# Fill one fillable order.
	var idx := -1
	for i in g.orders.size():
		if g.can_fill_order(i):
			idx = i
			break
	_check(idx >= 0, "found a fillable order")
	g.fill_order(idx)
	_check(int(_quest_by_template(g.quests, "orders_any").get("progress", 0)) == 1,
		"fill_order ticks the order quest by 1")

func _test_wired_craft() -> void:
	var g := GameState.new()
	g.quests = [_make_quest("craft", {"id": "cr1", "template": "craft_bread", "item": "bread"}, 5)]
	# Build a Bakery + seed inputs so the craft succeeds.
	g.buildings.append(BuildingConfig.BAKERY)
	g.inventory["flour"] = 100
	g.inventory["eggs"] = 100
	var res := g.craft(RecipeConfig.BREAD)
	_check(bool(res.get("ok", false)), "craft(bread) succeeds with a Bakery + inputs")
	_check(int(_quest_by_template(g.quests, "craft_bread").get("progress", 0)) >= 1,
		"craft ticks the craft-bread quest")

## A full ROWS×COLS grid where every cell holds `tile`.
func _full_grid(tile: int) -> Array:
	var g: Array = []
	for _r in Constants.ROWS:
		var row: Array = []
		for _c in Constants.COLS:
			row.append(tile)
		g.append(row)
	return g

func _test_wired_tool() -> void:
	var g := GameState.new()
	g.quests = [_make_quest("tool", {"id": "t1", "template": "tool_scythe", "tool": "scythe"}, 5)]
	g.grant_tool("scythe", 1)
	# A full grass grid for the scythe (instant clear_random_n tool, count 6).
	var res := g.use_tool_on_grid("scythe", _full_grid(T.GRASS))
	_check(bool(res.get("ok", false)), "use_tool_on_grid(scythe) succeeds")
	_check(int(_quest_by_template(g.quests, "tool_scythe").get("progress", 0)) == 1,
		"use_tool_on_grid ticks the matching tool quest by 1")
	# A non-matching tool quest is not ticked (use scythe against a bomb quest).
	g.quests = [_make_quest("tool", {"id": "t2", "template": "tool_bomb", "tool": "bomb"}, 5)]
	g.grant_tool("scythe", 1)
	g.use_tool_on_grid("scythe", _full_grid(T.GRASS))
	_check(int(_quest_by_template(g.quests, "tool_bomb").get("progress", 0)) == 0,
		"a scythe use does not tick a bomb quest (tool mismatch)")

# ── Persistence: round-trip ────────────────────────────────────────────────────

func _test_save_load_round_trip() -> void:
	var g := GameState.new()
	g.ensure_quests()
	g.quest_day = 4
	g.quests[0]["progress"] = 3
	g.almanac_xp = 320
	g.almanac_level = AlmanacConfig.level_for_xp(320)   # 3
	g.almanac_claimed = [1, 2]
	g.almanac_structural = {"startingExtraScythe": true}

	var d := g.to_dict()
	_check(d.has("quests") and d.has("quest_day") and d.has("almanac_xp")
			and d.has("almanac_claimed") and d.has("almanac_structural"),
		"to_dict includes the quest + almanac keys")

	var g2 := GameState.from_dict(d)
	_check(g2.quests.size() == g.quests.size(), "round-trip preserves the quest board size")
	_check(int(g2.quests[0]["progress"]) == 3, "round-trip preserves quest progress")
	_check(g2.quest_day == 4, "round-trip preserves quest_day")
	_check(g2.almanac_xp == 320, "round-trip preserves almanac_xp")
	_check(g2.almanac_level == 3, "round-trip recomputes almanac_level from xp (3)")
	_check(g2.almanac_claimed.has(1) and g2.almanac_claimed.has(2), "round-trip preserves claimed tiers")
	_check(g2.has_almanac_structural("startingExtraScythe"), "round-trip preserves structural honours")

	# A pre-quests save (no quest keys) loads with an empty board + fresh almanac.
	var old_save := {"inventory": {}, "progress": {}, "coins": 0, "turn": 0}
	var g3 := GameState.from_dict(old_save)
	_check(g3.quests.is_empty(), "a pre-quests save loads with an empty quest board")
	_check(g3.almanac_xp == 0 and g3.almanac_level == 1 and g3.almanac_claimed.is_empty(),
		"a pre-quests save loads with a fresh almanac")

	# A malformed quest row (missing id / bad target) is dropped on load.
	var bad := {"quests": [{"id": "ok", "target": 5, "progress": 2},
		{"target": 5}, {"id": "z", "target": 0}]}
	var g4 := GameState.from_dict(bad)
	_check(g4.quests.size() == 1, "malformed quest rows are dropped on load (only the well-formed one kept)")

# ── QuestsScreen + ViewRouter + Main integration ───────────────────────────────

func _test_screen_and_router_and_main() -> void:
	# ── QuestsScreen helpers + rendering ──────────────────────────────────────
	var game := GameState.new()
	game.ensure_quests()
	# Make the first quest claimable so a claim button reads enabled.
	game.quests[0]["progress"] = int(game.quests[0]["target"])

	var screen = QuestsScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "quests screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.quest_count() == 6, "quest_count() == 6")
	_check(screen._quest_rows.size() == 6, "one rendered row per quest")
	_check(screen.claimable_count() == 1, "claimable_count() == 1 (the forced-complete quest)")
	_check(screen.tier_total() == 10, "tier_total() == 10")

	# Claiming the complete quest via its button credits coins + XP + marks claimed.
	var claim_qid := String(game.quests[0]["id"])
	var coins0 := game.coins
	var claim_btn = screen._quest_buttons.get(claim_qid)
	_check(claim_btn != null and not claim_btn.disabled, "the complete quest's Claim button is enabled")
	if claim_btn != null:
		claim_btn.emit_signal("pressed")
	_check(game.coins > coins0, "claiming via the button credited coins")
	_check(game.almanac_xp == 20, "claiming via the button awarded 20 XP")

	# Switch to the Almanac tab; the tier rows render; tier 1 is claimable at level 1.
	screen._on_tab("almanac")
	_check(screen._tier_rows.size() == 10, "almanac tab renders 10 tier rows")
	var t1_btn = screen._tier_buttons.get(1)
	_check(t1_btn != null and not t1_btn.disabled, "tier 1 Claim button enabled at level 1")
	var coins_b := game.coins
	if t1_btn != null:
		t1_btn.emit_signal("pressed")
	_check(game.almanac_claimed.has(1), "claiming tier 1 via the button records it claimed")
	_check(game.coins == coins_b + 50, "claiming tier 1 via the button grants +50 coins")
	# A locked tier (tier 5, needs level 5) renders disabled.
	var t5_btn = screen._tier_buttons.get(5)
	_check(t5_btn != null and t5_btn.disabled, "tier 5 Claim button disabled (level too low)")

	# Close fires `closed` + hides.
	var before := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before + 1, "closed signal fired once")
	_check(not screen.visible, "quests hidden after close")

	# ── ViewRouter — the new QUESTS modal ─────────────────────────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.QUESTS)
	_check(r.current_modal() == ViewRouter.Modal.QUESTS, "current_modal() == QUESTS")
	_check(r.is_open(ViewRouter.Modal.QUESTS), "is_open(QUESTS) true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_q := ViewRouter.resolve("quests")
	_check(bool(d_q.get("ok", false)) and int(d_q.get("modal", -1)) == ViewRouter.Modal.QUESTS,
		"resolve('quests') → QUESTS modal")
	var d_a := ViewRouter.resolve("almanac")
	_check(bool(d_a.get("ok", false)) and int(d_a.get("modal", -1)) == ViewRouter.Modal.QUESTS,
		"resolve('almanac') → QUESTS modal (alias)")
	_check(ViewRouter.modal_id(ViewRouter.Modal.QUESTS) == "quests", "modal_id(QUESTS) == 'quests'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("quests") and ids.has("almanac"), "known_ids() contains 'quests' + 'almanac'")

	# ── Main integration ──────────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

	_check(main.has_method("_open_quests"), "Main has _open_quests()")
	_check(main.has_method("_on_quests_closed"), "Main has _on_quests_closed()")
	_check(main._quests_screen == null, "quests screen lazily created (null before open)")

	main._open_quests()
	_check(main._quests_screen != null, "_open_quests() lazily created the screen")
	_check(main._quests_screen.visible, "quests visible after _open_quests()")
	_check(main._router.current_modal() == ViewRouter.Modal.QUESTS,
		"_router.current_modal() == QUESTS after _open_quests()")
	# A second open reuses the SAME screen.
	var first_ref = main._quests_screen
	main._open_quests()
	_check(main._quests_screen == first_ref, "_open_quests() reuses the one screen")

	# apply_deeplink("quests") shows it; ("board") closes it.
	main.apply_deeplink("board")
	var ok_q: bool = main.apply_deeplink("quests")
	_check(ok_q, "apply_deeplink('quests') returns true")
	_check(main._quests_screen.visible, "apply_deeplink('quests') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.QUESTS,
		"_router.current_modal() == QUESTS after apply_deeplink('quests')")
	var ok_b: bool = main.apply_deeplink("board")
	_check(ok_b, "apply_deeplink('board') returns true")
	_check(not main._quests_screen.visible, "quests hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")
	SaveManager.clear()
